import { retryFailedJob, RetryFailedJobResult } from "@/lib/jobs/retry";
import {
  publishCompletedJobToMoltBook,
  syncGalleryToMoltBook,
  MoltBookSyncSummary,
} from "@/lib/social/moltbook-publisher";

export interface WorkerCommandPayload {
  jobId?: string;
  limit?: number;
}

export async function executeRetryFailedJobCommand(
  payload: WorkerCommandPayload,
): Promise<RetryFailedJobResult> {
  if (typeof payload.jobId !== "string" || payload.jobId.trim().length === 0) {
    throw new Error("Missing jobId");
  }

  return retryFailedJob(payload.jobId.trim());
}

export async function executeMoltBookSyncCommand(
  payload: WorkerCommandPayload,
): Promise<MoltBookSyncSummary> {
  if (typeof payload.jobId === "string" && payload.jobId.trim().length > 0) {
    const result = await publishCompletedJobToMoltBook(payload.jobId.trim());
    return {
      scanned: 1,
      posted: result.status === "posted" ? 1 : 0,
      skipped: result.status === "skipped" ? 1 : 0,
      failed: result.status === "failed" ? 1 : 0,
      results: [result],
    };
  }

  return syncGalleryToMoltBook(payload.limit);
}
