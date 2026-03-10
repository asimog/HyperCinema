import { getVideoServiceDb } from "./firebase";
import { NormalizedRenderRequest, RenderJobRecord, RenderStatus } from "./types";

const COLLECTION = "video_renders";

function nowIso(): string {
  return new Date().toISOString();
}

function collection() {
  return getVideoServiceDb().collection(COLLECTION);
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(record: RenderJobRecord): RenderJobRecord {
  return {
    ...record,
    status: (record.status ?? record.renderStatus ?? "queued") as RenderStatus,
    renderStatus: (record.renderStatus ?? record.status ?? "queued") as RenderStatus,
    startedAt: record.startedAt ?? null,
    completedAt: record.completedAt ?? null,
    videoUrl: record.videoUrl ?? null,
    thumbnailUrl: record.thumbnailUrl ?? null,
    error: record.error ?? null,
  };
}

export async function getRenderJob(id: string): Promise<RenderJobRecord | null> {
  const doc = await collection().doc(id).get();
  if (!doc.exists) return null;
  return normalize(doc.data() as RenderJobRecord);
}

export async function createOrGetRenderJob(
  jobId: string,
  request: NormalizedRenderRequest,
): Promise<{ record: RenderJobRecord; created: boolean }> {
  const sanitizedRequest = stripUndefined(request);

  return getVideoServiceDb().runTransaction(async (tx) => {
    const ref = collection().doc(jobId);
    const snap = await tx.get(ref);
    if (snap.exists) {
      return {
        record: normalize(snap.data() as RenderJobRecord),
        created: false,
      };
    }

    const createdAt = nowIso();
    const record: RenderJobRecord = {
      id: jobId,
      jobId,
      status: "queued",
      renderStatus: "queued",
      videoUrl: null,
      thumbnailUrl: null,
      error: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
      request: sanitizedRequest,
    };

    tx.set(ref, record);
    return { record, created: true };
  });
}

export async function updateRenderJob(
  id: string,
  patch: Partial<Omit<RenderJobRecord, "id" | "jobId" | "createdAt">>,
): Promise<void> {
  await collection()
    .doc(id)
    .set(
      {
        ...patch,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
}

export async function markRenderProcessing(id: string): Promise<void> {
  await updateRenderJob(id, {
    status: "processing",
    renderStatus: "processing",
    startedAt: nowIso(),
    error: null,
  });
}

export async function markRenderReady(
  id: string,
  result: { videoUrl: string; thumbnailUrl: string | null },
): Promise<void> {
  await updateRenderJob(id, {
    status: "ready",
    renderStatus: "ready",
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    completedAt: nowIso(),
    error: null,
  });
}

export async function markRenderFailed(id: string, error: string): Promise<void> {
  await updateRenderJob(id, {
    status: "failed",
    renderStatus: "failed",
    error,
    completedAt: nowIso(),
  });
}

export async function claimRenderJob(
  id: string,
  staleAfterMs: number,
): Promise<RenderJobRecord | null> {
  return getVideoServiceDb().runTransaction(async (tx) => {
    const ref = collection().doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return null;
    }

    const current = normalize(snap.data() as RenderJobRecord);
    if (current.status === "ready" || current.status === "failed") {
      return null;
    }

    if (current.status === "processing") {
      const updatedAtMs = Date.parse(current.updatedAt);
      if (
        Number.isFinite(updatedAtMs) &&
        Date.now() - updatedAtMs < staleAfterMs
      ) {
        return null;
      }
    }

    const updated: RenderJobRecord = {
      ...current,
      status: "processing",
      renderStatus: "processing",
      startedAt: current.startedAt ?? nowIso(),
      updatedAt: nowIso(),
      error: null,
    };

    tx.set(ref, updated, { merge: true });
    return updated;
  });
}

export async function touchRenderJob(id: string): Promise<void> {
  await updateRenderJob(id, {});
}

export async function listRecoverableRenderJobs(params: {
  limit: number;
  staleAfterMs: number;
}): Promise<RenderJobRecord[]> {
  const snapshot = await collection()
    .where("status", "in", ["queued", "processing"])
    .limit(params.limit)
    .get();

  const now = Date.now();
  return snapshot.docs
    .map((doc) => normalize(doc.data() as RenderJobRecord))
    .filter((record) => {
      if (record.status === "queued") {
        return true;
      }
      const updatedAtMs = Date.parse(record.updatedAt);
      if (!Number.isFinite(updatedAtMs)) {
        return true;
      }
      return now - updatedAtMs >= params.staleAfterMs;
    });
}
