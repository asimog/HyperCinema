import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { GeneratedCinematicScript } from "@/lib/types/domain";
import { GoogleVeoRenderPayload } from "@/lib/video/veo";

interface StartRenderResponse {
  id?: string;
  jobId?: string;
  statusUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

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

export async function renderCinematicVideo(params: {
  jobId: string;
  wallet: string;
  durationSeconds: number;
  script: GeneratedCinematicScript;
  googleVeo?: GoogleVeoRenderPayload;
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const videoBaseUrl = inferenceConfig.video.baseUrl ?? env.VIDEO_API_BASE_URL;
  if (!videoBaseUrl) {
    throw new Error(
      "VIDEO_API_BASE_URL is required to render cinematic videos.",
    );
  }

  const scenePayload = params.script.scenes.map((scene) => ({
    ...scene,
    includeAudio: params.googleVeo?.generateAudio ?? false,
  }));
  const withSound = params.googleVeo?.generateAudio ?? false;
  const isVeoProvider = inferenceConfig.video.provider === "google_veo";
  const baseRequestPayload = {
    jobId: params.jobId,
    wallet: params.wallet,
    durationSeconds: params.durationSeconds,
    withSound,
    resolution: params.googleVeo?.resolution ?? env.VIDEO_RESOLUTION,
    hookLine: params.script.hookLine,
    scenes: scenePayload,
    videoEngine: env.VIDEO_ENGINE,
    provider: inferenceConfig.video.provider,
    model: inferenceConfig.video.model ?? params.googleVeo?.model ?? env.VIDEO_VEO_MODEL,
  };
  const renderRequestPayload =
    isVeoProvider
      ? {
          ...baseRequestPayload,
          provider: "google_veo",
          prompt: params.googleVeo?.prompt ?? params.script.hookLine,
          metadata: params.googleVeo ?? null,
          googleVeo: params.googleVeo ?? null,
        }
      : baseRequestPayload;

  const startPayload = await withRetry(
    async () => {
      const startResponse = await fetchWithTimeout(
        `${videoBaseUrl.replace(/\/+$/, "")}/render`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.VIDEO_API_KEY}`,
          },
          body: JSON.stringify(renderRequestPayload),
        },
        20_000,
      );

      if (!startResponse.ok) {
        const body = await startResponse.text();
        const message = `Video render request failed (${startResponse.status}): ${body}`;
        if (isRetryableHttpStatus(startResponse.status)) {
          throw new RetryableError(message);
        }
        throw new Error(message);
      }

      return (await startResponse.json()) as StartRenderResponse;
    },
    {
      attempts: 3,
      baseDelayMs: 900,
      maxDelayMs: 5_000,
    },
  );

  if (startPayload.videoUrl) {
    return {
      videoUrl: startPayload.videoUrl,
      thumbnailUrl: startPayload.thumbnailUrl ?? null,
    };
  }

  const renderId = startPayload.id ?? startPayload.jobId;
  if (!renderId && !startPayload.statusUrl) {
    throw new Error("Video API did not return a render identifier.");
  }

  for (
    let attempt = 0;
    attempt < env.VIDEO_RENDER_MAX_POLL_ATTEMPTS;
    attempt += 1
  ) {
    await sleep(env.VIDEO_RENDER_POLL_INTERVAL_MS);
    const pollUrl =
      startPayload.statusUrl ?? `${videoBaseUrl.replace(/\/+$/, "")}/render/${renderId}`;
    let pollResponse: Response;
    try {
      pollResponse = await withRetry(
        async () => {
          const response = await fetchWithTimeout(
            pollUrl,
            {
              headers: {
                Authorization: `Bearer ${env.VIDEO_API_KEY}`,
              },
            },
            12_000,
          );

          if (!response.ok) {
            const body = await response.text();
            const message = `Video render polling failed (${response.status}): ${body || "empty response"}`;
            if (isRetryableHttpStatus(response.status)) {
              throw new RetryableError(message);
            }
            throw new Error(message);
          }

          return response;
        },
        {
          attempts: 2,
          baseDelayMs: 500,
          maxDelayMs: 2_000,
        },
      );
    } catch (error) {
      if (error instanceof RetryableError || error instanceof TypeError) {
        continue;
      }
      throw error;
    }

    const pollPayload = (await pollResponse.json()) as PollRenderResponse;
    const status = (pollPayload.renderStatus ?? pollPayload.status ?? "").toLowerCase();

    if (status === "failed" || status === "error") {
      throw new Error(pollPayload.error ?? "Video render failed.");
    }

    if (
      status === "completed" ||
      status === "complete" ||
      status === "ready" ||
      pollPayload.videoUrl
    ) {
      if (!pollPayload.videoUrl) {
        throw new Error("Video render marked complete but videoUrl is missing.");
      }

      return {
        videoUrl: pollPayload.videoUrl,
        thumbnailUrl: pollPayload.thumbnailUrl ?? null,
      };
    }
  }

  throw new Error(
    `Video rendering timed out after ${env.VIDEO_RENDER_MAX_POLL_ATTEMPTS} polling attempts.`,
  );
}
