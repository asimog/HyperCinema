import { getDb } from "@/lib/firebase/admin";
import { getEnv } from "@/lib/env";
import { getJobArtifacts, listCompletedJobArtifacts } from "@/lib/jobs/repository";
import { logger } from "@/lib/logging/logger";
import { JobDocument, ReportDocument, VideoDocument } from "@/lib/types/domain";

type GoonBookPublicationStatus = "pending" | "posting" | "posted" | "failed";
type GoonBookCredentialSource = "env" | "stored" | "registered";

interface GoonBookPublicationDocument {
  jobId: string;
  status: GoonBookPublicationStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt: string | null;
  postedAt: string | null;
  goonBookPostId: string | null;
  errorMessage: string | null;
}

interface GoonBookAgentStateDocument {
  handle: string;
  displayName: string;
  bio: string;
  apiKey: string;
  apiKeyPreview: string | null;
  profileId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoonBookPublishingCredential {
  apiKey: string;
  handle: string;
  source: GoonBookCredentialSource;
}

interface ManagedGoonBookAgentIdentity {
  handle: string;
  displayName: string;
  bio: string;
}

interface GoonBookPostPayload {
  error?: string;
  item?: { id?: string | null };
}

export interface GoonBookSyncSummary {
  scanned: number;
  posted: number;
  skipped: number;
  failed: number;
  results: Array<{
    jobId: string;
    status: "posted" | "skipped" | "failed";
    reason?: string;
    postId?: string | null;
  }>;
}

const POSTING_STALE_MS = 5 * 60_000;

let cachedCredential: GoonBookPublishingCredential | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function goonBookPublicationCollection() {
  return getDb().collection("goonbook_publications");
}

function goonBookAgentStateCollection() {
  return getDb().collection("goonbook_agent_state");
}

function normalizePublication(
  jobId: string,
  raw?: Partial<GoonBookPublicationDocument> | null,
): GoonBookPublicationDocument {
  return {
    jobId,
    status:
      raw?.status === "posting" || raw?.status === "posted" || raw?.status === "failed"
        ? raw.status
        : "pending",
    attempts: Math.max(0, Math.floor(raw?.attempts ?? 0)),
    createdAt: raw?.createdAt ?? nowIso(),
    updatedAt: raw?.updatedAt ?? nowIso(),
    lastAttemptAt: raw?.lastAttemptAt ?? null,
    postedAt: raw?.postedAt ?? null,
    goonBookPostId: raw?.goonBookPostId ?? null,
    errorMessage: raw?.errorMessage ?? null,
  };
}

function normalizeAgentState(
  identity: ManagedGoonBookAgentIdentity,
  raw?: Partial<GoonBookAgentStateDocument> | null,
): GoonBookAgentStateDocument | null {
  const apiKey = raw?.apiKey?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    handle: raw?.handle?.trim() || identity.handle,
    displayName: raw?.displayName?.trim() || identity.displayName,
    bio: raw?.bio?.trim() || identity.bio,
    apiKey,
    apiKeyPreview: raw?.apiKeyPreview?.trim() || null,
    profileId: raw?.profileId?.trim() || null,
    createdAt: raw?.createdAt ?? nowIso(),
    updatedAt: raw?.updatedAt ?? nowIso(),
  };
}

