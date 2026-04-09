import { getVideo } from "@/lib/jobs/repository";
import { NextRequest, NextResponse } from "next/server";
import { existsSync, createReadStream } from "fs";
import { stat } from "fs/promises";

export const runtime = "nodejs";

const RAILWAY_VIDEO_DIR = "/data/videos";

type Context = {
  params: Promise<{ jobId: string }>;
};

function getLocalVideoPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}.mp4`;
}

function getLocalThumbnailPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}-thumbnail.jpg`;
}

export async function GET(request: NextRequest, context: Context) {
  const { jobId } = await context.params;

  // Check if caller wants the raw video file
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true";

  const video = await getVideo(jobId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Still rendering — return status JSON
  if (!video.videoUrl && video.renderStatus !== "ready") {
    return NextResponse.json(
      {
        jobId,
        status: video.renderStatus,
        error:
          video.renderStatus === "failed"
            ? "Video generation failed"
            : undefined,
      },
      { status: video.renderStatus === "failed" ? 500 : 409 },
    );
  }

  // Try serving from Railway Persistent Volume first
  if (download || video.renderStatus === "ready") {
    const localPath = getLocalVideoPath(jobId);
    if (existsSync(localPath)) {
      const fileStats = await stat(localPath);
      const stream = createReadStream(localPath);

      return new NextResponse(stream as any, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(fileStats.size),
          "Content-Disposition": download
            ? `attachment; filename="${jobId}.mp4"`
            : "inline",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  // Fallback: redirect to remote URL if available
  if (video.videoUrl) {
    return NextResponse.redirect(video.videoUrl, 302);
  }

  return NextResponse.json(
    { error: "Video is still rendering", status: video.renderStatus },
    { status: 409 },
  );
}

export async function HEAD(_: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const localPath = getLocalVideoPath(jobId);

  if (existsSync(localPath)) {
    const fileStats = await stat(localPath);
    return new NextResponse(null, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(fileStats.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
