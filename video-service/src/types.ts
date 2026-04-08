import { z } from "zod";

const ALLOWED_VEO_MODEL = "veo-3.1-fast-generate-001" as const;
const resolutionSchema = z.enum(["720p", "1080p"]);
const xaiResolutionSchema = z.enum(["480p", "720p"]);

const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  visualPrompt: z.string().min(1),
  narration: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  imageUrl: z.string().url().nullable().optional(),
  includeAudio: z.boolean().optional(),
});

const analyticsSchema = z.object({
  pumpTokensTraded: z.number().optional(),
  buyCount: z.number().optional(),
  sellCount: z.number().optional(),
  solSpent: z.number().optional(),
  solReceived: z.number().optional(),
  estimatedPnlSol: z.number().optional(),
  bestTrade: z.string().optional(),
  worstTrade: z.string().optional(),
  styleClassification: z.string().optional(),
});

const tokenMetadataSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().nullable().optional(),
  imageUrl: z.string().url(),
  tradeCount: z.number().optional(),
  buyCount: z.number().optional(),
  sellCount: z.number().optional(),
  solVolume: z.number().optional(),
  lastSeenTimestamp: z.number().optional(),
});

const sceneEmotionVectorSchema = z.object({
  confidence: z.number(),
  chaos: z.number(),
  desperation: z.number(),
  discipline: z.number(),
  luck: z.number(),
  intensity: z.number(),
});

const videoTokenAnchorSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  role: z.enum(["primary", "secondary", "supporting"]),
});

const videoIdentitySheetSchema = z.object({
  identityId: z.string().min(1),
  archetype: z.string().min(1),
  protagonist: z.string().min(1),
  paletteCanon: z.array(z.string().min(1)).min(1),
  worldCanon: z.array(z.string().min(1)).min(1),
  lightingCanon: z.array(z.string().min(1)).min(1),
  symbolCanon: z.array(z.string().min(1)).min(1),
  tokenAnchors: z.array(videoTokenAnchorSchema).default([]),
  negativeConstraints: z.array(z.string().min(1)).min(1),
});

const sceneStateSchema = z.object({
  sceneNumber: z.number().int().positive(),
  phase: z.enum(["opening", "rise", "damage", "pivot", "climax", "aftermath"]),
  stateRef: z.string().min(1),
  emotionVector: sceneEmotionVectorSchema,
  subjectFocus: z.string().min(1),
  continuityAnchors: z.array(z.string().min(1)).min(1),
  deltaFromPrevious: z.array(z.string().min(1)).min(1),
  transitionNote: z.string().min(1),
});

const sceneMetadataSchema = z.object({
  sceneNumber: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
  narration: z.string().min(1),
  visualPrompt: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
  stateRef: z.string().min(1).optional(),
  continuityAnchors: z.array(z.string().min(1)).min(1).optional(),
  continuityPrompt: z.string().min(1).optional(),
});

const storyMetadataSchema = z.object({
  wallet: z.string().min(1),
  storyKind: z.string().optional(),
  subjectAddress: z.string().optional(),
  subjectChain: z.string().optional(),
  subjectName: z.string().nullable().optional(),
  subjectSymbol: z.string().nullable().optional(),
  experience: z.string().optional(),
  visibility: z.string().optional(),
  audioEnabled: z.boolean().nullable().optional(),
  sourceMediaUrl: z.string().url().nullable().optional(),
  sourceEmbedUrl: z.string().url().nullable().optional(),
  sourceMediaProvider: z.string().nullable().optional(),
  rangeDays: z.number().int().positive(),
  packageType: z.enum(["1d", "2d", "3d", "30s", "60s"]),
  durationSeconds: z.number().int().positive(),
  analytics: analyticsSchema.partial().optional(),
});

