// Video service types — xAI only
import { z } from "zod";

// One scene in the render request
const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  visualPrompt: z.string().min(1),
  narration: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  imageUrl: z.string().url().nullable().optional(),
  includeAudio: z.boolean().optional(),
});

// Per-scene detail passed to xAI
const sceneMetadataSchema = z.object({
  sceneNumber: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
  narration: z.string().min(1),
  visualPrompt: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
  stateRef: z.string().min(1).optional(),
  continuityAnchors: z.array(z.string().min(1)).optional(),
  continuityPrompt: z.string().min(1).optional(),
});

// Story context — who/what the video is about
const storyMetadataSchema = z.object({
  wallet: z.string().min(1),
  storyKind: z.string().optional(),
  subjectAddress: z.string().optional(),
  subjectChain: z.string().optional(),
  subjectName: z.string().nullable().optional(),
  subjectSymbol: z.string().nullable().optional(),
  audioEnabled: z.boolean().nullable().optional(),
  sourceMediaUrl: z.string().url().nullable().optional(),
  sourceEmbedUrl: z.string().url().nullable().optional(),
  sourceMediaProvider: z.string().nullable().optional(),
  rangeDays: z.number().int().positive(),
  packageType: z.string().min(1),
  durationSeconds: z.number().int().positive(),
});

// xAI-specific render metadata
const xaiMetadataSchema = z.object({
  provider: z.literal("xai"),
  model: z.string().min(1),
  resolution: z.enum(["480p", "720p"]).default("720p"),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]).default("16:9"),
  prompt: z.string().min(1),
  styleHints: z.array(z.string()).default([]),
  sceneMetadata: z.array(sceneMetadataSchema).min(1),
  storyMetadata: storyMetadataSchema,
});

// Full render request — xAI only
export const renderRequestSchema = z.object({
  jobId: z.string().min(1),
  wallet: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  withSound: z.boolean(),
  resolution: z.enum(["480p", "720p", "1080p"]).optional(),
  hookLine: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
  videoEngine: z.literal("xai"),
  provider: z.literal("xai"),
  prompt: z.string().optional(),
  model: z.string().optional(),
  xai: xaiMetadataSchema.optional(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;
export type RenderScene = z.infer<typeof sceneSchema>;
export type XAiMetadata = z.infer<typeof xaiMetadataSchema>;

// Normalized request stored in DB and passed through pipeline
export interface NormalizedRenderRequest
  extends Omit<RenderRequest, "resolution"> {
  resolution?: "480p" | "720p" | "1080p";
  xai?: XAiMetadata;
}

export type RenderStatus = "queued" | "processing" | "ready" | "failed";

// Render job record from database
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

// Validate and normalize an incoming render request
export function parseRenderRequest(payload: unknown): NormalizedRenderRequest {
  const parsed = renderRequestSchema.parse(payload);
  const xai = parsed.xai;

  if (!xai) {
    throw new Error("xai metadata required");
  }

  const resolution = xai.resolution ?? "720p";
  return {
    ...parsed,
    resolution,
    xai: { ...xai, resolution },
  };
}
