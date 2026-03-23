import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createX402PaidJob: vi.fn(),
  dispatchSingleJob: vi.fn(),
  getHashArtX402Server: vi.fn(),
  getEnv: vi.fn(),
}));

vi.mock("@/lib/jobs/repository", () => ({
  createX402PaidJob: mocks.createX402PaidJob,
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
        wallet: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
        packageType: "1d",
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

    const x402Server = {
      buildRequirements: vi.fn().mockResolvedValue({
        accepts: [
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            amount: "3000000",
            asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            payTo: "11111111111111111111111111111111",
            maxTimeoutSeconds: 300,
          },
        ],
        resource: {
          url: "https://hashart.fun/api/x402/video",
          description: "HashArt 30s cinematic trailer",
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
    mocks.createX402PaidJob.mockResolvedValue({
      jobId: "job-x402-1",
      status: "payment_confirmed",
      progress: "payment_confirmed",
      packageType: "1d",
      rangeDays: 1,
      priceSol: 0.02,
      priceUsdc: 3,
      videoSeconds: 30,
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
    expect(body.package.priceUsdc).toBe(3);
    expect(body.package.durationSeconds).toBe(30);
    expect(mocks.createX402PaidJob).not.toHaveBeenCalled();
  });

  it("settles x402 payment, creates the job, and dispatches processing", async () => {
    const response = await POST(
      buildRequest({
        headers: {
          "payment-signature": "payment-header-1",
        },
        body: {
          wallet: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
          durationSeconds: 60,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createX402PaidJob).toHaveBeenCalledWith({
      wallet: "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z",
      packageType: "2d",
      transaction: "sig-x402-1",
    });
    expect(mocks.dispatchSingleJob).toHaveBeenCalledWith("job-x402-1");
    expect(body.payment.method).toBe("x402_usdc");
    expect(body.payment.transaction).toBe("sig-x402-1");
    expect(body.urls.status).toBe("https://hashart.fun/api/jobs/job-x402-1");
  });
});
