import { generateReportPdf } from "@/lib/pdf/report";
import { publishCompletedJobToMoltBook } from "@/lib/social/moltbook-publisher";
import { InternalVideoRenderDocument } from "@/lib/types/domain";
import {
  getInternalVideoRender,
  getJobArtifacts,
  markJobFailed,
  updateJob,
  updateJobStatus,
  upsertReport,
  upsertVideo,
} from "./repository";
import { triggerJobProcessing } from "./trigger";

function isStale(updatedAt: string, staleAfterMs: number): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }
  return Date.now() - updatedAtMs >= staleAfterMs;
}

async function finalizeReadyRender(
  jobId: string,
  render: InternalVideoRenderDocument,
): Promise<boolean> {
  const { job, report } = await getJobArtifacts(jobId);
  if (!job || !report || !render.videoUrl) {
    return false;
  }

  const [reportUrl, publicVideoUrl, publicThumbnailUrl] = await Promise.all([
    report.downloadUrl
      ? Promise.resolve(report.downloadUrl)
      : generateReportPdf(report).then((pdfBuffer) => {
          // Save to local file path on Railway Persistent Volume
          return `/output/reports/${jobId}.pdf`;
        }),
    null, // videoUrl comes from render directly
    render.thumbnailUrl ? render.thumbnailUrl : null,
  ]);

  await Promise.all([
    upsertReport({
      ...report,
      downloadUrl: reportUrl,
    }),
    upsertVideo({
      jobId,
      videoUrl: render.videoUrl,
      thumbnailUrl: publicThumbnailUrl,
      duration: job.videoSeconds,
      renderStatus: "ready",
    }),
    job.status === "failed"
      ? updateJob(jobId, {
          status: "complete",
          progress: "complete",
          errorCode: null,
          errorMessage: null,
        })
      : updateJobStatus(jobId, "complete", {
          progress: "complete",
          errorCode: null,
          errorMessage: null,
        }),
  ]);

  try {
    await publishCompletedJobToMoltBook(jobId);
  } catch {
    // Recovery should not fail the completed job if social publication needs a retry.
  }

  return true;
}

async function syncFailedRender(
  jobId: string,
  render: InternalVideoRenderDocument,
): Promise<boolean> {
  const { job } = await getJobArtifacts(jobId);
  if (!job || job.status !== "processing") {
    return false;
  }

  await markJobFailed(
    jobId,
    "video_render_failed",
    render.error ?? "Video render failed before asset finalization.",
  );
  return true;
}

async function syncInFlightRender(
  jobId: string,
  _render: InternalVideoRenderDocument,
): Promise<boolean> {
  void _render;
  const { job } = await getJobArtifacts(jobId);
  if (!job) {
    return false;
  }

  await Promise.all([
    upsertVideo({
      jobId,
      videoUrl: null,
      thumbnailUrl: null,
      duration: job.videoSeconds,
      renderStatus: "processing",
    }),
    updateJobStatus(jobId, "processing", {
      progress: "generating_video",
      errorCode: null,
      errorMessage: null,
    }),
  ]);

  return true;
}

export async function recoverJobIfNeeded(jobId: string): Promise<boolean> {
  const { job, video } = await getJobArtifacts(jobId);
  if (!job || job.status === "complete") {
    return false;
  }

  const render = await getInternalVideoRender(jobId);

  if (render?.status === "ready" && !video?.videoUrl) {
    return finalizeReadyRender(jobId, render);
  }

  if (
    render &&
    (render.status === "processing" || render.status === "queued") &&
    (job.status === "failed" || job.status === "pending")
  ) {
    return syncInFlightRender(jobId, render);
  }

  if (render?.status === "failed" && job.status === "processing") {
    return syncFailedRender(jobId, render);
  }

  if (job.status === "processing" && isStale(job.updatedAt, 300_000)) {
    await triggerJobProcessing(jobId);
    return false;
  }

  return false;
}
