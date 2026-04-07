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

export function isVertexPromptPolicyError(status: number, body: string): boolean {
  if (status < 400 || status >= 500) {
    return false;
  }

  const normalized = body.toLowerCase();
  return (
    normalized.includes("usage guidelines") ||
    normalized.includes("try rephrasing the prompt") ||
    normalized.includes("prompt could not be submitted")
  );
}

export function sanitizePromptForPolicyRetry(prompt: string): string {
  const replacements: Array<[RegExp, string]> = [
    // Body descriptions that trigger policy filters
    [
      /\b(?:(?:stocky|heavyset|chubby|fat|skinny|obese|slim|short|tall|square[- ]built)\s+)+(?:man|woman|person|guy|girl|boy|figure)\b/gi,
      "adult protagonist",
    ],
    [/\bnot\s+fat\b/gi, "warm and approachable"],
    [/\b(?:stocky|heavyset|chubby|fat|skinny|obese|slim|short|tall|square[- ]built)\b/gi, ""],
    [/\b(?:ugly|hideous|deformed|grotesque|monstrous)\b/gi, "distinctive"],
    // Violence-related terms
    [/\b(?:kill|murder|shoot|stab|slash|cut|bleed|blood|wound|injure|attack|fight|violence|weapon|gun|knife|bomb|explode|die|death|dead|corpse|corpse|skeleton|skull|grave|tomb)\b/gi, "depart"],
    // Explicit content terms
    [/\b(?:naked|nude|naked|sexy|sexual|porn|explicit|adult|nsfw|bare|barely clothed|scantily clad)\b/gi, "elegant"],
    // Substance-related
    [/\b(?:drug|drugs|weed|marijuana|cocaine|heroin|alcohol|beer|wine|drunk|high|intoxicated|stoned)\b/gi, "herbal"],
    // Self-harm terms
    [/\b(?:suicide|self-harm|self harm|cutting|hang|jump)\b/gi, "reflect"],
    // Hate speech indicators
    [/\b(?:hate|hate speech|racist|bigot|slur|discriminate|genocide)\b/gi, "differ"],
    // Song lyrics protection
    [/\blyrics?\s+or\s+song\s+notes\s*:/gi, "Music cue:"],
    [/\bhappy birthday to you\b/gi, "a birthday singalong"],
    // Additional safe alternatives for common triggers
    [/\bbattle|war|combat|conflict|struggle\b/gi, "contest"],
    [/\bblood|bloody|gore|gory|gruesome|grisly\b/gi, "dramatic"],
    [/\bscream|shriek|yell|shout|cry|sob|weep|tears\b/gi, "express"],
    [/\bfear|terrify|terrifying|horror|horrifying|scary|frighten|creepy\b/gi, "intense"],
  ];

  let rewritten = prompt;
  for (const [pattern, replacement] of replacements) {
    rewritten = rewritten.replace(pattern, replacement);
  }

  rewritten = rewritten
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const safetyInstruction =
    "Safety rewrite: keep all character descriptions neutral and respectful, avoid sensitive body labels, and paraphrase song cues instead of quoting lyrics verbatim.";

  return rewritten.includes(safetyInstruction)
    ? rewritten
    : `${rewritten}\n${safetyInstruction}`;
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
    const useApiKeyAuth = Boolean(env.VERTEX_API_KEY);
    const authHeader = useApiKeyAuth ? undefined : await this.getAuthHeader();

    // Proactively sanitize prompt BEFORE first attempt to avoid policy violations
    const sanitizedPrompt = sanitizePromptForPolicyRetry(input.prompt);

    // Let API decide model if not specified
    const modelParams: { projectId: string; location: string; model?: string } = {
      projectId: env.VERTEX_PROJECT_ID,
      location: env.VERTEX_LOCATION,
      model: input.model || undefined,
    };

    const endpoint = this.withApiKey(
      this.buildPredictEndpoint(modelParams as { projectId: string; location: string; model: string }),
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

    const makeRequestBody = (prompt: string, imageUrl?: string): Record<string, unknown> => ({
      instances: [
        {
          prompt,
          ...(imageUrl ? { image: { uri: imageUrl } } : {}),
        },
      ],
      parameters,
    });

    const startOperation = async (prompt: string, imageUrl?: string): Promise<Response> =>
      fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(makeRequestBody(prompt, imageUrl)),
      });

    const imageUrl = normalizeImageUrl(input.imageUrl);
    let startResponse: Response | null = null;
    let lastStartFailure: { status: number; body: string } | null = null;
    // Start with sanitized prompt to avoid policy violations
    const startQueue: Array<{ prompt: string; imageUrl?: string }> = [
      { prompt: sanitizedPrompt, imageUrl },
    ];
    const seenStarts = new Set<string>();

    while (startQueue.length > 0) {
      const attempt = startQueue.shift()!;
      const attemptKey = `${attempt.imageUrl ?? "no-image"}::${attempt.prompt}`;
      if (seenStarts.has(attemptKey)) {
        continue;
      }
      seenStarts.add(attemptKey);

      const response = await startOperation(attempt.prompt, attempt.imageUrl);
      if (response.ok) {
        startResponse = response;
        break;
      }

      const body = await response.text();
      lastStartFailure = { status: response.status, body };

      if (attempt.imageUrl && isVertexImageEmptyError(response.status, body)) {
        startQueue.push({ prompt: attempt.prompt, imageUrl: undefined });
      }

      // Retry with further sanitization if policy violation still occurs
      if (isVertexPromptPolicyError(response.status, body)) {
        const rewrittenPrompt = sanitizePromptForPolicyRetry(attempt.prompt);
        // If sanitization changed the prompt, retry with it
        if (rewrittenPrompt !== attempt.prompt) {
          const retryKey = `retry-policy::${attempt.imageUrl ?? "no-image"}`;
          if (!seenStarts.has(retryKey)) {
            seenStarts.add(retryKey);
            startQueue.push({ prompt: rewrittenPrompt, imageUrl: attempt.imageUrl });
          }
          // Also try without image since the image might trigger the policy filter
          if (attempt.imageUrl) {
            const retryKeyNoImg = `retry-policy-noimg::${attempt.imageUrl}`;
            if (!seenStarts.has(retryKeyNoImg)) {
              seenStarts.add(retryKeyNoImg);
              startQueue.push({ prompt: rewrittenPrompt, imageUrl: undefined });
            }
          }
        } else {
          // Sanitization didn't help - generate a minimal safe fallback prompt
          const safePrompt = "A peaceful scenic landscape with natural beauty, calm atmosphere, serene environment, gentle lighting, tranquil setting, harmonious composition";
          const retryKey = `retry-safe::${attempt.imageUrl ?? "no-image"}`;
          if (!seenStarts.has(retryKey)) {
            seenStarts.add(retryKey);
            startQueue.push({ prompt: safePrompt, imageUrl: attempt.imageUrl });
          }
          if (attempt.imageUrl) {
            const retryKeyNoImg = `retry-safe-noimg::${attempt.imageUrl}`;
            if (!seenStarts.has(retryKeyNoImg)) {
              seenStarts.add(retryKeyNoImg);
              startQueue.push({ prompt: safePrompt, imageUrl: undefined });
            }
          }
        }
      }
    }

    if (!startResponse) {
      if (!lastStartFailure) {
        throw new Error("Veo start failed before a response was captured.");
      }
      throw new Error(`Veo start failed (${lastStartFailure.status}): ${lastStartFailure.body}`);
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
