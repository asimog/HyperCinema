import { db, PrismaClient, Prisma } from "@/lib/db";
import { assertTransition } from "@/lib/jobs/state-machine";
import { getPackageConfig } from "@/lib/packages";
import {
  type InternalVideoRenderDocument,
  type JobDocument,
  type JobProgress,
  type JobStatus,
  type PackageType,
  type PumpMetadataCacheDocument,
  type ReportDocument,
  type SupportedTokenChain,
  type VideoStyleId,
  type VideoDocument,
} from "@/lib/types/domain";
import { randomUUID } from "crypto";

function nowIso(): string {
  return new Date().toISOString();
}

const VALID_CINEMA_EXPERIENCES = new Set<
  NonNullable<JobDocument["experience"]>
>([
  "legacy",
  "hypercinema",
  "hyperm",
  "mythx",
  "trenchcinema",
  "funcinema",
  "familycinema",
  "musicvideo",
  "recreator",
  "hashmyth",
  "lovex",
]);

const EXPERIENCE_AUDIO_DEFAULTS: Partial<
  Record<NonNullable<JobDocument["experience"]>, boolean>
> = {
  legacy: false,
  hypercinema: false,
  hyperm: true,
  mythx: true,
  trenchcinema: true,
  funcinema: true,
  familycinema: true,
  musicvideo: true,
  recreator: true,
  hashmyth: true,
  lovex: true,
};

function isCinemaExperience(
  value: unknown,
): value is NonNullable<JobDocument["experience"]> {
  return (
    typeof value === "string" &&
    VALID_CINEMA_EXPERIENCES.has(
      value as NonNullable<JobDocument["experience"]>,
    )
  );
}

function resolveExperience(input: {
  experience?: JobDocument["experience"];
  requestKind?: JobDocument["requestKind"];
  visibility?: JobDocument["visibility"];
}): JobDocument["experience"] {
  if (isCinemaExperience(input.experience)) {
    return input.experience;
  }

  if (input.requestKind === "token_video") {
    return "hashmyth";
  }

  if (input.requestKind === "mythx") {
    return "mythx";
  }

  if (input.requestKind === "bedtime_story") {
    return "familycinema";
  }

  if (input.requestKind === "music_video") {
    return "musicvideo";
  }

  if (input.requestKind === "scene_recreation") {
    return "recreator";
  }

  if (input.requestKind === "generic_cinema") {
    return input.visibility === "private" ? "funcinema" : "hyperm";
  }

  return "legacy";
}

function resolveAudioEnabled(input: {
  audioEnabled?: boolean | null;
  requestKind?: JobDocument["requestKind"];
  experience?: JobDocument["experience"];
}): boolean {
  if (typeof input.audioEnabled === "boolean") {
    return input.audioEnabled;
  }

  if (isCinemaExperience(input.experience)) {
    const byExperience = EXPERIENCE_AUDIO_DEFAULTS[input.experience];
    if (typeof byExperience === "boolean") {
      return byExperience;
    }
  }

  if (input.requestKind === "token_video" || input.requestKind === "mythx") {
    return true;
  }

  if (
    input.requestKind === "bedtime_story" ||
    input.requestKind === "music_video" ||
    input.requestKind === "scene_recreation"
  ) {
    return true;
  }

  return false;
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

function buildJobDocument(input: {
  jobId: string;
  wallet: string;
  requestKind: JobDocument["requestKind"];
  packageType: PackageType;
  rangeDays: number;
  priceSol: number;
  priceUsdc: number;
  videoSeconds: number;
  status: JobStatus;
  progress: JobProgress;
  wallet_field?: string;
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
  paymentWaived?: boolean;
}): JobDocument {
  const createdAt = nowIso();
  const experience = resolveExperience({
    experience: input.experience,
    requestKind: input.requestKind,
    visibility: input.visibility ?? "public",
  });
  return {
    jobId: input.jobId,
    wallet: input.wallet,
    requestKind: input.requestKind,
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience,
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
    audioEnabled: resolveAudioEnabled({
      audioEnabled: input.audioEnabled,
      requestKind: input.requestKind,
      experience,
    }),
    packageType: input.packageType,
    rangeDays: input.rangeDays,
    priceSol: input.priceSol,
    priceUsdc: input.priceUsdc,
    videoSeconds: input.videoSeconds,
    status: input.status,
    progress: input.progress,
    txSignature: null,
    createdAt,
    updatedAt: createdAt,
    errorCode: null,
    errorMessage: null,
    paymentWaived: input.paymentWaived ?? false,
    discountCode: null,
  };
}

function jobCreateData(job: JobDocument) {
  return {
    jobId: job.jobId,
    wallet: job.wallet,
    requestKind: job.requestKind,
    pricingMode: job.pricingMode,
    visibility: job.visibility,
    experience: job.experience,
    moderationStatus: job.moderationStatus,
    creatorId: job.creatorId,
    creatorEmail: job.creatorEmail,
    subjectAddress: job.subjectAddress,
    subjectChain: job.subjectChain,
    subjectName: job.subjectName,
    subjectSymbol: job.subjectSymbol,
    subjectImage: job.subjectImage,
    subjectDescription: job.subjectDescription,
    sourceMediaUrl: job.sourceMediaUrl,
    sourceEmbedUrl: job.sourceEmbedUrl,
    sourceMediaProvider: job.sourceMediaProvider,
    sourceTranscript: job.sourceTranscript,
    stylePreset: job.stylePreset,
    requestedPrompt: job.requestedPrompt,
    audioEnabled: job.audioEnabled,
    packageType: job.packageType,
    rangeDays: job.rangeDays,
    priceSol: job.priceSol,
    priceUsdc: job.priceUsdc,
    videoSeconds: job.videoSeconds,
    status: job.status,
    progress: job.progress,
    txSignature: job.txSignature,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    paymentWaived: job.paymentWaived,
    discountCode: job.discountCode,
    // Required Prisma fields with defaults
    paymentAddress: "none",
    paymentRouting: "legacy_memo",
    requiredLamports: BigInt(0),
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.createdAt),
  };
}

