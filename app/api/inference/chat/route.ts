// /api/inference/chat — Chat homepage compatibility route
// Translates { message: string } → { messages: [{ role: "user", content: string }] }
// and pipes to the SSE streaming handler at /api/chat/stream
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message string is required" },
        { status: 400 },
      );
    }

    // Forward to the actual chat stream endpoint
    const { protocol, host } = new URL(request.url);
    const streamUrl = `${protocol}//${host}/api/chat/stream`;

    const streamResp = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        provider: body.provider,
      }),
    });

    if (!streamResp.ok) {
      const errText = await streamResp.text().catch(() => "");
      logger.error("inference_chat_proxy_error", {
        component: "api",
        status: streamResp.status,
        detail: errText.slice(0, 500),
      });
      return NextResponse.json(
        { error: "Chat service unavailable", detail: errText.slice(0, 200) },
        { status: streamResp.status },
      );
    }

    // Proxy the SSE stream back to the client
    return new Response(streamResp.body, {
      status: streamResp.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    logger.error("inference_chat_failed", {
      component: "api",
      errorCode: "inference_chat_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
