import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedRenderRequest, RenderJobRecord } from "../video-service/src/types";

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
  getVideoProviderRuntimeConfig: () => Promise.resolve({ apiKey: null, baseUrl: null, model: null }),
}));

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: () => ({
    VERTEX_VEO_MODEL: "veo-3.1-fast-generate-001",
    VEO_OUTPUT_RESOLUTION: "1080p",
    VEO_MAX_CLIP_SECONDS: 8,
    RENDER_RECOVERY_BATCH_LIMIT: 10,
    RENDER_STALE_MS: 60_000,
    FIREBASE_STORAGE_BUCKET: "hashart-fun-media",
  }),
}));

import { RenderService } from "../video-service/src/render-service";

function buildRequest(jobId: string): NormalizedRenderRequest {
  return {
    jobId,
    wallet: "wallet",
    durationSeconds: 30,
    withSound: true,
    resolution: "1080p",
    hookLine: "hook",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "visual",
        narration: "narration",
        durationSeconds: 8,
        imageUrl: "https://example.com/image.png",
        includeAudio: true,
      },
    ],
    videoEngine: "google_veo",
    provider: "google_veo",
    prompt: "prompt",
    metadata: {
      provider: "google_veo",
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: "prompt",
      styleHints: [],
      tokenMetadata: [],
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
        analytics: {},
      },
    },
    googleVeo: undefined,
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

    const service = new RenderService({
      generateClip: vi.fn(),
    });

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

  it("passes storageUri and onProgress heartbeat into clip generation", async () => {
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
        videoUris: ["gs://hashart-fun-media/video-renders/job-heartbeat/clips/1-1/final.mp4"],
        videoBytesBase64: [],
      };
    });

    const service = new RenderService({ generateClip } as never);
    await service.startOrGet(request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(generateClip).toHaveBeenCalledWith(
      expect.objectContaining({
        storageUri: "gs://hashart-fun-media/video-renders/job-heartbeat/clips/1-1",
        onProgress: expect.any(Function),
      }),
    );
    expect(repositoryMocks.touchRenderJob).toHaveBeenCalled();
  });
});
