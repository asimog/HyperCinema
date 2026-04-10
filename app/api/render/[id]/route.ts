// Render status endpoint — polls xAI GET /videos/:id and normalises response
// for lib/video/client.ts which expects { status, renderStatus, videoUrl, thumbnailUrl }

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 15;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

function findVideoUrl(obj: unknown): string | null {
  if (typeof obj === "string") {
    if (/^https?:\/\//i.test(obj) && /(mp4|mov|webm)(\?|$)/i.test(obj)) return obj;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k.toLowerCase().includes("video") || k.toLowerCase().includes("url")) {
        const found = findVideoUrl(v);
        if (found) return found;
      }
    }
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findVideoUrl(v);
      if (found) return found;
    }
  }
  return null;
}

function normalizeXaiStatus(payload: Record<string, unknown>): string {
  return ((payload.status ?? payload.state ?? "") as string).trim().toLowerCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const env = getEnv();
  const token = extractBearer(request.headers.get("authorization") ?? undefined);
  if (!token || token !== env.VIDEO_API_KEY) {
    return unauthorized();
  }

  const { id } = await params;
  const requestId = decodeURIComponent(id);

  const apiKey = env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY;
  const xaiBase = (env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL).replace(/\/+$/, "");

  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 503 });
  }

  const statusResp = await fetch(`${xaiBase}/videos/${encodeURIComponent(requestId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!statusResp.ok) {
    const body = await statusResp.text();
    return NextResponse.json(
      { error: `xAI status check failed (${statusResp.status})`, details: body },
      { status: statusResp.status },
    );
  }

  const payload = (await statusResp.json()) as Record<string, unknown>;
  const xaiStatus = normalizeXaiStatus(payload);
  const videoUrl = findVideoUrl(payload.video_url ?? payload.videoUrl ?? payload);

  // Map xAI status to the format expected by lib/video/client.ts
  let status: string;
  if (videoUrl || xaiStatus === "succeeded" || xaiStatus === "completed" || xaiStatus === "ready") {
    status = "ready";
  } else if (xaiStatus === "failed" || xaiStatus === "error") {
    status = "failed";
  } else {
    status = "processing";
  }

  return NextResponse.json({
    id: requestId,
    status,
    renderStatus: status,
    videoUrl: videoUrl ?? null,
    thumbnailUrl: null,
    error: status === "failed" ? ((payload.error as string) ?? "xAI render failed") : null,
  });
}
