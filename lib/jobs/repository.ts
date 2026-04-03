import { getDb } from "@/lib/firebase/admin";
import { assertTransition } from "@/lib/jobs/state-machine";
import { getPackageConfig } from "@/lib/packages";
import {
  DISCOUNT_CODES,
  generateDiscountCode,
  isBuiltinDiscountCode,
  isValidIssuedDiscountCode,
  type DiscountCode,
  normalizeDiscountCode,
  resolveDiscountCode,
} from "@/lib/payments/discount-codes";
import { derivePaymentAddress } from "@/lib/payments/dedicated-address";
import { applyPaymentSettlement } from "@/lib/payments/settlement";
import { getRevenueWalletAddress, solToLamports } from "@/lib/payments/solana-pay";
import {
  InternalVideoRenderDocument,
  JobDocument,
  JobProgress,
  JobStatus,
  PackageType,
  PumpMetadataCacheDocument,
  ReportDocument,
  SupportedTokenChain,
  VideoStyleId,
  VideoDocument,
} from "@/lib/types/domain";
import { randomUUID } from "crypto";
import type { Transaction } from "firebase-admin/firestore";

function nowIso(): string {
  return new Date().toISOString();
}

function isoToMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeDispatchRetryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(5 * 60_000, 5_000 * 2 ** (safeAttempt - 1));
}

export interface JobDispatchOutboxDocument {
  jobId: string;
  status: "pending" | "in_progress" | "dispatched";
  attempts: number;
  nextAttemptAt: string;
  lockUntil: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  dispatchedAt: string | null;
}

function normalizeDispatchOutboxDocument(
  jobId: string,
  raw: Partial<JobDispatchOutboxDocument>,
): JobDispatchOutboxDocument {
  return {
    jobId,
    status:
      raw.status === "in_progress" || raw.status === "dispatched"
        ? raw.status
        : "pending",
    attempts: Math.max(0, Math.floor(raw.attempts ?? 0)),
    nextAttemptAt: raw.nextAttemptAt ?? nowIso(),
    lockUntil: raw.lockUntil ?? null,
    lastError: raw.lastError ?? null,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
    dispatchedAt: raw.dispatchedAt ?? null,
  };
}

function normalizeJobDocument(raw: JobDocument): JobDocument {
  const packageConfig = getPackageConfig(raw.packageType);
  return {
    ...raw,
    pricingMode:
      raw.pricingMode === "public" || raw.pricingMode === "private"
        ? raw.pricingMode
        : "legacy",
    visibility: raw.visibility === "private" ? "private" : "public",
    experience:
      raw.experience === "hypercinema" ||
      raw.experience === "trenchcinema" ||
      raw.experience === "funcinema" ||
      raw.experience === "familycinema" ||
      raw.experience === "musicvideo" ||
      raw.experience === "recreator"
        ? raw.experience
        : "legacy",
    moderationStatus:
      raw.moderationStatus === "flagged" || raw.moderationStatus === "hidden"
        ? raw.moderationStatus
        : "visible",
    creatorId: raw.creatorId ?? null,
    creatorEmail: raw.creatorEmail ?? null,
    audioEnabled:
      typeof raw.audioEnabled === "boolean"
        ? raw.audioEnabled
        : raw.requestKind === "bedtime_story",
    priceUsdc: raw.priceUsdc ?? packageConfig.priceUsdc,
    paymentMethod:
      raw.paymentMethod === "x402_usdc" || raw.paymentMethod === "discount_code"
        ? raw.paymentMethod
        : "sol_dedicated_address",
    paymentCurrency: raw.paymentCurrency === "USDC" ? "USDC" : "SOL",
    paymentNetwork: "solana",
    x402Transaction: raw.x402Transaction ?? null,
    discountCode: raw.discountCode ?? null,
    paymentWaived: raw.paymentWaived ?? false,
    paymentAddress: raw.paymentAddress ?? "",
    paymentIndex:
      typeof raw.paymentIndex === "number" && Number.isInteger(raw.paymentIndex)
        ? raw.paymentIndex
        : null,
    paymentRouting:
      raw.paymentRouting === "dedicated_address" ||
      raw.paymentRouting === "x402" ||
      raw.paymentRouting === "discount_code"
        ? raw.paymentRouting
        : "legacy_memo",
    requiredLamports: raw.requiredLamports ?? solToLamports(raw.priceSol),
    receivedLamports: raw.receivedLamports ?? 0,
    paymentSignatures: Array.isArray(raw.paymentSignatures)
      ? raw.paymentSignatures
      : [],
    lastPaymentAt: raw.lastPaymentAt ?? null,
    sweepStatus:
      raw.sweepStatus === "swept" || raw.sweepStatus === "failed"
        ? raw.sweepStatus
        : "pending",
    sweepSignature: raw.sweepSignature ?? null,
    sweptLamports: Math.max(0, Math.floor(raw.sweptLamports ?? 0)),
    lastSweepAt: raw.lastSweepAt ?? null,
    sweepError: raw.sweepError ?? null,
  };
}

function resolvePackagePricing(input: {
  packageType: PackageType;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
}) {
  const pkg = getPackageConfig(input.packageType);
  return {
    packageType: pkg.packageType,
    rangeDays: input.rangeDays ?? pkg.rangeDays,
    priceSol: input.priceSol ?? pkg.priceSol,
    priceUsdc: input.priceUsdc ?? pkg.priceUsdc,
    videoSeconds: input.videoSeconds ?? pkg.videoSeconds,
  };
}

export function isSweepEligibleStatus(status: JobStatus): boolean {
  return (
    status === "payment_detected" ||
    status === "payment_confirmed" ||
    status === "processing" ||
    status === "complete" ||
    status === "failed"
  );
}

function jobsCollection() {
  return getDb().collection("jobs");
}

function paymentCounterCollection() {
  return getDb().collection("_meta");
}

function discountCodesCollection() {
  return getDb().collection("discount_codes");
}

function reportsCollection() {
  return getDb().collection("reports");
}

function videosCollection() {
  return getDb().collection("videos");
}

function metadataCollection() {
  return getDb().collection("pump_metadata_cache");
}

function dispatchOutboxCollection() {
  return getDb().collection("job_dispatch_outbox");
}

function videoRendersCollection() {
  return getDb().collection("video_renders");
}

async function upsertDispatchOutboxPending(jobId: string): Promise<void> {
  const createdAt = nowIso();
  await dispatchOutboxCollection().doc(jobId).set(
    {
      jobId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: createdAt,
      lockUntil: null,
      lastError: null,
      createdAt,
      updatedAt: createdAt,
      dispatchedAt: null,
    } satisfies JobDispatchOutboxDocument,
    { merge: true },
  );
}

interface DiscountCodeUsageDocument {
  code: DiscountCode;
  createdAt: string;
  origin: "builtin" | "admin";
  label: string | null;
  issuedBy: string | null;
  usedAt: string | null;
  usedByJobId: string | null;
  usedByAction: "job_create" | "job_redeem" | null;
}

