import { setTimeout as sleep } from "timers/promises";
import { GoogleAuth } from "google-auth-library";
import { getVideoServiceEnv } from "../env";

interface VertexStartResponse {
  name?: string;
}

interface VertexOperationResponse {
  name?: string;
  done?: boolean;
  error?: {
    message?: string;
    code?: number;
  };
  metadata?: unknown;
  response?: unknown;
}

const ALLOWED_VEO_MODEL = "veo-3.1-fast-generate-001" as const;

export interface GenerateClipInput {
  model: typeof ALLOWED_VEO_MODEL;
  resolution: "720p" | "1080p";
  generateAudio: boolean;
  prompt: string;
  durationSeconds: number;
  imageUrl?: string | null;
  styleHints?: string[];
  storageUri?: string;
  onProgress?: () => Promise<void> | void;
}

function normalizeImageUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isVertexImageEmptyError(status: number, body: string): boolean {
  if (status !== 400) {
    return false;
  }

  const normalized = body.toLowerCase();
  return (
    normalized.includes("image is empty") ||
    (normalized.includes("\"status\": \"invalid_argument\"") &&
      normalized.includes("image"))
  );
}

function findVideoUris(value: unknown, collector: Set<string>): void {
  if (typeof value === "string") {
    if (
      value.startsWith("gcs://") ||
      value.startsWith("gs://") ||
      value.startsWith("https://") ||
      value.startsWith("http://")
    ) {
      collector.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findVideoUris(item, collector);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const map = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(map)) {
    if (
      key.toLowerCase().includes("uri") ||
      key.toLowerCase().includes("url") ||
      key.toLowerCase().includes("video")
    ) {
      findVideoUris(item, collector);
      continue;
    }
    findVideoUris(item, collector);
  }
}

export function extractVideoUrisFromOperation(operation: VertexOperationResponse): string[] {
  const uris = new Set<string>();
  findVideoUris(operation, uris);
  return [...uris];
}

function isLikelyBase64Video(value: string): boolean {
  if (value.length < 128 || value.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/=_-]+$/.test(value);
}

function findInlineVideoBytes(value: unknown, collector: Set<string>): void {
  if (typeof value === "string") {
    if (isLikelyBase64Video(value)) {
      collector.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findInlineVideoBytes(item, collector);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const map = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(map)) {
    if (key === "bytesBase64Encoded" || key.toLowerCase().includes("base64")) {
      findInlineVideoBytes(item, collector);
      continue;
    }
    findInlineVideoBytes(item, collector);
  }
}

export function extractInlineVideoBytesFromOperation(operation: VertexOperationResponse): string[] {
  const bytes = new Set<string>();
  findInlineVideoBytes(operation, bytes);
  return [...bytes];
}

function extractFilteredVideoCount(operation: VertexOperationResponse): number {
  const stack: unknown[] = [operation];

  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    if (!current || typeof current !== "object") {
      continue;
    }

    const map = current as Record<string, unknown>;
    for (const [key, value] of Object.entries(map)) {
      if (key === "raiMediaFilteredCount" && typeof value === "number") {
        return value;
      }
      stack.push(value);
    }
  }

  return 0;
}

export class VertexVeoClient {
  private readonly auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }

  private async getAuthHeader(): Promise<string> {
    const client = await this.auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new Error("Unable to acquire Google Cloud access token for Veo.");
    }
    return `Bearer ${token.token}`;
  }

  private buildPredictEndpoint(input: { projectId: string; location: string; model: string }): string {
    return `https://${input.location}-aiplatform.googleapis.com/v1/projects/${input.projectId}/locations/${input.location}/publishers/google/models/${input.model}:predictLongRunning`;
  }

  private buildFetchOperationEndpoint(input: { projectId: string; location: string; model: string }): string {
    return `https://${input.location}-aiplatform.googleapis.com/v1/projects/${input.projectId}/locations/${input.location}/publishers/google/models/${input.model}:fetchPredictOperation`;
  }

  private buildOperationEndpoint(input: { location: string; operationName: string }): string {
    if (input.operationName.startsWith("https://") || input.operationName.startsWith("http://")) {
      return input.operationName;
    }

    return `https://${input.location}-aiplatform.googleapis.com/v1/${input.operationName.replace(/^\/+/, "")}`;
  }

  private withApiKey(url: string, apiKey?: string): string {
    if (!apiKey) return url;
    const next = new URL(url);
    next.searchParams.set("key", apiKey);
    return next.toString();
  }

  async generateClip(input: GenerateClipInput): Promise<{
    operationName: string;
    videoUris: string[];
    videoBytesBase64: string[];
  }> {
    const env = getVideoServiceEnv();
    if (input.model !== ALLOWED_VEO_MODEL) {
      throw new Error(`Only ${ALLOWED_VEO_MODEL} is allowed.`);
    }
    const useApiKeyAuth = Boolean(env.VERTEX_API_KEY);
    const authHeader = useApiKeyAuth ? undefined : await this.getAuthHeader();

    const endpoint = this.withApiKey(
      this.buildPredictEndpoint({
        projectId: env.VERTEX_PROJECT_ID,
        location: env.VERTEX_LOCATION,
        model: input.model,
      }),
      env.VERTEX_API_KEY,
    );

    const parameters: Record<string, unknown> = {
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
      generateAudio: input.generateAudio,
      ...(input.storageUri ? { storageUri: input.storageUri } : {}),
      ...(input.styleHints?.length ? { styleHints: input.styleHints } : {}),
    };

    const requestHeaders = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const makeRequestBody = (imageUrl?: string): Record<string, unknown> => ({
      instances: [
        {
          prompt: input.prompt,
          ...(imageUrl ? { image: { uri: imageUrl } } : {}),
        },
      ],
      parameters,
    });

    const startOperation = async (imageUrl?: string): Promise<Response> =>
      fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(makeRequestBody(imageUrl)),
      });

    const imageUrl = normalizeImageUrl(input.imageUrl);
    let startResponse = await startOperation(imageUrl);

    if (!startResponse.ok) {
      const body = await startResponse.text();
      const canRetryWithoutImage = Boolean(imageUrl) && isVertexImageEmptyError(startResponse.status, body);
      if (!canRetryWithoutImage) {
        throw new Error(`Veo start failed (${startResponse.status}): ${body}`);
      }

      startResponse = await startOperation(undefined);
      if (!startResponse.ok) {
        const fallbackBody = await startResponse.text();
        throw new Error(`Veo start failed (${startResponse.status}): ${fallbackBody}`);
      }
    }

    const started = (await startResponse.json()) as VertexStartResponse;
    if (!started.name) {
      throw new Error("Veo did not return an operation name.");
    }

    const fetchOperationEndpoint = this.withApiKey(
      this.buildFetchOperationEndpoint({
        projectId: env.VERTEX_PROJECT_ID,
        location: env.VERTEX_LOCATION,
        model: input.model,
      }),
      env.VERTEX_API_KEY,
    );
    const operationEndpoint = this.withApiKey(
      this.buildOperationEndpoint({
        location: env.VERTEX_LOCATION,
        operationName: started.name,
      }),
      env.VERTEX_API_KEY,
    );

    const pollHeaders = {
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    for (let attempt = 0; attempt < env.VERTEX_MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(env.VERTEX_POLL_INTERVAL_MS);
      await input.onProgress?.();

      let operationResponse = await fetch(fetchOperationEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...pollHeaders,
        },
        body: JSON.stringify({
          operationName: started.name,
        }),
      });

      if (!operationResponse.ok) {
        operationResponse = await fetch(operationEndpoint, {
          method: "GET",
          headers: pollHeaders,
        });
        if (!operationResponse.ok) {
          const body = await operationResponse.text();
          throw new Error(`Veo operation polling failed (${operationResponse.status}): ${body}`);
        }
      }

      let operation = (await operationResponse.json()) as VertexOperationResponse;
      if (!operation.done) {
        continue;
      }

      if (operation.error) {
        throw new Error(operation.error.message ?? "Veo operation failed.");
      }

      let videoUris = extractVideoUrisFromOperation(operation);
      let videoBytesBase64 = extractInlineVideoBytesFromOperation(operation);
      if (!videoUris.length && !videoBytesBase64.length) {
        const fallbackResponse = await fetch(operationEndpoint, {
          method: "GET",
          headers: pollHeaders,
        });
        if (fallbackResponse.ok) {
          operation = (await fallbackResponse.json()) as VertexOperationResponse;
          if (operation.error) {
            throw new Error(operation.error.message ?? "Veo operation failed.");
          }
          videoUris = extractVideoUrisFromOperation(operation);
          videoBytesBase64 = extractInlineVideoBytesFromOperation(operation);
        }
      }

      if (!videoUris.length && !videoBytesBase64.length) {
        const filteredCount = extractFilteredVideoCount(operation);
        if (filteredCount > 0) {
          throw new Error(
            `Veo operation completed without deliverable video output (filtered=${filteredCount}).`,
          );
        }
        throw new Error("Veo operation completed without any video payload.");
      }

      return {
        operationName: started.name,
        videoUris,
        videoBytesBase64,
      };
    }

    throw new Error("Timed out while waiting for Veo operation completion.");
  }
}
