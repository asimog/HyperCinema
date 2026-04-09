// Group chat: in-memory SSE broadcast + POST to send messages
// Messages are ephemeral (in-memory). For persistence, attach a DB table.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
  role: "user" | "agent";
}

// Shared in-memory state (per worker instance — acceptable for Railway single-instance)
const messages: ChatMessage[] = [];
const subscribers = new Set<(msg: ChatMessage) => void>();
const MAX_HISTORY = 100;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function broadcast(msg: ChatMessage) {
  for (const fn of subscribers) fn(msg);
}

// GET — SSE stream of group chat messages
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      request.signal.addEventListener("abort", () => {
        closed = true;
        subscribers.delete(handler);
        controller.close();
      });

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
          subscribers.delete(handler);
        }
      };

      // Send last N messages as history on connect
      send({ type: "history", messages: messages.slice(-50) });

      // Subscribe to new messages
      const handler = (msg: ChatMessage) => send({ type: "message", message: msg });
      subscribers.add(handler);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// POST — send a message to the group chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = String(body.text ?? "").trim().slice(0, 2000);
    const sender = String(body.sender ?? "anonymous").trim().slice(0, 64);

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const msg: ChatMessage = {
      id: uid(),
      sender,
      text,
      ts: Date.now(),
      role: "user",
    };

    messages.push(msg);
    if (messages.length > MAX_HISTORY) messages.splice(0, messages.length - MAX_HISTORY);
    broadcast(msg);

    return NextResponse.json({ ok: true, message: msg });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
