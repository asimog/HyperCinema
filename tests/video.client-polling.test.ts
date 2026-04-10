import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  getInferenceRuntimeConfig: vi.fn(),
  fetchWithTimeout: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/inference/config", () => ({
  getInferenceRuntimeConfig: mocks.getInferenceRuntimeConfig,
}));

vi.mock("@/lib/network/http", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

import { renderCinematicVideo } from "@/lib/video/client";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(status: number, payload: string): Response {
  return new Response(payload, { status });
}

describe("video client polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({
      VIDEO_API_BASE_URL: "https://video.example.com",
      VIDEO_API_KEY: "video-key",
      VIDEO_RENDER_MAX_POLL_ATTEMPTS: 1,
      VIDEO_RENDER_POLL_INTERVAL_MS: 1,
      VIDEO_RESOLUTION: "1080p",
      VIDEO_ENGINE: "google_veo",
    });
    mocks.getInferenceRuntimeConfig.mockResolvedValue({
      video: {
        provider: "google_veo",
        model: "veo-3.1-fast-generate-001",
        baseUrl: "https://video.example.com",
      },
    });
  }, 15_000);

  it(
    "fails fast on non-retryable polling errors",
    { timeout: 15_000 },
    async () => {
      mocks.fetchWithTimeout
        .mockResolvedValueOnce(jsonResponse(200, { id: "render-1" }))
        .mockResolvedValueOnce(textResponse(401, "Unauthorized"));

      await expect(
        renderCinematicVideo({
          jobId: "job-1",
          wallet: "wallet-1",
          durationSeconds: 30,
          script: {
            hookLine: "Hook line",
            scenes: [
              {
                sceneNumber: 1,
                visualPrompt: "visual",
                narration: "narration",
                durationSeconds: 5,
                imageUrl: null,
              },
            ],
          },
          xai: {
            provider: "xai",
            model: "grok-imagine-video",
            resolution: "720p",
            aspectRatio: "16:9",
            prompt: "Hook line",
            styleHints: [],
            sceneMetadata: [
              {
                sceneNumber: 1,
                durationSeconds: 5,
                narration: "narration",
                visualPrompt: "visual",
                imageUrl: null,
              },
            ],
            storyMetadata: {
              wallet: "wallet-1",
              rangeDays: 1,
              packageType: "30s",
              durationSeconds: 30,
            },
          },
        }),
      ).rejects.toThrow("Video poll failed (401)");

      expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(2);
    },
  );
});
