import { setTimeout as sleep } from "timers/promises";
import { getVideoServiceEnv } from "../env";

export interface GenerateElizaOSClipInput {
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

interface ElizaOSVideoStartResponse {
  id?: string;
  videoUrl?: string;
  status?: string;
}

interface ElizaOSVideoStatusResponse {
  id?: string;
  status?: string;
  videoUrl?: string;
  error?: string | { message?: string };
  createdAt?: string;
  completedAt?: string;
}

function normalizeValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function extractVideoUrl(payload: ElizaOSVideoStatusResponse): string | null {
  return payload.videoUrl?.trim() || null;
}

function extractErrorMessage(payload: ElizaOSVideoStatusResponse): string | null {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
    return payload.error.message.trim();
  }
  return null;
}

function normalizeElizaOSBaseUrl(value?: string): string {
  const fallback = "https://api.elizacloud.ai";
  const trimmed = (value || fallback).replace(/\/+$/, "");
  return trimmed.replace(/\/api(?:\/v1)?$/i, "");
}

export class ElizaOSVideoClient {
  async generateClip(input: GenerateElizaOSClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }> {
    const env = getVideoServiceEnv();
    const apiKey = normalizeValue(input.apiKey) ?? env.ELIZAOS_API_KEY ?? null;
    if (!apiKey) {
      throw new Error("ELIZAOS_API_KEY is required for ElizaOS video generation.");
    }

    const baseUrl = normalizeElizaOSBaseUrl(input.baseUrl ?? env.ELIZAOS_BASE_URL);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const startResponse = await fetch(`${baseUrl}/api/videos/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        model: input.model || env.ELIZAOS_VIDEO_MODEL,
        duration: Math.max(1, Math.min(30, Math.floor(input.durationSeconds))),
        aspect_ratio: input.aspectRatio ?? "16:9",
        style: input.style,
        image_url: normalizeValue(input.imageUrl),
      }),
    });

    if (!startResponse.ok) {
      const body = await startResponse.text();
      throw new Error(`ElizaOS video start failed (${startResponse.status}): ${body}`);
    }

    const started = (await startResponse.json()) as ElizaOSVideoStartResponse;
    const immediateUrl = extractVideoUrl(started);

    if (immediateUrl) {
      return {
        operationName: started.id ?? "elizaos-immediate",
        videoUris: [immediateUrl],
        videoBytesBase64: [],
      };
    }

    const videoId = started.id;
    if (!videoId) {
      throw new Error("ElizaOS video generation did not return a video id.");
    }

    for (let attempt = 0; attempt < env.VERTEX_MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(env.VERTEX_POLL_INTERVAL_MS);
      await input.onProgress?.();

      const statusResponse = await fetch(`${baseUrl}/api/videos/${encodeURIComponent(videoId)}`, {
        method: "GET",
        headers,
      });

      if (!statusResponse.ok) {
        const body = await statusResponse.text();
        throw new Error(`ElizaOS video polling failed (${statusResponse.status}): ${body}`);
      }

      const statusPayload = (await statusResponse.json()) as ElizaOSVideoStatusResponse;
      const status = (statusPayload.status ?? "").trim().toLowerCase();

      if (status === "failed" || status === "error" || status === "cancelled") {
        throw new Error(extractErrorMessage(statusPayload) ?? "ElizaOS video generation failed.");
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
          throw new Error("ElizaOS video generation completed without a video URL.");
        }

        return {
          operationName: videoId,
          videoUris: [videoUrl],
          videoBytesBase64: [],
        };
      }
    }

    throw new Error("Timed out while waiting for ElizaOS video generation.");
  }
}
