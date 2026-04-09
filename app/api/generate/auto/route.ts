// Auto-detect input and create the right job — the vending machine API.
// Accepts any string: @handle, wallet address, or empty (random).
// Always free, always public, always 30s default.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";
import {
  createPromptVideoJob,
  createTokenVideoJob,
} from "@/lib/jobs/repository";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

// Wallet address patterns for Solana, EVM (Ethereum/Base/BNB)
function detectInputType(input: string): "mythx" | "hashmyth" | "random" {
  const trimmed = input.trim();
  if (!trimmed) return "random";

  // X handle: @username or just word without special chars and not a wallet
  if (trimmed.startsWith("@") || /^[a-zA-Z][a-zA-Z0-9_]{1,14}$/.test(trimmed)) {
    return "mythx";
  }

  // Solana address: base58, 32-44 chars
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return "hashmyth";
  }

  // EVM address: 0x + 40 hex chars
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return "hashmyth";
  }

  // URL containing x.com or twitter.com
  if (/x\.com|twitter\.com/.test(trimmed)) {
    return "mythx";
  }

  // Treat anything else as mythx (X handle without @)
  return "mythx";
}

const RANDOM_PROMPTS = [
  "The rise and fall of a forgotten memecoin, told through the eyes of a degenerate trader.",
  "A whale silently moves markets at midnight. What are they planning?",
  "From penny to moon: the untold story of a Solana airdrop nobody expected.",
  "The last block before the rug pull. A cinematic thriller.",
  "DeFi summer: one year later. A documentary.",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = String(body.input ?? "").trim();
    const ip = getRequestIp(request);

    // Rate limit: 10 per hour per IP
    const rateLimit = await enforceRateLimit({
      scope: "auto_generate",
      key: ip,
      rules: [
        { name: "auto_per_minute", windowSec: 60, limit: 3 },
        { name: "auto_per_hour", windowSec: 3600, limit: 10 },
      ],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Try again soon.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
      );
    }

    const type = detectInputType(input);
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    let jobId: string;
    let detectedAs: string;

    if (type === "random") {
      const prompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "30s",
        subjectName: "Random Cinema",
        subjectDescription: prompt,
        requestedPrompt: prompt,
        paymentWaived: true,
      });
      jobId = job.jobId;
      detectedAs = "random";
    } else if (type === "mythx") {
      const handle = input.startsWith("@") ? input : input.startsWith("http") ? input : `@${input}`;
      const job = await createPromptVideoJob({
        requestKind: "mythx",
        packageType: "30s",
        subjectName: handle,
        sourceMediaUrl: input.startsWith("http")
          ? input
          : `https://x.com/${handle.replace("@", "")}`,
        sourceMediaProvider: "x",
        paymentWaived: true,
        experience: "mythx",
      });
      jobId = job.jobId;
      detectedAs = "mythx";
    } else {
      // hashmyth — resolve metadata first, best-effort
      let subjectName: string | null = null;
      let subjectSymbol: string | null = null;
      let subjectImage: string | null = null;
      let subjectDescription: string | null = null;
      let chain: import("@/lib/types/domain").SupportedTokenChain = "solana";

      try {
        const meta = await resolveMemecoinMetadata({ address: input, chain: "auto" });
        subjectName = meta.name;
        subjectSymbol = meta.symbol;
        subjectImage = meta.image;
        subjectDescription = meta.description;
        chain = meta.chain;
      } catch {
        // proceed with nulls — worker will retry
      }

      const job = await createTokenVideoJob({
        tokenAddress: input,
        packageType: "30s",
        subjectChain: chain,
        subjectName,
        subjectSymbol,
        subjectImage,
        subjectDescription,
        paymentWaived: true,
      });
      jobId = job.jobId;
      detectedAs = "hashmyth";
    }

    // Fire-and-forget job trigger
    triggerJobProcessing(jobId).catch((err) => {
      logger.error("auto_generate_trigger_failed", {
        component: "api",
        jobId,
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    });

    logger.info("auto_generate_created", {
      component: "api",
      jobId,
      detectedAs,
      input: input.slice(0, 64),
    });

    return NextResponse.json({
      jobId,
      jobUrl: `${appBaseUrl}/job/${jobId}`,
      detectedAs,
    });
  } catch (error) {
    logger.error("auto_generate_failed", {
      component: "api",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Generation failed", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
