// Background worker that polls for pending jobs.
// Runs alongside the Next.js server on Railway.
import { processJob } from "./workers/process-job";
import { db } from "./lib/db";
import { logger } from "./lib/logging/logger";

const POLL_MS = 30_000;

async function pollAndProcess(): Promise<void> {
  if (!db) return;

  try {
    const pending = await (db as any).$queryRaw`
      SELECT "jobId" FROM "Job"
      WHERE "status" = 'pending'
        AND "paymentWaived" = true
        AND "updatedAt" < NOW() - INTERVAL '5 seconds'
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    if (pending.length === 0) return;

    const jobId = pending[0].jobId;
    logger.info("worker_picked_job", { component: "bg_worker", jobId });

    await processJob(jobId);
    logger.info("worker_job_done", { component: "bg_worker", jobId });
  } catch (err) {
    logger.warn("worker_poll_error", {
      component: "bg_worker",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }
}

export function startBackgroundWorker(): void {
  if (!process.env.DATABASE_URL) {
    logger.info("bg_worker_disabled", {
      component: "bg_worker",
      reason: "DATABASE_URL not set — background worker disabled",
    });
    return;
  }

  logger.info("bg_worker_started", {
    component: "bg_worker",
    pollIntervalMs: POLL_MS,
  });

  // Poll immediately
  pollAndProcess();

  // Then poll every 30s
  setInterval(pollAndProcess, POLL_MS);
}