const googleVeoMetadataSchema = z.object({
  provider: z.literal("google_veo"),
  model: z.literal(ALLOWED_VEO_MODEL),
  resolution: resolutionSchema,
  generateAudio: z.boolean().default(true),
  prompt: z.string().min(1),
  styleHints: z.array(z.string()).default([]),
  tokenMetadata: z.array(tokenMetadataSchema).default([]),
  sceneMetadata: z.array(sceneMetadataSchema).min(1),
  storyMetadata: storyMetadataSchema,
  coherence: z
    .object({
      identity: videoIdentitySheetSchema,
      sceneStates: z.array(sceneStateSchema).default([]),
      renderPolicy: z
        .object({
          factorization: z.string().min(1),
          continuityMode: z.string().min(1).optional(),
          lintMode: z.string().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

const xaiMetadataSchema = z.object({
  provider: z.literal("xai"),
  model: z.string().min(1),
  resolution: xaiResolutionSchema.default("720p"),
  aspectRatio: z.literal("16:9").default("16:9"),
  prompt: z.string().min(1),
  styleHints: z.array(z.string()).default([]),
  sceneMetadata: z.array(sceneMetadataSchema).min(1),
  storyMetadata: storyMetadataSchema,
});

const openMontageMetadataSchema = z.object({
  provider: z.literal("openmontage"),
  compositionId: z.string().min(1).default("CinematicRenderer"),
  resolution: resolutionSchema.default("1080p"),
  prompt: z.string().min(1),
  workerProvider: z.enum(["google_veo", "xai", "mythx"]).optional(),
  workerModel: z.string().min(1).optional(),
  sceneMetadata: z.array(sceneMetadataSchema).min(1),
  storyMetadata: storyMetadataSchema,
});

export const renderRequestSchema = z.object({
  jobId: z.string().min(1),
  wallet: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  withSound: z.boolean(),
  resolution: resolutionSchema.optional(),
  hookLine: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
  videoEngine: z.enum(["google_veo", "xai", "openmontage"]),
  provider: z.string().optional(),
  prompt: z.string().optional(),
  metadata: googleVeoMetadataSchema.optional(),
  googleVeo: googleVeoMetadataSchema.optional(),
  xai: xaiMetadataSchema.optional(),
  openMontage: openMontageMetadataSchema.optional(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;
export type RenderScene = z.infer<typeof sceneSchema>;
export type GoogleVeoMetadata = z.infer<typeof googleVeoMetadataSchema>;
export type XAiMetadata = z.infer<typeof xaiMetadataSchema>;
export type OpenMontageMetadata = z.infer<typeof openMontageMetadataSchema>;

export interface NormalizedRenderRequest
  extends Omit<RenderRequest, "metadata" | "googleVeo" | "xai" | "openMontage" | "resolution"> {
  resolution?: "480p" | "720p" | "1080p";
  metadata?: GoogleVeoMetadata;
  googleVeo?: GoogleVeoMetadata;
  xai?: XAiMetadata;
  openMontage?: OpenMontageMetadata;
}

export type RenderStatus = "queued" | "processing" | "ready" | "failed";

export interface RenderJobRecord {
  id: string;
  jobId: string;
  status: RenderStatus;
  renderStatus: RenderStatus;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  request: NormalizedRenderRequest;
}

export function parseRenderRequest(payload: unknown): NormalizedRenderRequest {
  const parsed = renderRequestSchema.parse(payload);

  if (parsed.videoEngine === "xai") {
    if (parsed.provider !== "xai") {
      throw new Error("provider must be 'xai' when videoEngine=xai");
    }

    const metadata = parsed.xai;
    if (!metadata) {
      throw new Error("xai metadata is required when videoEngine=xai");
    }

    if (!metadata.model || !metadata.sceneMetadata?.length || !metadata.storyMetadata) {
      throw new Error(
        "xai.model, xai.sceneMetadata, and xai.storyMetadata are required for xAI renders",
      );
    }

    const requestedResolution = metadata.resolution ?? "720p";
    if (parsed.resolution && parsed.resolution !== requestedResolution) {
      throw new Error("resolution mismatch between request.resolution and xai.resolution.");
    }

    return {
      ...parsed,
      resolution: requestedResolution,
      xai: {
        ...metadata,
        resolution: requestedResolution,
      },
    };
  }

  if (parsed.videoEngine === "openmontage") {
    if (parsed.provider !== "openmontage") {
      throw new Error("provider must be 'openmontage' when videoEngine=openmontage");
    }

    const metadata = parsed.openMontage;
    if (!metadata) {
      throw new Error("openMontage metadata is required when videoEngine=openmontage");
    }

    if (!metadata.sceneMetadata?.length || !metadata.storyMetadata) {
      throw new Error(
        "openMontage.sceneMetadata and openMontage.storyMetadata are required for OpenMontage renders",
      );
    }

    const requestedResolution = parsed.resolution ?? metadata.resolution;
    if (parsed.resolution && parsed.resolution !== requestedResolution) {
      throw new Error(
        "resolution mismatch between request.resolution and openMontage.resolution.",
      );
    }

    return {
      ...parsed,
      resolution: requestedResolution,
      openMontage: {
        ...metadata,
        resolution: requestedResolution,
      },
    };
  }

  if (parsed.provider !== "google_veo") {
    throw new Error("provider must be 'google_veo' when videoEngine=google_veo");
  }

  if (!parsed.prompt || !parsed.prompt.trim()) {
    throw new Error("prompt is required when videoEngine=google_veo");
  }

  const metadata = parsed.metadata ?? parsed.googleVeo;
  if (!metadata) {
    throw new Error("metadata or googleVeo is required when videoEngine=google_veo");
  }

  if (parsed.withSound !== Boolean(metadata.generateAudio)) {
    throw new Error("withSound must match metadata.generateAudio for Veo renders.");
  }

  if (!metadata.model || !metadata.sceneMetadata?.length || !metadata.storyMetadata) {
    throw new Error(
      "metadata.model, metadata.sceneMetadata, and metadata.storyMetadata are required for Veo renders",
    );
  }

  if (metadata.model !== ALLOWED_VEO_MODEL) {
    throw new Error(`Only ${ALLOWED_VEO_MODEL} is allowed for Veo renders.`);
  }

  const requestedResolution = parsed.resolution ?? metadata.resolution;
  if (!requestedResolution) {
    throw new Error("resolution is required and must be 720p or 1080p.");
  }
  if (parsed.resolution && metadata.resolution && parsed.resolution !== metadata.resolution) {
    throw new Error("resolution mismatch between request.resolution and metadata.resolution.");
  }

  return {
    ...parsed,
    withSound: Boolean(metadata.generateAudio),
    resolution: requestedResolution,
    scenes: parsed.scenes.map((scene) => ({
      ...scene,
      includeAudio: Boolean(metadata.generateAudio),
    })),
    metadata: {
      ...metadata,
      model: ALLOWED_VEO_MODEL,
      resolution: requestedResolution,
      generateAudio: Boolean(metadata.generateAudio),
    },
    googleVeo: {
      ...metadata,
      model: ALLOWED_VEO_MODEL,
      resolution: requestedResolution,
      generateAudio: Boolean(metadata.generateAudio),
    },
  };
}
