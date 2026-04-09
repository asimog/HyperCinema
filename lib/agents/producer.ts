import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";
import type { ScriptOutput } from "@/lib/agents/writer";
import type { VisualDirection } from "@/lib/agents/director";

// ── Types ──────────────────────────────────────────────────

interface ScenePayload {
  sceneNumber: number;
  visualPrompt: string;
  narration: string;
  durationSeconds: number;
  imageUrl: string | null;
  includeAudio: boolean;
}

interface RenderStartResponse {
  id?: string;
  jobId?: string;
  statusUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

interface RenderPollResponse {
  status?: string;
  renderStatus?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  error?: string;
  renderId?: string;
}

// ── Constants ──────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 360; // 1 hour at 10s intervals
const RENDER_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;

// ── Producer Functions ─────────────────────────────────────

/**
 * Main entry point — orchestrates video generation from script and visual direction.
 */
export async function generateVideo(
  script: ScriptOutput,
  direction: VisualDirection,
  jobId: string,
): Promise<RenderResult> {
  logger.info("producer_generating_video", {
    component: "agents_producer",
    stage: "generateVideo",
    jobId,
    sceneCount: script.scenes.length,
    style: direction.style,
  });

  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const videoBaseUrl = inferenceConfig.video.baseUrl ?? env.VIDEO_API_BASE_URL;

  if (!videoBaseUrl) {
    return {
      success: false,
      error: "VIDEO_API_BASE_URL is not configured.",
    };
  }

  // Try xAI first
  const xaiResult = await renderWithxAI(
    script.visualPrompt,
    direction.aspectRatio,
    script.scenes.reduce((sum, s) => sum + s.durationSeconds, 15),
  );

  if (xaiResult.success && xaiResult.videoUrl) {
    logger.info("producer_xai_render_success", {
      component: "agents_producer",
      stage: "generateVideo",
      jobId,
    });
    return xaiResult;
  }

  // Fallback to OpenMontage for multi-clip compositions
  logger.info("producer_falling_back_to_openmontage", {
    component: "agents_producer",
    stage: "generateVideo",
    jobId,
    reason: xaiResult.error ?? "xAI render failed",
  });

  return renderWithOpenMontage(script.scenes, direction.aspectRatio);
}

/**
 * Calls xAI video API for single-prompt video generation.
 */
export async function renderWithxAI(
  prompt: string,
  aspectRatio: string,
  duration: number,
): Promise<RenderResult> {
  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const selection = inferenceConfig.providers.video["xai"];

  const apiKey = selection?.apiKey ?? env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY;
  const baseUrl =
    selection?.baseUrl ?? env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL;

  if (!apiKey) {
    return {
      success: false,
      error: "xAI video API key is not configured.",
    };
  }
  if (!baseUrl) {
    return {
      success: false,
      error: "xAI video base URL is not configured.",
    };
  }

  const model = selection?.model ?? env.XAI_VIDEO_MODEL ?? "grok-imagine-video";

  logger.info("producer_xai_render_starting", {
    component: "agents_producer",
    stage: "renderWithxAI",
    model,
    aspectRatio,
    duration,
  });

  try {
    const response = await withRetry(
      async () => {
        const res = await fetchWithTimeout(
          `${baseUrl.replace(/\/+$/, "")}/videos/generations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              prompt,
              size: mapAspectRatioToxAISize(aspectRatio),
              duration_seconds: Math.min(10, Math.max(3, duration)),
            }),
          },
          RENDER_TIMEOUT_MS,
        );

        if (!res.ok) {
          const body = await res.text();
          if (isRetryableHttpStatus(res.status)) {
            throw new RetryableError(
              `xAI video request failed (${res.status}): ${body}`,
            );
          }
          throw new Error(`xAI video request failed (${res.status}): ${body}`);
        }

        return res;
      },
      { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    );

    const payload = (await response.json()) as {
      data?: Array<{ url?: string }>;
      error?: { message?: string };
    };

    const videoUrl = payload.data?.[0]?.url;
    if (!videoUrl) {
      return {
        success: false,
        error: payload.error?.message ?? "xAI returned an empty response.",
      };
    }

    logger.info("producer_xai_render_completed", {
      component: "agents_producer",
      stage: "renderWithxAI",
      videoUrl: videoUrl.slice(0, 100),
    });

    return {
      success: true,
      videoUrl,
      thumbnailUrl: null,
    };
  } catch (error) {
    logger.warn("producer_xai_render_failed", {
      component: "agents_producer",
      stage: "renderWithxAI",
      errorCode: "xai_render_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "xAI render failed.",
    };
  }
}

/**
 * Falls back to OpenMontage for complex multi-clip compositions.
 */
export async function renderWithOpenMontage(
  scenes: Array<{
    narration: string;
    visualPrompt: string;
    durationSeconds: number;
  }>,
  aspectRatio: string,
): Promise<RenderResult> {
  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const videoBaseUrl = inferenceConfig.video.baseUrl ?? env.VIDEO_API_BASE_URL;

  if (!videoBaseUrl) {
    return {
      success: false,
      error: "Video API base URL is not configured for OpenMontage fallback.",
    };
  }

  logger.info("producer_openmontage_render_starting", {
    component: "agents_producer",
    stage: "renderWithOpenMontage",
    sceneCount: scenes.length,
    aspectRatio,
  });

  const scenePayload: ScenePayload[] = scenes.map((scene, index) => ({
    sceneNumber: index + 1,
    visualPrompt: scene.visualPrompt,
    narration: scene.narration,
    durationSeconds: scene.durationSeconds,
    imageUrl: null,
    includeAudio: false,
  }));

  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  try {
    const startResponse = await withRetry(
      async () => {
        const res = await fetchWithTimeout(
          `${videoBaseUrl.replace(/\/+$/, "")}/render`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.VIDEO_API_KEY}`,
            },
            body: JSON.stringify({
              jobId: `openmontage-${Date.now()}`,
              wallet: "agent-pipeline",
              durationSeconds: totalDuration,
              withSound: false,
              resolution: env.VIDEO_RESOLUTION ?? "480p",
              hookLine: scenes[0]?.narration ?? "Opening scene",
              scenes: scenePayload,
              videoEngine: "openmontage",
              provider: "openmontage",
              prompt: scenes[0]?.visualPrompt ?? "Cinematic opening scene",
              openMontage: {
                prompt: scenes[0]?.visualPrompt ?? "Cinematic opening scene",
                storyMetadata: {
                  audioEnabled: false,
                  sceneCount: scenes.length,
                  totalDuration,
                },
              },
            }),
          },
          20_000,
        );

        if (!res.ok) {
          const body = await res.text();
          if (isRetryableHttpStatus(res.status)) {
            throw new RetryableError(
              `OpenMontage render request failed (${res.status}): ${body}`,
            );
          }
          throw new Error(
            `OpenMontage render request failed (${res.status}): ${body}`,
          );
        }

        return res;
      },
      { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    );

    const startPayload = (await startResponse.json()) as RenderStartResponse;

    if (startPayload.videoUrl) {
      return {
        success: true,
        videoUrl: startPayload.videoUrl,
        thumbnailUrl: startPayload.thumbnailUrl ?? null,
      };
    }

    const renderId = startPayload.id ?? startPayload.jobId;
    const statusUrl =
      startPayload.statusUrl ??
      `${videoBaseUrl.replace(/\/+$/, "")}/render/${renderId}`;

    if (!renderId && !startPayload.statusUrl) {
      return {
        success: false,
        error: "OpenMontage did not return a render identifier.",
      };
    }

    // Poll for completion
    return pollRenderStatus(statusUrl, renderId);
  } catch (error) {
    logger.warn("producer_openmontage_render_failed", {
      component: "agents_producer",
      stage: "renderWithOpenMontage",
      errorCode: "openmontage_render_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "OpenMontage render failed.",
    };
  }
}

/**
 * Polls the video service for render completion status.
 */
export async function checkRenderStatus(
  jobId: string,
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const videoBaseUrl = inferenceConfig.video.baseUrl ?? env.VIDEO_API_BASE_URL;

  if (!videoBaseUrl) {
    return { status: "error", error: "Video API base URL is not configured." };
  }

  try {
    const response = await fetchWithTimeout(
      `${videoBaseUrl.replace(/\/+$/, "")}/render/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${env.VIDEO_API_KEY}`,
        },
      },
      POLL_TIMEOUT_MS,
    );