function normalizeJob(doc: any): JobDocument {
  return {
    jobId: doc.jobId,
    wallet: doc.wallet,
    requestKind: doc.requestKind,
    pricingMode: doc.pricingMode,
    visibility: doc.visibility,
    experience: doc.experience,
    moderationStatus: doc.moderationStatus,
    creatorId: doc.creatorId,
    creatorEmail: doc.creatorEmail,
    subjectAddress: doc.subjectAddress,
    subjectChain: doc.subjectChain,
    subjectName: doc.subjectName,
    subjectSymbol: doc.subjectSymbol,
    subjectImage: doc.subjectImage,
    subjectDescription: doc.subjectDescription,
    sourceMediaUrl: doc.sourceMediaUrl,
    sourceEmbedUrl: doc.sourceEmbedUrl,
    sourceMediaProvider: doc.sourceMediaProvider,
    sourceTranscript: doc.sourceTranscript,
    stylePreset: doc.stylePreset,
    requestedPrompt: doc.requestedPrompt,
    audioEnabled: doc.audioEnabled,
    packageType: doc.packageType,
    rangeDays: doc.rangeDays,
    priceSol: doc.priceSol,
    priceUsdc: doc.priceUsdc,
    videoSeconds: doc.videoSeconds,
    status: doc.status,
    progress: doc.progress,
    txSignature: doc.txSignature,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    errorCode: doc.errorCode,
    errorMessage: doc.errorMessage,
    paymentWaived: doc.paymentWaived ?? false,
    discountCode: doc.discountCode,
  };
}

// ============================================================
// createTokenVideoJob — creates a pending job for token videos
// ============================================================
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
  paymentWaived?: boolean;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const job = buildJobDocument({
    jobId,
    wallet: input.tokenAddress,
    requestKind: "token_video",
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "pending",
    progress: "pending",
    pricingMode: input.pricingMode ?? "legacy",
    visibility: input.visibility ?? "public",
    experience: input.experience,
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
    audioEnabled: input.audioEnabled,
    paymentWaived: input.paymentWaived,
  });

  await db.job.create({ data: jobCreateData(job) });

  // Add dispatch outbox entry
  await db.jobDispatchOutbox.create({
    data: {
      jobId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(job.createdAt),
      lockUntil: null,
      lastError: null,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.createdAt),
      dispatchedAt: null,
    },
  });

  return job;
}

// ============================================================
// createPromptVideoJob — creates a pending job for prompt-based videos
// ============================================================
export async function createPromptVideoJob(input: {
  requestKind:
    | "generic_cinema"
    | "mythx"
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
  paymentWaived?: boolean;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const job = buildJobDocument({
    jobId,
    wallet: `${input.requestKind}:${jobId}`,
    requestKind: input.requestKind,
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "pending",
    progress: "pending",
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience: input.experience,
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
    audioEnabled: input.audioEnabled,
    paymentWaived: input.paymentWaived,
  });

  await db.job.create({ data: jobCreateData(job) });

  await db.jobDispatchOutbox.create({
    data: {
      jobId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(job.createdAt),
      lockUntil: null,
      lastError: null,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.createdAt),
      dispatchedAt: null,
    },
  });

  return job;
}

