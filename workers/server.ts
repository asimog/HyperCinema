// ── Worker HTTP Server ─────────────────────────────────────────────
// Background job processor. Receives job dispatch requests from Vercel,
// runs the full analytics → script → video → upload pipeline.
// Endpoints: POST / (process job), POST /retry-job, POST /moltbook-sync,
//            GET /healthz
// Telegram bot and X bot are in separate files (not imported here).

import { logger } from "@/lib/logging/logger";
import { createServer } from "http";
import {
  executeMoltBookSyncCommand,
  executeRetryFailedJobCommand,
} from "./commands";
import { processJob } from "./process-job";

class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
}

function unauthorized(response: import("http").ServerResponse) {
  response.statusCode = 401;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ error: "Unauthorized" }));
}

function sendJson(
  response: import("http").ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(
  request: import("http").IncomingMessage,
  maxBodyBytes: number,
): Promise<{ jobId?: string; limit?: number }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    request.on("data", (chunk) => {
      const buffer = Buffer.from(chunk);
      totalBytes += buffer.length;

      if (totalBytes > maxBodyBytes) {
        reject(new BodyTooLargeError());
        request.destroy();
        return;
      }

      chunks.push(buffer);
    });

    request.on("error", reject);
    request.on("end", () => {
      try {
        const rawBody = Buffer.concat(chunks).toString("utf8").trim();
        resolve(
          (rawBody ? JSON.parse(rawBody) : {}) as {
            jobId?: string;
            limit?: number;
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}

const port = Number(process.env.PORT ?? "8080");
const workerToken = process.env.WORKER_TOKEN;
const allowUnauthenticatedWorker =
  process.env.WORKER_ALLOW_UNAUTHENTICATED === "true";
const maxBodyBytes = Math.max(
  1_024,
  Number(process.env.WORKER_MAX_BODY_BYTES ?? 32 * 1_024),
);

if (!workerToken && !allowUnauthenticatedWorker) {
  throw new Error(
    "WORKER_TOKEN is required. Set WORKER_ALLOW_UNAUTHENTICATED=true only for isolated local development.",
  );
}

if (allowUnauthenticatedWorker) {
  logger.warn("worker_authentication_disabled", {
    component: "worker",
    stage: "startup",
    errorCode: "worker_authentication_disabled",
    errorMessage:
      "WORKER_ALLOW_UNAUTHENTICATED=true was set; endpoints are running without bearer auth.",
  });
}

const activeJobs = new Set<string>();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = url.pathname;
  const isJobRoute =
    request.method === "POST" &&
    (pathname === "/" || pathname === "/jobs/process");
  const isRetryRoute = request.method === "POST" && pathname === "/retry-job";
  const isMoltBookSyncRoute =
    request.method === "POST" && pathname === "/moltbook-sync";
  const isHealthRoute =
    request.method === "GET" &&
    (pathname === "/healthz" || pathname === "/health");

  if (isHealthRoute) {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isJobRoute && !isRetryRoute && !isMoltBookSyncRoute) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!allowUnauthenticatedWorker && workerToken) {
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${workerToken}`) {
      unauthorized(response);
      return;
    }
  }

  let payload: { jobId?: string; limit?: number };
  try {
    payload = await readJsonBody(request, maxBodyBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      sendJson(response, 413, { error: "Payload too large" });
      return;
    }
    sendJson(response, 400, { error: "Invalid JSON body" });
    return;
  }

  if (isMoltBookSyncRoute) {
    try {
      const summary = await executeMoltBookSyncCommand(payload);
      sendJson(response, 200, { ok: true, ...summary });
      return;
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "MoltBook sync failure",
      });
      return;
    }
  }

  if (isRetryRoute) {
    if (!payload.jobId || typeof payload.jobId !== "string") {
      sendJson(response, 400, { error: "Missing jobId" });
      return;
    }

    try {
      const result = await executeRetryFailedJobCommand(payload);
      sendJson(response, 200, { ok: true, ...result });
      return;
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Retry failure",
      });
      return;
    }
  }

  if (!payload.jobId || typeof payload.jobId !== "string") {
    sendJson(response, 400, { error: "Missing jobId" });
    return;
  }

  const jobId = payload.jobId;

  if (activeJobs.has(jobId)) {
    sendJson(response, 202, { ok: true, jobId, queued: false });
    return;
  }

  activeJobs.add(jobId);
  void processJob(jobId)
    .catch((error) => {
      logger.error("worker_process_job_failed", {
        component: "worker",
        stage: "process_job",
        jobId,
        errorCode: "worker_process_failure",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
    })
    .finally(() => {
      activeJobs.delete(jobId);
    });

  sendJson(response, 202, { ok: true, jobId, queued: true });
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;

// ── Graceful shutdown ────────────────────────────────────────────────

function gracefulShutdown(signal: string) {
  logger.info("worker_shutdown", {
    component: "worker",
    stage: "shutdown",
    signal,
  });

  // Close HTTP server
  server.close(() => {
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(port, () => {
  console.log(`HYPERCINEMA worker listening on ${port}`);
});
