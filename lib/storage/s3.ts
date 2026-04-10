// ── S3 Storage — Supabase Video Upload ─────────────────────────────
// Downloads videos from source URL → uploads to Supabase S3 → returns public URL.
// Falls back to original URL if S3 not configured or upload fails.
// Used by: workers/process-job.ts (post-render upload)

import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";

let _client: S3Client | null = null;

function getS3Client(): S3Client | null {
  const env = getEnv();
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return null;
  }
  if (_client) return _client;
  _client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // required for Supabase S3
  });
  return _client;
}

function buildPublicUrl(key: string): string {
  const env = getEnv();
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  }
  // Supabase Storage public URL format
  const supabaseProjectRef = env.S3_ENDPOINT?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];
  if (supabaseProjectRef) {
    return `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/${env.S3_BUCKET}/${key}`;
  }
  // Generic S3-compatible fallback
  return `${env.S3_ENDPOINT?.replace(/\/+$/, "")}/${env.S3_BUCKET}/${key}`;
}

async function ensureBucketExists(
  client: S3Client,
  bucket: string,
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    // Bucket doesn't exist — create it
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

/**
 * Downloads a video from a URL and uploads it to S3-compatible storage.
 * Returns the persistent public URL. Falls back to the original URL if
 * S3 is not configured or the upload fails.
 */
export async function uploadVideoToStorage(
  sourceUrl: string,
  key: string,
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    // S3 not configured — return original URL
    return sourceUrl;
  }

  const env = getEnv();

  try {
    // Download the video as a stream
    const response = await fetch(sourceUrl);
    if (!response.ok || !response.body) {
      logger.warn("s3_upload_download_failed", {
        component: "storage_s3",
        sourceUrl: sourceUrl.slice(0, 100),
        status: response.status,
      });
      return sourceUrl;
    }

    const contentType = response.headers.get("content-type") ?? "video/mp4";
    const contentLength = response.headers.get("content-length");

    await ensureBucketExists(client, env.S3_BUCKET);

    const upload = new Upload({
      client,
      params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: response.body as unknown as ReadableStream,
        ContentType: contentType,
        ...(contentLength
          ? { ContentLength: parseInt(contentLength, 10) }
          : {}),
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10, // 10 MB parts
    });

    await upload.done();

    const publicUrl = buildPublicUrl(key);
    logger.info("s3_upload_complete", {
      component: "storage_s3",
      key,
      publicUrl: publicUrl.slice(0, 100),
    });

    return publicUrl;
  } catch (error) {
    logger.warn("s3_upload_failed", {
      component: "storage_s3",
      key,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    // Fall back to original URL on any failure
    return sourceUrl;
  }
}

export function isStorageConfigured(): boolean {
  return getS3Client() !== null;
}
