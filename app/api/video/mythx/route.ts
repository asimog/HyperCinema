import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPromptVideoJob } from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { fetchXProfileTweets, normalizeXProfileInput } from "@/lib/x/api";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

const mythxSchema = z.object({
  profileInput: z.string().min(1, "X username or profile URL is required"),
});

const RATE_LIMIT_RULES = [
  { name: "mythx_per_handle_per_day", windowSec: 86_400, limit: 2 },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = mythxSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { profileInput } = validation.data;
    const normalized = normalizeXProfileInput(profileInput);

    if (!normalized.username) {
      return NextResponse.json(
        { error: "Invalid X profile handle or URL" },
        { status: 400 },
      );
    }

    // Rate limit per X handle (not IP)
    const handleKey = `xhandle:${normalized.username.toLowerCase()}`;
    const rateLimit = await enforceRateLimit({
      scope: "api_video_mythx",
      key: handleKey,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. This X handle has reached its daily limit.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    // Fetch tweets and generate script
    const profile = await fetchXProfileTweets({
      profileInput,
      maxTweets: 16,
    });

    const subjectName =
      profile.profile.displayName ||
      (normalized.username ? `@${normalized.username}` : "X profile");

    const job = await createPromptVideoJob({
      requestKind: "mythx",
      packageType: "60s",
      subjectName,
      subjectDescription: `Autobiography built from @${profile.profile.username}'s latest tweets.`,
      sourceMediaUrl: profile.profile.profileUrl,
      sourceMediaProvider: "x",
      sourceTranscript: profile.transcript,
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "mythx",
      paymentWaived: true,
    });

    // Trigger background processing
    await triggerJobProcessing(job.jobId);

    logger.info("mythx_video_queued", {
      component: "api",
      route: "/api/video/mythx",
      jobId: job.jobId,
      profileInput,
    });

    return NextResponse.json({
      jobId: job.jobId,
      status: "pending",
    });
  } catch (error) {
    logger.error("mythx_video_failed", {
      component: "api",
      errorCode: "mythx_video_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to generate MythX video" },
      { status: 500 },
    );
  }
}
