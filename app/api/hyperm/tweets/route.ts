import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { fetchXProfileTweets } from "@/lib/x/api";

export const runtime = "nodejs";

const requestSchema = z.object({
  profileInput: z.string().min(2).max(500),
});

const HYPERM_TWEETS_RATE_LIMIT_RULES = [
  { name: "hyperm_tweets_per_minute", windowSec: 60, limit: 6 },
  { name: "hyperm_tweets_per_hour", windowSec: 60 * 60, limit: 40 },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_hyperm_tweets_post",
      key: `${ip}:${parsed.data.profileInput.toLowerCase()}`,
      rules: [...HYPERM_TWEETS_RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const result = await fetchXProfileTweets({
      profileInput: parsed.data.profileInput,
      maxTweets: 42,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("not configured") ||
      message.includes("resolve the X profile") ||
      message.includes("no tweets available")
        ? 503
        : 400;

    return NextResponse.json(
      {
        error: "Failed to load X profile tweets",
        message,
      },
      { status },
    );
  }
}
