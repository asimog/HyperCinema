import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTokenVideoJob, createPromptVideoJob } from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

const hashmythSchema = z.object({
  address: z.string().min(1, "Address or contract is required"),
  mode: z.enum(["wallet", "coin"]),
});

const WALLET_RATE_LIMIT_RULES = [
  { name: "hashmyth_wallet_per_day", windowSec: 86_400, limit: 2 },
] as const;

const COIN_RATE_LIMIT_RULES = [
  { name: "hashmyth_coin_per_day", windowSec: 86_400, limit: 10 },
] as const;

const VALID_CHAINS = new Set(["pump.fun", "four.meme", "clanker.world"]);

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const body = await request.json();
    const validation = hashmythSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { address, mode } = validation.data;

    if (mode === "wallet") {
      const rateLimit = await enforceRateLimit({
        scope: "api_video_hashmyth_wallet",
        key: address.toLowerCase(),
        rules: [...WALLET_RATE_LIMIT_RULES],
      });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. This wallet has reached its daily limit.",
            retryAfterSec: rateLimit.retryAfterSec,
          },
          { status: 429 },
        );
      }

      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "60s",
        subjectName: `Wallet ${address.slice(0, 8)}...`,
        subjectDescription: `HashMyth wallet analysis video for ${address}`,
        audioEnabled: true,
        visibility: "public",
        pricingMode: "public",
        experience: "hashmyth",
        paymentWaived: true,
      });

      await triggerJobProcessing(job.jobId);

      logger.info("hashmyth_wallet_video_queued", {
        component: "api",
        route: "/api/video/hashmyth",
        jobId: job.jobId,
        mode,
        address,
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
      });
    }

    // Coin mode - validate chain
    const rateLimit = await enforceRateLimit({
      scope: "api_video_hashmyth_coin",
      key: address.toLowerCase(),
      rules: [...COIN_RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. This contract has reached its daily limit.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    // Resolve token metadata
    const token = await resolveMemecoinMetadata({
      address,
      chain: "auto",
    });

    const job = await createTokenVideoJob({
      tokenAddress: address,
      packageType: "60s",
      subjectChain: token.chain,
      subjectName: token.name,
      subjectSymbol: token.symbol,
      subjectImage: token.image,
      subjectDescription: token.description,
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "hashmyth",
      paymentWaived: true,
    });

    await triggerJobProcessing(job.jobId);

    logger.info("hashmyth_coin_video_queued", {
      component: "api",
      route: "/api/video/hashmyth",
      jobId: job.jobId,
      mode,
      address,
    });

    return NextResponse.json({
      jobId: job.jobId,
      status: "pending",
    });
  } catch (error) {
    logger.error("hashmyth_video_failed", {
      component: "api",
      errorCode: "hashmyth_video_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to generate HashMyth video" },
      { status: 500 },
    );
  }
}
