import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NormalizedRenderRequest,
  RenderJobRecord,
} from "../video-service/src/types";

const repositoryMocks = vi.hoisted(() => ({
  claimRenderJob: vi.fn(),
  createOrGetRenderJob: vi.fn(),
  getRenderJob: vi.fn(),
  listRecoverableRenderJobs: vi.fn(),
  markRenderFailed: vi.fn(),
  markRenderReady: vi.fn(),
  touchRenderJob: vi.fn(),
  updateRenderJob: vi.fn(),
}));

vi.mock("../video-service/src/repository", () => repositoryMocks);

vi.mock("../video-service/src/inference-config", () => ({
  getVideoProviderConfig: () => ({ apiKey: null, baseUrl: null, model: null }),
}));

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: () => ({
    XAI_API_KEY: "xai-test-key",
    XAI_BASE_URL: "https://api.x.ai/v1",
    XAI_VIDEO_MODEL: "grok-imagine-video",
    MAX_CLIP_SECONDS: 8,
    FFMPEG_PATH: "ffmpeg",
    RENDER_RECOVERY_BATCH_LIMIT: 10,
    RENDER_STALE_MS: 60_000,
    S3_ENDPOINT: "https://test.supabase.co/storage/v1/s3",
    S3_ACCESS_KEY_ID: "test-key",
    S3_SECRET_ACCESS_KEY: "test-secret",
    S3_BUCKET: "videos",
    S3_REGION: "us-east-1",
  }),
}));

vi.mock("../video-service/src/providers/xai-video", () => ({
  XAiVideoClient: class MockXAiVideoClient {
    private _generateClip: ReturnType<typeof vi.fn> | null = null;
    setGenerateClip(fn: ReturnType<typeof vi.fn>) {
      this._generateClip = fn;
    }
    async generateClip(input: any) {
      if (this._generateClip) return this._generateClip(input);
      await input.onProgress?.();
      return {
        operationName: "op-1",
        videoUris: ["https://example.com/clip-1.mp4"],
        videoBytesBase64: [],
      };
    }
  },
}));

import { RenderService } from "../video-service/src/render-service";
import { XAiVideoClient } from "../video-service/src/providers/xai-video";

function buildRequest(jobId: string): NormalizedRenderRequest {
  return {
    jobId,
    wallet: "wallet",
    durationSeconds: 30,
    withSound: false,
    hookLine: "hook",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "visual",
        narration: "narration",
        durationSeconds: 8,
        imageUrl: "https://example.com/image.png",
      },
    ],
    videoEngine: "xai",
    provider: "xai",
    prompt: "prompt",
    xai: {
      provider: "xai",
      model: "grok-imagine-video",
      resolution: "720p",
      aspectRatio: "16:9",
      prompt: "prompt",
      styleHints: [],
      sceneMetadata: [
        {
          sceneNumber: 1,
          durationSeconds: 8,
          narration: "narration",
          visualPrompt: "visual",
          imageUrl: "https://example.com/image.png",
        },
      ],
      storyMetadata: {
        wallet: "wallet",
        rangeDays: 1,
        packageType: "30s",
        durationSeconds: 30,
      },
    },
  };
}

function buildFailedRecord(request: NormalizedRenderRequest): RenderJobRecord {
  return {
    id: request.jobId,
    jobId: request.jobId,
    status: "failed",
    renderStatus: "failed",
    videoUrl: null,
    thumbnailUrl: null,
    error: "old failure",
    createdAt: "2026-03-11T00:00:00.000Z",
    updatedAt: "2026-03-11T00:00:01.000Z",
    startedAt: "2026-03-11T00:00:00.500Z",
    completedAt: "2026-03-11T00:00:01.000Z",
    request,
  };
}

describe("video-service failed-render retry behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.claimRenderJob.mockResolvedValue(null);
    repositoryMocks.updateRenderJob.mockResolvedValue(undefined);
  });

  it("requeues failed existing renders when startOrGet is called again", async () => {
    const request = buildRequest("job-retry");
    repositoryMocks.getRenderJob.mockResolvedValue(buildFailedRecord(request));

    const service = new RenderService();

    const response = await service.startOrGet(request);

    expect(response).toEqual({
      mode: "async",
      id: "job-retry",
      jobId: "job-retry",
    });
    expect(repositoryMocks.updateRenderJob).toHaveBeenCalledWith(
      "job-retry",
      expect.objectContaining({
        status: "queued",
        renderStatus: "queued",
        error: null,
        videoUrl: null,
        thumbnailUrl: null,
        startedAt: null,
        completedAt: null,
      }),
    );
  });

  it("invokes onProgress heartbeat during clip generation", async () => {
    const request = buildRequest("job-heartbeat");
    repositoryMocks.getRenderJob.mockResolvedValue(null);
    repositoryMocks.createOrGetRenderJob.mockResolvedValue({
      record: {
        ...buildFailedRecord(request),
        status: "queued",
        renderStatus: "queued",
        error: null,
        startedAt: null,
        completedAt: null,
      },
      created: true,
    });
    repositoryMocks.claimRenderJob.mockResolvedValue({
      ...buildFailedRecord(request),
      status: "processing",
      renderStatus: "processing",
      error: null,
      startedAt: "2026-03-12T00:00:00.000Z",
      completedAt: null,
    });
    repositoryMocks.markRenderFailed.mockResolvedValue(undefined);

    const generateClip = vi.fn().mockImplementation(async (input) => {
      await input.onProgress?.();
      return {
        operationName: "op-1",
        videoUris: ["https://example.com/clip-1.mp4"],
        videoBytesBase64: [],
      };
    });

    // Patch the XAiVideoClient instance used by RenderService
    const service = new RenderService();
    (service as any).xaiClient = { generateClip: generateClip };

    await service.startOrGet(request);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(generateClip).toHaveBeenCalledWith(
      expect.objectContaining({
        onProgress: expect.any(Function),
      }),
    );
    expect(repositoryMocks.touchRenderJob).toHaveBeenCalled();
  });
});