// ============================================================
// getJob
// ============================================================
export async function getJob(jobId: string): Promise<JobDocument | null> {
  const doc = await db.job.findUnique({ where: { jobId } });
  if (!doc) return null;
  return normalizeJob(doc);
}

// ============================================================
// updateJob — partial update
// ============================================================
export async function updateJob(
  jobId: string,
  data: Partial<JobDocument>,
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.errorCode !== undefined) updateData.errorCode = data.errorCode;
  if (data.errorMessage !== undefined)
    updateData.errorMessage = data.errorMessage;
  if (data.txSignature !== undefined) updateData.txSignature = data.txSignature;
  if (data.paymentWaived !== undefined)
    updateData.paymentWaived = data.paymentWaived;
  if (data.discountCode !== undefined)
    updateData.discountCode = data.discountCode;
  updateData.updatedAt = new Date();

  await db.job.update({ where: { jobId }, data: updateData });
}

// ============================================================
// updateJobProgress — update just the progress field
// ============================================================
export async function updateJobProgress(
  jobId: string,
  progress: JobProgress,
): Promise<void> {
  await db.job.update({
    where: { jobId },
    data: { progress, updatedAt: new Date() },
  });
}

// ============================================================
// updateJobStatus — with state machine validation
// ============================================================
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: {
    progress?: JobProgress;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  if (job.status !== status) {
    assertTransition(job.status, status);
  }

  await updateJob(jobId, {
    status,
    progress: extra?.progress ?? (status as JobProgress),
    errorCode: extra?.errorCode ?? null,
    errorMessage: extra?.errorMessage ?? null,
  });
}

// ============================================================
// markJobFailed
// ============================================================
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

// ============================================================
// failJob — simple alias
// ============================================================
export async function failJob(jobId: string, error: string): Promise<void> {
  await markJobFailed(jobId, "job_failed", error);
}

