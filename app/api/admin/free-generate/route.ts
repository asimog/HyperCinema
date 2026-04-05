import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import {
  createPromptVideoJob,
  createTokenVideoJob,
  updateJobStatus,
} from "@/lib/jobs/repository";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { getCinemaPackageConfig } from "@/lib/cinema/config";
import { getCrossmintSessionFromRequest, isCrossmintAdmin } from "@/lib/crossmint/server";
import { logger } from "@/lib/logging/logger";
import {
  CinemaExperience,
  PackageType,
  VideoStyleId,
} from "@/lib/types/domain";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getDefaultStylePresetForExperience,
  videoStyleSchema,
} from "@/lib/styles/video-style-validation";

export const runtime = "nodejs";

const freeGenerateSchema = z.discriminatedUnion("requestKind", [
  z.object({
    requestKind: z.literal("token_video"),
    tokenAddress: z.string().min(32).max(64),
    chain: z.enum(["auto", "solana", "ethereum", "bsc", "base"]).default("auto"),
    packageType: z.enum(["30s", "60s"]),
    stylePreset: videoStyleSchema.optional(),
    subjectDescription: z.string().max(1_200).optional(),
    requestedPrompt: z.string().max(4_000).optional(),
    audioEnabled: z.boolean().optional(),
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
  }),
  z.object({
    requestKind: z.enum(["generic_cinema", "mythx", "bedtime_story", "music_video", "scene_recreation"]),
    subjectName: z.string().min(2).max(120),
    subjectDescription: z.string().max(4_000).optional(),
    sourceMediaUrl: z.string().url().max(1_500).optional(),
    sourceMediaProvider: z.string().max(64).optional(),
    sourceTranscript: z.string().max(12_000).optional(),
    packageType: z.enum(["30s", "60s"]),
    stylePreset: videoStyleSchema.optional(),
    requestedPrompt: z.string().max(4_000).optional(),
    audioEnabled: z.boolean().optional(),
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
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getCrossmintSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Fetch viewer to get email for admin check
    const { getCrossmintViewerFromCookies } = await import("@/lib/crossmint/server");
    const viewer = await getCrossmintViewerFromCookies();
    if (!viewer || !isCrossmintAdmin({ email: viewer.email, userId: viewer.userId })) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = freeGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const pkg = getCinemaPackageConfig({
      packageType: payload.packageType as PackageType,
      pricingMode: "private",
    });
    const defaultStylePreset = getDefaultStylePresetForExperience(payload.experience);
    const stylePreset: VideoStyleId =
      payload.stylePreset ?? defaultStylePreset ?? "hyperflow_assembly";

    let jobId: string;

    if (payload.requestKind === "token_video") {
      const resolved = await resolveMemecoinMetadata({
        address: payload.tokenAddress,
        chain: payload.chain,
      });

      const job = await createTokenVideoJob({
        tokenAddress: payload.tokenAddress,
        packageType: payload.packageType as PackageType,
        subjectChain: resolved.chain,
        subjectName: resolved.name,
        subjectSymbol: resolved.symbol,
        subjectImage: resolved.image,
        subjectDescription: payload.subjectDescription?.trim() || resolved.description,
        stylePreset: stylePreset as VideoStyleId,
        requestedPrompt: payload.requestedPrompt?.trim() || null,
        audioEnabled: payload.audioEnabled,
        pricingMode: "private",
        visibility: "private",
        experience: payload.experience as CinemaExperience | undefined,
        creatorId: viewer.userId,
        priceSol: 0,
        priceUsdc: 0,
        videoSeconds: pkg.videoSeconds,
        rangeDays: pkg.rangeDays,
      });
      jobId = job.jobId;
    } else {
      const job = await createPromptVideoJob({
        requestKind: payload.requestKind,
        packageType: payload.packageType as PackageType,
        subjectName: payload.subjectName,
        subjectDescription: payload.subjectDescription?.trim() || null,
        sourceMediaUrl: payload.sourceMediaUrl?.trim() || null,
        sourceEmbedUrl: null,
        sourceMediaProvider: payload.sourceMediaProvider?.trim() || null,
        sourceTranscript: payload.sourceTranscript?.trim() || null,
        stylePreset: stylePreset as VideoStyleId,
        requestedPrompt: payload.requestedPrompt?.trim() || null,
        audioEnabled: payload.audioEnabled,
        pricingMode: "private",
        visibility: "private",
        experience: payload.experience as CinemaExperience | undefined,
        creatorId: viewer.userId,
        priceSol: 0,
        priceUsdc: 0,
        videoSeconds: pkg.videoSeconds,
        rangeDays: pkg.rangeDays,
      });
      jobId = job.jobId;
    }

    // Skip payment — go straight to payment_confirmed and dispatch
    await updateJobStatus(jobId, "payment_confirmed", {
      progress: "payment_confirmed",
      requiredLamports: 0,
      receivedLamports: 0,
    });

    const dispatch = await dispatchSingleJob(jobId);
    const dispatched = dispatch.status === "dispatched";
    logger.info("amber_vaults_free_generate", {
      component: "admin_free_generate",
      stage: "dispatch",
      jobId,
      adminUserId: viewer.userId,
      dispatchStatus: dispatch.status,
    });

    return NextResponse.json({ jobId, dispatched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Free generate failed", message }, { status: 500 });
  }
}
