import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createTokenVideoJob: vi.fn(),
  createPromptVideoJob: vi.fn(),
  findRecentReusableTokenJob: vi.fn(),
  rollbackUnpaidJob: vi.fn(),
  ensurePaymentAddressSubscribedToHeliusWebhook: vi.fn(),
  enforceRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  resolveMemecoinMetadata: vi.fn(),
  getCrossmintSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/jobs/repository", () => ({
  createTokenVideoJob: mocks.createTokenVideoJob,
  createPromptVideoJob: mocks.createPromptVideoJob,
  findRecentReusableTokenJob: mocks.findRecentReusableTokenJob,
  rollbackUnpaidJob: mocks.rollbackUnpaidJob,
}));

vi.mock("@/lib/helius/webhook-subscriptions", () => ({
  ensurePaymentAddressSubscribedToHeliusWebhook:
    mocks.ensurePaymentAddressSubscribedToHeliusWebhook,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/request-ip", () => ({
  getRequestIp: mocks.getRequestIp,
}));

vi.mock("@/lib/memecoins/metadata", () => ({
  resolveMemecoinMetadata: mocks.resolveMemecoinMetadata,
}));

vi.mock("@/lib/crossmint/server", () => ({
  getCrossmintSessionFromRequest: mocks.getCrossmintSessionFromRequest,
}));

import { POST } from "@/app/api/jobs/route";

function buildTokenRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tokenAddress: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
      packageType: "30s",
      chain: "solana",
      stylePreset: "trench_neon",
    }),
  });
}

function buildPromptRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestKind: "generic_cinema",
      subjectName: "HyperCinema teaser",
      subjectDescription: "A minimal route launcher short.",
      sourceMediaUrl: "https://www.youtube.com/watch?v=x55A69SSvsg",
      sourceTranscript: "Open on the hook.\nRide the beat.",
      packageType: "30s",
      pricingMode: "public",
      visibility: "public",
      experience: "hypercinema",
    }),
  });
}

function buildMythXRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestKind: "mythx",
      subjectName: "@creator",
      subjectDescription: "Autobiography from the last 42 tweets.",
      sourceMediaUrl: "https://x.com/creator",
      sourceMediaProvider: "x",
      sourceTranscript: "First tweet.\nSecond tweet.",
      packageType: "30s",
      pricingMode: "public",
      visibility: "public",
      audioEnabled: true,
      experience: "mythx",
    }),
  });
}

function buildMusicVideoRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestKind: "music_video",
      subjectName: "Neon Anthem",
      subjectDescription: "A synthwave single gets trailer treatment.",
      packageType: "30s",
      pricingMode: "public",
      visibility: "public",
    }),
  });
}

function buildSceneRecreationRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestKind: "scene_recreation",
      subjectName: "The Last Scene",
      subjectDescription: "A source scene gets rebuilt at higher voltage.",
      packageType: "30s",
      pricingMode: "public",
      visibility: "public",
    }),
  });
}

