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
import { GenerateClipInput, VertexVeoClient } from "./providers/vertex-veo";

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

export type RenderServiceStartResult = RenderServiceResultSync | RenderServiceResultAsync;

export interface ClipGenerator {
  generateClip(input: GenerateClipInput): Promise<{ operationName: string; videoUris: string[] }>;
}

export class RenderService {
  private readonly activeRenders = new Set<string>();

  constructor(private readonly clipGenerator: ClipGenerator = new VertexVeoClient()) {}

  async startOrGet(request: NormalizedRenderRequest): Promise<RenderServiceStartResult> {
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

      this.kickRender(existing.id);
      return {
        mode: "async",
        id: existing.id,
        jobId: existing.jobId,
      };
    }

    const created = await createOrGetRenderJob(normalizedRequest.jobId, normalizedRequest);
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

    const metadata = record.request.metadata ?? record.request.googleVeo;
    const model = metadata?.model ?? env.VERTEX_VEO_MODEL;
    const resolution =
      metadata?.resolution ??
      record.request.resolution ??
      env.VEO_OUTPUT_RESOLUTION;
    const styleHints = metadata?.styleHints ?? [];
    const chunks = buildSceneChunks({
      request: record.request,
      maxClipSeconds: env.VEO_MAX_CLIP_SECONDS,
    });

    if (!chunks.length) {
      throw new Error("No scene chunks available for rendering.");
    }

    const clipUris: string[] = [];
    for (const chunk of chunks) {
      const clip = await this.clipGenerator.generateClip({
        model,
        resolution,
        prompt: chunk.prompt,
        durationSeconds: chunk.durationSeconds,
        imageUrl: chunk.imageUrl,
        styleHints,
        generateAudio: true,
      });
      clipUris.push(clip.videoUris[0]!);
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
}
