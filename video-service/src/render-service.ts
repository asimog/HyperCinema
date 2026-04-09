import { promises as fs } from "fs";
import path from "path";
import {
  claimRenderJob,
  createOrGetRenderJob,
  getRenderJob,
  listRecoverableRenderJobs,
  markRenderFailed,
  markRenderReady,
  touchRenderJob,
  updateRenderJob,
} from "./repository";
import { getVideoServiceEnv } from "./env";
import { NormalizedRenderRequest, RenderJobRecord } from "./types";
import { buildSceneChunks, normalizeScenes } from "./pipeline/scene-plan";
import {
  concatClips,
  generateThumbnail,
  stageClipFiles,
  uploadLocalFile,
} from "./pipeline/media";
import { getVideoProviderRuntimeConfig } from "./inference-config";
import {
  ElizaOSVideoClient,
  GenerateElizaOSClipInput,
} from "./providers/elizaos-video";
import {
  GenericRestVideoClient,
  GenerateGenericRestClipInput,
} from "./providers/generic-rest-video";
import { MythXVideoClient } from "./providers/mythx-video";
import { OpenMontageRenderer } from "./providers/openmontage";
import { GenerateClipInput, VertexVeoClient } from "./providers/vertex-veo";
import { GenerateXAiClipInput, XAiVideoClient } from "./providers/xai-video";
import { GenericVideoMetadata, OpenMontageMetadata } from "./types";

export interface RenderServiceResultSync {
  mode: "sync";
  id: string;
  jobId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
}

export interface RenderServiceResultAsync {
  mode: "async";
  id: string;
  jobId: string;
}

export type RenderServiceStartResult =
  | RenderServiceResultSync
  | RenderServiceResultAsync;

export interface ClipGenerator {
  generateClip(input: GenerateClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }>;
}

const ALLOWED_VEO_MODEL = "veo-3.1-fast-generate-001" as const;

function normalizeVeoModel(value: unknown, fallback: string): string {
  if (value === ALLOWED_VEO_MODEL) {
    return value;
  }
  return fallback;
}

function normalizeResolution(
  value: unknown,
  fallback: "720p" | "1080p",
): "720p" | "1080p" {
  if (value === "720p" || value === "1080p") {
    return value;
  }
  return fallback;
}

export function resolveRenderConfig(input: {
  metadata?: { model?: unknown; resolution?: unknown } | null;
  requestResolution?: unknown;
  envModel: string;
  envResolution: "720p" | "1080p";
}): { model: string; resolution: "720p" | "1080p" } {
  return {
    model: normalizeVeoModel(input.metadata?.model, input.envModel),
    resolution: normalizeResolution(
      input.metadata?.resolution ?? input.requestResolution,
      input.envResolution,
    ),
  };
}

export class RenderService {
  private readonly activeRenders = new Set<string>();

  constructor(
    private readonly clipGenerator: ClipGenerator = new VertexVeoClient(),
    private readonly xaiClipGenerator: XAiVideoClient = new XAiVideoClient(),
    private readonly elizaosClipGenerator: ElizaOSVideoClient = new ElizaOSVideoClient(),
    private readonly mythxClipGenerator: MythXVideoClient = new MythXVideoClient(),
    private readonly openMontageRenderer: OpenMontageRenderer = new OpenMontageRenderer(),
    private readonly genericClipGenerator: GenericRestVideoClient = new GenericRestVideoClient(),
  ) {}

  async startOrGet(
    request: NormalizedRenderRequest,
  ): Promise<RenderServiceStartResult> {
    const normalizedRequest: NormalizedRenderRequest = {
      ...request,
      scenes: normalizeScenes(request.scenes),
    };

    const existing = await getRenderJob(normalizedRequest.jobId);
    if (existing) {
      if (existing.status === "ready" && existing.videoUrl) {
        return {
          mode: "sync",
          id: existing.id,
          jobId: existing.jobId,
          videoUrl: existing.videoUrl,
          thumbnailUrl: existing.thumbnailUrl,
        };
      }

      if (existing.status === "failed") {
        // Failed renders must be re-queued on retries instead of staying permanently terminal.
        await updateRenderJob(existing.id, {
          status: "queued",
          renderStatus: "queued",
          videoUrl: null,
          thumbnailUrl: null,
          error: null,
          startedAt: null,
          completedAt: null,
          request: normalizedRequest,
        });
      }

      this.kickRender(existing.id);
      return {
        mode: "async",
        id: existing.id,
        jobId: existing.jobId,
      };
    }

    const created = await createOrGetRenderJob(
      normalizedRequest.jobId,
      normalizedRequest,
    );
    this.kickRender(created.record.id);

    if (created.record.status === "ready" && created.record.videoUrl) {
      return {
        mode: "sync",
        id: created.record.id,
        jobId: created.record.jobId,
        videoUrl: created.record.videoUrl,
        thumbnailUrl: created.record.thumbnailUrl,
      };
    }

    return {
      mode: "async",
      id: created.record.id,
      jobId: created.record.jobId,
    };
  }

