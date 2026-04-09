// SSE feed: streams live job updates (in-progress + recent complete)
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 3000;
const FEED_TAKE = 30;

async function getJobFeed() {
  try {
    const jobs = await db.job.findMany({
      where: {
        status: {
          in: ["processing", "payment_detected", "complete", "failed"],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: FEED_TAKE,
      select: {
        jobId: true,
        status: true,
        progress: true,
        requestKind: true,
        subjectName: true,
        subjectSymbol: true,
        stylePreset: true,
        videoSeconds: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return jobs;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      request.signal.addEventListener("abort", () => {
        closed = true;
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
        }
      };

      // Initial snapshot
      const initial = await getJobFeed();
      send({ type: "snapshot", jobs: initial });

      // Poll loop
      while (!closed) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (closed) break;
        const jobs = await getJobFeed();
        send({ type: "update", jobs });
      }
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
