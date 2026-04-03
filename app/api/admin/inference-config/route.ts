import { NextRequest, NextResponse } from "next/server";

import { cockpitSessionCookie } from "@/lib/admin/cockpit-auth";
import { getInferenceRuntimeConfig, updateInferenceRuntimeConfig } from "@/lib/inference/config";
import {
  TEXT_INFERENCE_PROVIDER_OPTIONS,
  VIDEO_INFERENCE_PROVIDER_OPTIONS,
  isTextInferenceProvider,
  isVideoInferenceProvider,
  type TextInferenceProviderId,
  type VideoInferenceProviderId,
} from "@/lib/inference/providers";

function isAuthed(request: NextRequest): boolean {
  return request.cookies.get(cockpitSessionCookie.name)?.value === cockpitSessionCookie.value;
}

function trimOrNull(value: unknown): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const config = await getInferenceRuntimeConfig();
  return NextResponse.json({
    config,
    options: {
      text: TEXT_INFERENCE_PROVIDER_OPTIONS,
      video: VIDEO_INFERENCE_PROVIDER_OPTIONS,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as {
    text?: { provider?: string; model?: string | null; baseUrl?: string | null };
    video?: { provider?: string; model?: string | null; baseUrl?: string | null };
  };

  const textProvider = body.text?.provider;
  if (textProvider && !isTextInferenceProvider(textProvider)) {
    return NextResponse.json({ error: `Unsupported text provider: ${textProvider}` }, { status: 400 });
  }

  const videoProvider = body.video?.provider;
  if (videoProvider && !isVideoInferenceProvider(videoProvider)) {
    return NextResponse.json({ error: `Unsupported video provider: ${videoProvider}` }, { status: 400 });
  }

  const next = await updateInferenceRuntimeConfig({
    text:
      body.text && textProvider
        ? {
            provider: textProvider as TextInferenceProviderId,
            model: trimOrNull(body.text.model),
            baseUrl: trimOrNull(body.text.baseUrl),
          }
        : undefined,
    video:
      body.video && videoProvider
        ? {
            provider: videoProvider as VideoInferenceProviderId,
            model: trimOrNull(body.video.model),
            baseUrl: trimOrNull(body.video.baseUrl),
          }
        : undefined,
    updatedBy: "cockpit",
  });

  return NextResponse.json({ config: next });
}
