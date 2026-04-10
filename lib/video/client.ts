// ── Video Service HTTP Client ───────────────────────────────────────
// Posts render requests to the video-service and polls for completion.
// Handles both sync (immediate videoUrl) and async (poll with retries) flows.
// Used by: lib/video/pipeline.ts, lib/video/mythx-pipeline.ts

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { GeneratedCinematicScript } from "@/lib/types/domain";
import { XAiVideoRenderPayload } from "@/lib/video/xai";

// Response from POST /render
interface StartRenderResponse {
  id?: string;
  jobId?: string;
  statusUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

// Response from GET /render/:id
interface PollRenderResponse {
  status?: string;
  renderStatus?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Send render job to video-service, poll until done
export async function renderCinematicVideo(params: {
  jobId: string;
  wallet: string;
  durationSeconds: number;
  script: GeneratedCinematicScript;
  xai: XAiVideoRenderPayload;
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const env = getEnv();

  if (!env.VIDEO_API_BASE_URL) {
    throw new Error("VIDEO_API_BASE_URL is required.");
  }

  const baseUrl = env.VIDEO_API_BASE_URL.replace(/\/+$/, "");

  // Build request payload
  const payload = {
    jobId: params.jobId,
    wallet: params.wallet,
    durationSeconds: params.durationSeconds,
    withSound: false,
    resolution: params.xai.resolution ?? "720p",
    hookLine: params.script.hookLine,
    scenes: params.script.scenes,
    videoEngine: "xai",
    provider: "xai",
    model: params.xai.model,
    prompt: params.xai.prompt ?? params.script.hookLine,
    xai: params.xai,
  };

  // POST to /render with retry
  const startPayload = await withRetry(
    async () => {
      const response = await fetchWithTimeout(
        `${baseUrl}/render`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.VIDEO_API_KEY}`,
          },
          body: JSON.stringify(payload),
        },
        20_000,
      );

      if (!response.ok) {
        const body = await response.text();
        const msg = `Video render request failed (${response.status}): ${body}`;
        if (isRetryableHttpStatus(response.status))
          throw new RetryableError(msg);
        throw new Error(msg);
      }

      return (await response.json()) as StartRenderResponse;
    },
    { attempts: 3, baseDelayMs: 900, maxDelayMs: 5_000 },
  );

  // Sync result — video done immediately
  if (startPayload.videoUrl) {
    return {
      videoUrl: startPayload.videoUrl,
      thumbnailUrl: startPayload.thumbnailUrl ?? null,
    };
  }

  // Async result — poll for completion
  const renderId = startPayload.id ?? startPayload.jobId;
  if (!renderId && !startPayload.statusUrl) {
    throw new Error("Video API did not return a render ID.");
  }

  for (
    let attempt = 0;
    attempt < env.VIDEO_RENDER_MAX_POLL_ATTEMPTS;
    attempt += 1
  ) {
    await sleep(env.VIDEO_RENDER_POLL_INTERVAL_MS);

    const pollUrl = startPayload.statusUrl ?? `${baseUrl}/render/${renderId}`;

    let pollResponse: Response;
    try {
      pollResponse = await withRetry(
        async () => {
          const response = await fetchWithTimeout(
            pollUrl,
            { headers: { Authorization: `Bearer ${env.VIDEO_API_KEY}` } },
            12_000,
          );

          if (!response.ok) {
            const body = await response.text();
            const msg = `Video poll failed (${response.status}): ${body || "empty"}`;
            if (isRetryableHttpStatus(response.status))
              throw new RetryableError(msg);
            throw new Error(msg);
          }

          return response;
        },
        { attempts: 2, baseDelayMs: 500, maxDelayMs: 2_000 },
      );
    } catch (error) {
      // Transient errors — keep polling
      if (error instanceof RetryableError || error instanceof TypeError)
        continue;
      throw error;
    }

    const poll = (await pollResponse.json()) as PollRenderResponse;
    const status = (poll.renderStatus ?? poll.status ?? "").toLowerCase();

    if (status === "failed" || status === "error") {
      throw new Error(poll.error ?? "Video render failed.");
    }

    if (
      status === "completed" ||
      status === "complete" ||
      status === "ready" ||
      poll.videoUrl
    ) {
      if (!poll.videoUrl) {
        throw new Error("Render complete but videoUrl is missing.");
      }
      return {
        videoUrl: poll.videoUrl,
        thumbnailUrl: poll.thumbnailUrl ?? null,
      };
    }
  }

  throw new Error(
    `Video rendering timed out after ${env.VIDEO_RENDER_MAX_POLL_ATTEMPTS} attempts.`,
  );
}
