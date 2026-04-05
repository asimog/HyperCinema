import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: () => ({
    VIDEO_API_KEY: "video-secret",
    VIDEO_SERVICE_BASE_URL: "https://video.example.com",
    VERTEX_PROJECT_ID: "hashart-fun",
    VERTEX_API_KEY: "vertex-key",
    VERTEX_LOCATION: "us-central1",
    VERTEX_VEO_MODEL: "veo-3.1-fast-generate-001",
    VEO_OUTPUT_RESOLUTION: "1080p",
    VEO_MAX_CLIP_SECONDS: 8,
    VERTEX_POLL_INTERVAL_MS: 0,
    VERTEX_MAX_POLL_ATTEMPTS: 1,
    RENDER_RECOVERY_INTERVAL_MS: 30_000,
    RENDER_STALE_MS: 20 * 60_000,
    RENDER_RECOVERY_BATCH_LIMIT: 20,
    FFMPEG_PATH: "ffmpeg",
    FIREBASE_PROJECT_ID: "hashart-fun",
    FIREBASE_STORAGE_BUCKET: "hashart-fun.appspot.com",
  }),
}));

import {
  extractInlineVideoBytesFromOperation,
  sanitizePromptForPolicyRetry,
  VertexVeoClient,
} from "../video-service/src/providers/vertex-veo";

describe("vertex veo polling endpoint", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("polls with fetchPredictOperation using operationName", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-123",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            video: {
              uri: "gcs://video-renders/hashart-fun/op-123.mp4",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = new VertexVeoClient();
    const result = await client.generateClip({
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: "test prompt",
      durationSeconds: 8,
      storageUri: "gs://hashart-fun-media/video-renders/job-123/clips/1-1",
      imageUrl: null,
      styleHints: [],
    });

    expect(result.videoUris).toEqual(["gcs://video-renders/hashart-fun/op-123.mp4"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [pollUrl, pollInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(pollUrl).toContain(":fetchPredictOperation");
    expect(pollInit.method).toBe("POST");
    expect(pollInit.body).toContain("\"operationName\"");
    expect(pollInit.body).toContain("operations/op-123");
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].body).toContain("\"storageUri\"");
  });

  it("falls back to the operation resource when fetchPredictOperation returns no video URI", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-456",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {},
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            generatedSamples: [
              {
                video: {
                  uri: "gs://video-renders/hashart-fun/op-456.mp4",
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = new VertexVeoClient();
    const result = await client.generateClip({
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: "test prompt",
      durationSeconds: 8,
      imageUrl: null,
      styleHints: [],
    });

    expect(result.videoUris).toEqual(["gs://video-renders/hashart-fun/op-456.mp4"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [fallbackUrl, fallbackInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(fallbackUrl).toContain("/operations/op-456");
    expect(fallbackInit.method).toBe("GET");
  });

  it("returns inline base64 video bytes when the operation completes without a URI", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-789",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            videos: [
              {
                bytesBase64Encoded: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = new VertexVeoClient();
    const result = await client.generateClip({
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: "test prompt",
      durationSeconds: 8,
      imageUrl: null,
      styleHints: [],
    });

    expect(result.videoUris).toEqual([]);
    expect(result.videoBytesBase64).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("extracts inline video bytes from nested operation payloads", () => {
    expect(
      extractInlineVideoBytesFromOperation({
        done: true,
        response: {
          generatedSamples: [
            {
              video: {
                bytesBase64Encoded:
                  "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==",
              },
            },
          ],
        },
      }),
    ).toHaveLength(1);
  });

  it("invokes onProgress while polling long-running operations", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-999",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ done: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const onProgress = vi.fn();
    const client = new VertexVeoClient();

    await expect(
      client.generateClip({
        model: "veo-3.1-fast-generate-001",
        resolution: "1080p",
        generateAudio: true,
        prompt: "test prompt",
        durationSeconds: 8,
        imageUrl: null,
        styleHints: [],
        onProgress,
      }),
    ).rejects.toThrow("Timed out while waiting for Veo operation completion.");

    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it("surfaces filtered-output completions with a clearer error", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-filtered",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            raiMediaFilteredCount: 1,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            raiMediaFilteredCount: 1,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = new VertexVeoClient();

    await expect(
      client.generateClip({
        model: "veo-3.1-fast-generate-001",
        resolution: "1080p",
        generateAudio: true,
        prompt: "test prompt",
        durationSeconds: 8,
        imageUrl: null,
        styleHints: [],
      }),
    ).rejects.toThrow("filtered=1");
  });

  it("rewrites and retries prompts when Vertex rejects policy-sensitive wording", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message:
              "This prompt contains words that violate Vertex AI's usage guidelines. Try rephrasing the prompt.",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "projects/hashart-fun/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/op-safe",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            video: {
              uri: "gs://video-renders/hashart-fun/op-safe.mp4",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const originalPrompt =
      "Subject: Birthday short. Brief: a stocky but not fat square-built short man arrives in canada and is celebrating his birthday with friends. Music cue: happy birthday to you.";
    const rewrittenPrompt = sanitizePromptForPolicyRetry(originalPrompt);

    const client = new VertexVeoClient();
    const result = await client.generateClip({
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: originalPrompt,
      durationSeconds: 8,
      imageUrl: null,
      styleHints: [],
    });

    expect(result.videoUris).toEqual(["gs://video-renders/hashart-fun/op-safe.mp4"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstStartBody = String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body);
    const secondStartBody = String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body);

    expect(firstStartBody).toContain("stocky but not fat");
    expect(secondStartBody).toContain("adult protagonist");
    expect(secondStartBody).toContain("canada");
    expect(secondStartBody).toContain("birthday singalong");
    expect(secondStartBody).not.toContain("stocky");
    expect(secondStartBody).not.toContain("fat");
  });
});
