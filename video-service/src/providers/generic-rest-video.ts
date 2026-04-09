import { setTimeout as sleep } from "timers/promises";
import { getVideoServiceEnv } from "../env";

export interface GenerateGenericRestClipInput {
  /** Provider identifier: "fal" | "huggingface" | "others" */
  provider: string;
  model: string;
  prompt: string;
  durationSeconds: number;
  apiKey: string;
  baseUrl: string;
  imageUrl?: string | null;
  onProgress?: () => Promise<void> | void;
}

interface GenericStartResponse {
  request_id?: string;
  id?: string;
  video_url?: string;
  videoUrl?: string;
  url?: string;
  status?: string;
  output?: { video_url?: string } | string;
  video?: { url?: string };
}

interface GenericStatusResponse {
  status?: string;
  video_url?: string;
  videoUrl?: string;
  url?: string;
  output?: { video_url?: string } | string;
  video?: { url?: string };
  error?: string | { message?: string };
}

function extractVideoUrl(payload: GenericStartResponse | GenericStatusResponse): string | null {
  if (typeof payload.video_url === "string" && /^https?:\/\//i.test(payload.video_url)) {
    return payload.video_url;
  }
  if (typeof payload.videoUrl === "string" && /^https?:\/\//i.test(payload.videoUrl)) {
    return payload.videoUrl;
  }
  if (typeof payload.url === "string" && /^https?:\/\//i.test(payload.url)) {
    return payload.url;
  }
  const output = payload.output;
  if (output && typeof output === "object" && typeof output.video_url === "string" && /^https?:\/\//i.test(output.video_url)) {
    return output.video_url;
  }
  const video = payload.video;
  if (video && typeof video === "object" && typeof video.url === "string" && /^https?:\/\//i.test(video.url)) {
    return video.url;
  }
  return null;
}

function extractJobId(payload: GenericStartResponse): string | null {
  return (
    (typeof payload.request_id === "string" && payload.request_id.trim()) ||
    (typeof payload.id === "string" && payload.id.trim()) ||
    null
  );
}

function buildAuthHeader(provider: string, apiKey: string): string {
  // FAL uses "Key" prefix; all other providers use "Bearer"
  if (provider === "fal") {
    return `Key ${apiKey}`;
  }
  return `Bearer ${apiKey}`;
}

function buildStartUrl(provider: string, baseUrl: string, model: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (provider === "fal" || provider === "huggingface") {
    // FAL: POST https://fal.run/{model}
    // HuggingFace: POST https://router.huggingface.co/hf-inference/models/{model}
    return `${base}/${encodeURIComponent(model)}`;
  }
  // Generic / others: POST {baseUrl}/videos/generations
  return `${base}/videos/generations`;
}

function buildStatusUrl(provider: string, baseUrl: string, model: string, jobId: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (provider === "fal") {
    // FAL polls at queue.fal.run, not fal.run
    return `https://queue.fal.run/${encodeURIComponent(model)}/requests/${encodeURIComponent(jobId)}/status`;
  }
  if (provider === "huggingface") {
    return `${base}/${encodeURIComponent(model)}/status/${encodeURIComponent(jobId)}`;
  }
  // Generic / others: GET {baseUrl}/videos/{jobId}
  return `${base}/videos/${encodeURIComponent(jobId)}`;
}

export class GenericRestVideoClient {
  async generateClip(input: GenerateGenericRestClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }> {
    const env = getVideoServiceEnv();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(input.provider, input.apiKey),
    };

    const startUrl = buildStartUrl(input.provider, input.baseUrl, input.model);
    const startBody = JSON.stringify({
      prompt: input.prompt,
      model: input.model,
      duration_seconds: input.durationSeconds,
      image_url: input.imageUrl ?? undefined,
    });

    const startRes = await fetch(startUrl, { method: "POST", headers, body: startBody });
    if (!startRes.ok) {
      const text = await startRes.text();
      throw new Error(
        `${input.provider} video start failed (${startRes.status}): ${text}`,
      );
    }

    const started = (await startRes.json()) as GenericStartResponse;

    // Immediate return if videoUrl is in the start response
    const immediateUrl = extractVideoUrl(started);
    if (immediateUrl) {
      return {
        operationName: "immediate",
        videoUris: [immediateUrl],
        videoBytesBase64: [],
      };
    }

    const jobId = extractJobId(started);
    if (!jobId) {
      throw new Error(`${input.provider} did not return a job id in the start response.`);
    }

    const statusUrl = buildStatusUrl(input.provider, input.baseUrl, input.model, jobId);
    const maxAttempts = env.VERTEX_MAX_POLL_ATTEMPTS;
    const pollIntervalMs = env.VERTEX_POLL_INTERVAL_MS;

    for (let i = 0; i < maxAttempts; i++) {
      await sleep(pollIntervalMs);
      await input.onProgress?.();

      const statusRes = await fetch(statusUrl, { method: "GET", headers });
      if (!statusRes.ok) {
        const text = await statusRes.text();
        throw new Error(
          `${input.provider} video polling failed (${statusRes.status}): ${text}`,
        );
      }

      const status = (await statusRes.json()) as GenericStatusResponse;
      const statusStr = (String(status.status ?? "")).toLowerCase();

      if (statusStr === "failed" || statusStr === "error") {
        const errMsg =
          typeof status.error === "string"
            ? status.error
            : (status.error as { message?: string } | undefined)?.message ?? "unknown error";
        throw new Error(`${input.provider} video generation failed: ${errMsg}`);
      }

      const videoUrl = extractVideoUrl(status);
      if (videoUrl) {
        return {
          operationName: jobId,
          videoUris: [videoUrl],
          videoBytesBase64: [],
        };
      }

      if (statusStr === "completed" || statusStr === "complete" || statusStr === "ready" || statusStr === "succeeded") {
        throw new Error(
          `${input.provider} reported completion but did not return a video URL.`,
        );
      }
    }

    throw new Error(
      `Timed out waiting for ${input.provider} video generation after ${maxAttempts} poll attempts.`,
    );
  }
}
