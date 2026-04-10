// ── Render Service — xAI Video Pipeline ────────────────────────────
// Full render orchestrator: claim job → generate clips → concat → upload.
// 1. buildSceneChunks() — splits scenes into ≤8s clips
// 2. xAI generateClip() — generates each clip via /videos/generations
// 3. stageClipFiles() — downloads all clips to temp dir
// 4. concatClips() — FFmpeg concat manifest → final.mp4
// 5. generateThumbnail() — FFmpeg extract frame 1
// 6. uploadLocalFile() — S3 upload → public URL
// Fire-and-forget: kickRender() runs in background, tracked via activeRenders Set.

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
import { getVideoProviderConfig } from "./inference-config";
import { NormalizedRenderRequest, RenderJobRecord } from "./types";
import { buildSceneChunks, normalizeScenes } from "./pipeline/scene-plan";
import {
  concatClips,
  generateThumbnail,
  stageClipFiles,
  uploadLocalFile,
} from "./pipeline/media";
import { XAiVideoClient, GenerateXAiClipInput } from "./providers/xai-video";

// Render finished synchronously — video ready immediately
export interface RenderServiceResultSync {
  mode: "sync";
  id: string;
  jobId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
}

// Render kicked off — poll for completion
export interface RenderServiceResultAsync {
  mode: "async";
  id: string;
  jobId: string;
}

export type RenderServiceStartResult =
  | RenderServiceResultSync
  | RenderServiceResultAsync;

export class RenderService {
  // Track in-flight renders to prevent duplicates
  private readonly activeRenders = new Set<string>();
  private readonly xaiClient = new XAiVideoClient();

  // Start new render or return existing one
  async startOrGet(
    request: NormalizedRenderRequest,
  ): Promise<RenderServiceStartResult> {
    const normalized: NormalizedRenderRequest = {
      ...request,
      scenes: normalizeScenes(request.scenes),
    };

    const existing = await getRenderJob(normalized.jobId);
    if (existing) {
      // Already done — return immediately
      if (existing.status === "ready" && existing.videoUrl) {
        return {
          mode: "sync",
          id: existing.id,
          jobId: existing.jobId,
          videoUrl: existing.videoUrl,
          thumbnailUrl: existing.thumbnailUrl,
        };
      }

      // Failed — reset so it can retry
      if (existing.status === "failed") {
        await updateRenderJob(existing.id, {
          status: "queued",
          renderStatus: "queued",
          videoUrl: null,
          thumbnailUrl: null,
          error: null,
          startedAt: null,
          completedAt: null,
          request: normalized,
        });
      }

      this.kickRender(existing.id);
      return { mode: "async", id: existing.id, jobId: existing.jobId };
    }

    // New render
    const created = await createOrGetRenderJob(normalized.jobId, normalized);
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

  // Get render job status by id
  async getById(id: string): Promise<RenderJobRecord | null> {
    return getRenderJob(id);
  }

  // Resume stale or queued renders on startup
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

  // Fire-and-forget render in background
  private kickRender(jobId: string): void {
    if (this.activeRenders.has(jobId)) return;
    this.activeRenders.add(jobId);
    void this.runRender(jobId).finally(() => {
      this.activeRenders.delete(jobId);
    });
  }

  // Claim and run a render job
  private async runRender(jobId: string): Promise<void> {
    const env = getVideoServiceEnv();
    const claimed = await claimRenderJob(jobId, env.RENDER_STALE_MS);
    if (!claimed) return;

    try {
      await this.processRender(claimed);
    } catch (error) {
      await markRenderFailed(
        claimed.id,
        error instanceof Error ? error.message : "Unknown render error",
      );
    }
  }

  // Full xAI render pipeline: generate clips → concat → thumbnail → upload
  private async processRender(record: RenderJobRecord): Promise<void> {
    const env = getVideoServiceEnv();
    const providerConfig = getVideoProviderConfig();

    const xaiMeta = record.request.xai;
    // Use xAI metadata model if present, fall back to env default
    const model = xaiMeta?.model ?? providerConfig.model ?? env.XAI_VIDEO_MODEL;
    const resolution = (xaiMeta?.resolution ?? "720p") as "480p" | "720p";
    const aspectRatio = xaiMeta?.aspectRatio ?? "16:9";
    const apiKey = providerConfig.apiKey ?? env.XAI_API_KEY ?? null;

    if (!apiKey) {
      throw new Error("XAI_API_KEY is required for video generation.");
    }

    // Split scenes into fixed-length chunks
    const chunks = buildSceneChunks({
      request: record.request,
      maxClipSeconds: env.MAX_CLIP_SECONDS,
    });

    if (!chunks.length) {
      throw new Error("No scene chunks to render.");
    }

    // Generate one clip per chunk
    const clipUris: string[] = [];
    for (const chunk of chunks) {
      const clip = await this.xaiClient.generateClip({
        model,
        resolution,
        aspectRatio,
        prompt: chunk.prompt,
        durationSeconds: chunk.durationSeconds,
        imageUrl: chunk.imageUrl,
        apiKey,
        baseUrl: providerConfig.baseUrl ?? env.XAI_BASE_URL,
        onProgress: () => touchRenderJob(record.id),
      } satisfies GenerateXAiClipInput);

      const uri = clip.videoUris[0];
      const inline = clip.videoBytesBase64[0];

      if (uri) {
        clipUris.push(uri);
      } else if (inline) {
        // Inline base64 video from API
        clipUris.push(`data:video/mp4;base64,${inline}`);
      } else {
        throw new Error(`Clip ${chunk.chunkId} returned no video.`);
      }

      await touchRenderJob(record.id);
    }

    // Download clips, concat, generate thumbnail, upload
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
      // Always clean up temp files
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}