export interface DiscountCodeAdminRecord {
  code: string;
  origin: "builtin" | "admin";
  label: string | null;
  createdAt: string | null;
  issuedBy: string | null;
  usedAt: string | null;
  usedByJobId: string | null;
  usedByAction: "job_create" | "job_redeem" | null;
  isConsumed: boolean;
}

function normalizeDiscountCodeUsageDocument(
  code: DiscountCode,
  raw: Partial<DiscountCodeUsageDocument>,
): DiscountCodeUsageDocument {
  return {
    code,
    createdAt: raw.createdAt ?? nowIso(),
    origin: raw.origin === "admin" ? "admin" : "builtin",
    label: raw.label ?? null,
    issuedBy: raw.issuedBy ?? null,
    usedAt: raw.usedAt ?? null,
    usedByJobId: raw.usedByJobId ?? null,
    usedByAction:
      raw.usedByAction === "job_create" || raw.usedByAction === "job_redeem"
        ? raw.usedByAction
        : null,
  };
}

async function claimDiscountCodeInTransaction(input: {
  tx: Transaction;
  code: string;
  jobId: string;
  action: "job_create" | "job_redeem";
}): Promise<DiscountCode> {
  const normalized = normalizeDiscountCode(input.code);
  const resolved = resolveDiscountCode(normalized);
  const isBuiltin = resolved !== null || isBuiltinDiscountCode(normalized);
  if (!resolved && !isBuiltin) {
    throw new Error("Invalid discount code");
  }

  const ref = discountCodesCollection().doc(normalized);
  const snap = await input.tx.get(ref);
  const current = normalizeDiscountCodeUsageDocument(
    (resolved ?? normalized) as DiscountCode,
    snap.exists ? (snap.data() as Partial<DiscountCodeUsageDocument>) : {},
  );

  if (!snap.exists && !isBuiltin) {
    throw new Error("Invalid discount code");
  }

  if (current.usedAt) {
    if (
      current.usedByJobId === input.jobId &&
      current.usedByAction === input.action
    ) {
      return (resolved ?? normalized) as DiscountCode;
    }

    throw new Error("This discount code has already been used.");
  }

  const createdAt = current.createdAt ?? nowIso();
  input.tx.set(
    ref,
    {
      code: (resolved ?? normalized) as DiscountCode,
      createdAt,
      origin: current.origin,
      label: current.label,
      issuedBy: current.issuedBy,
      usedAt: nowIso(),
      usedByJobId: input.jobId,
      usedByAction: input.action,
    } satisfies DiscountCodeUsageDocument,
    { merge: true },
  );

  return (resolved ?? normalized) as DiscountCode;
}

function discountCodeRecordFromDoc(
  code: string,
  raw: Partial<DiscountCodeUsageDocument> | null,
  origin: "builtin" | "admin",
): DiscountCodeAdminRecord {
  const normalized = normalizeDiscountCode(code);
  const current = raw
    ? normalizeDiscountCodeUsageDocument(normalized as DiscountCode, raw)
    : null;

  return {
    code: normalized,
    origin: current?.origin ?? origin,
    label: current?.label ?? null,
    createdAt: current?.createdAt ?? null,
    issuedBy: current?.issuedBy ?? null,
    usedAt: current?.usedAt ?? null,
    usedByJobId: current?.usedByJobId ?? null,
    usedByAction: current?.usedByAction ?? null,
    isConsumed: Boolean(current?.usedAt),
  };
}

export async function listDiscountCodeAdminRecords(): Promise<DiscountCodeAdminRecord[]> {
  const snapshot = await discountCodesCollection().get();
  const byCode = new Map<string, Partial<DiscountCodeUsageDocument>>();

  for (const doc of snapshot.docs) {
    byCode.set(normalizeDiscountCode(doc.id), doc.data() as Partial<DiscountCodeUsageDocument>);
  }

  const builtinRecords = DISCOUNT_CODES.map((code) =>
    discountCodeRecordFromDoc(code, byCode.get(code) ?? null, "builtin"),
  );

  const adminRecords = snapshot.docs
    .map((doc) => {
      const normalized = normalizeDiscountCode(doc.id);
      if (isBuiltinDiscountCode(normalized)) {
        return null;
      }

      return discountCodeRecordFromDoc(
        normalized,
        doc.data() as Partial<DiscountCodeUsageDocument>,
        "admin",
      );
    })
    .filter((record): record is DiscountCodeAdminRecord => record !== null);

  return [...builtinRecords, ...adminRecords].sort((left, right) => {
    if (left.isConsumed !== right.isConsumed) {
      return left.isConsumed ? -1 : 1;
    }
    if (left.origin !== right.origin) {
      return left.origin === "builtin" ? -1 : 1;
    }
    return left.code.localeCompare(right.code);
  });
}

export async function issueDiscountCode(input: {
  code?: string;
  label?: string | null;
  issuedBy?: string | null;
}): Promise<DiscountCodeAdminRecord> {
  const requested = input.code?.trim();
  const candidates = requested
    ? [normalizeDiscountCode(requested)]
    : Array.from({ length: 12 }, () => generateDiscountCode());

  for (const candidate of candidates) {
    if (!isValidIssuedDiscountCode(candidate)) {
      if (requested) {
        throw new Error("Enter a new alphanumeric code that is not one of the built-ins.");
      }
      continue;
    }

    const ref = discountCodesCollection().doc(candidate);
    const createdAt = nowIso();
    const record: DiscountCodeUsageDocument = {
      code: candidate as DiscountCode,
      createdAt,
      origin: "admin",
      label: input.label?.trim() || null,
      issuedBy: input.issuedBy?.trim() || null,
      usedAt: null,
      usedByJobId: null,
      usedByAction: null,
    };

    try {
      await ref.create(record);
      return discountCodeRecordFromDoc(candidate, record, "admin");
    } catch {
      if (requested) {
        throw new Error("That code already exists in Firestore.");
      }
    }
  }

  throw new Error("Unable to generate a unique code. Try again.");
}

export async function createJob(input: {
  wallet: string;
  packageType: PackageType;
}): Promise<JobDocument> {
  const pkg = getPackageConfig(input.packageType);
  const jobId = randomUUID();

  return getDb().runTransaction(async (tx) => {
    const createdAt = nowIso();
    const counterRef = paymentCounterCollection().doc("payment_counter");
    const counterSnap = await tx.get(counterRef);
    const currentCounter = counterSnap.exists
      ? (counterSnap.data()?.nextPaymentIndex as number | undefined)
      : undefined;
    const paymentIndex =
      typeof currentCounter === "number" && Number.isInteger(currentCounter) && currentCounter > 0
        ? currentCounter
        : 1;

    const paymentAddress = derivePaymentAddress(paymentIndex);

    tx.set(
      counterRef,
      {
        nextPaymentIndex: paymentIndex + 1,
        updatedAt: createdAt,
      },
      { merge: true },
    );

    const job: JobDocument = {
      jobId,
      wallet: input.wallet,
      requestKind: "wallet_recap",
      packageType: pkg.packageType,
      rangeDays: pkg.rangeDays,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      status: "awaiting_payment",
      progress: "awaiting_payment",
      txSignature: null,
      createdAt,
      updatedAt: createdAt,
      errorCode: null,
      errorMessage: null,
      paymentMethod: "sol_dedicated_address",
      paymentCurrency: "SOL",
      paymentNetwork: "solana",
      x402Transaction: null,
      discountCode: null,
      paymentWaived: false,
      paymentAddress,
      paymentIndex,
      paymentRouting: "dedicated_address",
      requiredLamports: solToLamports(pkg.priceSol),
      receivedLamports: 0,
      paymentSignatures: [],
      lastPaymentAt: null,
      sweepStatus: "pending",
      sweepSignature: null,
      sweptLamports: 0,
      lastSweepAt: null,
      sweepError: null,
    };

    tx.set(jobsCollection().doc(jobId), job);
    return job;
  });
}

