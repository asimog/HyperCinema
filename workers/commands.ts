import {
  buildSweepSummary,
  sweepDedicatedPaymentAddressForJob,
  sweepDedicatedPaymentAddresses,
  SweepSummary,
} from "./sweep-payments";
import { retryFailedJob, RetryFailedJobResult } from "@/lib/jobs/retry";
import {
  publishCompletedJobToGoonBook,
  syncGalleryToGoonBook,
  GoonBookSyncSummary,
} from "@/lib/social/goonbook-publisher";

export interface WorkerCommandPayload {
  jobId?: string;
  limit?: number;
}

export async function executeSweepCommand(
  payload: WorkerCommandPayload,
): Promise<SweepSummary> {
  if (typeof payload.jobId === "string" && payload.jobId.trim().length > 0) {
    const jobId = payload.jobId.trim();
    const result = await sweepDedicatedPaymentAddressForJob(jobId);
    return buildSweepSummary(1, [result]);
  }

  return sweepDedicatedPaymentAddresses(payload.limit);
}

export async function executeRetryFailedJobCommand(
  payload: WorkerCommandPayload,
): Promise<RetryFailedJobResult> {
  if (typeof payload.jobId !== "string" || payload.jobId.trim().length === 0) {
    throw new Error("Missing jobId");
  }

  return retryFailedJob(payload.jobId.trim());
}

export async function executeGoonBookSyncCommand(
  payload: WorkerCommandPayload,
): Promise<GoonBookSyncSummary> {
  if (typeof payload.jobId === "string" && payload.jobId.trim().length > 0) {
    const result = await publishCompletedJobToGoonBook(payload.jobId.trim());
    return {
      scanned: 1,
      posted: result.status === "posted" ? 1 : 0,
      skipped: result.status === "skipped" ? 1 : 0,
      failed: result.status === "failed" ? 1 : 0,
      results: [result],
    };
  }

  return syncGalleryToGoonBook(payload.limit);
}
