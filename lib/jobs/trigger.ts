import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";
import { processJob } from "@/workers/process-job";

export async function triggerJobProcessing(jobId: string): Promise<void> {
  const env = getEnv();
  if (env.WORKER_URL) {
    if (!env.WORKER_TOKEN) {
      throw new Error("WORKER_TOKEN is required when WORKER_URL is configured");
    }

    await withRetry(
      async () => {
        const response = await fetchWithTimeout(
          env.WORKER_URL!,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.WORKER_TOKEN}`,
            },
            body: JSON.stringify({ jobId }),
          },
          12_000,
        );

        if (!response.ok) {
          const body = await response.text();
          const message = `Failed to trigger worker (${response.status}): ${body || "empty response"}`;
          if (isRetryableHttpStatus(response.status)) {
            throw new RetryableError(message);
          }
          throw new Error(message);
        }
      },
      {
        attempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 3_000,
        onRetry: ({ attempt, error, delayMs }) => {
          logger.warn("worker_trigger_retry", {
            component: "jobs_trigger",
            stage: "trigger_worker",
            jobId,
            attempt,
            durationMs: delayMs,
            errorCode: "worker_trigger_retry",
            errorMessage: error instanceof Error ? error.message : "unknown",
          });
        },
      },
    );
    return;
  }

  if (!env.ALLOW_IN_PROCESS_WORKER) {
    throw new Error(
      "WORKER_URL is not configured and ALLOW_IN_PROCESS_WORKER is disabled",
    );
  }

  // Local/dev fallback when remote worker dispatch is intentionally disabled.
  void processJob(jobId).catch((error) => {
    logger.error("local_worker_execution_failed", {
      component: "jobs_trigger",
      stage: "local_worker",
      jobId,
      errorCode: "local_worker_failure",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
  });
}