    if (!response.ok) {
      return {
        status: "error",
        error: `Status check failed with ${response.status}`,
      };
    }

    const payload = (await response.json()) as RenderPollResponse;
    const status = (
      payload.renderStatus ??
      payload.status ??
      "unknown"
    ).toLowerCase();

    return {
      status,
      videoUrl: payload.videoUrl,
      error: payload.error,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Status check failed",
    };
  }
}

/**
 * Handles retry logic for failed renders.
 */
export async function retryFailedRender(
  jobId: string,
  attempt: number = 1,
): Promise<RenderResult> {
  const maxRetries = DEFAULT_MAX_RETRIES;

  if (attempt > maxRetries) {
    logger.warn("producer_retry_exhausted", {
      component: "agents_producer",
      stage: "retryFailedRender",
      jobId,
      attempt,
      maxRetries,
    });

    return {
      success: false,
      error: `Render failed after ${maxRetries} retry attempts.`,
    };
  }

  const backoffMs = Math.min(30_000, 2000 * Math.pow(2, attempt - 1));

  logger.info("producer_retry_attempt", {
    component: "agents_producer",
    stage: "retryFailedRender",
    jobId,
    attempt,
    maxRetries,
    backoffMs,
  });

  await sleep(backoffMs);

  const status = await checkRenderStatus(jobId);

  if (
    status.status === "completed" ||
    status.status === "complete" ||
    status.status === "ready"
  ) {
    return {
      success: true,
      videoUrl: status.videoUrl,
      thumbnailUrl: null,
    };
  }

  if (status.status === "failed" || status.status === "error") {
    return retryFailedRender(jobId, attempt + 1);
  }

  // Still processing, check again
  return retryFailedRender(jobId, attempt + 1);
}