export async function createX402PaidJob(input: {
  wallet: string;
  packageType: PackageType;
  transaction: string;
}): Promise<JobDocument> {
  const pkg = getPackageConfig(input.packageType);
  const jobId = randomUUID();
  const createdAt = nowIso();
  const paymentAddress = getRevenueWalletAddress();

  const job: JobDocument = {
    jobId,
    wallet: input.wallet,
    requestKind: "wallet_recap",
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "payment_confirmed",
    progress: "payment_confirmed",
    txSignature: input.transaction,
    createdAt,
    updatedAt: createdAt,
    errorCode: null,
    errorMessage: null,
    paymentMethod: "x402_usdc",
    paymentCurrency: "USDC",
    paymentNetwork: "solana",
    x402Transaction: input.transaction,
    discountCode: null,
    paymentWaived: false,
    paymentAddress,
    paymentIndex: null,
    paymentRouting: "x402",
    requiredLamports: 0,
    receivedLamports: 0,
    paymentSignatures: input.transaction ? [input.transaction] : [],
    lastPaymentAt: createdAt,
    sweepStatus: "swept",
    sweepSignature: input.transaction,
    sweptLamports: 0,
    lastSweepAt: createdAt,
    sweepError: null,
  };

  await jobsCollection().doc(jobId).set(job);
  await upsertDispatchOutboxPending(jobId);
  return job;
}

export async function createTokenVideoJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();

  return getDb().runTransaction(async (tx) => {
    const createdAt = nowIso();
    const counterRef = paymentCounterCollection().doc("payment_counter");
    const counterSnap = await tx.get(counterRef);
    const currentCounter = counterSnap.exists
      ? (counterSnap.data()?.nextPaymentIndex as number | undefined)
      : undefined;
    const paymentIndex =
      typeof currentCounter === "number" && Number.isInteger(currentCounter) && currentCounter > 0
        ? currentCounter
        : 1;

    const paymentAddress = derivePaymentAddress(paymentIndex);

    tx.set(
      counterRef,
      {
        nextPaymentIndex: paymentIndex + 1,
        updatedAt: createdAt,
      },
      { merge: true },
    );

    const job: JobDocument = {
      jobId,
      wallet: input.tokenAddress,
      requestKind: "token_video",
      pricingMode: input.pricingMode ?? "legacy",
      visibility: input.visibility ?? "public",
      experience: input.experience ?? "legacy",
      moderationStatus: "visible",
      creatorId: input.creatorId ?? null,
      creatorEmail: input.creatorEmail ?? null,
      subjectAddress: input.tokenAddress,
      subjectChain: input.subjectChain,
      subjectName: input.subjectName ?? null,
      subjectSymbol: input.subjectSymbol ?? null,
      subjectImage: input.subjectImage ?? null,
      subjectDescription: input.subjectDescription ?? null,
      stylePreset: input.stylePreset ?? null,
      requestedPrompt: input.requestedPrompt ?? null,
      audioEnabled: input.audioEnabled ?? false,
      packageType: pkg.packageType,
      rangeDays: pkg.rangeDays,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      status: "awaiting_payment",
      progress: "awaiting_payment",
      txSignature: null,
      createdAt,
      updatedAt: createdAt,
      errorCode: null,
      errorMessage: null,
      paymentMethod: "sol_dedicated_address",
      paymentCurrency: "SOL",
      paymentNetwork: "solana",
      x402Transaction: null,
      discountCode: null,
      paymentWaived: false,
      paymentAddress,
      paymentIndex,
      paymentRouting: "dedicated_address",
      requiredLamports: solToLamports(pkg.priceSol),
      receivedLamports: 0,
      paymentSignatures: [],
      lastPaymentAt: null,
      sweepStatus: "pending",
      sweepSignature: null,
      sweptLamports: 0,
      lastSweepAt: null,
      sweepError: null,
    };

    tx.set(jobsCollection().doc(jobId), job);
    return job;
  });
}

export async function createX402PaidTokenVideoJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  transaction: string;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const createdAt = nowIso();
  const paymentAddress = getRevenueWalletAddress();

  const job: JobDocument = {
    jobId,
    wallet: input.tokenAddress,
    requestKind: "token_video",
    pricingMode: input.pricingMode ?? "legacy",
    visibility: input.visibility ?? "public",
    experience: input.experience ?? "legacy",
    moderationStatus: "visible",
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectAddress: input.tokenAddress,
    subjectChain: input.subjectChain,
    subjectName: input.subjectName ?? null,
    subjectSymbol: input.subjectSymbol ?? null,
    subjectImage: input.subjectImage ?? null,
    subjectDescription: input.subjectDescription ?? null,
    stylePreset: input.stylePreset ?? null,
    requestedPrompt: input.requestedPrompt ?? null,
    audioEnabled: input.audioEnabled ?? false,
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "payment_confirmed",
    progress: "payment_confirmed",
    txSignature: input.transaction,
    createdAt,
    updatedAt: createdAt,
    errorCode: null,
    errorMessage: null,
    paymentMethod: "x402_usdc",
    paymentCurrency: "USDC",
    paymentNetwork: "solana",
    x402Transaction: input.transaction,
    discountCode: null,
    paymentWaived: false,
    paymentAddress,
    paymentIndex: null,
    paymentRouting: "x402",
    requiredLamports: 0,
    receivedLamports: 0,
    paymentSignatures: input.transaction ? [input.transaction] : [],
    lastPaymentAt: createdAt,
    sweepStatus: "swept",
    sweepSignature: input.transaction,
    sweptLamports: 0,
    lastSweepAt: createdAt,
    sweepError: null,
  };

  await jobsCollection().doc(jobId).set(job);
  await upsertDispatchOutboxPending(jobId);
  return job;
}

