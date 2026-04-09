import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  getInferenceRuntimeConfig: vi.fn(),
  fetchWithTimeout: vi.fn(),
  resolveTextProviderSelection: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ getEnv: mocks.getEnv }));
vi.mock("@/lib/inference/config", () => ({
  getInferenceRuntimeConfig: mocks.getInferenceRuntimeConfig,
  resolveTextProviderSelection: mocks.resolveTextProviderSelection,
}));
vi.mock("@/lib/network/http", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));
vi.mock("@/lib/network/retry", () => ({
  withRetry: async (fn: () => Promise<unknown>) => fn(),
  isRetryableHttpStatus: () => false,
  RetryableError: class RetryableError extends Error {},
}));

describe("FAL text provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({ OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1" });
    mocks.getInferenceRuntimeConfig.mockResolvedValue({});
    mocks.resolveTextProviderSelection.mockReturnValue({
      provider: "fal",
      selection: { apiKey: "test-fal-key", baseUrl: "https://fal.run", model: null },
    });
  });

  it("uses 'Key' Authorization header, not 'Bearer'", async () => {
    mocks.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ output: "Hello from Fal" }),
    });

    const { generateTextInference } = await import("@/lib/inference/text");
    await generateTextInference({
      provider: "fal",
      messages: [{ role: "user", content: "Hello" }],
    });

    const [, options] = mocks.fetchWithTimeout.mock.calls[0];
    expect(options.headers["Authorization"]).toMatch(/^Key /);
    expect(options.headers["Authorization"]).not.toMatch(/^Bearer /);
  });

  it("constructs URL as {baseUrl}/{model}", async () => {
    mocks.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ output: "response" }),
    });

    const { generateTextInference } = await import("@/lib/inference/text");
    await generateTextInference({
      provider: "fal",
      model: "fal-ai/wizardlm-2-8x22b",
      messages: [{ role: "user", content: "Test" }],
    });

    const [url] = mocks.fetchWithTimeout.mock.calls[0];
    expect(url).toBe("https://fal.run/fal-ai%2Fwizardlm-2-8x22b");
  });

  it("throws if apiKey is missing", async () => {
    mocks.resolveTextProviderSelection.mockReturnValue({
      provider: "fal",
      selection: { apiKey: null, baseUrl: "https://fal.run", model: null },
    });

    const { generateTextInference } = await import("@/lib/inference/text");
    await expect(
      generateTextInference({ provider: "fal", messages: [{ role: "user", content: "Hi" }] }),
    ).rejects.toThrow("FAL_API_KEY");
  });

  it("parses output field from FAL response", async () => {
    mocks.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ output: "  generated text  " }),
    });

    const { generateTextInference } = await import("@/lib/inference/text");
    const result = await generateTextInference({
      provider: "fal",
      messages: [{ role: "user", content: "Prompt" }],
    });
    expect(result).toBe("generated text");
  });

  it("parses generated_text field as fallback", async () => {
    mocks.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ generated_text: "fallback text" }),
    });

    const { generateTextInference } = await import("@/lib/inference/text");
    const result = await generateTextInference({
      provider: "fal",
      messages: [{ role: "user", content: "Prompt" }],
    });
    expect(result).toBe("fallback text");
  });
});
