/**
 * POST /api/x402/hashmyth
 * x402-paid HashMyth video generation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createX402PaidTokenVideoJob } from "@/lib/jobs/repository";
import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { logger } from "@/lib/logging/logger";
import { videoStyleSchema } from "@/lib/styles/video-style-validation";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const HASHMYTH_X402_RATE_LIMIT = [
  { name: "hashmyth_x402_per_hour", windowSec: 3600, limit: 5 },
] as const;

const hashmythX402Schema = z.object({
  tokenAddress: z.string().min(1),
  chain: z.enum(["solana", "ethereum", "base", "bsc"]).default("solana"),
  style: videoStyleSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_x402_hashmyth",
      key: ip,
      rules: [...HASHMYTH_X402_RATE_LIMIT],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: rateLimit.retryAfterSec },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = hashmythX402Schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tokenAddress, chain, style } = validation.data;

    const job = await createX402PaidTokenVideoJob({
      tokenAddress,
      packageType: "1d",
      subjectChain: chain as any,
      subjectName: tokenAddress,
      transaction: `hashmyth-${Date.now()}`,
      stylePreset: style || "trench_neon",
      priceUsdc: 1500000,
      videoSeconds: 30,
    });

    await dispatchSingleJob(job.jobId);

    logger.info("hashmyth_x402_job_created", {
      component: "api",
      jobId: job.jobId,
      tokenAddress,
    });

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      watchUrl: `/job/${job.jobId}`,
    });
  } catch (error) {
    logger.error("hashmyth_x402_failed", {
      component: "api",
      errorCode: "hashmyth_x402_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to create HashMyth job", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