export async function createPromptVideoJob(input: {
  requestKind:
    | "generic_cinema"
    | "bedtime_story"
    | "music_video"
    | "scene_recreation";
  packageType: PackageType;
  subjectName: string;
  subjectDescription?: string | null;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();

  return getDb().runTransaction(async (tx) => {
    const createdAt = nowIso();
    const counterRef = paymentCounterCollection().doc("payment_counter");
    const counterSnap = await tx.get(counterRef);
    const currentCounter = counterSnap.exists
      ? (counterSnap.data()?.nextPaymentIndex as number | undefined)
      : undefined;
    const paymentIndex =
      typeof currentCounter === "number" && Number.isInteger(currentCounter) && currentCounter > 0
        ? currentCounter
        : 1;

    const paymentAddress = derivePaymentAddress(paymentIndex);

    tx.set(
      counterRef,
      {
        nextPaymentIndex: paymentIndex + 1,
        updatedAt: createdAt,
      },
      { merge: true },
    );

    const job: JobDocument = {
      jobId,
      wallet: `${input.requestKind}:${jobId}`,
      requestKind: input.requestKind,
      pricingMode: input.pricingMode ?? "public",
      visibility: input.visibility ?? "public",
      experience: input.experience ?? "hypercinema",
      moderationStatus: "visible",
      creatorId: input.creatorId ?? null,
      creatorEmail: input.creatorEmail ?? null,
      subjectName: input.subjectName.trim(),
      subjectDescription: input.subjectDescription?.trim() || null,
      sourceMediaUrl: input.sourceMediaUrl?.trim() || null,
      sourceEmbedUrl: input.sourceEmbedUrl?.trim() || null,
      sourceMediaProvider: input.sourceMediaProvider?.trim() || null,
      sourceTranscript: input.sourceTranscript?.trim() || null,
      stylePreset: input.stylePreset ?? null,
      requestedPrompt: input.requestedPrompt?.trim() || null,
      audioEnabled:
        typeof input.audioEnabled === "boolean"
          ? input.audioEnabled
          : input.requestKind === "bedtime_story" ||
              input.requestKind === "music_video" ||
              input.requestKind === "scene_recreation",
      packageType: pkg.packageType,
      rangeDays: pkg.rangeDays,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      status: "awaiting_payment",
      progress: "awaiting_payment",
      txSignature: null,
      createdAt,
      updatedAt: createdAt,
      errorCode: null,
      errorMessage: null,
      paymentMethod: "sol_dedicated_address",
      paymentCurrency: "SOL",
      paymentNetwork: "solana",
      x402Transaction: null,
      discountCode: null,
      paymentWaived: false,
      paymentAddress,
      paymentIndex,
      paymentRouting: "dedicated_address",
      requiredLamports: solToLamports(pkg.priceSol),
      receivedLamports: 0,
      paymentSignatures: [],
      lastPaymentAt: null,
      sweepStatus: "pending",
      sweepSignature: null,
      sweptLamports: 0,
      lastSweepAt: null,
      sweepError: null,
    };

    tx.set(jobsCollection().doc(jobId), job);
    return job;
  });
}

function createDiscountWaivedJobRecord(input: {
  jobId: string;
  wallet: string;
  requestKind: JobDocument["requestKind"];
  packageType: PackageType;
  rangeDays: number;
  priceSol: number;
  priceUsdc: number;
  videoSeconds: number;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  subjectAddress?: string | null;
  subjectChain?: SupportedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  discountCode: DiscountCode;
}): JobDocument {
  const createdAt = nowIso();
  return {
    jobId: input.jobId,
    wallet: input.wallet,
    requestKind: input.requestKind,
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience: input.experience ?? "hypercinema",
    moderationStatus: "visible",
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectAddress: input.subjectAddress ?? undefined,
    subjectChain: input.subjectChain ?? null,
    subjectName: input.subjectName ?? null,
    subjectSymbol: input.subjectSymbol ?? null,
    subjectImage: input.subjectImage ?? null,
    subjectDescription: input.subjectDescription ?? null,
    sourceMediaUrl: input.sourceMediaUrl ?? null,
    sourceEmbedUrl: input.sourceEmbedUrl ?? null,
    sourceMediaProvider: input.sourceMediaProvider ?? null,
    sourceTranscript: input.sourceTranscript ?? null,
    stylePreset: input.stylePreset ?? null,
    requestedPrompt: input.requestedPrompt ?? null,
    audioEnabled: input.audioEnabled ?? false,
    packageType: input.packageType,
    rangeDays: input.rangeDays,
    priceSol: input.priceSol,
    priceUsdc: input.priceUsdc,
    videoSeconds: input.videoSeconds,
    status: "payment_confirmed",
    progress: "payment_confirmed",
    txSignature: null,
    createdAt,
    updatedAt: createdAt,
    errorCode: null,
    errorMessage: null,
    paymentMethod: "discount_code",
    paymentCurrency: "SOL",
    paymentNetwork: "solana",
    x402Transaction: null,
    discountCode: input.discountCode,
    paymentWaived: true,
    paymentAddress: "",
    paymentIndex: null,
    paymentRouting: "discount_code",
    requiredLamports: 0,
    receivedLamports: 0,
    paymentSignatures: [],
    lastPaymentAt: createdAt,
    sweepStatus: "swept",
    sweepSignature: null,
    sweptLamports: 0,
    lastSweepAt: createdAt,
    sweepError: null,
  };
}

export async function createDiscountWaivedTokenVideoJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
  discountCode: string;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();

  return getDb().runTransaction(async (tx) => {
    const code = await claimDiscountCodeInTransaction({
      tx,
      code: input.discountCode,
      jobId,
      action: "job_create",
    });

    const job = createDiscountWaivedJobRecord({
      jobId,
      wallet: input.tokenAddress,
      requestKind: "token_video",
      packageType: pkg.packageType,
      rangeDays: pkg.rangeDays,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      pricingMode: input.pricingMode ?? "legacy",
      visibility: input.visibility ?? "public",
      experience: input.experience ?? "legacy",
      creatorId: input.creatorId ?? null,
      creatorEmail: input.creatorEmail ?? null,
      subjectAddress: input.tokenAddress,
      subjectChain: input.subjectChain,
      subjectName: input.subjectName ?? null,
      subjectSymbol: input.subjectSymbol ?? null,
      subjectImage: input.subjectImage ?? null,
      subjectDescription: input.subjectDescription ?? null,
      stylePreset: input.stylePreset ?? null,
      requestedPrompt: input.requestedPrompt ?? null,
      audioEnabled: input.audioEnabled ?? false,
      discountCode: code,
    });

    tx.set(jobsCollection().doc(jobId), job);
    tx.set(
      dispatchOutboxCollection().doc(jobId),
      {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: job.createdAt,
        lockUntil: null,
        lastError: null,
        createdAt: job.createdAt,
        updatedAt: job.createdAt,
        dispatchedAt: null,
      } satisfies JobDispatchOutboxDocument,
    );
    return job;
  });
}