  async getById(id: string): Promise<RenderJobRecord | null> {
    return getRenderJob(id);
  }

  async resumePendingJobs(limit?: number): Promise<number> {
    const env = getVideoServiceEnv();
    const jobs = await listRecoverableRenderJobs({
      limit: limit ?? env.RENDER_RECOVERY_BATCH_LIMIT,
      staleAfterMs: env.RENDER_STALE_MS,
    });

    for (const job of jobs) {
      this.kickRender(job.id);
    }

    return jobs.length;
  }

  private kickRender(jobId: string): void {
    if (this.activeRenders.has(jobId)) {
      return;
    }

    this.activeRenders.add(jobId);
    void this.runRender(jobId).finally(() => {
      this.activeRenders.delete(jobId);
    });
  }

  private async runRender(jobId: string): Promise<void> {
    const env = getVideoServiceEnv();
    const claimed = await claimRenderJob(jobId, env.RENDER_STALE_MS);
    if (!claimed) {
      return;
    }

    try {
      await this.processRender(claimed);
    } catch (error) {
      await markRenderFailed(
        claimed.id,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private async processRender(record: RenderJobRecord): Promise<void> {
    const env = getVideoServiceEnv();
    const provider =
      record.request.videoEngine === "generic" || record.request.generic != null
        ? "generic"
        : record.request.provider === "xai" ||
            record.request.provider === "elizaos" ||
            record.request.provider === "openmontage"
          ? record.request.provider
          : "google_veo";

    if (provider === "openmontage") {
      if (!record.request.openMontage) {
        throw new Error(
          "OpenMontage render requested without openMontage metadata.",
        );
      }
      await this.processOpenMontageRender(record, record.request.openMontage);
      return;
    }

    if (provider === "generic") {
      const genericMeta = record.request.generic;
      if (!genericMeta) {
        throw new Error(
          "Generic video render requested without generic metadata.",
        );
      }
      await this.processGenericRender(record, genericMeta);
      return;
    }

    const metadata = record.request.metadata ?? record.request.googleVeo;
    const xaiMetadata = record.request.xai;
    const elizaosMetadata = record.request.elizaos;
    const [googleVeoProviderConfig, xaiProviderConfig, elizaosProviderConfig] =
      await Promise.all([
        getVideoProviderRuntimeConfig("google_veo"),
        getVideoProviderRuntimeConfig("xai"),
        getVideoProviderRuntimeConfig("elizaos"),
      ]);
    const veoConfig = resolveRenderConfig({
      metadata,
      requestResolution: record.request.resolution,
      envModel: googleVeoProviderConfig.model ?? env.VERTEX_VEO_MODEL,
      envResolution: env.VEO_OUTPUT_RESOLUTION,
    });
    const xaiModel =
      xaiMetadata?.model ?? xaiProviderConfig.model ?? env.XAI_VIDEO_MODEL;
    const elizaosModel =
      elizaosMetadata?.model ??
      elizaosProviderConfig.model ??
      env.ELIZAOS_VIDEO_MODEL;
    const xaiResolution = (xaiMetadata?.resolution ?? "720p") as
      | "480p"
      | "720p";
    const veoModel = veoConfig.model;
    const veoResolution = veoConfig.resolution;
    const styleHints =
      provider === "xai"
        ? (xaiMetadata?.styleHints ?? [])
        : (metadata?.styleHints ?? []);
    const generateAudio = metadata?.generateAudio ?? record.request.withSound;
    const chunks = buildSceneChunks({
      request: record.request,
      maxClipSeconds: env.VEO_MAX_CLIP_SECONDS,
    });

    if (!chunks.length) {
      throw new Error("No scene chunks available for rendering.");
    }

    const clipUris: string[] = [];
    for (const chunk of chunks) {
      const clip =
        provider === "xai"
          ? await this.xaiClipGenerator.generateClip({
              model: xaiModel,
              resolution: xaiResolution,
              prompt: chunk.prompt,
              durationSeconds: chunk.durationSeconds,
              imageUrl: chunk.imageUrl,
              aspectRatio: xaiMetadata?.aspectRatio ?? "16:9",
              apiKey: xaiProviderConfig.apiKey,
              baseUrl: xaiProviderConfig.baseUrl,
              onProgress: () => touchRenderJob(record.id),
            } satisfies GenerateXAiClipInput)
          : provider === "elizaos"
            ? await this.elizaosClipGenerator.generateClip({
                model: elizaosModel,
                prompt: chunk.prompt,
                durationSeconds: chunk.durationSeconds,
                imageUrl: chunk.imageUrl,
                aspectRatio: elizaosMetadata?.aspectRatio ?? "16:9",
                style: elizaosMetadata?.style,
                apiKey: elizaosProviderConfig.apiKey,
                baseUrl: elizaosProviderConfig.baseUrl,
                onProgress: () => touchRenderJob(record.id),
              } satisfies GenerateElizaOSClipInput)
            : await this.clipGenerator.generateClip({
                model: veoModel as GenerateClipInput["model"],
                resolution: veoResolution,
                prompt: chunk.prompt,
                durationSeconds: chunk.durationSeconds,
                imageUrl: chunk.imageUrl,
                styleHints,
                generateAudio,
                storageUri: `gs://${env.FIREBASE_STORAGE_BUCKET}/video-renders/${record.jobId}/clips/${chunk.chunkId}`,
                apiKey: googleVeoProviderConfig.apiKey,
                onProgress: () => touchRenderJob(record.id),
              });
      const uri = clip.videoUris[0];
      const inlineVideo = clip.videoBytesBase64[0];
      if (uri) {
        clipUris.push(uri);
      } else if (inlineVideo) {
        clipUris.push(`data:video/mp4;base64,${inlineVideo}`);
      } else {
        throw new Error(
          `Clip render for job ${record.jobId} completed without a video asset.`,
        );
      }
      await touchRenderJob(record.id);
    }

    const { directory, clipPaths } = await stageClipFiles({ clipUris });
    const outputVideoPath = path.join(directory, "final.mp4");
    const outputThumbPath = path.join(directory, "thumbnail.jpg");

    try {
      await concatClips({
        clipPaths,
        outputPath: outputVideoPath,
        workingDir: directory,
      });
      await generateThumbnail({
        videoPath: outputVideoPath,
        outputPath: outputThumbPath,
        workingDir: directory,
      });

      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadLocalFile({
          localPath: outputVideoPath,
          storagePath: `video-renders/${record.jobId}/final.mp4`,
          contentType: "video/mp4",
        }),
        uploadLocalFile({
          localPath: outputThumbPath,
          storagePath: `video-renders/${record.jobId}/thumbnail.jpg`,
          contentType: "image/jpeg",
        }),
      ]);

      await markRenderReady(record.id, {
        videoUrl,
        thumbnailUrl,
      });
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }

  private async processOpenMontageRender(
    record: RenderJobRecord,
    openMontage: OpenMontageMetadata,
  ): Promise<void> {
    const env = getVideoServiceEnv();
    const chunks = buildSceneChunks({
      request: record.request,
      maxClipSeconds: env.VEO_MAX_CLIP_SECONDS,
    });

    if (!chunks.length) {
      throw new Error("No scene chunks available for OpenMontage rendering.");
    }

    const workerProvider =
      openMontage.workerProvider ?? env.OPENMONTAGE_VIDEO_WORKER_PROVIDER;
    const workerModel =
      openMontage.workerModel ??
      env.OPENMONTAGE_VIDEO_WORKER_MODEL ??
      undefined;
    const [googleVeoProviderConfig, xaiProviderConfig, mythxProviderConfig] =
      await Promise.all([
        getVideoProviderRuntimeConfig("google_veo"),
        getVideoProviderRuntimeConfig("xai"),
        getVideoProviderRuntimeConfig("mythx"),
      ]);
    const clipUris: string[] = [];

    for (const chunk of chunks) {
      const clip =
        workerProvider === "xai"
          ? await this.xaiClipGenerator.generateClip({
              model:
                workerModel ?? xaiProviderConfig.model ?? env.XAI_VIDEO_MODEL,
              resolution: "720p",
              prompt: chunk.prompt,
              durationSeconds: chunk.durationSeconds,
              imageUrl: chunk.imageUrl,
              aspectRatio: "16:9",
              apiKey: xaiProviderConfig.apiKey,
              baseUrl: xaiProviderConfig.baseUrl,
              onProgress: () => touchRenderJob(record.id),
            } satisfies GenerateXAiClipInput)
          : workerProvider === "mythx"
            ? await this.mythxClipGenerator.generateClip({
                model:
                  workerModel ??
                  mythxProviderConfig.model ??
                  env.MYTHX_VIDEO_MODEL,
                prompt: chunk.prompt,
                durationSeconds: chunk.durationSeconds,
                aspectRatio: "16:9",
                apiKey: mythxProviderConfig.apiKey,
                baseUrl: mythxProviderConfig.baseUrl,
                onProgress: () => touchRenderJob(record.id),
              })
            : await this.clipGenerator.generateClip({
                model: (workerModel ??
                  googleVeoProviderConfig.model ??
                  env.VERTEX_VEO_MODEL) as GenerateClipInput["model"],
                resolution: openMontage.resolution,
                prompt: chunk.prompt,
                durationSeconds: chunk.durationSeconds,
                imageUrl: chunk.imageUrl,
                styleHints: ["openmontage", "editorial-composition"],
                generateAudio: false,
                storageUri: `gs://${env.FIREBASE_STORAGE_BUCKET}/video-renders/${record.jobId}/openmontage/${chunk.chunkId}`,
                apiKey: googleVeoProviderConfig.apiKey,
                onProgress: () => touchRenderJob(record.id),
              });
      const uri = clip.videoUris[0];
      const inlineVideo = clip.videoBytesBase64[0];
      if (uri) {
        clipUris.push(uri);
      } else if (inlineVideo) {
        clipUris.push(`data:video/mp4;base64,${inlineVideo}`);
      } else {
        throw new Error(
          `OpenMontage source clip ${chunk.chunkId} completed without a video asset.`,
        );
      }
      await touchRenderJob(record.id);
    }

    const { directory, clipPaths } = await stageClipFiles({ clipUris });
    const renderDirectory = path.resolve(
      env.OPENMONTAGE_OUTPUT_ROOT,
      record.jobId,
    );

    try {
      const outputVideoPath = await this.openMontageRenderer.render({
        jobId: record.jobId,
        outputDirectory: renderDirectory,
        compositionId: openMontage.compositionId,
        openingTitle:
          record.request.hookLine ||
          openMontage.storyMetadata.subjectName ||
          null,
        scenes: chunks.map((chunk, index) => ({
          clipPath: clipPaths[index]!,
          sceneNumber: chunk.sceneNumber,
          durationSeconds: chunk.durationSeconds,
          narration: chunk.narration,
          visualPrompt: chunk.visualPrompt,
        })),
      });
      const outputThumbPath = path.join(renderDirectory, "thumbnail.jpg");

      await generateThumbnail({
        videoPath: outputVideoPath,
        outputPath: outputThumbPath,
        workingDir: renderDirectory,
      });

      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadLocalFile({
          localPath: outputVideoPath,
          storagePath: `video-renders/${record.jobId}/final.mp4`,
          contentType: "video/mp4",
        }),
        uploadLocalFile({
          localPath: outputThumbPath,
          storagePath: `video-renders/${record.jobId}/thumbnail.jpg`,
          contentType: "image/jpeg",
        }),
      ]);

      await markRenderReady(record.id, {
        videoUrl,
        thumbnailUrl,
      });
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
      await fs.rm(renderDirectory, { recursive: true, force: true });
    }
  }