function shortWallet(wallet: string): string {
  if (!wallet) return "unknown";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function clamp(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function getManagedAgentIdentity(): ManagedGoonBookAgentIdentity {
  const env = getEnv();
  return {
    handle: env.GOONBOOK_AGENT_HANDLE.trim().toLowerCase(),
    displayName: env.GOONBOOK_AGENT_DISPLAY_NAME.trim(),
    bio: env.GOONBOOK_AGENT_BIO.trim(),
  };
}

function getManagedAgentStateDocId(handle: string): string {
  return handle.trim().toLowerCase() || "hasmedia";
}

function buildPostBody(input: {
  job: JobDocument;
  report: ReportDocument | null;
}): string {
  const env = getEnv();
  const walletLabel = shortWallet(input.job.wallet);
  const personality =
    input.report?.walletPersonality ||
    input.report?.styleClassification ||
    "Trench Cinema";
  const summary = clamp(
    input.report?.summary ||
      input.report?.narrativeSummary ||
      "Fresh HashArt trench cinema export.",
    420,
  );
  const jobUrl = new URL(`/job/${input.job.jobId}`, env.APP_BASE_URL).toString();

  return [
    `New HashArt drop for ${walletLabel}.`,
    `${personality}. ${summary}`,
    `Watch: ${jobUrl}`,
    "#HashArt #GoonBook #Solana",
  ].join("\n\n");
}

async function claimPublication(jobId: string): Promise<GoonBookPublicationDocument | null> {
  return getDb().runTransaction(async (tx) => {
    const ref = goonBookPublicationCollection().doc(jobId);
    const snap = await tx.get(ref);
    const current = normalizePublication(
      jobId,
      snap.exists ? ((snap.data() as Partial<GoonBookPublicationDocument>) ?? null) : null,
    );

    if (current.status === "posted") {
      return null;
    }

    const lastAttemptAtMs = current.lastAttemptAt ? Date.parse(current.lastAttemptAt) : 0;
    const isFreshPosting =
      current.status === "posting" &&
      Number.isFinite(lastAttemptAtMs) &&
      Date.now() - lastAttemptAtMs < POSTING_STALE_MS;

    if (isFreshPosting) {
      return null;
    }

    const updated: GoonBookPublicationDocument = {
      ...current,
      status: "posting",
      attempts: current.attempts + 1,
      updatedAt: nowIso(),
      lastAttemptAt: nowIso(),
      errorMessage: null,
    };

    tx.set(ref, updated, { merge: true });
    return updated;
  });
}

async function markPublicationPosted(input: { jobId: string; postId?: string | null }) {
  const timestamp = nowIso();
  await goonBookPublicationCollection().doc(input.jobId).set(
    {
      jobId: input.jobId,
      status: "posted",
      updatedAt: timestamp,
      postedAt: timestamp,
      goonBookPostId: input.postId ?? null,
      errorMessage: null,
    } satisfies Partial<GoonBookPublicationDocument>,
    { merge: true },
  );
}

async function markPublicationFailed(input: { jobId: string; errorMessage: string }) {
  await goonBookPublicationCollection().doc(input.jobId).set(
    {
      jobId: input.jobId,
      status: "failed",
      updatedAt: nowIso(),
      errorMessage: input.errorMessage,
    } satisfies Partial<GoonBookPublicationDocument>,
    { merge: true },
  );
}

async function readStoredManagedCredential(
  identity: ManagedGoonBookAgentIdentity,
): Promise<GoonBookPublishingCredential | null> {
  const snap = await goonBookAgentStateCollection()
    .doc(getManagedAgentStateDocId(identity.handle))
    .get();
  if (!snap.exists) {
    return null;
  }

  const normalized = normalizeAgentState(
    identity,
    (snap.data() as Partial<GoonBookAgentStateDocument>) ?? null,
  );
  if (!normalized) {
    return null;
  }

  return {
    apiKey: normalized.apiKey,
    handle: normalized.handle,
    source: "stored",
  };
}

async function persistManagedCredential(input: {
  identity: ManagedGoonBookAgentIdentity;
  apiKey: string;
  profileId?: string | null;
}) {
  const docId = getManagedAgentStateDocId(input.identity.handle);
  const timestamp = nowIso();
  const existing = await goonBookAgentStateCollection().doc(docId).get();

  await goonBookAgentStateCollection().doc(docId).set(
    {
      handle: input.identity.handle,
      displayName: input.identity.displayName,
      bio: input.identity.bio,
      apiKey: input.apiKey,
      apiKeyPreview: `${input.apiKey.slice(0, 16)}...`,
      profileId: input.profileId ?? null,
      createdAt: existing.exists
        ? ((existing.data() as Partial<GoonBookAgentStateDocument>)?.createdAt ?? timestamp)
        : timestamp,
      updatedAt: timestamp,
    } satisfies GoonBookAgentStateDocument,
    { merge: true },
  );
}

async function registerManagedAgent(
  identity: ManagedGoonBookAgentIdentity,
): Promise<GoonBookPublishingCredential> {
  const env = getEnv();
  if (!env.GOONBOOK_API_BASE_URL) {
    throw new Error("GoonBook agent publishing is not configured.");
  }

  const response = await fetch(
    new URL("/api/goonbook/agents/register", env.GOONBOOK_API_BASE_URL).toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        handle: identity.handle,
        displayName: identity.displayName,
        bio: identity.bio,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    agent?: {
      apiKey?: string;
      profile?: {
        id?: string | null;
      };
    };
  };

  const apiKey = payload.agent?.apiKey?.trim();
  if (!response.ok || !apiKey) {
    throw new Error(payload.error || `GoonBook register returned ${response.status}`);
  }

  await persistManagedCredential({
    identity,
    apiKey,
    profileId: payload.agent?.profile?.id ?? null,
  });

  cachedCredential = {
    apiKey,
    handle: identity.handle,
    source: "registered",
  };

  return cachedCredential;
}

async function resolvePublishingCredential(): Promise<GoonBookPublishingCredential> {
  const env = getEnv();
  const identity = getManagedAgentIdentity();

  if (!env.GOONBOOK_API_BASE_URL) {
    throw new Error("GoonBook agent publishing is not configured.");
  }

  if (env.GOONBOOK_AGENT_API_KEY) {
    cachedCredential = {
      apiKey: env.GOONBOOK_AGENT_API_KEY,
      handle: identity.handle,
      source: "env",
    };
    return cachedCredential;
  }

  if (cachedCredential && cachedCredential.handle === identity.handle) {
    return cachedCredential;
  }

  const stored = await readStoredManagedCredential(identity);
  if (stored) {
    cachedCredential = stored;
    return stored;
  }

  return registerManagedAgent(identity);
}

async function sendGoonBookPostRequest(input: {
  apiKey: string;
  job: JobDocument;
  report: ReportDocument | null;
  video: VideoDocument | null;
}): Promise<{ response: Response; payload: GoonBookPostPayload }> {
  const env = getEnv();
  const response = await fetch(
    new URL("/api/goonbook/agents/posts", env.GOONBOOK_API_BASE_URL).toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        body: buildPostBody({
          job: input.job,
          report: input.report,
        }),
        imageAlt: input.video?.thumbnailUrl
          ? `HashArt trailer thumbnail for ${shortWallet(input.job.wallet)}`
          : null,
        imageUrl: input.video?.thumbnailUrl ?? null,
        mediaCategory: input.video?.thumbnailUrl ? "art" : null,
        mediaRating: input.video?.thumbnailUrl ? "safe" : null,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GoonBookPostPayload;
  return { response, payload };
}

async function postToGoonBook(input: {
  job: JobDocument;
  report: ReportDocument | null;
  video: VideoDocument | null;
}): Promise<{ postId: string | null }> {
  const env = getEnv();
  if (!env.GOONBOOK_API_BASE_URL) {
    throw new Error("GoonBook agent publishing is not configured.");
  }

  let credential = await resolvePublishingCredential();
  let attempt = await sendGoonBookPostRequest({
    apiKey: credential.apiKey,
    job: input.job,
    report: input.report,
    video: input.video,
  });

  if (!attempt.response.ok && attempt.response.status === 401 && credential.source !== "env") {
    credential = await registerManagedAgent(getManagedAgentIdentity());
    attempt = await sendGoonBookPostRequest({
      apiKey: credential.apiKey,
      job: input.job,
      report: input.report,
      video: input.video,
    });
  }

  if (!attempt.response.ok) {
    throw new Error(
      attempt.payload.error || `GoonBook returned ${attempt.response.status}`,
    );
  }

  return {
    postId: attempt.payload.item?.id ?? null,
  };
}

export async function publishCompletedJobToGoonBook(jobId: string): Promise<{
  jobId: string;
  status: "posted" | "skipped" | "failed";
  reason?: string;
  postId?: string | null;
}> {
  const env = getEnv();
  if (!env.GOONBOOK_API_BASE_URL) {
    return {
      jobId,
      status: "skipped",
      reason: "goonbook_not_configured",
    };
  }

  const claim = await claimPublication(jobId);
  if (!claim) {
    return {
      jobId,
      status: "skipped",
      reason: "already_posted_or_in_progress",
    };
  }

  try {
    const { job, report, video } = await getJobArtifacts(jobId);
    if (!job || job.status !== "complete") {
      throw new Error("Job is not ready for GoonBook publication.");
    }

    const published = await postToGoonBook({ job, report, video });
    await markPublicationPosted({
      jobId,
      postId: published.postId,
    });

    return {
      jobId,
      status: "posted",
      postId: published.postId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GoonBook error";
    await markPublicationFailed({
      jobId,
      errorMessage: message,
    });

    logger.warn("goonbook_publication_failed", {
      component: "goonbook_publisher",
      stage: "publish_completed_job",
      jobId,
      errorCode: "goonbook_publication_failed",
      errorMessage: message,
    });

    return {
      jobId,
      status: "failed",
      reason: message,
    };
  }
}

export async function syncGalleryToGoonBook(
  requestedLimit?: number,
): Promise<GoonBookSyncSummary> {
  const env = getEnv();
  if (!env.GOONBOOK_API_BASE_URL) {
    return {
      scanned: 0,
      posted: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };
  }

  const limit = Math.max(
    1,
    Math.min(
      env.GOONBOOK_SYNC_BATCH_LIMIT,
      requestedLimit && Number.isFinite(requestedLimit)
        ? Math.floor(requestedLimit)
        : env.GOONBOOK_SYNC_BATCH_LIMIT,
    ),
  );
  const galleryItems = await listCompletedJobArtifacts(limit);
  const results: GoonBookSyncSummary["results"] = [];

  for (const item of galleryItems) {
    const result = await publishCompletedJobToGoonBook(item.job.jobId);
    results.push(result);
  }

  return {
    scanned: galleryItems.length,
    posted: results.filter((item) => item.status === "posted").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  };
}