export async function createDiscountWaivedPromptVideoJob(input: {
  requestKind:
    | "generic_cinema"
    | "bedtime_story"
    | "music_video"
    | "scene_recreation";
  packageType: PackageType;
  subjectName: string;
  subjectDescription?: string | null;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
  discountCode: string;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();

  return getDb().runTransaction(async (tx) => {
    const code = await claimDiscountCodeInTransaction({
      tx,
      code: input.discountCode,
      jobId,
      action: "job_create",
    });

    const job = createDiscountWaivedJobRecord({
      jobId,
      wallet: `${input.requestKind}:${jobId}`,
      requestKind: input.requestKind,
      packageType: pkg.packageType,
      rangeDays: pkg.rangeDays,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      pricingMode: input.pricingMode ?? "public",
      visibility: input.visibility ?? "public",
      experience: input.experience ?? "hypercinema",
      creatorId: input.creatorId ?? null,
      creatorEmail: input.creatorEmail ?? null,
      subjectName: input.subjectName.trim(),
      subjectDescription: input.subjectDescription?.trim() || null,
      sourceMediaUrl: input.sourceMediaUrl?.trim() || null,
      sourceEmbedUrl: input.sourceEmbedUrl?.trim() || null,
      sourceMediaProvider: input.sourceMediaProvider?.trim() || null,
      sourceTranscript: input.sourceTranscript?.trim() || null,
      stylePreset: input.stylePreset ?? null,
      requestedPrompt: input.requestedPrompt?.trim() || null,
      audioEnabled:
        typeof input.audioEnabled === "boolean"
          ? input.audioEnabled
          : input.requestKind === "bedtime_story" ||
            input.requestKind === "music_video" ||
            input.requestKind === "scene_recreation",
      discountCode: code,
    });

    tx.set(jobsCollection().doc(jobId), job);
    tx.set(
      dispatchOutboxCollection().doc(jobId),
      {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: job.createdAt,
        lockUntil: null,
        lastError: null,
        createdAt: job.createdAt,
        updatedAt: job.createdAt,
        dispatchedAt: null,
      } satisfies JobDispatchOutboxDocument,
    );
    return job;
  });
}

export async function applyDiscountCodeToJob(input: {
  jobId: string;
  discountCode: string;
}): Promise<JobDocument> {
  return getDb().runTransaction(async (tx) => {
    const ref = jobsCollection().doc(input.jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error(`Job ${input.jobId} not found`);
    }

    const current = normalizeJobDocument(snap.data() as JobDocument);
    if (current.paymentWaived || current.paymentMethod === "discount_code") {
      return current;
    }

    if (current.status !== "awaiting_payment" && current.status !== "payment_detected") {
      throw new Error("Discount codes can only be applied before payment is confirmed.");
    }

    const code = await claimDiscountCodeInTransaction({
      tx,
      code: input.discountCode,
      jobId: input.jobId,
      action: "job_redeem",
    });

    const now = nowIso();
    const updated: JobDocument = {
      ...current,
      status: "payment_confirmed",
      progress: "payment_confirmed",
      txSignature: null,
      paymentMethod: "discount_code",
      paymentCurrency: "SOL",
      paymentNetwork: "solana",
      x402Transaction: null,
      discountCode: code,
      paymentWaived: true,
      paymentRouting: "discount_code",
      requiredLamports: 0,
      receivedLamports: 0,
      paymentSignatures: [],
      lastPaymentAt: now,
      sweepStatus: "swept",
      sweepSignature: null,
      sweptLamports: 0,
      lastSweepAt: now,
      sweepError: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: now,
    };

    tx.set(ref, updated, { merge: true });
    tx.set(
      dispatchOutboxCollection().doc(input.jobId),
      {
        jobId: input.jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lockUntil: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        dispatchedAt: null,
      } satisfies JobDispatchOutboxDocument,
    );

    return updated;
  });
}

export async function getJob(jobId: string): Promise<JobDocument | null> {
  const doc = await jobsCollection().doc(jobId).get();
  if (!doc.exists) {
    return null;
  }
  return normalizeJobDocument(doc.data() as JobDocument);
}

const REUSABLE_JOB_STATUSES = new Set<JobStatus>([
  "awaiting_payment",
  "payment_detected",
  "payment_confirmed",
  "processing",
]);

export async function findRecentReusableJob(input: {
  wallet: string;
  packageType: PackageType;
  maxAgeMinutes?: number;
}): Promise<JobDocument | null> {
  const maxAgeMinutes = Math.max(1, Math.floor(input.maxAgeMinutes ?? 20));
  const thresholdMs = Date.now() - maxAgeMinutes * 60_000;

  const snapshot = await jobsCollection()
    .where("wallet", "==", input.wallet)
    .limit(50)
    .get();

  const candidates = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .sort((a, b) => isoToMs(b.createdAt) - isoToMs(a.createdAt));

  for (const job of candidates) {
    if (job.packageType !== input.packageType) {
      continue;
    }
    if (!REUSABLE_JOB_STATUSES.has(job.status)) {
      continue;
    }
    if (isoToMs(job.createdAt) < thresholdMs) {
      continue;
    }
    return job;
  }

  return null;
}

export async function findRecentReusableTokenJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  maxAgeMinutes?: number;
}): Promise<JobDocument | null> {
  const maxAgeMinutes = Math.max(1, Math.floor(input.maxAgeMinutes ?? 20));
  const thresholdMs = Date.now() - maxAgeMinutes * 60_000;

  const snapshot = await jobsCollection()
    .where("wallet", "==", input.tokenAddress)
    .limit(50)
    .get();

  const candidates = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .sort((a, b) => isoToMs(b.createdAt) - isoToMs(a.createdAt));

  for (const job of candidates) {
    if (job.requestKind !== "token_video") {
      continue;
    }
    if (job.packageType !== input.packageType) {
      continue;
    }
    if (job.subjectChain !== input.subjectChain) {
      continue;
    }
    if ((job.stylePreset ?? null) !== (input.stylePreset ?? null)) {
      continue;
    }
    if ((job.requestedPrompt ?? null) !== (input.requestedPrompt ?? null)) {
      continue;
    }
    if (!REUSABLE_JOB_STATUSES.has(job.status)) {
      continue;
    }
    if (isoToMs(job.createdAt) < thresholdMs) {
      continue;
    }
    return job;
  }

  return null;
}

export async function rollbackUnpaidJob(jobId: string): Promise<{
  rolledBack: boolean;
  job: JobDocument | null;
}> {
  return getDb().runTransaction(async (tx) => {
    const ref = jobsCollection().doc(jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return {
        rolledBack: false,
        job: null,
      };
    }

    const current = normalizeJobDocument(snap.data() as JobDocument);
    const isUnpaidAwaitingJob =
      current.status === "awaiting_payment" &&
      current.receivedLamports <= 0 &&
      current.paymentSignatures.length === 0 &&
      !current.txSignature;

    if (!isUnpaidAwaitingJob) {
      return {
        rolledBack: false,
        job: current,
      };
    }

    tx.delete(ref);
    return {
      rolledBack: true,
      job: null,
    };
  });
}

export async function getJobByPaymentAddress(
  paymentAddress: string,
): Promise<JobDocument | null> {
  const snapshot = await jobsCollection()
    .where("paymentAddress", "==", paymentAddress)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return normalizeJobDocument(snapshot.docs[0]!.data() as JobDocument);
}