// ============================================================
// listJobs — list jobs with optional type filter
// ============================================================
export async function listJobs(
  type?: string,
  limit: number = 50,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: type ? { requestKind: type } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// getJobsByWallet — find jobs by wallet/token address
// ============================================================
export async function getJobsByWallet(
  wallet: string,
  limit: number = 10,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: { wallet },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// getJobsByInput — search by subject name or address
// ============================================================
export async function getJobsByInput(
  input: string,
  limit: number = 10,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: {
      OR: [
        { subjectName: { contains: input, mode: "insensitive" as any } },
        { subjectAddress: { contains: input, mode: "insensitive" as any } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// findRecentReusableTokenJob — find recent complete jobs for reuse
// ============================================================
export async function findRecentReusableTokenJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  maxAgeMinutes: number;
}): Promise<JobDocument | null> {
  const cutoff = new Date(Date.now() - input.maxAgeMinutes * 60 * 1000);
  const docs = await db.job.findMany({
    where: {
      subjectAddress: input.tokenAddress,
      subjectChain: input.subjectChain,
      packageType: input.packageType,
      status: "complete",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (docs.length === 0) return null;
  return normalizeJob(docs[0]);
}

// ============================================================
// beginJobProcessing — acquire lock for processing
// ============================================================
export async function beginJobProcessing(
  jobId: string,
  options?: { staleAfterMs?: number },
): Promise<{
  acquired: boolean;
  job: JobDocument | null;
}> {
  const current = await getJob(jobId);
  if (!current) {
    return { acquired: false, job: null };
  }

  if (current.status === "complete" || current.status === "failed") {
    return { acquired: false, job: current };
  }

  const staleAfterMs = Math.max(30_000, options?.staleAfterMs ?? 300_000);
  const currentUpdatedAtMs = Date.parse(current.updatedAt);
  const processingLeaseIsFresh =
    current.status === "processing" &&
    Number.isFinite(currentUpdatedAtMs) &&
    Date.now() - currentUpdatedAtMs < staleAfterMs;

  if (processingLeaseIsFresh) {
    return { acquired: false, job: current };
  }

  if (current.status !== "pending" && current.status !== "processing") {
    throw new Error(
      `Job ${jobId} cannot enter processing from ${current.status}`,
    );
  }

  if (current.status === "pending") {
    assertTransition(current.status, "processing");
  }

  await updateJob(jobId, {
    status: "processing",
    progress: "fetching_transactions",
    errorCode: null,
    errorMessage: null,
  });

  const updated = await getJob(jobId);
  return { acquired: true, job: updated };
}

// ============================================================
// prepareFailedJobForRetry — reset failed job to pending
// ============================================================
export async function prepareFailedJobForRetry(jobId: string): Promise<{
  status: "ready" | "job_not_found" | "job_not_failed" | "already_processing";
  job: JobDocument | null;
}> {
  const job = await getJob(jobId);
  if (!job) return { status: "job_not_found", job: null };
  if (job.status !== "failed") return { status: "job_not_failed", job };

  await updateJob(jobId, {
    status: "pending",
    progress: "pending",
    errorCode: null,
    errorMessage: null,
  });

  // Reset dispatch outbox
  const now = nowIso();
  await db.jobDispatchOutbox.upsert({
    where: { jobId },
    create: {
      jobId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(now),
      lockUntil: null,
      lastError: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      dispatchedAt: null,
    },
    update: {
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(now),
      lockUntil: null,
      lastError: null,
      updatedAt: new Date(now),
      dispatchedAt: null,
    },
  });

  const updated = await getJob(jobId);
  return { status: "ready", job: updated };
}

// ============================================================
// getJobArtifacts — get job + report + video together
// ============================================================
export async function getJobArtifacts(jobId: string): Promise<{
  job: JobDocument | null;
  report: ReportDocument | null;
  video: VideoDocument | null;
}> {
  const [jobDoc, reportDoc, videoDoc] = await Promise.all([
    db.job.findUnique({ where: { jobId } }),
    db.report.findUnique({ where: { jobId } }),
    db.video.findUnique({ where: { jobId } }),
  ]);

  return {
    job: jobDoc ? normalizeJob(jobDoc) : null,
    report: reportDoc ? (reportDoc as unknown as ReportDocument) : null,
    video: videoDoc ? (videoDoc as unknown as VideoDocument) : null,
  };
}

// ============================================================
// getReport
// ============================================================
export async function getReport(jobId: string): Promise<ReportDocument | null> {
  const doc = await db.report.findUnique({ where: { jobId } });
  if (!doc) return null;
  return doc as unknown as ReportDocument;
}

// ============================================================
// getVideo
// ============================================================
export async function getVideo(jobId: string): Promise<VideoDocument | null> {
  const doc = await db.video.findUnique({ where: { jobId } });
  if (!doc) return null;
  return doc as unknown as VideoDocument;
}

// ============================================================
// getInternalVideoRender
// ============================================================
export async function getInternalVideoRender(
  jobId: string,
): Promise<InternalVideoRenderDocument | null> {
  const doc = await db.videoRender.findUnique({ where: { jobId } });
  if (!doc) return null;
  return {
    id: doc.id,
    jobId: doc.jobId,
    status: doc.status as InternalVideoRenderDocument["status"],
    renderStatus:
      doc.renderStatus as InternalVideoRenderDocument["renderStatus"],
    videoUrl: doc.videoUrl,
    thumbnailUrl: doc.thumbnailUrl,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    startedAt: doc.startedAt?.toISOString() ?? null,
    completedAt: doc.completedAt?.toISOString() ?? null,
  };
}

// ============================================================
// upsertReport
// ============================================================
export async function upsertReport(report: ReportDocument): Promise<void> {
  const data = report as any;
  if (data.createdAt) data.createdAt = new Date(data.createdAt);
  if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);

  await db.report.upsert({
    where: { jobId: report.jobId },
    create: data,
    update: data,
  });
}

// ============================================================
// upsertVideo
// ============================================================
export async function upsertVideo(video: VideoDocument): Promise<void> {
  const data = video as any;
  if (data.createdAt) data.createdAt = new Date(data.createdAt);
  if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);

  await db.video.upsert({
    where: { jobId: video.jobId },
    create: data,
    update: data,
  });
}

// ============================================================
// Pump metadata cache
// ============================================================
export async function getPumpMetadata(
  mint: string,
): Promise<PumpMetadataCacheDocument | null> {
  const doc = await db.pumpMetadataCache.findUnique({ where: { mint } });
  if (!doc) return null;
  return doc as unknown as PumpMetadataCacheDocument;
}

export async function upsertPumpMetadata(
  metadata: PumpMetadataCacheDocument,
): Promise<void> {
  const data = metadata as any;
  if (data.cachedAt) data.cachedAt = new Date(data.cachedAt);

  await db.pumpMetadataCache.upsert({
    where: { mint: metadata.mint },
    create: data,
    update: data,
  });
}

// ============================================================
// Moderation
// ============================================================
export async function updateJobModeration(
  jobId: string,
  moderationStatus: "visible" | "flagged" | "hidden",
): Promise<void> {
  await db.job.update({
    where: { jobId },
    data: { moderationStatus, updatedAt: new Date() },
  });
}

export async function listModerationJobArtifacts(limit: number = 50): Promise<
  Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }>
> {
  const jobs = await db.job.findMany({
    where: { moderationStatus: "flagged" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }> = [];
  for (const jobDoc of jobs) {
    const job = normalizeJob(jobDoc);
    const report = await getReport(job.jobId);
    const video = await getVideo(job.jobId);
    results.push({ job, report, video });
  }
  return results;
}

// ============================================================
// Completed job artifacts listing
// ============================================================
export async function listCompletedJobArtifacts(
  limit: number = 50,
): Promise<
  Array<{ job: JobDocument; report: ReportDocument; video: VideoDocument }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", visibility: "public" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: Array<{
    job: JobDocument;
    report: ReportDocument;
    video: VideoDocument;
  }> = [];
  for (const jobDoc of jobs) {
    const job = normalizeJob(jobDoc);
    const report = await getReport(job.jobId);
    const video = await getVideo(job.jobId);
    if (report && video) {
      results.push({ job, report, video });
    }
  }
  return results;
}

export async function listCompletedJobArtifactsByWallet(
  wallet: string,
  limit: number = 50,
): Promise<
  Array<{ job: JobDocument; report: ReportDocument; video: VideoDocument }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", wallet },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: Array<{
    job: JobDocument;
    report: ReportDocument;
    video: VideoDocument;
  }> = [];
  for (const jobDoc of jobs) {
    const job = normalizeJob(jobDoc);
    const report = await getReport(job.jobId);
    const video = await getVideo(job.jobId);
    if (report && video) {
      results.push({ job, report, video });
    }
  }
  return results;
}

export async function listCompletedPrivateJobArtifactsByCreator(
  creatorId: string,
  limit: number = 50,
): Promise<
  Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", creatorId, visibility: "private" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }> = [];
  for (const jobDoc of jobs) {
    const job = normalizeJob(jobDoc);
    const report = await getReport(job.jobId);
    const video = await getVideo(job.jobId);
    results.push({ job, report, video });
  }
  return results;
}

// ============================================================
// Dispatch outbox helpers
// ============================================================
export async function claimDispatchJob(jobId: string): Promise<any | null> {
  const now = new Date();
  const outbox = await db.jobDispatchOutbox.findUnique({ where: { jobId } });
  if (!outbox) return null;
  if (outbox.status === "dispatched") return null;
  if (
    outbox.status === "in_progress" &&
    outbox.lockUntil &&
    outbox.lockUntil > now
  )
    return null;
  if (outbox.status === "pending" && outbox.nextAttemptAt > now) return null;

  const updated = await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "in_progress",
      lockUntil: new Date(now.getTime() + 2 * 60_000),
      updatedAt: now,
    },
  });
  return updated;
}

