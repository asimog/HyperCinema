import { NextRequest, NextResponse } from "next/server";

import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import type { VideoInferenceProviderId } from "@/lib/inference/providers";
import { fetchWithTimeout } from "@/lib/network/http";
import { getEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const INFERENCE_VIDEO_RATE_LIMIT_RULES = [
  { name: "inference_video_per_minute", windowSec: 60, limit: 5 },
  { name: "inference_video_per_hour", windowSec: 60 * 60, limit: 30 },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: VideoInferenceProviderId;
      model?: string | null;
      payload?: Record<string, unknown>;
    };

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_inference_video_post",
      key: ip,
      rules: [...INFERENCE_VIDEO_RATE_LIMIT_RULES],
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

    const env = getEnv();
    const config = await getInferenceRuntimeConfig();
    const provider = body.provider ?? (config.video.provider as VideoInferenceProviderId);
    const model = body.model ?? config.video.model;
    const baseUrl = config.video.baseUrl ?? env.VIDEO_API_BASE_URL;
    const payload = {
      ...(body.payload ?? {}),
      provider,
      model,
    };

    if (!baseUrl || !env.VIDEO_API_KEY) {
      return NextResponse.json(
        { error: "VIDEO_API_BASE_URL and VIDEO_API_KEY must be configured." },
        { status: 503 },
      );
    }

    const response = await fetchWithTimeout(
      `${baseUrl.replace(/\/+$/, "")}/render`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.VIDEO_API_KEY}`,
        },
        body: JSON.stringify(payload),
      },
      20_000,
    );

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Video inference failed", message: text },
        { status: response.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ raw: text });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Video inference failed", message },
      { status: 500 },
    );
  }
}
