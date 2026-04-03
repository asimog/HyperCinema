import { NextRequest, NextResponse } from "next/server";

import { generateTextInference } from "@/lib/inference/text";
import type { TextInferenceProviderId } from "@/lib/inference/providers";

export const runtime = "nodejs";

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
