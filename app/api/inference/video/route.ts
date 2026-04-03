import { NextRequest, NextResponse } from "next/server";

import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import type { VideoInferenceProviderId } from "@/lib/inference/providers";
import { fetchWithTimeout } from "@/lib/network/http";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: VideoInferenceProviderId;
      model?: string | null;
      payload?: Record<string, unknown>;
    };

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