export async function listSweepCandidateJobs(limit: number): Promise<JobDocument[]> {
  const queryLimit = Math.max(limit * 2, limit);
  const [pendingSnapshot, failedSnapshot] = await Promise.all([
    jobsCollection()
      .where("paymentRouting", "==", "dedicated_address")
      .where("sweepStatus", "==", "pending")
      .orderBy("lastSweepAt", "asc")
      .limit(queryLimit)
      .get(),
    jobsCollection()
      .where("paymentRouting", "==", "dedicated_address")
      .where("sweepStatus", "==", "failed")
      .orderBy("lastSweepAt", "asc")
      .limit(queryLimit)
      .get(),
  ]);

  const seen = new Set<string>();
  return [...pendingSnapshot.docs, ...failedSnapshot.docs]
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .filter((job) => {
      if (seen.has(job.jobId)) {
        return false;
      }
      seen.add(job.jobId);
      return !!job.paymentAddress && !!job.paymentIndex && isSweepEligibleStatus(job.status);
    })
    .sort((a, b) => isoToMs(a.lastSweepAt) - isoToMs(b.lastSweepAt))
    .slice(0, limit);
}

export async function getReport(jobId: string): Promise<ReportDocument | null> {
  const doc = await reportsCollection().doc(jobId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as ReportDocument;
}

export async function getVideo(jobId: string): Promise<VideoDocument | null> {
  const doc = await videosCollection().doc(jobId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as VideoDocument;
}

export async function getInternalVideoRender(
  jobId: string,
): Promise<InternalVideoRenderDocument | null> {
  const doc = await videoRendersCollection().doc(jobId).get();
  if (!doc.exists) {
    return null;
  }

  const raw = doc.data() as Partial<InternalVideoRenderDocument>;
  return {
    id: raw.id ?? jobId,
    jobId: raw.jobId ?? jobId,
    status:
      raw.status === "processing" ||
      raw.status === "ready" ||
      raw.status === "failed"
        ? raw.status
        : "queued",
    renderStatus:
      raw.renderStatus === "processing" ||
      raw.renderStatus === "ready" ||
      raw.renderStatus === "failed"
        ? raw.renderStatus
        : "queued",
    videoUrl: raw.videoUrl ?? null,
    thumbnailUrl: raw.thumbnailUrl ?? null,
    error: raw.error ?? null,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
    startedAt: raw.startedAt ?? null,
    completedAt: raw.completedAt ?? null,
  };
}

export async function getJobArtifacts(jobId: string): Promise<{
  job: JobDocument | null;
  report: ReportDocument | null;
  video: VideoDocument | null;
}> {
  const [job, report, video] = await Promise.all([
    getJob(jobId),
    getReport(jobId),
    getVideo(jobId),
  ]);
  return { job, report, video };
}

export async function listCompletedJobArtifacts(
  limit: number,
): Promise<Array<{ job: JobDocument; report: ReportDocument | null; video: VideoDocument | null }>> {
  const baseLimit = Math.max(1, Math.floor(limit));
  const queryLimit = Math.max(baseLimit * 6, baseLimit);
  const snapshot = await jobsCollection()
    .where("status", "==", "complete")
    .limit(queryLimit)
    .get();

  const jobs = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .filter((job) => job.visibility !== "private" && job.moderationStatus !== "hidden")
    .sort((a, b) => isoToMs(b.updatedAt) - isoToMs(a.updatedAt))
    .slice(0, baseLimit);

  const artifacts = await Promise.all(
    jobs.map(async (job) => {
      const [report, video] = await Promise.all([
        getReport(job.jobId),
        getVideo(job.jobId),
      ]);
      return { job, report, video };
    }),
  );

  return artifacts;
}

export async function listCompletedJobArtifactsByWallet(
  wallet: string,
  limit: number,
): Promise<Array<{ job: JobDocument; report: ReportDocument | null; video: VideoDocument | null }>> {
  const baseLimit = Math.max(1, Math.floor(limit));
  const trimmed = wallet.trim();
  if (!trimmed) return [];

  const snapshot = await jobsCollection()
    .where("status", "==", "complete")
    .where("wallet", "==", trimmed)
    .limit(baseLimit)
    .get();

  const jobs = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .filter((job) => job.visibility !== "private" && job.moderationStatus !== "hidden")
    .sort((a, b) => isoToMs(b.updatedAt) - isoToMs(a.updatedAt))
    .slice(0, baseLimit);

  const artifacts = await Promise.all(
    jobs.map(async (job) => {
      const [report, video] = await Promise.all([
        getReport(job.jobId),
        getVideo(job.jobId),
      ]);
      return { job, report, video };
    }),
  );

  return artifacts;
}

export async function listCompletedPrivateJobArtifactsByCreator(
  creatorId: string,
  limit: number,
): Promise<Array<{ job: JobDocument; report: ReportDocument | null; video: VideoDocument | null }>> {
  const baseLimit = Math.max(1, Math.floor(limit));
  const trimmed = creatorId.trim();
  if (!trimmed) return [];

  const snapshot = await jobsCollection()
    .where("status", "==", "complete")
    .where("creatorId", "==", trimmed)
    .limit(Math.max(baseLimit * 4, baseLimit))
    .get();

  const jobs = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .filter((job) => job.visibility === "private")
    .sort((a, b) => isoToMs(b.updatedAt) - isoToMs(a.updatedAt))
    .slice(0, baseLimit);

  return Promise.all(
    jobs.map(async (job) => {
      const [report, video] = await Promise.all([
        getReport(job.jobId),
        getVideo(job.jobId),
      ]);
      return { job, report, video };
    }),
  );
}

export async function listModerationJobArtifacts(
  limit: number,
): Promise<Array<{ job: JobDocument; report: ReportDocument | null; video: VideoDocument | null }>> {
  const baseLimit = Math.max(1, Math.floor(limit));
  const snapshot = await jobsCollection()
    .where("status", "==", "complete")
    .limit(Math.max(baseLimit * 6, baseLimit))
    .get();

  const jobs = snapshot.docs
    .map((doc) => normalizeJobDocument(doc.data() as JobDocument))
    .sort((a, b) => isoToMs(b.updatedAt) - isoToMs(a.updatedAt))
    .slice(0, baseLimit);

  return Promise.all(
    jobs.map(async (job) => {
      const [report, video] = await Promise.all([
        getReport(job.jobId),
        getVideo(job.jobId),
      ]);
      return { job, report, video };
    }),
  );
}

export async function updateJobModeration(
  jobId: string,
  moderationStatus: JobDocument["moderationStatus"],
): Promise<void> {
  await updateJob(jobId, {
    moderationStatus:
      moderationStatus === "flagged" || moderationStatus === "hidden"
        ? moderationStatus
        : "visible",
  });
}

export async function updateJob(
  jobId: string,
  patch: Partial<Omit<JobDocument, "jobId" | "createdAt">>,
): Promise<void> {
  await jobsCollection()
    .doc(jobId)
    .set(
      {
        ...patch,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  patch?: Partial<Omit<JobDocument, "jobId" | "status" | "createdAt">>,
): Promise<JobDocument> {
  return getDb().runTransaction(async (tx) => {
    const ref = jobsCollection().doc(jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error(`Job ${jobId} not found`);
    }

    const current = normalizeJobDocument(snap.data() as JobDocument);
    if (current.status !== nextStatus) {
      assertTransition(current.status, nextStatus);
    }

    const updated: JobDocument = {
      ...current,
      ...patch,
      status: nextStatus,
      progress:
        patch?.progress ??
        (nextStatus === "processing" ? "fetching_transactions" : nextStatus),
      updatedAt: nowIso(),
      jobId,
    };

    tx.set(ref, updated, { merge: true });
    return updated;
  });
}

export async function updateJobProgress(
  jobId: string,
  progress: JobProgress,
): Promise<void> {
  await updateJob(jobId, { progress });
}

export async function markPaymentDetected(
  jobId: string,
  txSignature: string,
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  if (job.status === "awaiting_payment") {
    await updateJobStatus(jobId, "payment_detected", {
      txSignature,
      progress: "payment_detected",
      lastPaymentAt: nowIso(),
    });
    return;
  }

  if (job.status === "payment_detected" && !job.txSignature) {
    await updateJob(jobId, {
      txSignature,
      progress: "payment_detected",
      lastPaymentAt: nowIso(),
    });
  }
}

export async function markPaymentConfirmed(
  jobId: string,
  txSignature: string,
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  if (job.status === "payment_confirmed" || job.status === "processing") {
    return;
  }

  if (job.status === "awaiting_payment") {
    await updateJobStatus(jobId, "payment_detected", {
      txSignature,
      progress: "payment_detected",
      lastPaymentAt: nowIso(),
    });
    await updateJobStatus(jobId, "payment_confirmed", {
      txSignature,
      progress: "payment_confirmed",
      lastPaymentAt: nowIso(),
    });
    await upsertDispatchOutboxPending(jobId);
    return;
  }

  if (job.status === "payment_detected") {
    await updateJobStatus(jobId, "payment_confirmed", {
      txSignature,
      progress: "payment_confirmed",
      lastPaymentAt: nowIso(),
    });
    await upsertDispatchOutboxPending(jobId);
  }
}

export async function applyConfirmedPayment(input: {
  jobId: string;
  signature: string;
  lamports: number;
}): Promise<{
  job: JobDocument | null;
  duplicate: boolean;
  newlyConfirmed: boolean;
}> {
  return getDb().runTransaction(async (tx) => {
    const ref = jobsCollection().doc(input.jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return {
        job: null,
        duplicate: false,
        newlyConfirmed: false,
      };
    }

    const current = normalizeJobDocument(snap.data() as JobDocument);
    const settlement = applyPaymentSettlement(
      {
        status: current.status,
        requiredLamports: current.requiredLamports,
        receivedLamports: current.receivedLamports,
        paymentSignatures: current.paymentSignatures,
        txSignature: current.txSignature,
      },
      {
        signature: input.signature,
        lamports: input.lamports,
      },
    );

    if (settlement.duplicate) {
      return {
        job: current,
        duplicate: true,
        newlyConfirmed: false,
      };
    }

    if (current.status !== settlement.next.status) {
      assertTransition(current.status, settlement.next.status);
    }

    const nextProgress: JobProgress =
      settlement.next.status === "payment_confirmed"
        ? "payment_confirmed"
        : settlement.next.status === "payment_detected"
          ? "payment_detected"
          : current.progress;

    const updated: JobDocument = {
      ...current,
      status: settlement.next.status,
      progress: nextProgress,
      txSignature: settlement.next.txSignature,
      requiredLamports: settlement.next.requiredLamports,
      receivedLamports: settlement.next.receivedLamports,
      paymentSignatures: settlement.next.paymentSignatures,
      lastPaymentAt: nowIso(),
      sweepStatus: "pending",
      sweepError: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: nowIso(),
    };

    tx.set(ref, updated, { merge: true });

    if (settlement.newlyConfirmed) {
      const createdAt = nowIso();
      tx.set(dispatchOutboxCollection().doc(input.jobId), {
        jobId: input.jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: createdAt,
        lockUntil: null,
        lastError: null,
        createdAt,
        updatedAt: createdAt,
        dispatchedAt: null,
      } satisfies JobDispatchOutboxDocument);
    }

    return {
      job: updated,
      duplicate: false,
      newlyConfirmed: settlement.newlyConfirmed,
    };
  });
}

export type FailedJobRetryPreparationResult =
  | { status: "ready"; job: JobDocument }
  | { status: "already_processing"; job: JobDocument }
  | { status: "job_not_found" }
  | { status: "job_not_failed"; job: JobDocument }
  | { status: "payment_incomplete"; job: JobDocument };

export async function prepareFailedJobForRetry(
  jobId: string,
): Promise<FailedJobRetryPreparationResult> {
  return getDb().runTransaction(async (tx) => {
    const jobRef = jobsCollection().doc(jobId);
    const outboxRef = dispatchOutboxCollection().doc(jobId);
    const renderRef = videoRendersCollection().doc(jobId);
    const jobSnap = await tx.get(jobRef);
    const outboxSnap = await tx.get(outboxRef);
    const renderSnap = await tx.get(renderRef);
    if (!jobSnap.exists) {
      return { status: "job_not_found" };
    }

    const current = normalizeJobDocument(jobSnap.data() as JobDocument);
    if (current.status !== "failed") {
      return {
        status: "job_not_failed",
        job: current,
      };
    }

    if (current.receivedLamports < current.requiredLamports) {
      return {
        status: "payment_incomplete",
        job: current,
      };
    }

    const render = renderSnap.exists
      ? ((renderSnap.data() as Partial<InternalVideoRenderDocument>) ?? null)
      : null;
    const renderStatus =
      render?.status === "processing" ||
      render?.status === "ready" ||
      render?.status === "failed"
        ? render.status
        : render?.renderStatus === "processing" ||
            render?.renderStatus === "ready" ||
            render?.renderStatus === "failed"
          ? render.renderStatus
          : "queued";

    if (renderStatus === "processing" || renderStatus === "queued") {
      const now = nowIso();
      const resumed: JobDocument = {
        ...current,
        status: "processing",
        progress: "generating_video",
        errorCode: null,
        errorMessage: null,
        updatedAt: now,
      };

      tx.set(jobRef, resumed, { merge: true });
      return {
        status: "already_processing",
        job: resumed,
      };
    }

    const now = nowIso();
    const updated: JobDocument = {
      ...current,
      status: "payment_confirmed",
      progress: "payment_confirmed",
      errorCode: null,
      errorMessage: null,
      updatedAt: now,
    };
    const existing = outboxSnap.exists
      ? normalizeDispatchOutboxDocument(
          jobId,
          outboxSnap.data() as Partial<JobDispatchOutboxDocument>,
        )
      : null;

    tx.set(jobRef, updated, { merge: true });

    tx.set(
      outboxRef,
      {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lockUntil: null,
        lastError: null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        dispatchedAt: null,
      } satisfies JobDispatchOutboxDocument,
      { merge: true },
    );

    return {
      status: "ready",
      job: updated,
    };
  });
}

export async function markSweepResult(input: {
  jobId: string;
  status: "pending" | "swept" | "failed";
  signature?: string | null;
  sweptLamportsDelta?: number;
  error?: string | null;
}): Promise<void> {
  const current = await getJob(input.jobId);
  if (!current) {
    return;
  }

  const nextSweptLamports =
    current.sweptLamports + Math.max(0, Math.floor(input.sweptLamportsDelta ?? 0));

  await updateJob(input.jobId, {
    sweepStatus: input.status,
    sweepSignature: input.signature ?? current.sweepSignature,
    sweptLamports: nextSweptLamports,
    lastSweepAt: nowIso(),
    sweepError: input.error ?? null,
  });
}

export async function markJobFailed(
  jobId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  if (job.status === "failed") {
    await updateJob(jobId, { errorCode, errorMessage, progress: "failed" });
    return;
  }

  if (job.status === "complete") {
    throw new Error(`Cannot mark completed job ${jobId} as failed`);
  }

  await updateJobStatus(jobId, "failed", {
    errorCode,
    errorMessage,
    progress: "failed",
  });
}

export async function beginJobProcessing(
  jobId: string,
  options?: { staleAfterMs?: number },
): Promise<{
  acquired: boolean;
  job: JobDocument | null;
}> {
  return getDb().runTransaction(async (tx) => {
    const ref = jobsCollection().doc(jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return {
        acquired: false,
        job: null,
      };
    }

    const current = normalizeJobDocument(snap.data() as JobDocument);
    if (current.status === "complete" || current.status === "failed") {
      return {
        acquired: false,
        job: current,
      };
    }

    const staleAfterMs = Math.max(30_000, options?.staleAfterMs ?? 120_000);
    const currentUpdatedAtMs = isoToMs(current.updatedAt);
    const processingLeaseIsFresh =
      current.status === "processing" &&
      currentUpdatedAtMs > 0 &&
      Date.now() - currentUpdatedAtMs < staleAfterMs;

    if (processingLeaseIsFresh) {
      return {
        acquired: false,
        job: current,
      };
    }

    if (current.status !== "payment_confirmed" && current.status !== "processing") {
      throw new Error(`Job ${jobId} cannot enter processing from ${current.status}`);
    }

    if (current.status === "payment_confirmed") {
      assertTransition(current.status, "processing");
    }

    const updated: JobDocument = {
      ...current,
      status: "processing",
      progress:
        current.progress === "complete" || current.progress === "failed"
          ? "fetching_transactions"
          : current.progress,
      updatedAt: nowIso(),
      errorCode: null,
      errorMessage: null,
    };

    tx.set(ref, updated, { merge: true });
    return {
      acquired: true,
      job: updated,
    };
  });
}

async function tryClaimDispatchJob(jobId: string): Promise<JobDispatchOutboxDocument | null> {
  return getDb().runTransaction(async (tx) => {
    const now = new Date();
    const nowTime = now.getTime();
    const ref = dispatchOutboxCollection().doc(jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return null;
    }

    const current = normalizeDispatchOutboxDocument(
      jobId,
      snap.data() as Partial<JobDispatchOutboxDocument>,
    );

    if (current.status === "dispatched") {
      return null;
    }

    if (current.status === "in_progress" && isoToMs(current.lockUntil) > nowTime) {
      return null;
    }

    if (current.status === "pending" && isoToMs(current.nextAttemptAt) > nowTime) {
      return null;
    }

    const updated: JobDispatchOutboxDocument = {
      ...current,
      status: "in_progress",
      lockUntil: new Date(nowTime + 2 * 60_000).toISOString(),
      updatedAt: now.toISOString(),
    };

    tx.set(ref, updated, { merge: true });
    return updated;
  });
}

export async function claimDispatchJob(jobId: string): Promise<JobDispatchOutboxDocument | null> {
  return tryClaimDispatchJob(jobId);
}

export async function claimDueDispatchJobs(limit: number): Promise<JobDispatchOutboxDocument[]> {
  const queryLimit = Math.max(limit * 3, limit);
  const snapshot = await dispatchOutboxCollection()
    .where("status", "in", ["pending", "in_progress"])
    .limit(queryLimit)
    .get();

  const candidates = snapshot.docs
    .map((doc) =>
      normalizeDispatchOutboxDocument(
        doc.id,
        doc.data() as Partial<JobDispatchOutboxDocument>,
      ),
    )
    .sort((a, b) => isoToMs(a.nextAttemptAt) - isoToMs(b.nextAttemptAt));

  const claimed: JobDispatchOutboxDocument[] = [];
  for (const candidate of candidates) {
    if (claimed.length >= limit) break;
    const record = await tryClaimDispatchJob(candidate.jobId);
    if (record) {
      claimed.push(record);
    }
  }

  return claimed;
}

export async function markDispatchJobSuccess(jobId: string): Promise<void> {
  const now = nowIso();
  await dispatchOutboxCollection().doc(jobId).set(
    {
      status: "dispatched",
      lockUntil: null,
      updatedAt: now,
      dispatchedAt: now,
      lastError: null,
      nextAttemptAt: now,
    } satisfies Partial<JobDispatchOutboxDocument>,
    { merge: true },
  );
}

export async function rescheduleDispatchJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await getDb().runTransaction(async (tx) => {
    const now = new Date();
    const ref = dispatchOutboxCollection().doc(jobId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return;
    }

    const current = normalizeDispatchOutboxDocument(
      jobId,
      snap.data() as Partial<JobDispatchOutboxDocument>,
    );
    if (current.status === "dispatched") {
      return;
    }

    const attempts = current.attempts + 1;
    const nextAttemptAt = new Date(
      now.getTime() + computeDispatchRetryDelayMs(attempts),
    ).toISOString();

    tx.set(
      ref,
      {
        status: "pending",
        attempts,
        nextAttemptAt,
        lockUntil: null,
        lastError: errorMessage,
        updatedAt: now.toISOString(),
      } satisfies Partial<JobDispatchOutboxDocument>,
      { merge: true },
    );
  });
}

export async function upsertReport(report: ReportDocument): Promise<void> {
  await reportsCollection().doc(report.jobId).set(report, { merge: true });
}

export async function upsertVideo(video: VideoDocument): Promise<void> {
  await videosCollection().doc(video.jobId).set(video, { merge: true });
}

export async function getPumpMetadata(
  mint: string,
): Promise<PumpMetadataCacheDocument | null> {
  const doc = await metadataCollection().doc(mint).get();
  if (!doc.exists) return null;
  return doc.data() as PumpMetadataCacheDocument;
}

export async function upsertPumpMetadata(
  metadata: PumpMetadataCacheDocument,
): Promise<void> {
  await metadataCollection().doc(metadata.mint).set(metadata, { merge: true });
}
