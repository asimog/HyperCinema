import { resolveRenderConfig } from "../video-service/src/render-service";

describe("video-service render config resolver", () => {
  const env = {
    envModel: "veo-3.1-fast-generate-001" as const,
    envResolution: "1080p" as const,
  };

  it("falls back to env model when stale metadata model is present", () => {
    const resolved = resolveRenderConfig({
      ...env,
      metadata: {
        model: "veo-3",
        resolution: "1080p",
      },
      requestResolution: "1080p",
    });

    expect(resolved.model).toBe("veo-3.1-fast-generate-001");
    expect(resolved.resolution).toBe("1080p");
  });

  it("keeps valid metadata model and resolution", () => {
    const resolved = resolveRenderConfig({
      ...env,
      metadata: {
        model: "veo-3.1-fast-generate-001",
        resolution: "720p",
      },
      requestResolution: "1080p",
    });

    expect(resolved.model).toBe("veo-3.1-fast-generate-001");
    expect(resolved.resolution).toBe("720p");
  });

  it("falls back to env resolution when request data is invalid", () => {
    const resolved = resolveRenderConfig({
      ...env,
      metadata: undefined,
      requestResolution: "2k",
    });

    expect(resolved.model).toBe("veo-3.1-fast-generate-001");
    expect(resolved.resolution).toBe("1080p");
  });
});
