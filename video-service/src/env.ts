// Video service config — xAI + S3 only
import { z } from "zod";

// Trim whitespace from env strings
function trim(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

const schema = z.object({
  // Server port
  PORT: z.coerce.number().int().positive().default(8090),
  // Auth key for render API
  VIDEO_API_KEY: z.string().min(1),
  // Public base URL for status links in responses
  VIDEO_SERVICE_BASE_URL: z.string().url().optional(),

  // xAI video generation
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),

  // How often to poll xAI for clip status
  XAI_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  // Max poll attempts before timeout
  XAI_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(180),

  // Max seconds per clip — longer scenes split into chunks
  MAX_CLIP_SECONDS: z.coerce.number().int().min(2).max(30).default(8),

  // Path to ffmpeg binary
  FFMPEG_PATH: z.string().min(1).default("ffmpeg"),

  // S3-compatible storage (Supabase Storage)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).default("videos"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  // Override public URL base if CDN or custom domain
  S3_PUBLIC_URL: z.string().url().optional(),

  // How often recovery loop runs
  RENDER_RECOVERY_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
  // Stale render threshold — reclaim if stuck this long
  RENDER_STALE_MS: z.coerce.number().int().min(60_000).default(5 * 60_000),
  // Max renders to recover per batch
  RENDER_RECOVERY_BATCH_LIMIT: z.coerce.number().int().positive().default(20),
});

export type VideoServiceEnv = z.infer<typeof schema>;

// Cached after first parse
let cached: VideoServiceEnv | null = null;

export function getVideoServiceEnv(): VideoServiceEnv {
  if (cached) return cached;

  const parsed = schema.safeParse({
    ...process.env,
    XAI_API_KEY: trim(process.env.XAI_API_KEY),
    XAI_BASE_URL: trim(process.env.XAI_BASE_URL),
    XAI_VIDEO_MODEL: trim(process.env.XAI_VIDEO_MODEL),
    S3_ENDPOINT: trim(process.env.S3_ENDPOINT),
    S3_ACCESS_KEY_ID: trim(process.env.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: trim(process.env.S3_SECRET_ACCESS_KEY),
    S3_PUBLIC_URL: trim(process.env.S3_PUBLIC_URL),
    VIDEO_SERVICE_BASE_URL: trim(process.env.VIDEO_SERVICE_BASE_URL),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Bad video-service config: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
