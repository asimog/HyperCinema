import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVideoServiceDb: vi.fn(),
  getVideoServiceEnv: vi.fn(),
}));

vi.mock("../video-service/src/firebase", () => ({
  getVideoServiceDb: mocks.getVideoServiceDb,
}));

vi.mock("../video-service/src/env", () => ({
  getVideoServiceEnv: mocks.getVideoServiceEnv,
}));

function mockDoc(data: unknown) {
  return {
    exists: true,
    data: () => data,
  };
}

describe("video-service provider config resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getVideoServiceEnv.mockReturnValue({
      VERTEX_API_KEY: "vertex-env-key",
      VERTEX_VEO_MODEL: "veo-3.1-fast-generate-001",
      XAI_API_KEY: "xai-env-key",
      XAI_BASE_URL: "https://api.x.ai/v1",
      XAI_VIDEO_MODEL: "grok-imagine-video",
      ELIZAOS_API_KEY: "eliza-env-key",
      ELIZAOS_BASE_URL: "https://api.elizacloud.ai",
      ELIZAOS_VIDEO_MODEL: "eliza-default",
      OPENMONTAGE_COMPOSITION_ID: "CinematicRenderer",
      MYTHX_API_KEY: "mythx-env-key",
      MYTHX_BASE_URL: "https://cloud.milady.ai",
      MYTHX_VIDEO_MODEL: "mythx-default",
    });
  });

  it("prefers registry entries over env fallbacks", async () => {
    mocks.getVideoServiceDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: vi.fn().mockResolvedValue(
            mockDoc({
              providers: {
                video: {
                  xai: {
                    apiKey: "xai-firestore-key",
                    baseUrl: "https://firestore.x.ai",
                    model: "grok-imagine-video-hd",
                  },
                },
              },
            }),
          ),
        }),
      }),
    });

    const { getVideoProviderRuntimeConfig } = await import("../video-service/src/inference-config");
    const config = await getVideoProviderRuntimeConfig("xai");

    expect(config).toEqual({
      apiKey: "xai-firestore-key",
      baseUrl: "https://firestore.x.ai",
      model: "grok-imagine-video-hd",
    });
  });

  it("falls back to legacy selected-provider fields for backward compatibility", async () => {
    mocks.getVideoServiceDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: vi.fn().mockResolvedValue(
            mockDoc({
              video: {
                provider: "elizaos",
                apiKey: "legacy-eliza-key",
                baseUrl: "https://legacy.eliza.example",
                model: "legacy-eliza-model",
              },
            }),
          ),
        }),
      }),
    });

    const { getVideoProviderRuntimeConfig } = await import("../video-service/src/inference-config");
    const config = await getVideoProviderRuntimeConfig("elizaos");

    expect(config).toEqual({
      apiKey: "legacy-eliza-key",
      baseUrl: "https://legacy.eliza.example",
      model: "legacy-eliza-model",
    });
  });
});