describe("POST /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
    mocks.findRecentReusableTokenJob.mockResolvedValue(null);
    mocks.rollbackUnpaidJob.mockResolvedValue({
      rolledBack: true,
      job: null,
    });
    mocks.resolveMemecoinMetadata.mockResolvedValue({
      address: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
      chain: "solana",
      name: "Hash Token",
      symbol: "HASH",
      image: null,
      description: "Hash token description",
      isPump: true,
      links: [],
      marketSnapshot: {
        priceUsd: null,
        marketCapUsd: null,
        liquidityUsd: null,
        volume24hUsd: null,
        pairUrl: null,
      },
    });
    mocks.createTokenVideoJob.mockResolvedValue({
      jobId: "job-1",
      priceSol: 0.01,
      paymentAddress: "11111111111111111111111111111111",
      requiredLamports: 10_000_000,
      subjectChain: "solana",
      subjectName: "Hash Token",
      subjectSymbol: "HASH",
      stylePreset: "trench_neon",
      pricingMode: "legacy",
      visibility: "public",
      experience: "legacy",
    });
    mocks.createPromptVideoJob.mockResolvedValue({
      jobId: "job-prompt-1",
      priceSol: 0.004,
      paymentAddress: "11111111111111111111111111111111",
      requiredLamports: 4_000_000,
      subjectName: "HyperCinema teaser",
      pricingMode: "public",
      visibility: "public",
      experience: "hypercinema",
    });
    mocks.ensurePaymentAddressSubscribedToHeliusWebhook.mockResolvedValue({
      webhookId: "wh-1",
      created: false,
      alreadySubscribed: false,
    });
    mocks.getCrossmintSessionFromRequest.mockResolvedValue(null);
  });

  it("creates a token video job and subscribes the payment address to Helius", async () => {
    const response = await POST(buildTokenRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-1");
    expect(body.subjectSymbol).toBe("HASH");
    expect(mocks.createTokenVideoJob).toHaveBeenCalledTimes(1);
    expect(mocks.ensurePaymentAddressSubscribedToHeliusWebhook).toHaveBeenCalledWith(
      "11111111111111111111111111111111",
    );
  });

  it("reuses an existing recent token job for same token/package/style", async () => {
    mocks.findRecentReusableTokenJob.mockResolvedValue({
      jobId: "job-reused",
      priceSol: 0.01,
      paymentAddress: "11111111111111111111111111111111",
      requiredLamports: 10_000_000,
      subjectChain: "solana",
      subjectName: "Hash Token",
      subjectSymbol: "HASH",
      stylePreset: "trench_neon",
      pricingMode: "legacy",
      visibility: "public",
      experience: "legacy",
    });

    const response = await POST(buildTokenRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-reused");
    expect(mocks.createTokenVideoJob).not.toHaveBeenCalled();
    expect(mocks.ensurePaymentAddressSubscribedToHeliusWebhook).toHaveBeenCalledWith(
      "11111111111111111111111111111111",
    );
  });

  it("creates a prompt-driven public cinema job", async () => {
    const response = await POST(buildPromptRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt-1");
    expect(body.pricingMode).toBe("public");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledTimes(1);
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKind: "generic_cinema",
        sourceMediaUrl: "https://www.youtube.com/watch?v=x55A69SSvsg",
        sourceTranscript: "Open on the hook.\nRide the beat.",
      }),
    );
  });

  it("creates a MythX prompt-driven autobiography job", async () => {
    const response = await POST(buildMythXRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt-1");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKind: "mythx",
        subjectName: "@creator",
        sourceMediaUrl: "https://x.com/creator",
        sourceMediaProvider: "x",
        sourceTranscript: "First tweet.\nSecond tweet.",
        audioEnabled: true,
        experience: "mythx",
      }),
    );
  });

  it("creates a prompt-driven music video job with audio enabled by default", async () => {
    const response = await POST(buildMusicVideoRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt-1");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKind: "music_video",
        subjectName: "Neon Anthem",
        experience: "musicvideo",
      }),
    );
  });

  it("creates a prompt-driven scene recreation job with audio enabled by default", async () => {
    const response = await POST(buildSceneRecreationRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt-1");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKind: "scene_recreation",
        subjectName: "The Last Scene",
        experience: "recreator",
      }),
    );
  });

  it("rolls back the new job and returns 503 when webhook subscription fails", async () => {
    mocks.ensurePaymentAddressSubscribedToHeliusWebhook.mockRejectedValue(
      new Error("helius webhook update failed"),
    );

    const response = await POST(buildTokenRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("Failed to subscribe payment address");
    expect(String(body.message)).toContain("helius webhook update failed");
    expect(body.rolledBack).toBe(true);
    expect(mocks.rollbackUnpaidJob).toHaveBeenCalledWith("job-1");
  });
});
