import { getBucket } from "@/lib/firebase/admin";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { randomUUID } from "crypto";

export async function uploadBufferToStorage(params: {
  storagePath: string;
  contentType: string;
  data: Buffer;
}): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(params.storagePath);
  const downloadToken = randomUUID();

  await file.save(params.data, {
    metadata: {
      contentType: params.contentType,
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    params.storagePath,
  )}?alt=media&token=${downloadToken}`;
}

export async function uploadRemoteFileToStorage(params: {
  sourceUrl: string;
  storagePath: string;
  contentType: string;
}): Promise<string> {
  const arrayBuffer = await withRetry(
    async () => {
      const response = await fetchWithTimeout(params.sourceUrl, {}, 20_000);
      if (!response.ok) {
        const message = `Failed to fetch remote file (${response.status}): ${params.sourceUrl}`;
        if (isRetryableHttpStatus(response.status)) {
          throw new RetryableError(message);
        }
        throw new Error(message);
      }
      return response.arrayBuffer();
    },
    {
      attempts: 3,
      baseDelayMs: 600,
      maxDelayMs: 4_000,
    },
  );

  return uploadBufferToStorage({
    storagePath: params.storagePath,
    contentType: params.contentType,
    data: Buffer.from(arrayBuffer),
  });
}
