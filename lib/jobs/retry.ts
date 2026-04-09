import { prepareFailedJobForRetry } from "@/lib/jobs/repository";
import { logger } from "@/lib/logging/logger";

export type RetryFailedJobReason =
  | "already_processing"
  | "job_not_found"
  | "job_not_failed";

export interface RetryFailedJobResult {
  jobId: string;
  status: "ready" | "skipped";
  reason?: RetryFailedJobReason;
  error?: string;
}

export async function retryFailedJob(
  jobId: string,
): Promise<RetryFailedJobResult> {
  const prepared = await prepareFailedJobForRetry(jobId);
  if (prepared.status !== "ready") {
    return {
      jobId,
      status: "skipped",
      reason: prepared.status,
    };
  }

  logger.info("failed_job_retry_prepared", {
    component: "jobs_retry",
    stage: "retry",
    jobId,
  });

  return {
    jobId,
    status: "ready",
    error: prepared.job?.errorMessage ?? undefined,
  };
}
