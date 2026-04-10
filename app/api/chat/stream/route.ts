// ── Chat Stream API — SSE AI Chat with Concierge ───────────────────
// POST /api/chat/stream — streams AI responses via Server-Sent Events
// Rate limited: 10/min, 60/hour per IP
// Provider: xAI (grok-3), falls back to OpenRouter if configured
// System prompt: "You are HyperM — sharp, concise, crypto-native."

import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

// Hardcoded xAI config — TEXT_INFERENCE_PROVIDER is xAI, uses XAI_TEXT_API_KEY
const XAI_BASE_URL =
  process.env.XAI_BASE_URL ||
  process.env.XAI_TEXT_BASE_URL ||
  "https://api.x.ai/v1";
const XAI_API_KEY =
  process.env.XAI_TEXT_API_KEY || process.env.XAI_API_KEY || null;
const XAI_MODEL = process.env.XAI_TEXT_MODEL || "grok-3";

const RATE_LIMIT_RULES = [
  { name: "chat_stream_per_minute", windowSec: 60, limit: 10 },
  { name: "chat_stream_per_hour", windowSec: 3_600, limit: 60 },
] as const;

function encodeSSE(data: string, event?: string): string {
  let output = "";
  if (event) {
    output += `event: ${event}\n`;
  }
  output += `data: ${data}\n\n`;
  return output;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);

    const rateLimit = await enforceRateLimit({
      scope: "api_chat_stream",
      key: ip,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return new Response(
        encodeSSE(
          JSON.stringify({
            error: "Rate limit exceeded",
            retryAfterSec: rateLimit.retryAfterSec,
          }),
          "error",
        ),
        {
          status: 429,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const body = await request.json();
    const messages: Array<{ role: string; content: string }> =
      body.messages ?? [];

    if (!messages.length) {
      return new Response(
        encodeSSE(
          JSON.stringify({ error: "messages array is required" }),
          "error",
        ),
        {
          status: 400,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const model = XAI_MODEL;
    const apiKey = XAI_API_KEY;
    const baseUrl = XAI_BASE_URL;

    if (!apiKey) {
      return new Response(
        encodeSSE(
          JSON.stringify({ error: "Text inference API key not configured" }),
          "error",
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    if (!baseUrl) {
      return new Response(
        encodeSSE(
          JSON.stringify({ error: "Text inference base URL not configured" }),
          "error",
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    // Stream via standard /chat/completions (OpenAI-compatible, works with all xAI keys)
    const stream = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: body.temperature ?? 0.7,
          max_tokens: body.maxTokens ?? 4096,
          stream: true,
        }),
      },
    );

    if (!stream.ok) {
      const errorBody = await stream.text();
      return new Response(
        encodeSSE(
          JSON.stringify({
            error: `xAI request failed (${stream.status})`,
            details: errorBody,
          }),
          "error",
        ),
        {
          status: stream.status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const reader = stream.body?.getReader();
    if (!reader) {
      return new Response(
        encodeSSE(
          JSON.stringify({ error: "Failed to read response stream" }),
          "error",
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          let fullText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += textDecoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;

              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6).trim();
                if (dataStr === "[DONE]") {
                  controller.enqueue(
                    textEncoder.encode(
                      encodeSSE(JSON.stringify({ done: true }), "done"),
                    ),
                  );
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  // xAI stream events have output_text in delta
                  const delta =
                    parsed.output_text ??
                    parsed.delta?.text ??
                    parsed.delta?.content ??
                    parsed.choices?.[0]?.delta?.content ??
                    "";

                  if (delta) {
                    fullText += delta;
                    controller.enqueue(
                      textEncoder.encode(
                        encodeSSE(
                          JSON.stringify({ content: delta }),
                          "message",
                        ),
                      ),
                    );
                  }
                } catch {
                  // Skip malformed SSE lines
                }
              }
            }
          }

          controller.enqueue(
            textEncoder.encode(
              encodeSSE(
                JSON.stringify({ content: fullText, done: true }),
                "complete",
              ),
            ),
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            textEncoder.encode(
              encodeSSE(
                JSON.stringify({
                  error: "Streaming failed",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                }),
                "error",
              ),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    logger.error("chat_stream_failed", {
      component: "api",
      errorCode: "chat_stream_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return new Response(
      encodeSSE(
        JSON.stringify({
          error: "Chat streaming failed",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        "error",
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  }
}
