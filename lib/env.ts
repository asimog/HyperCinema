// Production env validation with Zod — xAI only, KISS
import { z } from "zod";

function trimEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalEnvValue(value: string | undefined): string | undefined {
  const trimmed = trimEnvValue(value);
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const envSchema = z.object({
  // ── xAI (text + video) ──────────────────────────────────────────
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_TEXT_API_KEY: z.string().min(1).optional(),
  XAI_VIDEO_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_TEXT_MODEL: z.string().min(1).optional(),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),

  // ── Video render service ────────────────────────────────────────
  VIDEO_API_KEY: z.string().default("local-dev-key"),
  VIDEO_API_BASE_URL: z.string().url().optional(),

  // ── X (Twitter) API — tweet scraping ────────────────────────────
  X_API_BEARER_TOKEN: z.string().min(1).optional(),
  X_API_CONSUMER_KEY: z.string().min(1).optional(),
  X_API_CONSUMER_SECRET: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  X_API_BASE_URL: z.string().url().default("https://api.x.com/2"),
  X_OAUTH2_CLIENT_ID: z.string().min(1).optional(),
  X_OAUTH2_CLIENT_SECRET: z.string().min(1).optional(),

  // ── S3 storage (Supabase) ──────────────────────────────────────
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).default("videos"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_PUBLIC_URL: z.string().url().optional(),

  // ── Worker / job processing ─────────────────────────────────────
  WORKER_URL: z.string().url().optional(),
  WORKER_TOKEN: z.string().optional(),
  ALLOW_IN_PROCESS_WORKER: z.coerce.boolean().optional(),

  // ── Video polling ───────────────────────────────────────────────
  VIDEO_RENDER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  VIDEO_RENDER_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(120),

  // ── App / admin ─────────────────────────────────────────────────
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  COCKPIT_USERNAME: z.string().min(1).optional(),
  COCKPIT_PASSWORD: z.string().min(1).optional(),

  // ── Database (not validated here — handled by Prisma) ──────────
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    ...process.env,
    XAI_API_KEY: trimOptionalEnvValue(process.env.XAI_API_KEY),
    XAI_TEXT_API_KEY: trimOptionalEnvValue(process.env.XAI_TEXT_API_KEY),
    XAI_VIDEO_API_KEY: trimOptionalEnvValue(process.env.XAI_VIDEO_API_KEY),
    XAI_BASE_URL: trimEnvValue(process.env.XAI_BASE_URL),
    XAI_TEXT_MODEL: trimOptionalEnvValue(process.env.XAI_TEXT_MODEL),
    XAI_VIDEO_MODEL: trimOptionalEnvValue(process.env.XAI_VIDEO_MODEL),
    VIDEO_API_KEY: trimOptionalEnvValue(process.env.VIDEO_API_KEY),
    VIDEO_API_BASE_URL: trimEnvValue(process.env.VIDEO_API_BASE_URL),
    X_API_BEARER_TOKEN: trimOptionalEnvValue(process.env.X_API_BEARER_TOKEN),
    X_API_CONSUMER_KEY: trimOptionalEnvValue(process.env.X_API_CONSUMER_KEY),
    X_API_CONSUMER_SECRET: trimOptionalEnvValue(
      process.env.X_API_CONSUMER_SECRET,
    ),
    X_API_ACCESS_TOKEN: trimOptionalEnvValue(process.env.X_API_ACCESS_TOKEN),
    X_API_ACCESS_TOKEN_SECRET: trimOptionalEnvValue(
      process.env.X_API_ACCESS_TOKEN_SECRET,
    ),
    X_API_BASE_URL: trimEnvValue(process.env.X_API_BASE_URL),
    X_OAUTH2_CLIENT_ID: trimOptionalEnvValue(process.env.X_OAUTH2_CLIENT_ID),
    X_OAUTH2_CLIENT_SECRET: trimOptionalEnvValue(
      process.env.X_OAUTH2_CLIENT_SECRET,
    ),
    S3_ENDPOINT: trimEnvValue(process.env.S3_ENDPOINT),
    S3_ACCESS_KEY_ID: trimOptionalEnvValue(process.env.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: trimOptionalEnvValue(
      process.env.S3_SECRET_ACCESS_KEY,
    ),
    S3_BUCKET: trimOptionalEnvValue(process.env.S3_BUCKET),
    S3_REGION: trimOptionalEnvValue(process.env.S3_REGION),
    S3_PUBLIC_URL: trimEnvValue(process.env.S3_PUBLIC_URL),
    WORKER_URL: trimEnvValue(process.env.WORKER_URL),
    WORKER_TOKEN: trimOptionalEnvValue(process.env.WORKER_TOKEN),
    APP_BASE_URL: trimEnvValue(process.env.APP_BASE_URL),
    COCKPIT_USERNAME: trimOptionalEnvValue(process.env.COCKPIT_USERNAME),
    COCKPIT_PASSWORD: trimOptionalEnvValue(process.env.COCKPIT_PASSWORD),
    VIDEO_RENDER_POLL_INTERVAL_MS: trimOptionalEnvValue(
      process.env.VIDEO_RENDER_POLL_INTERVAL_MS,
    ),
    VIDEO_RENDER_MAX_POLL_ATTEMPTS: trimOptionalEnvValue(
      process.env.VIDEO_RENDER_MAX_POLL_ATTEMPTS,
    ),
    NODE_ENV: trimOptionalEnvValue(process.env.NODE_ENV),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Bad env config: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
