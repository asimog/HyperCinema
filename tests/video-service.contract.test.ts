import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FastifyInstance } from "fastify";
import {
  buildVideoService,
  RenderServicePort,
} from "../video-service/src/server";
import { parseRenderRequest } from "../video-service/src/types";

// Mock repository to prevent Prisma initialization during tests
vi.mock("../video-service/src/repository", () => ({
  claimRenderJob: vi.fn(),
  createOrGetRenderJob: vi.fn(),
  getRenderJob: vi.fn(),
  listRecoverableRenderJobs: vi.fn(),
  markRenderFailed: vi.fn(),
  markRenderReady: vi.fn(),
  touchRenderJob: vi.fn(),
  updateRenderJob: vi.fn(),
}));

class InMemoryRenderService implements RenderServicePort {
  private readonly records = new Map<
    string,
    {
      id: string;
      status: "queued" | "ready";
      renderStatus: "queued" | "ready";
      videoUrl: string | null;
      thumbnailUrl: string | null;
      error: string | null;
    }
  >();

  async startOrGet(request: ReturnType<typeof parseRenderRequest>) {
    const existing = this.records.get(request.jobId);
    if (existing) {
      if (existing.status === "ready" && existing.videoUrl) {
        return {
          mode: "sync" as const,
          id: existing.id,
          jobId: existing.id,
          videoUrl: existing.videoUrl,
          thumbnailUrl: existing.thumbnailUrl,
        };
      }

      return {
        mode: "async" as const,
        id: existing.id,
        jobId: existing.id,
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

    return {
      mode: "async" as const,
      id: request.jobId,
      jobId: request.jobId,
    };
  }

  async getById(id: string) {
    return this.records.get(id) ?? null;
  }

  markReady(id: string) {
    const current = this.records.get(id);
    if (!current) return;
    this.records.set(id, {
      ...current,
      status: "ready",
      renderStatus: "ready",
      videoUrl: "https://cdn.example.com/final.mp4",
      thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    });
  }
}

function buildXAiPayload(jobId: string) {
  return {
    jobId,
    wallet: "wallet",
    durationSeconds: 30,
    withSound: false,
    hookLine: "hook line",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "visual prompt",
        narration: "narration prompt",
        durationSeconds: 10,
        imageUrl: "https://cdn.example.com/image.png",
      },
    ],
    videoEngine: "xai" as const,
    provider: "xai" as const,
    prompt: "global prompt",
    xai: {
      provider: "xai" as const,
      model: "grok-imagine-video",
      resolution: "720p" as const,
      aspectRatio: "16:9" as const,
      prompt: "global prompt",
      styleHints: [],
      sceneMetadata: [
        {
          sceneNumber: 1,
          durationSeconds: 10,
          narration: "narration prompt",
          visualPrompt: "visual prompt",
          imageUrl: "https://cdn.example.com/image.png",
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

describe("video-service /render contract (xAI only)", () => {
  let app: FastifyInstance;
  let service: InMemoryRenderService;

  beforeAll(async () => {
    service = new InMemoryRenderService();
    app = buildVideoService({
      service,
      authToken: "video-secret",
      baseUrl: "http://video.test",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects unauthorized requests", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/render",
      payload: buildXAiPayload("job-unauthorized"),
    });

    expect(response.statusCode).toBe(401);
  });

  it("validates required xAI fields", async () => {
    const payload = buildXAiPayload("job-invalid");
    // @ts-expect-error test invalid payload shape
    delete payload.xai;

    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects non-xAI videoEngine values", async () => {
    const payload = buildXAiPayload("job-wrong-engine");
    // @ts-expect-error test invalid enum value
    payload.videoEngine = "google_veo";
    // @ts-expect-error test invalid enum value
    payload.provider = "google_veo";

    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns idempotent async response for duplicate POSTs", async () => {
    const payload = buildXAiPayload("job-idempotent");

    const first = await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload,
    });

    const second = await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const firstBody = first.json();
    const secondBody = second.json();
    expect(firstBody.id).toBe("job-idempotent");
    expect(secondBody.id).toBe("job-idempotent");
    expect(secondBody.statusUrl).toBe(
      "http://video.test/render/job-idempotent",
    );
  });

  it("supports async status lifecycle via GET /render/:id and /render/status/:id", async () => {
    await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload: buildXAiPayload("job-status"),
    });

    const queued = await app.inject({
      method: "GET",
      url: "/render/job-status",
      headers: {
        authorization: "Bearer video-secret",
      },
    });
    expect(queued.statusCode).toBe(200);
    expect(queued.json().status).toBe("queued");

    service.markReady("job-status");

    const ready = await app.inject({
      method: "GET",
      url: "/render/status/job-status",
      headers: {
        authorization: "Bearer video-secret",
      },
    });

    expect(ready.statusCode).toBe(200);
    expect(ready.json().renderStatus).toBe("ready");
    expect(ready.json().videoUrl).toContain("final.mp4");
  });

  it("accepts valid xAI render payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/render",
      headers: {
        authorization: "Bearer video-secret",
      },
      payload: buildXAiPayload("job-xai-valid"),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe("job-xai-valid");
    expect(response.json().statusUrl).toBe(
      "http://video.test/render/job-xai-valid",
    );
  });
});
