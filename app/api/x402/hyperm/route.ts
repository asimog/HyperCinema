/**
 * POST /api/x402/hyperm
 * x402-paid HyperM video generation - premium creator cuts
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPromptVideoJob } from "@/lib/jobs/repository";
import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { logger } from "@/lib/logging/logger";
import { videoStyleSchema } from "@/lib/styles/video-style-validation";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const HYPERM_X402_RATE_LIMIT = [
  { name: "hyperm_x402_per_hour", windowSec: 3600, limit: 3 },
] as const;

const hypermX402Schema = z.object({
  subjectInput: z.string().min(1),
  style: videoStyleSchema.optional(),
  description: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_x402_hyperm",
      key: ip,
      rules: [...HYPERM_X402_RATE_LIMIT],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: rateLimit.retryAfterSec },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = hypermX402Schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { subjectInput, style, description } = validation.data;

    const job = await createPromptVideoJob({
      requestKind: "generic_cinema",
      packageType: "30s",
      experience: "hyperm",
      requestedPrompt: description || subjectInput,
      stylePreset: style || "vhs_cinema",
      subjectName: subjectInput,
      subjectDescription: description,
      pricingMode: "public",
      visibility: "public",
    });

    await dispatchSingleJob(job.jobId);

    logger.info("hyperm_x402_job_created", {
      component: "api",
      jobId: job.jobId,
      subjectInput,
    });

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      watchUrl: `/job/${job.jobId}`,
    });
  } catch (error) {
    logger.error("hyperm_x402_failed", {
      component: "api",
      errorCode: "hyperm_x402_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to create HyperM job", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
