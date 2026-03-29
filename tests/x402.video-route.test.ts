import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createX402PaidTokenVideoJob: vi.fn(),
  dispatchSingleJob: vi.fn(),
  getHashArtX402Server: vi.fn(),
  getEnv: vi.fn(),
  resolveMemecoinMetadata: vi.fn(),
}));

vi.mock("@/lib/jobs/repository", () => ({
  createX402PaidTokenVideoJob: mocks.createX402PaidTokenVideoJob,
}));

vi.mock("@/lib/jobs/dispatch", () => ({
  dispatchSingleJob: mocks.dispatchSingleJob,
}));

vi.mock("@/lib/x402/hashart", () => ({
  getHashArtX402Server: mocks.getHashArtX402Server,
  usdToUsdcAtomic: (amountUsd: number) => String(Math.round(amountUsd * 1_000_000)),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/memecoins/metadata", () => ({
  resolveMemecoinMetadata: mocks.resolveMemecoinMetadata,
}));

import { POST } from "@/app/api/x402/video/route";

function buildRequest(input?: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return new NextRequest("http://localhost/api/x402/video", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input?.headers ?? {}),
    },
    body: JSON.stringify(
      input?.body ?? {
        tokenAddress: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
        packageType: "1d",
        chain: "solana",
      },
    ),
  });
}

describe("POST /api/x402/video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({
      APP_BASE_URL: "https://hashart.fun",
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

    const x402Server = {
      buildRequirements: vi.fn().mockResolvedValue({
        accepts: [
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            amount: "1000000",
            asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            payTo: "11111111111111111111111111111111",
            maxTimeoutSeconds: 300,
          },
        ],
        resource: {
          url: "https://hashart.fun/api/x402/video",
          description: "HashCinema 30s memecoin video",
          mimeType: "application/json",
        },
      }),
      encodeRequirements: vi.fn().mockReturnValue("encoded-payment-required"),
      settlePayment: vi.fn().mockResolvedValue({
        success: true,
        transaction: "sig-x402-1",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        payer: "payer-wallet-1",
      }),
    };

    mocks.getHashArtX402Server.mockReturnValue(x402Server);
    mocks.createX402PaidTokenVideoJob.mockResolvedValue({
      jobId: "job-x402-1",
      status: "payment_confirmed",
      progress: "payment_confirmed",
      packageType: "1d",
      rangeDays: 1,
      priceSol: 0.01,
      priceUsdc: 1,
      videoSeconds: 30,
      subjectAddress: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
      subjectChain: "solana",
      subjectName: "Hash Token",
      subjectSymbol: "HASH",
      stylePreset: "hyperflow_assembly",
    });
    mocks.dispatchSingleJob.mockResolvedValue({
      jobId: "job-x402-1",
      status: "dispatched",
    });
  });

  it("returns an x402 challenge when no payment signature is present", async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(response.headers.get("PAYMENT-REQUIRED")).toBe("encoded-payment-required");
    expect(body.paymentMethod).toBe("x402_usdc");
    expect(body.currency).toBe("USDC");
    expect(body.package.priceUsdc).toBe(1);
    expect(body.package.durationSeconds).toBe(30);
    expect(mocks.createX402PaidTokenVideoJob).not.toHaveBeenCalled();
  });

  it("settles x402 payment, creates the job, and dispatches processing", async () => {
    const response = await POST(
      buildRequest({
        headers: {
          "payment-signature": "payment-header-1",
        },
        body: {
          tokenAddress: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
          durationSeconds: 60,
          chain: "solana",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createX402PaidTokenVideoJob).toHaveBeenCalledWith({
      tokenAddress: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
      packageType: "2d",
      subjectChain: "solana",
      subjectName: "Hash Token",
      subjectSymbol: "HASH",
      subjectImage: null,
      subjectDescription: "Hash token description",
      transaction: "sig-x402-1",
      stylePreset: "hyperflow_assembly",
      requestedPrompt: null,
    });
    expect(mocks.dispatchSingleJob).toHaveBeenCalledWith("job-x402-1");
    expect(body.payment.method).toBe("x402_usdc");
    expect(body.payment.transaction).toBe("sig-x402-1");
    expect(body.urls.status).toBe("https://hashart.fun/api/jobs/job-x402-1");
  });
});

