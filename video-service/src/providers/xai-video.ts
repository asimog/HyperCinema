import { setTimeout as sleep } from "timers/promises";
import { getVideoServiceEnv } from "../env";

export interface GenerateXAiClipInput {
  model: string;
  resolution: "480p" | "720p";
  aspectRatio?: "1:1" | "16:9" | "9:16";
  prompt: string;
  durationSeconds: number;
  imageUrl?: string | null;
  apiKey?: string | null;
  baseUrl?: string | null;
  onProgress?: () => Promise<void> | void;
}

interface XAiVideoStartResponse {
  id?: string;
  request_id?: string;
  video_url?: string;
}

interface XAiVideoStatusResponse {
  id?: string;
  request_id?: string;
  status?: string;
  state?: string;
  video_url?: string;
  error?: string | { message?: string };
}

function normalizeImageUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function extractRequestId(payload: XAiVideoStartResponse | XAiVideoStatusResponse): string | null {
  return payload.request_id?.trim() || payload.id?.trim() || null;
}

function collectVideoUrls(value: unknown, collector: Set<string>): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) && /(mp4|mov|webm)(\?|$)/i.test(value)) {
      collector.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectVideoUrls(item, collector);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      key.toLowerCase().includes("video") ||
      key.toLowerCase().includes("url") ||
      key.toLowerCase().includes("download")
    ) {
      collectVideoUrls(item, collector);
      continue;
    }
    collectVideoUrls(item, collector);
  }
}

function extractVideoUrls(payload: unknown): string[] {
  const urls = new Set<string>();
  collectVideoUrls(payload, urls);
  return [...urls];
}

function normalizeStatus(payload: XAiVideoStatusResponse): string {
  return (payload.status ?? payload.state ?? "").trim().toLowerCase();
}

function extractErrorMessage(payload: XAiVideoStatusResponse): string | null {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
    return payload.error.message.trim();
  }
  return null;
}

export class XAiVideoClient {
  async generateClip(input: GenerateXAiClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }> {
    const env = getVideoServiceEnv();
    const apiKey = normalizeValue(input.apiKey) ?? env.XAI_API_KEY ?? null;
    const baseUrl = (input.baseUrl?.trim() || env.XAI_BASE_URL).replace(/\/+$/, "");

    if (!apiKey) {
      throw new Error("XAI_API_KEY is required for xAI video generation.");
    }
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const startResponse = await fetch(`${baseUrl}/videos/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: input.model || env.XAI_VIDEO_MODEL,
        prompt: input.prompt,
        image_url: normalizeImageUrl(input.imageUrl),
        duration_seconds: Math.max(1, Math.min(15, Math.floor(input.durationSeconds))),
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio ?? "16:9",
      }),
    });

    if (!startResponse.ok) {
      const body = await startResponse.text();
      throw new Error(`xAI video start failed (${startResponse.status}): ${body}`);
    }

    const started = (await startResponse.json()) as XAiVideoStartResponse;
    const immediateUrls = extractVideoUrls(started);
    if (immediateUrls.length) {
      return {
        operationName: extractRequestId(started) ?? "xai-immediate",
        videoUris: immediateUrls,
        videoBytesBase64: [],
      };
    }

    const requestId = extractRequestId(started);
    if (!requestId) {
      throw new Error("xAI video generation did not return a request id.");
    }

    for (let attempt = 0; attempt < env.VERTEX_MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(env.VERTEX_POLL_INTERVAL_MS);
      await input.onProgress?.();

      const statusResponse = await fetch(`${baseUrl}/videos/${encodeURIComponent(requestId)}`, {
        method: "GET",
        headers,
      });

      if (!statusResponse.ok) {
        const body = await statusResponse.text();
        throw new Error(`xAI video polling failed (${statusResponse.status}): ${body}`);
      }

      const statusPayload = (await statusResponse.json()) as XAiVideoStatusResponse;
      const status = normalizeStatus(statusPayload);

      if (status === "failed" || status === "error" || status === "cancelled") {
        throw new Error(extractErrorMessage(statusPayload) ?? "xAI video generation failed.");
      }

      const videoUris = extractVideoUrls(statusPayload);
      if (
        status === "completed" ||
        status === "complete" ||
        status === "ready" ||
        status === "succeeded" ||
        videoUris.length
      ) {
        if (!videoUris.length) {
          throw new Error("xAI video generation completed without a video URL.");
        }

        return {
          operationName: requestId,
          videoUris,
          videoBytesBase64: [],
        };
      }
    }

    throw new Error("Timed out while waiting for xAI video generation.");
  }
}
