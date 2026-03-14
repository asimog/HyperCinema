import {
  extractVideoUrisFromOperation,
  isVertexImageEmptyError,
} from "../video-service/src/providers/vertex-veo";

describe("vertex veo adapter output parsing", () => {
  it("extracts gs and https URIs from nested operation response payloads", () => {
    const uris = extractVideoUrisFromOperation({
      done: true,
      response: {
        predictions: [
          {
            video: {
              uri: "gs://bucket/path/clip-1.mp4",
            },
          },
        ],
        outputVideos: [{ url: "https://example.com/video-2.mp4" }],
      },
    });

    expect(uris).toContain("gs://bucket/path/clip-1.mp4");
    expect(uris).toContain("https://example.com/video-2.mp4");
  });

  it("extracts URIs from operation metadata when response is empty", () => {
    const uris = extractVideoUrisFromOperation({
      done: true,
      metadata: {
        outputs: [
          {
            gcsUri: "gs://bucket/path/final.mp4",
          },
        ],
      } as unknown as Record<string, unknown>,
      response: {},
    } as unknown as Parameters<typeof extractVideoUrisFromOperation>[0]);

    expect(uris).toContain("gs://bucket/path/final.mp4");
  });

  it("detects image-empty invalid argument responses for fallback handling", () => {
    const body = JSON.stringify({
      error: {
        code: 400,
        message: "image is empty",
        status: "INVALID_ARGUMENT",
      },
    });

    expect(isVertexImageEmptyError(400, body)).toBe(true);
  });

  it("ignores non-image start failures", () => {
    const body = JSON.stringify({
      error: {
        code: 400,
        message: "request missing prompt",
        status: "INVALID_ARGUMENT",
      },
    });

    expect(isVertexImageEmptyError(400, body)).toBe(false);
    expect(isVertexImageEmptyError(500, body)).toBe(false);
  });
});
