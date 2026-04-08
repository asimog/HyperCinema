import {
  createDiscountWaivedPromptVideoJob,
  createDiscountWaivedTokenVideoJob,
  createPromptVideoJob,
  createTokenVideoJob,
  findRecentReusableTokenJob,
  rollbackUnpaidJob,
} from "@/lib/jobs/repository";
import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { ensurePaymentAddressSubscribedToHeliusWebhook } from "@/lib/helius/webhook-subscriptions";
import { logger } from "@/lib/logging/logger";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { getPackageConfig } from "@/lib/packages";
import { normalizeDiscountCode } from "@/lib/payments/discount-codes";
import { lamportsToSol } from "@/lib/payments/solana-pay";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import {
  CinemaExperience,
  CinemaPricingMode,
  CinemaVisibility,
  JobDocument,
  PackageType,
  RequestedTokenChain,
  VideoStyleId,
} from "@/lib/types/domain";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertFirestoreEmulatorAvailable } from "@/lib/firebase/emulator";
import { getCinemaPackageConfig } from "@/lib/cinema/config";
import {
  getDefaultStylePresetForExperience,
  videoStyleSchema,
} from "@/lib/styles/video-style-validation";

export const runtime = "nodejs";

const sharedCinemaSchema = z.object({
  packageType: z.enum(["30s", "60s"]),
  stylePreset: videoStyleSchema.optional(),
  requestedPrompt: z.string().max(4_000).optional(),
  audioEnabled: z.boolean().optional(),
  discountCode: z.string().max(32).optional(),
  pricingMode: z.enum(["legacy", "public", "private"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  experience: z
    .enum([
      "legacy",
      "hypercinema",
      "hyperm",
      "mythx",
      "trenchcinema",
      "funcinema",
      "familycinema",
      "musicvideo",
      "recreator",
      "hashmyth",
      "lovex",
    ])
    .optional(),
});

const tokenVideoSchema = sharedCinemaSchema.extend({
  requestKind: z.literal("token_video").optional(),
  tokenAddress: z.string().min(32).max(64),
  chain: z.enum(["auto", "solana", "ethereum", "bsc", "base"]).default("auto"),
  subjectDescription: z.string().max(1_200).optional(),
});

const promptVideoSchema = sharedCinemaSchema.extend({
  requestKind: z.enum([
    "generic_cinema",
    "mythx",
    "bedtime_story",
    "music_video",
    "scene_recreation",
  ]),
  subjectName: z.string().min(2).max(120),
  subjectDescription: z.string().max(4_000).optional(),
  sourceMediaUrl: z.string().url().max(1_500).optional(),
  sourceEmbedUrl: z.string().url().max(1_500).optional(),
  sourceMediaProvider: z.string().max(64).optional(),
  sourceTranscript: z.string().max(12_000).optional(),
});

const createJobSchema = z.union([tokenVideoSchema, promptVideoSchema]);

const JOB_RATE_LIMIT_RULES = [
  { name: "jobs_per_minute", windowSec: 60, limit: 5 },
  { name: "jobs_per_hour", windowSec: 60 * 60, limit: 20 },
] as const;

type CreateJobPayload = z.infer<typeof createJobSchema>;

interface CreateJobResponse {
  jobId: string;
  priceSol: number;
  paymentAddress: string;
  amountSol: number;
  paymentRequired: boolean;
  tokenAddress?: string | null;
  chain?: RequestedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  stylePreset?: VideoStyleId | null;
  pricingMode?: CinemaPricingMode;
  visibility?: CinemaVisibility;
  experience?: CinemaExperience;
  discountCode?: string | null;
}

function isPromptPayload(payload: CreateJobPayload): payload is z.infer<typeof promptVideoSchema> {
  return (
    payload.requestKind === "generic_cinema" ||
    payload.requestKind === "mythx" ||
    payload.requestKind === "bedtime_story" ||
    payload.requestKind === "music_video" ||
    payload.requestKind === "scene_recreation"
  );
}

function resolvePricing(input: {
  packageType: PackageType;
  pricingMode?: CinemaPricingMode;
}) {
  if (input.pricingMode === "public" || input.pricingMode === "private") {
    return getCinemaPackageConfig({
      packageType: input.packageType,
      pricingMode: input.pricingMode,
    });
  }

  return getPackageConfig(input.packageType);
}

function normalizeVisibility(input: {
  pricingMode?: CinemaPricingMode;
  visibility?: CinemaVisibility;
  requestKind?: CreateJobPayload["requestKind"];
}): CinemaVisibility {
  if (input.visibility === "private" || input.pricingMode === "private") {
    return "private";
  }

  if (input.requestKind === "bedtime_story") {
    return "private";
  }

  return "public";
}

function normalizeExperience(input: {
  experience?: CinemaExperience;
  requestKind?: CreateJobPayload["requestKind"];
  visibility: CinemaVisibility;
}): CinemaExperience {
  if (
    input.experience === "legacy" ||
    input.experience === "hypercinema" ||
    input.experience === "hyperm" ||
    input.experience === "mythx" ||
    input.experience === "trenchcinema" ||
    input.experience === "funcinema" ||
    input.experience === "familycinema" ||
    input.experience === "musicvideo" ||
    input.experience === "recreator" ||
    input.experience === "hashmyth" ||
    input.experience === "lovex"
  ) {
    return input.experience;
  }

  if (input.requestKind === "token_video") {
    return "hashmyth";
  }

  if (input.requestKind === "mythx") {
    return "mythx";
  }

  if (input.requestKind === "bedtime_story") {
    return "familycinema";
  }

  if (input.requestKind === "music_video") {
    return "musicvideo";
  }

  if (input.requestKind === "scene_recreation") {
    return "recreator";
  }

  return input.visibility === "private" ? "funcinema" : "hyperm";
}

function createJobResponse(input: {
  job: JobDocument;
  chain?: RequestedTokenChain | null;
}): CreateJobResponse {
  return {
    jobId: input.job.jobId,
    priceSol: input.job.priceSol,
    paymentAddress: input.job.paymentAddress,
    amountSol: lamportsToSol(input.job.requiredLamports),
    paymentRequired: !input.job.paymentWaived && input.job.requiredLamports > 0,
    tokenAddress: input.job.subjectAddress ?? null,
    chain: input.chain ?? (input.job.subjectChain ?? null),
    subjectName: input.job.subjectName ?? null,
    subjectSymbol: input.job.subjectSymbol ?? null,
    subjectImage: input.job.subjectImage ?? null,
    stylePreset: input.job.stylePreset ?? null,
    pricingMode: input.job.pricingMode ?? "legacy",
    visibility: input.job.visibility ?? "public",
    experience: input.job.experience ?? "legacy",
    discountCode: input.job.discountCode ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    await assertFirestoreEmulatorAvailable();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firestore emulator is unavailable.";
    return NextResponse.json(
      {
        error: "Firestore emulator unavailable",
        message,
        details: "Start the local Firestore emulator before creating MythX jobs.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const ip = getRequestIp(request);
    const rateLimitKey = isPromptPayload(payload)
      ? `${ip}:${payload.subjectName.toLowerCase()}`
      : `${ip}:${payload.tokenAddress.toLowerCase()}`;

    const rateLimit = await enforceRateLimit({
      scope: "api_jobs_post",
      key: rateLimitKey,
      rules: [...JOB_RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const pricingMode = payload.pricingMode ?? "legacy";
    const visibility = normalizeVisibility({
      pricingMode,
      visibility: payload.visibility,
      requestKind: payload.requestKind,
    });
    const experience = normalizeExperience({
      experience: payload.experience,
      requestKind: payload.requestKind,
      visibility,
    });

    const creatorId: string | null = null;

    const pkg = resolvePricing({
      packageType: payload.packageType as PackageType,
      pricingMode,
    });
    const discountCode = payload.discountCode?.trim()
      ? normalizeDiscountCode(payload.discountCode)
      : null;
    const defaultStylePreset = getDefaultStylePresetForExperience(experience);

    if (!isPromptPayload(payload)) {
      const resolved = await resolveMemecoinMetadata({
        address: payload.tokenAddress,
        chain: payload.chain,
      });

      if (discountCode) {
        const job = await createDiscountWaivedTokenVideoJob({
          tokenAddress: payload.tokenAddress,
          packageType: payload.packageType as PackageType,
          subjectChain: resolved.chain,
          subjectName: resolved.name,
          subjectSymbol: resolved.symbol,
          subjectImage: resolved.image,
          subjectDescription:
            payload.subjectDescription?.trim() ||
            resolved.description,
          stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
          requestedPrompt: payload.requestedPrompt?.trim() || null,
          audioEnabled: payload.audioEnabled,
          pricingMode,
          visibility,
          experience,
          creatorId,
          priceSol: pkg.priceSol,
          priceUsdc: pkg.priceUsdc,
          videoSeconds: pkg.videoSeconds,
          rangeDays: pkg.rangeDays,
          discountCode,
        });
        await dispatchSingleJob(job.jobId);

        return NextResponse.json(
          createJobResponse({
            job,
            chain: job.subjectChain ?? resolved.chain,
          }),
        );
      }

      const canReuseLegacy =
        pricingMode === "legacy" &&
        visibility === "public" &&
        (payload.requestKind ?? "token_video") === "token_video";

      if (canReuseLegacy) {
        const reusableJob = await findRecentReusableTokenJob({
          tokenAddress: payload.tokenAddress,
          packageType: payload.packageType as PackageType,
          subjectChain: resolved.chain,
          stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
          requestedPrompt: payload.requestedPrompt?.trim() || null,
          maxAgeMinutes: 20,
        });

        if (reusableJob) {
          await ensurePaymentAddressSubscribedToHeliusWebhook(reusableJob.paymentAddress);
          return NextResponse.json(
            createJobResponse({
              job: reusableJob,
              chain: reusableJob.subjectChain ?? resolved.chain,
            }),
          );
        }
      }

      const job = await createTokenVideoJob({
        tokenAddress: payload.tokenAddress,
        packageType: payload.packageType as PackageType,
        subjectChain: resolved.chain,
        subjectName: resolved.name,
        subjectSymbol: resolved.symbol,
        subjectImage: resolved.image,
        subjectDescription:
          payload.subjectDescription?.trim() ||
          resolved.description,
        stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
        requestedPrompt: payload.requestedPrompt?.trim() || null,
        audioEnabled: payload.audioEnabled,
        pricingMode,
        visibility,
        experience,
        creatorId,
        priceSol: pkg.priceSol,
        priceUsdc: pkg.priceUsdc,
        videoSeconds: pkg.videoSeconds,
        rangeDays: pkg.rangeDays,
      });

      try {
        await ensurePaymentAddressSubscribedToHeliusWebhook(job.paymentAddress);
      } catch (error) {
        const rollback = await rollbackUnpaidJob(job.jobId);
        const message = error instanceof Error ? error.message : "Unknown error";

        logger.error("job_create_webhook_subscription_failed", {
          component: "api_jobs",
          stage: "create_job",
          jobId: job.jobId,
          paymentAddress: job.paymentAddress,
          errorCode: "webhook_subscription_failed",
          errorMessage: message,
          rolledBack: rollback.rolledBack,
        });

        return NextResponse.json(
          {
            error:
              "Failed to subscribe payment address to webhook. Please retry job creation.",
            message,
            rolledBack: rollback.rolledBack,
          },
          { status: rollback.rolledBack ? 503 : 500 },
        );
      }

      return NextResponse.json(
        createJobResponse({
          job,
          chain: job.subjectChain ?? resolved.chain,
        }),
      );
    }

    if (discountCode) {
      const job = await createDiscountWaivedPromptVideoJob({
        requestKind: payload.requestKind,
        packageType: payload.packageType as PackageType,
        subjectName: payload.subjectName,
        subjectDescription: payload.subjectDescription?.trim() || null,
        sourceMediaUrl: payload.sourceMediaUrl?.trim() || null,
        sourceEmbedUrl: payload.sourceEmbedUrl?.trim() || null,
        sourceMediaProvider: payload.sourceMediaProvider?.trim() || null,
        sourceTranscript: payload.sourceTranscript?.trim() || null,
        stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
        requestedPrompt: payload.requestedPrompt?.trim() || null,
        audioEnabled: payload.audioEnabled,
        pricingMode,
        visibility,
        experience,
        creatorId,
        priceSol: pkg.priceSol,
        priceUsdc: pkg.priceUsdc,
        videoSeconds: pkg.videoSeconds,
        rangeDays: pkg.rangeDays,
        discountCode,
      });
      await dispatchSingleJob(job.jobId);

      return NextResponse.json(
        createJobResponse({
          job,
          chain: null,
        }),
      );
    }

    const job = await createPromptVideoJob({
      requestKind: payload.requestKind,
      packageType: payload.packageType as PackageType,
      subjectName: payload.subjectName,
      subjectDescription: payload.subjectDescription?.trim() || null,
      sourceMediaUrl: payload.sourceMediaUrl?.trim() || null,
      sourceEmbedUrl: payload.sourceEmbedUrl?.trim() || null,
      sourceMediaProvider: payload.sourceMediaProvider?.trim() || null,
      sourceTranscript: payload.sourceTranscript?.trim() || null,
      stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
      requestedPrompt: payload.requestedPrompt?.trim() || null,
      audioEnabled: payload.audioEnabled,
      pricingMode,
      visibility,
      experience,
      creatorId,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      rangeDays: pkg.rangeDays,
    });

    try {
      await ensurePaymentAddressSubscribedToHeliusWebhook(job.paymentAddress);
    } catch (error) {
      const rollback = await rollbackUnpaidJob(job.jobId);
      const message = error instanceof Error ? error.message : "Unknown error";

      logger.error("job_create_webhook_subscription_failed", {
        component: "api_jobs",
        stage: "create_job",
        jobId: job.jobId,
        paymentAddress: job.paymentAddress,
        errorCode: "webhook_subscription_failed",
        errorMessage: message,
        rolledBack: rollback.rolledBack,
      });

      return NextResponse.json(
        {
          error:
            "Failed to subscribe payment address to webhook. Please retry job creation.",
          message,
          rolledBack: rollback.rolledBack,
        },
        { status: rollback.rolledBack ? 503 : 500 },
      );
    }

    return NextResponse.json(
      createJobResponse({
        job,
        chain: null,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("valid Solana mint") ||
      message.includes("EVM-formatted") ||
      message.includes("support the Solana chain")
        ? 400
        : 500;
    return NextResponse.json(
      { error: "Failed to create job", message },
      { status },
    );
  }
}
