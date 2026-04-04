// MythXEliza generation endpoint with rate limits
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMythXElizaVideo } from "@/lib/elizaos/mythx-agent";
import { videoStyleSchema } from "@/lib/styles/video-style-validation";
import { validatePromoCode } from "@/lib/promocodes/manager";
import { logger } from "@/lib/logging/logger";
import { randomUUID } from "crypto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

// Rate limit rules for generation requests
const MYTHX_ELIZA_RATE_LIMIT_RULES = [
  { name: "mythx_eliza_per_10min", windowSec: 600, limit: 3 },
  { name: "mythx_eliza_per_hour", windowSec: 3600, limit: 10 },
] as const;

// Zod schema for request validation
const mythxElizaRequestSchema = z.object({
  profileInput: z.string().min(1, "X profile handle or URL is required"),
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
      scope: "api_mythx_eliza_generate",
      key: ip,
      rules: [...MYTHX_ELIZA_RATE_LIMIT_RULES],
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
    const validation = mythxElizaRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { profileInput, style, maxTweets, promoCode, wallet } = validation.data;

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

    logger.info("mythx_eliza_generation_started", {
      component: "api",
      route: "/api/mythx-eliza/generate",
      profileInput,
      style,
      maxTweets,
      promoCode,
      ip,
    });

    // Generate video via ElizaOS
    const result = await generateMythXElizaVideo({
      profileInput,
      style,
      maxTweets,
      promoCode,
      wallet: wallet || `web-${randomUUID()}`,
      jobId: `mythx-web-${randomUUID()}`,
    });

    logger.info("mythx_eliza_generation_completed", {
      component: "api",
      profileInput,
      style,
      totalScenes: result.metadata.totalScenes,
      totalDuration: result.metadata.totalDurationSeconds,
      processingTime: result.metadata.processingTimeMs,
    });

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      videoUrl: result.videoUrl,
      galleryUrl: result.galleryUrl,
      scenes: result.scenes,
      metadata: result.metadata,
      postedToTwitter: result.postedToTwitter,
      twitterPostUrl: result.twitterPostUrl,
      promoCodeUsed: result.promoCodeUsed,
    });
  } catch (error) {
    logger.error("mythx_eliza_generation_failed", {
      component: "api",
      errorCode: "mythx_eliza_generation_failed",
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

/**
 * GET /api/mythx-eliza/status
 * Check ElizaOS agent status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { getElizaOSClient } = await import("@/lib/elizaos/client");
    const { MYTHX_ELIZA_AGENT_ID } = await import("@/lib/elizaos/mythx-character");

    const client = getElizaOSClient();
    const agent = await client.getAgent(MYTHX_ELIZA_AGENT_ID);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get agent status",
        message: error instanceof Error ? error.message : "Unknown error",
        agentStatus: "unavailable",
      },
      { status: 500 }
    );
  }
}
