/**
 * POST /api/x402/mythx
 * x402-paid MythX video generation - agents pay USDC for autobiographical videos
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getEnv } from "@/lib/env";
import { createX402PaidTokenVideoJob } from "@/lib/jobs/repository";
import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { logger } from "@/lib/logging/logger";
import { videoStyleSchema } from "@/lib/styles/video-style-validation";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const MYTHX_X402_RATE_LIMIT = [
  { name: "mythx_x402_per_hour", windowSec: 3600, limit: 5 },
] as const;

const mythxX402Schema = z.object({
  profileInput: z.string().min(1),
  style: videoStyleSchema.optional(),
  maxTweets: z.coerce.number().int().min(1).max(100).default(42),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_x402_mythx",
      key: ip,
      rules: [...MYTHX_X402_RATE_LIMIT],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: rateLimit.retryAfterSec },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = mythxX402Schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { profileInput, style } = validation.data;

    const jobId = `mythx-x402-${randomUUID()}`;

    // Create x402-paid job using existing repository function
    const job = await createX402PaidTokenVideoJob({
      tokenAddress: profileInput,
      packageType: "1d",
      subjectChain: "solana",
      subjectName: profileInput,
      transaction: jobId, // x402 transaction will be added during payment
      stylePreset: style || "vhs_cinema",
      priceUsdc: 2000000, // 2 USDC
      videoSeconds: 30,
    });

    // Dispatch for processing
    await dispatchSingleJob(job.jobId);

    logger.info("mythx_x402_job_created", {
      component: "api",
      jobId: job.jobId,
      profileInput,
    });

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      watchUrl: `/job/${job.jobId}`,
    });
  } catch (error) {
    logger.error("mythx_x402_failed", {
      component: "api",
      errorCode: "mythx_x402_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to create MythX job", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
