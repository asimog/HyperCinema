// ── Media Pipeline — Download, Concat, Thumbnail, Upload ───────────
// 1. stageClipFiles() — downloads clip URIs (URLs or base64) to temp dir
// 2. concatClips() — FFmpeg concat manifest → single mp4 (H.264 + AAC)
// 3. generateThumbnail() — FFmpeg extract frame at 1s → JPEG
// 4. uploadLocalFile() — S3 upload via @aws-sdk → returns public URL
// S3 client: lazy-initialized, throws if creds missing.

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getVideoServiceEnv } from "../env";

// Build ffmpeg concat manifest
export function buildConcatManifest(paths: string[]): string {
  return paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
}

// Run a shell command — reject on non-zero exit
function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr}`));
    });
  });
}

// Download a clip from URL or base64 data URI to disk
async function downloadFromUri(
  uri: string,
  destination: string,
): Promise<void> {
  if (uri.startsWith("data:")) {
    // Inline base64 — decode and write directly
    const match = uri.match(/^data:.*?;base64,(.+)$/);
    if (!match) throw new Error("Bad data URI for clip.");
    await fs.writeFile(destination, Buffer.from(match[1]!, "base64"));
    return;
  }

  // Remote URL — fetch and write
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error(`Clip download failed (${response.status}): ${uri}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

// Download all clip URIs to a temp directory
export async function stageClipFiles(input: {
  clipUris: string[];
  workingDir?: string;
}): Promise<{ directory: string; clipPaths: string[] }> {
  const dir =
    input.workingDir ??
    (await fs.mkdtemp(path.join(os.tmpdir(), "xai-render-")));
  const clipPaths: string[] = [];

  for (let i = 0; i < input.clipUris.length; i += 1) {
    const dest = path.join(dir, `clip-${i + 1}.mp4`);
    await downloadFromUri(input.clipUris[i]!, dest);
    clipPaths.push(dest);
  }

  return { directory: dir, clipPaths };
}

// Concatenate clips into one file using ffmpeg
export async function concatClips(input: {
  clipPaths: string[];
  outputPath: string;
  workingDir: string;
}): Promise<void> {
  const env = getVideoServiceEnv();
  const manifestPath = path.join(input.workingDir, "concat.txt");
  await fs.writeFile(
    manifestPath,
    `${buildConcatManifest(input.clipPaths)}\n`,
    "utf8",
  );

  await runCommand(
    env.FFMPEG_PATH,
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      manifestPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      input.outputPath,
    ],
    input.workingDir,
  );
}

// Extract first frame as JPEG thumbnail
export async function generateThumbnail(input: {
  videoPath: string;
  outputPath: string;
  workingDir: string;
}): Promise<void> {
  const env = getVideoServiceEnv();
  await runCommand(
    env.FFMPEG_PATH,
    [
      "-y",
      "-ss",
      "1",
      "-i",
      input.videoPath,
      "-frames:v",
      "1",
      input.outputPath,
    ],
    input.workingDir,
  );
}

// Get S3 client if credentials are present
function getS3Client(): S3Client | null {
  const env = getVideoServiceEnv();
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY)
    return null;
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // required for Supabase S3
  });
}

// Build public URL for an uploaded S3 object
function buildS3PublicUrl(key: string): string {
  const env = getVideoServiceEnv();
  // Use explicit override if provided
  if (env.S3_PUBLIC_URL)
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  // Auto-detect Supabase public URL pattern
  const ref = env.S3_ENDPOINT?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (ref)
    return `https://${ref}.supabase.co/storage/v1/object/public/${env.S3_BUCKET}/${key}`;
  // Generic S3 fallback
  return `${env.S3_ENDPOINT?.replace(/\/+$/, "")}/${env.S3_BUCKET}/${key}`;
}

// Upload a local file to S3, return its public URL
export async function uploadLocalFile(input: {
  localPath: string;
  storagePath: string;
  contentType: string;
}): Promise<string> {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error(
      "S3 not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
    );
  }

  const env = getVideoServiceEnv();
  const data = await fs.readFile(input.localPath);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: env.S3_BUCKET,
      Key: input.storagePath,
      Body: data,
      ContentType: input.contentType,
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 10, // 10MB parts
  });

  await upload.done();
  return buildS3PublicUrl(input.storagePath);
}

// Generate a unique storage key for a render asset
export function buildStoragePath(jobId: string, filename: string): string {
  const uid = randomUUID().slice(0, 8);
  return `video-renders/${jobId}/${uid}-${filename}`;
}
