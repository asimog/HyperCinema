import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVideoServiceEnv: vi.fn(),
}));

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: mocks.getVideoServiceEnv,
}));

const defaultEnv = {
  VERTEX_POLL_INTERVAL_MS: 100,
  VERTEX_MAX_POLL_ATTEMPTS: 5,
};

describe("GenericRestVideoClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVideoServiceEnv.mockReturnValue(defaultEnv);
    vi.stubGlobal("fetch", vi.fn());
  });

  async function getClient() {
    const mod = await import("../video-service/src/providers/generic-rest-video");
    return new mod.GenericRestVideoClient();
  }

  it("uses 'Key' Authorization header for provider=fal", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ video_url: "https://cdn.fal.ai/output.mp4" }),
    } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "fal",
      model: "fal-ai/wan-pro",
      prompt: "test prompt",
      durationSeconds: 4,
      apiKey: "fal-key-123",
      baseUrl: "https://fal.run",
    });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Key fal-key-123",
    });
  });

  it("uses 'Bearer' Authorization header for provider=huggingface", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ video_url: "https://hf.co/output.mp4" }),
    } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "huggingface",
      model: "stabilityai/stable-video-diffusion-img2vid-xt",
      prompt: "test prompt",
      durationSeconds: 4,
      apiKey: "hf-token-456",
      baseUrl: "https://router.huggingface.co/hf-inference/models",
    });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer hf-token-456",
    });
  });

  it("uses 'Bearer' Authorization header for provider=others", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoUrl: "https://example.com/out.mp4" }),
    } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "others",
      model: "custom-model",
      prompt: "test",
      durationSeconds: 8,
      apiKey: "custom-key",
      baseUrl: "https://custom-api.example.com",
    });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer custom-key",
    });
  });

  it("constructs FAL start URL as {baseUrl}/{model}", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ video_url: "https://cdn.fal.ai/out.mp4" }),
    } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "fal",
      model: "fal-ai/wan-pro",
      prompt: "test",
      durationSeconds: 4,
      apiKey: "key",
      baseUrl: "https://fal.run",
    });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://fal.run/fal-ai%2Fwan-pro");
  });

  it("constructs HuggingFace start URL as {baseUrl}/{model}", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ video_url: "https://hf.co/out.mp4" }),
    } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "huggingface",
      model: "stabilityai/stable-video-diffusion-img2vid-xt",
      prompt: "test",
      durationSeconds: 4,
      apiKey: "hf-token",
      baseUrl: "https://router.huggingface.co/hf-inference/models",
    });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("stabilityai%2Fstable-video-diffusion-img2vid-xt");
  });

  it("returns immediately when videoUrl is in the start response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "job-1", video_url: "https://cdn.fal.ai/immediate.mp4" }),
    } as Response);

    const client = await getClient();
    const result = await client.generateClip({
      provider: "fal",
      model: "fal-ai/wan-pro",
      prompt: "test",
      durationSeconds: 4,
      apiKey: "key",
      baseUrl: "https://fal.run",
    });

    expect(result.videoUris).toEqual(["https://cdn.fal.ai/immediate.mp4"]);
    // fetch called exactly once — no polling
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("polls status URL until completed and returns videoUrl", async () => {
    vi.mocked(fetch)
      // Start response: queued
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "job-abc", status: "queued" }),
      } as Response)
      // Poll 1: processing
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "processing" }),
      } as Response)
      // Poll 2: completed with videoUrl
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "completed", video_url: "https://example.com/done.mp4" }),
      } as Response);

    const client = await getClient();
    const result = await client.generateClip({
      provider: "others",
      model: "custom",
      prompt: "test",
      durationSeconds: 8,
      apiKey: "key",
      baseUrl: "https://custom.example.com",
    });

    expect(result.videoUris).toEqual(["https://example.com/done.mp4"]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("throws on status=failed", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "job-fail", status: "queued" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "failed", error: "Model crashed" }),
      } as Response);

    const client = await getClient();
    await expect(
      client.generateClip({
        provider: "others",
        model: "model",
        prompt: "test",
        durationSeconds: 4,
        apiKey: "key",
        baseUrl: "https://api.example.com",
      }),
    ).rejects.toThrow("failed");
  });

  it("uses queue.fal.run for FAL status URL", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: "req-xyz", status: "queued" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "completed", video_url: "https://cdn.fal.ai/vid.mp4" }),
      } as Response);

    const client = await getClient();
    await client.generateClip({
      provider: "fal",
      model: "fal-ai/wan-pro",
      prompt: "test",
      durationSeconds: 4,
      apiKey: "key",
      baseUrl: "https://fal.run",
    });

    // Second call (status poll) should go to queue.fal.run
    const [statusUrl] = vi.mocked(fetch).mock.calls[1];
    expect(statusUrl as string).toContain("queue.fal.run");
    expect(statusUrl as string).toContain("fal-ai%2Fwan-pro");
    expect(statusUrl as string).toContain("req-xyz");
  });

  it("times out after max poll attempts", async () => {
    mocks.getVideoServiceEnv.mockReturnValue({ VERTEX_POLL_INTERVAL_MS: 1, VERTEX_MAX_POLL_ATTEMPTS: 2 });

    vi.mocked(fetch)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ id: "job-slow", status: "processing" }),
      } as Response);

    const client = await getClient();
    await expect(
      client.generateClip({
        provider: "others",
        model: "model",
        prompt: "test",
        durationSeconds: 4,
        apiKey: "key",
        baseUrl: "https://api.example.com",
      }),
    ).rejects.toThrow("Timed out");
  });
});
