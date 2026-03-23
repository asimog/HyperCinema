import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { createX402PaidJob } from "@/lib/jobs/repository";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { resolvePackage } from "@/lib/packages";
import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getHashArtX402Server, usdToUsdcAtomic } from "@/lib/x402/hashart";

export const runtime = "nodejs";

const agentVideoRequestSchema = z
  .object({
    wallet: z.string().min(32).max(64),
    packageType: z.enum(["1d", "2d", "3d"]).optional(),
    durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
  })
  .refine((value) => value.packageType || value.durationSeconds, {
    message: "Either packageType or durationSeconds is required.",
    path: ["packageType"],
  });

function isValidWallet(wallet: string): boolean {
  try {
    new PublicKey(wallet);
    return true;
  } catch {
    return false;
  }
}

function buildResourceUrl(): string {
  const env = getEnv();
  return new URL("/api/x402/video", env.APP_BASE_URL).toString();
}

async function buildRequirements(input: {
  packageType: "1d" | "2d" | "3d";
  priceUsdc: number;
  durationSeconds: number;
}) {
  const server = getHashArtX402Server();
  return server.buildRequirements({
    amountAtomic: usdToUsdcAtomic(input.priceUsdc),
    resourceUrl: buildResourceUrl(),
    description: `HashArt ${input.durationSeconds}s cinematic trailer`,
    mimeType: "application/json",
    timeoutSeconds: 300,
  });
}

function build402Response(input: {
  error?: string;
  requirementsHeader: string;
  accepts: unknown[];
  resource: unknown;
  packageType: "1d" | "2d" | "3d";
  rangeDays: number;
  priceSol: number;
  priceUsdc: number;
  durationSeconds: number;
}) {
  return NextResponse.json(
    {
      error: input.error ?? "Payment required",
      paymentMethod: "x402_usdc",
      network: "solana",
      currency: "USDC",
      package: {
        packageType: input.packageType,
        rangeDays: input.rangeDays,
        durationSeconds: input.durationSeconds,
        priceSol: input.priceSol,
        priceUsdc: input.priceUsdc,
      },
      accepts: input.accepts,
      resource: input.resource,
    },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": input.requirementsHeader,
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = agentVideoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    if (!isValidWallet(parsed.data.wallet)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 },
      );
    }

    const pkg = resolvePackage({
      packageType: parsed.data.packageType ?? null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    });
    if (!pkg) {
      return NextResponse.json(
        { error: "Unsupported package request" },
        { status: 400 },
      );
    }

    const server = getHashArtX402Server();
    const requirements = await buildRequirements({
      packageType: pkg.packageType,
      priceUsdc: pkg.priceUsdc,
      durationSeconds: pkg.videoSeconds,
    });
    const requirementsHeader = server.encodeRequirements(requirements);
    const paymentSignature = request.headers.get("payment-signature")?.trim();

    if (!paymentSignature) {
      return build402Response({
        requirementsHeader,
        accepts: requirements.accepts,
        resource: requirements.resource,
        packageType: pkg.packageType,
        rangeDays: pkg.rangeDays,
        priceSol: pkg.priceSol,
        priceUsdc: pkg.priceUsdc,
        durationSeconds: pkg.videoSeconds,
      });
    }

    const accepted = requirements.accepts[0];
    if (!accepted) {
      throw new Error("No x402 payment requirements were generated");
    }

    const settlement = await server.settlePayment(paymentSignature, accepted);
    if (!settlement.success || !settlement.transaction) {
      return build402Response({
        error: settlement.errorReason || "Payment settlement failed",
        requirementsHeader,
        accepts: requirements.accepts,
        resource: requirements.resource,
        packageType: pkg.packageType,
        rangeDays: pkg.rangeDays,
        priceSol: pkg.priceSol,
        priceUsdc: pkg.priceUsdc,
        durationSeconds: pkg.videoSeconds,
      });
    }

    const job = await createX402PaidJob({
      wallet: parsed.data.wallet,
      packageType: pkg.packageType,
      transaction: settlement.transaction,
    });

    const dispatch = await dispatchSingleJob(job.jobId);

    return NextResponse.json(
      {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        dispatchStatus: dispatch.status,
        package: {
          packageType: job.packageType,
          rangeDays: job.rangeDays,
          durationSeconds: job.videoSeconds,
          priceSol: job.priceSol,
          priceUsdc: job.priceUsdc,
        },
        payment: {
          method: "x402_usdc",
          network: settlement.network,
          currency: "USDC",
          amountUsd: job.priceUsdc,
          transaction: settlement.transaction,
          payer: settlement.payer ?? null,
        },
        urls: {
          job: `${getEnv().APP_BASE_URL}/job/${job.jobId}`,
          status: `${getEnv().APP_BASE_URL}/api/jobs/${job.jobId}`,
          report: `${getEnv().APP_BASE_URL}/api/report/${job.jobId}`,
          video: `${getEnv().APP_BASE_URL}/api/video/${job.jobId}`,
        },
      },
      {
        status: dispatch.status === "dispatched" ? 200 : 202,
        headers: {
          "X-X402-Transaction": settlement.transaction,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("x402_video_job_failed", {
      component: "api_x402_video",
      stage: "create_paid_job",
      errorCode: "x402_video_job_failed",
      errorMessage: message,
    });

    return NextResponse.json(
      { error: "Failed to create x402 video job", message },
      { status: 500 },
    );
  }
}
