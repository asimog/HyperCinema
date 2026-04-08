// MythX generation endpoint with rate limits
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createDiscountWaivedPromptVideoJob,
  createPromptVideoJob,
} from "@/lib/jobs/repository";
import { videoStyleSchema } from "@/lib/styles/video-style-validation";
import { validatePromoCode } from "@/lib/promocodes/manager";
import { logger } from "@/lib/logging/logger";
import { randomUUID } from "crypto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { dispatchSingleJob } from "@/lib/jobs/dispatch";

export const runtime = "nodejs";

// Rate limit rules for generation requests
const MYTHX_RATE_LIMIT_RULES = [
  { name: "mythx_per_10min", windowSec: 600, limit: 3 },
  { name: "mythx_per_hour", windowSec: 3600, limit: 10 },
] as const;

// Zod schema for request validation
const mythxRequestSchema = z.object({
  profileInput: z.string().min(1, "X profile handle or URL is required"),
  packageType: z.enum(["30s", "60s"]).default("60s"),
  style: videoStyleSchema.optional(),
  maxTweets: z.coerce.number().int().min(1).max(100).default(42),
  promoCode: z.string().optional(),
  wallet: z.string().optional(),
});

// Handle POST request for video generation
export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);

    // Check rate limits before processing
    const rateLimit = await enforceRateLimit({
      scope: "api_mythx_generate",
      key: ip,
      rules: [...MYTHX_RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before generating another video.",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = mythxRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { profileInput, packageType, style, maxTweets, promoCode, wallet } = validation.data;

    // Check promo code validity if provided
    if (promoCode) {
      const validation = await validatePromoCode(promoCode);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: "Invalid promo code",
            message: validation.errorMessage,
          },
          { status: 400 }
        );
      }
    }

    logger.info("mythx_generation_started", {
      component: "api",
      route: "/api/mythx/generate",
      profileInput,
      style,
      maxTweets,
      promoCode,
      ip,
    });

    const jobInput = {
      requestKind: "mythx" as const,
      packageType,
      subjectName: profileInput,
      subjectDescription: `Autobiography generated from the latest ${maxTweets} tweets.`,
      sourceMediaUrl: profileInput.startsWith("http")
        ? profileInput
        : `https://x.com/${profileInput.replace(/^@/, "")}`,
      sourceMediaProvider: "x",
      stylePreset: style ?? "vhs_cinema",
      requestedPrompt: `Build a MythX autobiographical cut from ${maxTweets} recent tweets.`,
      audioEnabled: true,
      visibility: "public" as const,
      pricingMode: "public" as const,
      experience: "mythx" as const,
      creatorId: wallet || `web-${randomUUID()}`,
    };

    const job = promoCode
      ? await createDiscountWaivedPromptVideoJob({
          ...jobInput,
          discountCode: promoCode,
        })
      : await createPromptVideoJob(jobInput);

    if (promoCode) {
      await dispatchSingleJob(job.jobId);
    }

    logger.info("mythx_generation_completed", {
      component: "api",
      profileInput,
      style: job.stylePreset,
      queued: true,
      paymentRequired: !job.paymentWaived,
    });

    return NextResponse.json({
      success: true,
      mode: "queued",
      jobId: job.jobId,
      galleryUrl: `/job/${job.jobId}`,
      status: job.status,
      progress: job.progress,
      paymentRequired: !job.paymentWaived,
      paymentAddress: job.paymentAddress,
      amountSol: job.priceSol,
      promoCodeUsed: job.discountCode,
    });
  } catch (error) {
    logger.error("mythx_generation_failed", {
      component: "api",
      errorCode: "mythx_generation_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      error,
    });

    return NextResponse.json(
      {
        error: "Failed to generate MythX video",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
