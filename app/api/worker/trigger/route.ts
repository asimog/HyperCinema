// Worker trigger endpoint — called by Vercel to dispatch job processing.
// Railway runs the Next.js app with no serverless timeout limits,
// so this endpoint can run the full job processing pipeline.
import { NextRequest, NextResponse } from "next/server";
import { processJob } from "@/workers/process-job";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes on Railway

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.WORKER_TOKEN || "local-dev-key";

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { jobId } = body;
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  logger.info("worker_triggered", {
    component: "api_worker_trigger",
    jobId,
  });

  // Run job processing synchronously — Railway has no timeout
  try {
    await processJob(jobId);
    return NextResponse.json({ ok: true, jobId, status: "processed" });
  } catch (err) {
    logger.error("worker_process_failed", {
      component: "api_worker_trigger",
      jobId,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
