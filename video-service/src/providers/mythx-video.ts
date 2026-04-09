// MythX video provider for video-service
import { setTimeout as sleep } from "timers/promises";
import { getVideoServiceEnv } from "../env";

// Input for generating a single clip
export interface GenerateMythXClipInput {
  model?: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio?: string;
  style?: string;
  imageUrl?: string | null;
  apiKey?: string | null;
  baseUrl?: string | null;
  onProgress?: () => Promise<void> | void;
}

// Response from MythX video start
interface MythXVideoStartResponse {
  id?: string;
  videoUrl?: string;
  status?: string;
}

// Response from polling video status
interface MythXVideoStatusResponse {
  id?: string;
  status?: string;
  videoUrl?: string;
  error?: string | { message?: string };
  createdAt?: string;
  completedAt?: string;
}

// Clean image URL or return undefined
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

function extractVideoUrl(payload: MythXVideoStatusResponse): string | null {
  return payload.videoUrl?.trim() || null;
}

function extractErrorMessage(payload: MythXVideoStatusResponse): string | null {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
    return payload.error.message.trim();
  }
  return null;
}

export class MythXVideoClient {
  async generateClip(input: GenerateMythXClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }> {
    const env = getVideoServiceEnv();
    const apiKey = normalizeValue(input.apiKey) ?? env.MYTHX_API_KEY ?? null;
    if (!apiKey) {
      throw new Error("MYTHX_API_KEY is required for MythX video generation.");
    }

    const baseUrl = normalizeMythXBaseUrl(input.baseUrl ?? env.MYTHX_BASE_URL);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const startResponse = await fetch(`${baseUrl}/api/videos/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        model: input.model || env.MYTHX_VIDEO_MODEL,
        duration: Math.max(1, Math.min(30, Math.floor(input.durationSeconds))),
        aspect_ratio: input.aspectRatio ?? "16:9",
        style: input.style,
        image_url: normalizeImageUrl(input.imageUrl),
      }),
    });

    if (!startResponse.ok) {
      const body = await startResponse.text();
      throw new Error(`MythX video start failed (${startResponse.status}): ${body}`);
    }

    const started = (await startResponse.json()) as MythXVideoStartResponse;
    const immediateUrl = extractVideoUrl(started as MythXVideoStatusResponse);
    
    if (immediateUrl) {
      return {
        operationName: started.id ?? "mythx-immediate",
        videoUris: [immediateUrl],
        videoBytesBase64: [],
      };
    }

    const videoId = started.id;
    if (!videoId) {
      throw new Error("MythX video generation did not return a video id.");
    }

    const maxAttempts = env.VERTEX_MAX_POLL_ATTEMPTS;
    const pollInterval = env.VERTEX_POLL_INTERVAL_MS;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await sleep(pollInterval);
      await input.onProgress?.();

      const statusResponse = await fetch(`${baseUrl}/api/videos/${encodeURIComponent(videoId)}`, {
        method: "GET",
        headers,
      });

      if (!statusResponse.ok) {
        const body = await statusResponse.text();
        throw new Error(`MythX video polling failed (${statusResponse.status}): ${body}`);
      }

      const statusPayload = (await statusResponse.json()) as MythXVideoStatusResponse;
      const status = (statusPayload.status ?? "").trim().toLowerCase();

      if (status === "failed" || status === "error" || status === "cancelled") {
        throw new Error(extractErrorMessage(statusPayload) ?? "MythX video generation failed.");
      }

      const videoUrl = extractVideoUrl(statusPayload);
      if (
        status === "completed" ||
        status === "complete" ||
        status === "ready" ||
        status === "succeeded" ||
        videoUrl
      ) {
        if (!videoUrl) {
          throw new Error("MythX video generation completed without a video URL.");
        }

        return {
          operationName: videoId,
          videoUris: [videoUrl],
          videoBytesBase64: [],
        };
      }
    }

    throw new Error("Timed out while waiting for MythX video generation.");
  }
}

function normalizeMythXBaseUrl(value?: string): string {
  const fallback = "https://cloud.milady.ai";
  const trimmed = (value || fallback).replace(/\/+$/, "");
  return trimmed.replace(/\/api(?:\/v1)?$/i, "");
}
