import { buildSceneChunks } from "../video-service/src/pipeline/scene-plan";
import { buildConcatManifest } from "../video-service/src/pipeline/media";
import { NormalizedRenderRequest } from "../video-service/src/types";

function buildRequest(): NormalizedRenderRequest {
  return {
    jobId: "job-1",
    wallet: "wallet",
    durationSeconds: 60,
    withSound: true,
    resolution: "1080p",
    hookLine: "hook line",
    videoEngine: "google_veo",
    provider: "google_veo",
    prompt: "Global prompt",
    metadata: {
      provider: "google_veo",
      model: "veo-3.1-fast-generate-001",
      resolution: "1080p",
      generateAudio: true,
      prompt: "Global prompt",
      styleHints: ["memetic"],
      tokenMetadata: [],
      sceneMetadata: [
        {
          sceneNumber: 1,
          durationSeconds: 17,
          narration: "narration",
          visualPrompt: "visual",
          imageUrl: null,
          stateRef: "identity-1-state-1",
          continuityAnchors: ["hooded protagonist", "casino-cathedral tension", "AAA remains visible"],
          continuityPrompt:
            "Preserve the hooded protagonist and keep AAA readable inside the same casino-cathedral frame.",
        },
      ],
      storyMetadata: {
        wallet: "wallet",
        rangeDays: 1,
        packageType: "30s",
        durationSeconds: 60,
        analytics: {},
      },
    },
    googleVeo: undefined,
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "visual",
        narration: "narration",
        durationSeconds: 17,
        imageUrl: "https://cdn.example.com/image.png",
        includeAudio: true,
      },
    ],
  };
}

describe("video-service scene chunk planner", () => {
  it("splits long scenes into Veo-supported chunks", () => {
    const chunks = buildSceneChunks({
      request: buildRequest(),
      maxClipSeconds: 8,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.durationSeconds).toBe(8);
    expect(chunks[1]?.durationSeconds).toBe(6);
    expect(chunks[2]?.durationSeconds).toBe(4);
    expect(chunks.every((chunk) => [4, 6, 8].includes(chunk.durationSeconds))).toBe(true);
    expect(chunks[0]?.prompt.includes("Scene 1, chunk 1/3")).toBe(true);
    expect(chunks[0]?.prompt.includes("Primary continuity stateRef: identity-1-state-1")).toBe(
      true,
    );
    expect(chunks[1]?.prompt.includes("Reuse continuity stateRef identity-1-state-1.")).toBe(
      true,
    );
    expect(chunks[1]?.prompt.includes("Continue the scene with this continuity prompt:")).toBe(
      true,
    );
  });

  it("rounds unsupported odd durations to the nearest supported duration plan", () => {
    const request = buildRequest();
    request.scenes = [
      {
        sceneNumber: 1,
        visualPrompt: "visual",
        narration: "narration",
        durationSeconds: 7,
        imageUrl: "https://cdn.example.com/image.png",
        includeAudio: true,
      },
    ];

    const chunks = buildSceneChunks({
      request,
      maxClipSeconds: 8,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.durationSeconds).toBe(8);
  });

  it("builds deterministic ffmpeg concat manifest", () => {
    const manifest = buildConcatManifest(["C:/tmp/clip-1.mp4", "C:/tmp/clip-2.mp4"]);
    expect(manifest).toContain("file 'C:/tmp/clip-1.mp4'");
    expect(manifest).toContain("file 'C:/tmp/clip-2.mp4'");
  });
});