// ── Helpers ────────────────────────────────────────────────

function mapAspectRatioToxAISize(aspectRatio: string): string {
  const ratio = aspectRatio.toLowerCase();
  if (ratio.includes("9:16") || ratio.includes("vertical")) {
    return "720x1280";
  }
  if (ratio.includes("1:1") || ratio.includes("square")) {
    return "1024x1024";
  }
  // Default 1:1
  return "1024x1024";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollRenderStatus(
  statusUrl: string,
  renderId?: string,
): Promise<RenderResult> {
  const env = getEnv();
  const maxAttempts = DEFAULT_MAX_POLL_ATTEMPTS;
  const pollInterval = DEFAULT_POLL_INTERVAL_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    try {
      const response = await fetchWithTimeout(
        statusUrl,
        {
          headers: {
            Authorization: `Bearer ${env.VIDEO_API_KEY}`,
          },
        },
        POLL_TIMEOUT_MS,
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as RenderPollResponse;
      const status = (
        payload.renderStatus ??
        payload.status ??
        ""
      ).toLowerCase();

      if (status === "failed" || status === "error") {
        return {
          success: false,
          error: payload.error ?? "Video render failed.",
          renderId,
        };
      }

      if (
        status === "completed" ||
        status === "complete" ||
        status === "ready" ||
        payload.videoUrl
      ) {
        if (!payload.videoUrl) {
          return {
            success: false,
            error: "Video render marked complete but videoUrl is missing.",
            renderId,
          };
        }

        return {
          success: true,
          videoUrl: payload.videoUrl,
          thumbnailUrl: payload.thumbnailUrl ?? null,
          renderId,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    success: false,
    error: `Video rendering timed out after ${maxAttempts} polling attempts.`,
    renderId,
  };
}