export async function claimDueDispatchJobs(limit: number): Promise<any[]> {
  const now = new Date();
  const outboxes = await db.jobDispatchOutbox.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      nextAttemptAt: { lte: now },
    },
    take: limit * 3,
    orderBy: { nextAttemptAt: "asc" },
  });

  const claimed: any[] = [];
  for (const outbox of outboxes) {
    if (claimed.length >= limit) break;
    const record = await claimDispatchJob(outbox.jobId);
    if (record) claimed.push(record);
  }
  return claimed;
}

export async function markDispatchJobSuccess(jobId: string): Promise<void> {
  const now = new Date();
  await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "dispatched",
      lockUntil: null,
      updatedAt: now,
      dispatchedAt: now,
      lastError: null,
    },
  });
}

export async function rescheduleDispatchJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date();
  const current = await db.jobDispatchOutbox.findUnique({ where: { jobId } });
  if (!current || current.status === "dispatched") return;

  const attempts = current.attempts + 1;
  const delayMs = Math.min(5 * 60_000, 5_000 * 2 ** (attempts - 1));
  const nextAttemptAt = new Date(now.getTime() + delayMs);

  await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "pending",
      attempts,
      nextAttemptAt,
      lockUntil: null,
      lastError: errorMessage,
      updatedAt: now,
    },
  });
}
