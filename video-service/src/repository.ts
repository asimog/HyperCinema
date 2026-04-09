import type { VideoRender, Prisma } from "@prisma/client";
import { db } from "./db";
import { PrismaClient } from "@prisma/client";
import {
  NormalizedRenderRequest,
  RenderJobRecord,
  RenderStatus,
} from "./types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRecord(
  record: VideoRender | null,
  request?: NormalizedRenderRequest,
): RenderJobRecord {
  const status = (record?.status ??
    record?.renderStatus ??
    "queued") as RenderStatus;
  const renderStatus = (record?.renderStatus ??
    record?.status ??
    "queued") as RenderStatus;
  return {
    id: record!.id,
    jobId: record!.jobId,
    status,
    renderStatus,
    videoUrl: record!.videoUrl ?? null,
    thumbnailUrl: record!.thumbnailUrl ?? null,
    error: record!.error ?? null,
    createdAt: record!.createdAt.toISOString(),
    updatedAt: record!.updatedAt.toISOString(),
    startedAt: record!.startedAt ? record!.startedAt.toISOString() : null,
    completedAt: record!.completedAt ? record!.completedAt.toISOString() : null,
    request: request!,
  };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getRenderJob(
  id: string,
): Promise<RenderJobRecord | null> {
  const record = await db.videoRender.findUnique({ where: { jobId: id } });
  if (!record) return null;

  // Re-fetch request from the render row if stored, otherwise return what we have
  const request = (record as unknown as { request?: NormalizedRenderRequest })
    .request;
  return normalizeRecord(record, request ?? ({} as NormalizedRenderRequest));
}

export async function createOrGetRenderJob(
  jobId: string,
  request: NormalizedRenderRequest,
): Promise<{ record: RenderJobRecord; created: boolean }> {
  const sanitizedRequest = stripUndefined(request);
  const now = new Date();

  return db.$transaction(async (tx: TxClient) => {
    const existing = await tx.videoRender.findUnique({ where: { jobId } });
    if (existing) {
      return {
        record: normalizeRecord(existing, sanitizedRequest),
        created: false,
      };
    }

    const record = await tx.videoRender.create({
      data: {
        id: jobId,
        jobId,
        status: "queued",
        renderStatus: "queued",
        videoUrl: null,
        thumbnailUrl: null,
        error: null,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
      } as any,
    });

    return {
      record: normalizeRecord(record, sanitizedRequest),
      created: true,
    };
  });
}

export async function updateRenderJob(
  id: string,
  patch: Partial<Omit<RenderJobRecord, "id" | "jobId" | "createdAt">>,
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.renderStatus !== undefined) data.renderStatus = patch.renderStatus;
  if (patch.videoUrl !== undefined) data.videoUrl = patch.videoUrl;
  if (patch.thumbnailUrl !== undefined) data.thumbnailUrl = patch.thumbnailUrl;
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.startedAt !== undefined)
    data.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  if (patch.completedAt !== undefined)
    data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;

  await db.videoRender.update({
    where: { jobId: id },
    data,
  });
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

export async function markRenderFailed(
  id: string,
  error: string,
): Promise<void> {
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
  return db.$transaction(async (tx: TxClient) => {
    const existing = await tx.videoRender.findUnique({ where: { jobId: id } });
    if (!existing) return null;

    const currentStatus = existing.status as RenderStatus;
    if (currentStatus === "ready" || currentStatus === "failed") {
      return null;
    }

    if (currentStatus === "processing") {
      const updatedAtMs = existing.updatedAt.getTime();
      if (
        Number.isFinite(updatedAtMs) &&
        Date.now() - updatedAtMs < staleAfterMs
      ) {
        return null;
      }
    }

    const now = new Date();
    const updated = await tx.videoRender.update({
      where: { jobId: id },
      data: {
        status: "processing",
        renderStatus: "processing",
        startedAt: existing.startedAt ?? now,
        updatedAt: now,
        error: null,
      },
    });

    return normalizeRecord(updated, {} as NormalizedRenderRequest);
  });
}

export async function touchRenderJob(id: string): Promise<void> {
  await updateRenderJob(id, {});
}

export async function listRecoverableRenderJobs(params: {
  limit: number;
  staleAfterMs: number;
}): Promise<RenderJobRecord[]> {
  const records = await db.videoRender.findMany({
    where: {
      status: { in: ["queued", "processing"] },
    },
    take: params.limit,
  });

  const now = Date.now();
  return records
    .map((record) => normalizeRecord(record, {} as NormalizedRenderRequest))
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