  private async processGenericRender(
    record: RenderJobRecord,
    genericMeta: GenericVideoMetadata,
  ): Promise<void> {
    const env = getVideoServiceEnv();
    const chunks = buildSceneChunks({
      request: record.request,
      maxClipSeconds: env.VEO_MAX_CLIP_SECONDS,
    });

    if (!chunks.length) {
      throw new Error("No scene chunks available for generic video rendering.");
    }

    const clipUris: string[] = [];
    for (const chunk of chunks) {
      const clip = await this.genericClipGenerator.generateClip({
        provider: genericMeta.provider,
        model: genericMeta.model,
        prompt: chunk.prompt,
        durationSeconds: chunk.durationSeconds,
        apiKey: genericMeta.apiKey,
        baseUrl: genericMeta.baseUrl,
        imageUrl: chunk.imageUrl ?? null,
        onProgress: () => touchRenderJob(record.id),
      } satisfies GenerateGenericRestClipInput);

      const uri = clip.videoUris[0];
      const inlineVideo = clip.videoBytesBase64[0];
      if (uri) {
        clipUris.push(uri);
      } else if (inlineVideo) {
        clipUris.push(`data:video/mp4;base64,${inlineVideo}`);
      } else {
        throw new Error(
          `Generic clip render for job ${record.jobId} completed without a video asset.`,
        );
      }
      await touchRenderJob(record.id);
    }

    const { directory, clipPaths } = await stageClipFiles({ clipUris });
    const outputVideoPath = path.join(directory, "final.mp4");
    const outputThumbPath = path.join(directory, "thumbnail.jpg");

    try {
      await concatClips({
        clipPaths,
        outputPath: outputVideoPath,
        workingDir: directory,
      });
      await generateThumbnail({
        videoPath: outputVideoPath,
        outputPath: outputThumbPath,
        workingDir: directory,
      });

      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadLocalFile({
          localPath: outputVideoPath,
          storagePath: `video-renders/${record.jobId}/final.mp4`,
          contentType: "video/mp4",
        }),
        uploadLocalFile({
          localPath: outputThumbPath,
          storagePath: `video-renders/${record.jobId}/thumbnail.jpg`,
          contentType: "image/jpeg",
        }),
      ]);

      await markRenderReady(record.id, { videoUrl, thumbnailUrl });
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}
