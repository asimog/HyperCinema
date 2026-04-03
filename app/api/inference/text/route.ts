import { NextRequest, NextResponse } from "next/server";

import { generateTextInference } from "@/lib/inference/text";
import type { TextInferenceProviderId } from "@/lib/inference/providers";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const INFERENCE_TEXT_RATE_LIMIT_RULES = [
  { name: "inference_text_per_minute", windowSec: 60, limit: 10 },
  { name: "inference_text_per_hour", windowSec: 60 * 60, limit: 120 },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: TextInferenceProviderId;
      model?: string | null;
      prompt?: string;
      messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      temperature?: number;
      maxTokens?: number;
    };

    const messages = body.messages?.length
      ? body.messages
      : body.prompt?.trim()
        ? [{ role: "user" as const, content: body.prompt.trim() }]
        : [];

    if (!messages.length) {
      return NextResponse.json(
        { error: "prompt or messages are required." },
        { status: 400 },
      );
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_inference_text_post",
      key: ip,
      rules: [...INFERENCE_TEXT_RATE_LIMIT_RULES],
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

    const content = await generateTextInference({
      provider: body.provider,
      model: body.model ?? undefined,
      messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });

    return NextResponse.json({
      provider: body.provider ?? null,
      model: body.model ?? null,
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Text inference failed", message },
      { status: 500 },
    );
  }
}
