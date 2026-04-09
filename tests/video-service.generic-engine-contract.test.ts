import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FastifyInstance } from "fastify";

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: () => ({
    VIDEO_API_KEY: "test-key",
    VERTEX_PROJECT_ID: "test-project",
    VERTEX_LOCATION: "us-central1",
    VERTEX_VEO_MODEL: "veo-3.1-fast-generate-001",
    VEO_OUTPUT_RESOLUTION: "1080p",
    VEO_MAX_CLIP_SECONDS: 8,
    VERTEX_POLL_INTERVAL_MS: 5000,
    VERTEX_MAX_POLL_ATTEMPTS: 180,
    RENDER_RECOVERY_INTERVAL_MS: 30_000,
    RENDER_STALE_MS: 300_000,
    RENDER_RECOVERY_BATCH_LIMIT: 20,
    FFMPEG_PATH: "ffmpeg",
    FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_STORAGE_BUCKET: "test-project.appspot.com",
  }),
}));

import {
  buildVideoService,
  RenderServicePort,
} from "../video-service/src/server";
import { parseRenderRequest } from "../video-service/src/types";

class InMemoryRenderService implements RenderServicePort {
  private readonly records = new Map<
    string,
    {
      id: string;
      status: "queued" | "ready";
      renderStatus: string;
      videoUrl: string | null;
      thumbnailUrl: string | null;
      error: string | null;
    }
  >();

  async startOrGet(request: ReturnType<typeof parseRenderRequest>) {
    const existing = this.records.get(request.jobId);
    if (existing?.status === "ready" && existing.videoUrl) {
      return {
        mode: "sync" as const,
        id: existing.id,
        jobId: existing.id,
        videoUrl: existing.videoUrl,
        thumbnailUrl: existing.thumbnailUrl,
      };
    }
    this.records.set(request.jobId, {
      id: request.jobId,
      status: "queued",
      renderStatus: "queued",
      videoUrl: null,
      thumbnailUrl: null,
      error: null,
    });
    return { mode: "async" as const, id: request.jobId, jobId: request.jobId };
  }

  async getById(id: string) {
    return this.records.get(id) ?? null;
  }

  async resumePendingJobs() {
    return 0;
  }
}

function buildGenericPayload(overrides: Record<string, unknown> = {}) {
  return {
    jobId: "test-generic-job",
    wallet: "0xtest",
    durationSeconds: 8,
    withSound: false,
    hookLine: "Test hook",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "A cinematic landscape",
        narration: "The story begins here",
        durationSeconds: 8,
      },
    ],
    videoEngine: "generic",
    provider: "fal",
    prompt: "A cinematic landscape",
    generic: {
      provider: "fal",
      model: "fal-ai/wan-pro",
      prompt: "A cinematic landscape",
      apiKey: "fal-test-key",
      baseUrl: "https://fal.run",
      sceneMetadata: [
        {
          sceneNumber: 1,
          durationSeconds: 8,
          narration: "The story begins here",
          visualPrompt: "A cinematic landscape",
          imageUrl: null,
        },
      ],
      storyMetadata: {
        wallet: "0xtest",
        rangeDays: 7,
        packageType: "30s",
        durationSeconds: 8,
      },
    },
    ...overrides,
  };
}

describe("video-service /render with videoEngine=generic", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildVideoService({
      service: new InMemoryRenderService(),
      authToken: "test-token",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("accepts a valid generic render payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: { Authorization: "Bearer test-token" },
      body: buildGenericPayload(),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as Record<string, unknown>;
    expect(body.id ?? body.jobId).toBeTruthy();
  });

  it("rejects generic payload missing apiKey", async () => {
    const payload = buildGenericPayload();
    (payload.generic as Record<string, unknown>).apiKey = "";

    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: { Authorization: "Bearer test-token" },
      body: payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects generic payload when generic metadata is absent", async () => {
    const payload = buildGenericPayload();
    delete (payload as Record<string, unknown>).generic;

    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: { Authorization: "Bearer test-token" },
      body: payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects request without Authorization header", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/render",
      body: buildGenericPayload(),
    });

    expect(response.statusCode).toBe(401);
  });
});
