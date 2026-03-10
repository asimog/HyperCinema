import { getEnv } from "@/lib/env";
import {
  claimDispatchJob,
  claimDueDispatchJobs,
  markDispatchJobSuccess,
  rescheduleDispatchJob,
} from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { logger } from "@/lib/logging/logger";

export interface DispatchAttemptResult {
  jobId: string;
  status: "dispatched" | "skipped" | "retry_scheduled";
  error?: string;
}

export interface DispatchRunSummary {
  processed: number;
  dispatched: number;
  skipped: number;
  retryScheduled: number;
  results: DispatchAttemptResult[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown dispatch error";
}

async function runDispatchAttempt(jobId: string): Promise<DispatchAttemptResult> {
  try {
    await triggerJobProcessing(jobId);
    await markDispatchJobSuccess(jobId);
    return {
      jobId,
      status: "dispatched",
    };
  } catch (error) {
    const message = errorMessage(error);
    await rescheduleDispatchJob(jobId, message);
    logger.warn("job_dispatch_retry_scheduled", {
      component: "job_dispatch",
      stage: "dispatch",
      jobId,
      errorCode: "dispatch_failed",
      errorMessage: message,
    });
    return {
      jobId,
      status: "retry_scheduled",
      error: message,
    };
  }
}

export async function dispatchSingleJob(jobId: string): Promise<DispatchAttemptResult> {
  const claimed = await claimDispatchJob(jobId);
  if (!claimed) {
    return {
      jobId,
      status: "skipped",
    };
  }

  return runDispatchAttempt(jobId);
}

export async function dispatchDueJobs(
  requestedLimit?: number,
): Promise<DispatchRunSummary> {
  const env = getEnv();
  const limit = Math.max(
    1,
    Math.min(
      200,
      requestedLimit && Number.isFinite(requestedLimit)
        ? Math.floor(requestedLimit)
        : env.JOB_DISPATCH_BATCH_LIMIT,
    ),
  );

  const claimed = await claimDueDispatchJobs(limit);
  const results: DispatchAttemptResult[] = [];

  for (const record of claimed) {
    const result = await runDispatchAttempt(record.jobId);
    results.push(result);
  }

  return {
    processed: results.length,
    dispatched: results.filter((result) => result.status === "dispatched").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    retryScheduled: results.filter((result) => result.status === "retry_scheduled")
      .length,
    results,
  };
}
