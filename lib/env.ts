import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

function isValidSolanaPublicKey(value: string): boolean {
  try {
    // PublicKey constructor validates base58 format and key length.
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function trimEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalEnvValue(value: string | undefined): string | undefined {
  const trimmed = trimEnvValue(value);
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const envSchema = z.object({
  HELIUS_API_KEY: z.string().min(1),
  HELIUS_WEBHOOK_ID: z.string().uuid().optional(),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_RPC_FALLBACK_URL: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
  TEXT_INFERENCE_PROVIDER: z
    .enum(["openrouter", "openai", "claude", "replicate", "huggingface", "ollama", "others"])
    .default("openrouter"),
  TEXT_INFERENCE_MODEL: z.string().min(1).optional(),
  TEXT_INFERENCE_BASE_URL: z.string().url().optional(),
  TEXT_INFERENCE_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  VIDEO_API_KEY: z.string().min(1),
  X_API_BEARER_TOKEN: z.string().min(1).optional(),
  X_API_CONSUMER_KEY: z.string().min(1).optional(),
  X_API_CONSUMER_SECRET: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  X_API_BASE_URL: z.string().url().default("https://api.x.com/2"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().url().default("https://api.anthropic.com/v1"),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  REPLICATE_BASE_URL: z.string().url().default("https://api.replicate.com/v1"),
  HUGGINGFACE_API_TOKEN: z.string().min(1).optional(),
  HUGGINGFACE_TEXT_BASE_URL: z
    .string()
    .url()
    .default("https://api-inference.huggingface.co/models"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  HELIUS_WEBHOOK_SECRET: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  HYPERCINEMA_PAYMENT_WALLET: z
    .string()
    .min(32)
    .max(64)
    .refine(isValidSolanaPublicKey, {
      message: "HYPERCINEMA_PAYMENT_WALLET must be a valid Solana address",
    }),
  PAYMENT_MASTER_SEED_HEX: z.string().min(64),
  PAYMENT_DERIVATION_PREFIX: z.string().default("hypercinema-job"),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  WORKER_URL: z.string().url().optional(),
  WORKER_TOKEN: z.string().optional(),
  ALLOW_IN_PROCESS_WORKER: z.coerce.boolean().optional(),
  JOB_DISPATCH_BATCH_LIMIT: z.coerce.number().int().positive().default(25),
  JOB_PROCESSING_STALE_MS: z.coerce.number().int().min(30_000).default(120_000),
  VIDEO_RENDER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .default(5_000),
  VIDEO_RENDER_MAX_POLL_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .default(2_160),
  OPENROUTER_BASE_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  VIDEO_INFERENCE_PROVIDER: z
    .enum(["google_veo", "openai", "replicate", "huggingface", "ollama", "others"])
    .default("google_veo"),
  VIDEO_INFERENCE_MODEL: z.string().min(1).optional(),
  OPENROUTER_APP_NAME: z.string().default("HYPERCINEMA"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  VIDEO_API_BASE_URL: z.string().url().optional(),
  VIDEO_ENGINE: z.literal("google_veo").default("google_veo"),
  VIDEO_VEO_MODEL: z
    .literal("veo-3.1-fast-generate-001")
    .default("veo-3.1-fast-generate-001"),
  VIDEO_RESOLUTION: z.enum(["720p", "1080p"]).default("1080p"),
  X402_FACILITATOR_URL: z
    .string()
    .url()
    .default("https://x402.dexter.cash"),
  GOONBOOK_API_BASE_URL: z.string().url().optional(),
  GOONBOOK_AGENT_API_KEY: z.string().optional(),
  GOONBOOK_AGENT_HANDLE: z.string().default("hasmedia"),
  GOONBOOK_AGENT_DISPLAY_NAME: z.string().default("HASMEDIA"),
  GOONBOOK_AGENT_BIO: z
    .string()
    .default("HyperMyths drops AI video trailers and posts them to GoonBook."),
  GOONBOOK_SYNC_BATCH_LIMIT: z.coerce.number().int().positive().default(12),
  SWEEP_MIN_LAMPORTS: z.coerce.number().int().nonnegative().default(5_000),
  SWEEP_BATCH_LIMIT: z.coerce.number().int().positive().default(50),
  ANALYTICS_ENGINE_MODE: z
    .enum(["v2_fallback_legacy", "v2", "legacy"])
    .default("v2_fallback_legacy"),
  MOONPAY_API_KEY: z.string().min(1).optional(),
  MOONPAY_WEBHOOK_SHARED_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_MOONPAY_PAYLINK_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MOONPAY_NETWORK: z.enum(["main", "test"]).optional(),
  CROSSMINT_SERVER_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CROSSMINT_API_KEY: z.string().min(1).optional(),
  CROSSMINT_COOKIE_DOMAIN: z.string().min(1).optional(),
  CROSSMINT_ADMIN_ALLOWLIST: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse({
    ...process.env,
    HELIUS_WEBHOOK_ID: trimOptionalEnvValue(process.env.HELIUS_WEBHOOK_ID),
    OPENROUTER_MODEL: trimOptionalEnvValue(process.env.OPENROUTER_MODEL),
    TEXT_INFERENCE_PROVIDER: trimEnvValue(process.env.TEXT_INFERENCE_PROVIDER),
    TEXT_INFERENCE_MODEL: trimOptionalEnvValue(process.env.TEXT_INFERENCE_MODEL),
    TEXT_INFERENCE_BASE_URL: trimOptionalEnvValue(process.env.TEXT_INFERENCE_BASE_URL),
    TEXT_INFERENCE_API_KEY: trimOptionalEnvValue(process.env.TEXT_INFERENCE_API_KEY),
    VIDEO_ENGINE: trimEnvValue(process.env.VIDEO_ENGINE),
    VIDEO_VEO_MODEL: trimEnvValue(process.env.VIDEO_VEO_MODEL),
    VIDEO_RESOLUTION: trimEnvValue(process.env.VIDEO_RESOLUTION),
    X_API_BEARER_TOKEN: trimOptionalEnvValue(process.env.X_API_BEARER_TOKEN),
    X_API_CONSUMER_KEY: trimOptionalEnvValue(process.env.X_API_CONSUMER_KEY),
    X_API_CONSUMER_SECRET: trimOptionalEnvValue(process.env.X_API_CONSUMER_SECRET),
    X_API_ACCESS_TOKEN: trimOptionalEnvValue(process.env.X_API_ACCESS_TOKEN),
    X_API_ACCESS_TOKEN_SECRET: trimOptionalEnvValue(process.env.X_API_ACCESS_TOKEN_SECRET),
    X_API_BASE_URL: trimEnvValue(process.env.X_API_BASE_URL),
    OPENAI_BASE_URL: trimEnvValue(process.env.OPENAI_BASE_URL),
    ANTHROPIC_BASE_URL: trimEnvValue(process.env.ANTHROPIC_BASE_URL),
    REPLICATE_BASE_URL: trimEnvValue(process.env.REPLICATE_BASE_URL),
    HUGGINGFACE_TEXT_BASE_URL: trimEnvValue(process.env.HUGGINGFACE_TEXT_BASE_URL),
    OLLAMA_BASE_URL: trimEnvValue(process.env.OLLAMA_BASE_URL),
    X402_FACILITATOR_URL: trimEnvValue(process.env.X402_FACILITATOR_URL),
    GOONBOOK_API_BASE_URL: trimOptionalEnvValue(process.env.GOONBOOK_API_BASE_URL),
    GOONBOOK_AGENT_API_KEY: trimOptionalEnvValue(process.env.GOONBOOK_AGENT_API_KEY),
    GOONBOOK_AGENT_HANDLE:
      trimOptionalEnvValue(process.env.GOONBOOK_AGENT_HANDLE) ?? "hasmedia",
    GOONBOOK_AGENT_DISPLAY_NAME:
      trimOptionalEnvValue(process.env.GOONBOOK_AGENT_DISPLAY_NAME) ?? "HASMEDIA",
    GOONBOOK_AGENT_BIO:
      trimOptionalEnvValue(process.env.GOONBOOK_AGENT_BIO) ??
      "HyperMyths drops AI video trailers and posts them to GoonBook.",
    CROSSMINT_SERVER_API_KEY: trimOptionalEnvValue(process.env.CROSSMINT_SERVER_API_KEY),
    MOONPAY_API_KEY: trimOptionalEnvValue(process.env.MOONPAY_API_KEY),
    MOONPAY_WEBHOOK_SHARED_TOKEN: trimOptionalEnvValue(
      process.env.MOONPAY_WEBHOOK_SHARED_TOKEN,
    ),
    NEXT_PUBLIC_MOONPAY_PAYLINK_ID: trimOptionalEnvValue(
      process.env.NEXT_PUBLIC_MOONPAY_PAYLINK_ID,
    ),
    NEXT_PUBLIC_MOONPAY_NETWORK:
      process.env.NEXT_PUBLIC_MOONPAY_NETWORK === "test"
        ? "test"
        : process.env.NEXT_PUBLIC_MOONPAY_NETWORK === "main"
          ? "main"
          : undefined,
    NEXT_PUBLIC_CROSSMINT_API_KEY: trimOptionalEnvValue(
      process.env.NEXT_PUBLIC_CROSSMINT_API_KEY,
    ),
    CROSSMINT_COOKIE_DOMAIN: trimOptionalEnvValue(process.env.CROSSMINT_COOKIE_DOMAIN),
    CROSSMINT_ADMIN_ALLOWLIST: trimOptionalEnvValue(
      process.env.CROSSMINT_ADMIN_ALLOWLIST,
    ),
    VIDEO_INFERENCE_PROVIDER: trimEnvValue(process.env.VIDEO_INFERENCE_PROVIDER),
    VIDEO_INFERENCE_MODEL: trimOptionalEnvValue(process.env.VIDEO_INFERENCE_MODEL),
    ALLOW_IN_PROCESS_WORKER:
      process.env.ALLOW_IN_PROCESS_WORKER ??
      (process.env.NODE_ENV === "production" ? "false" : "true"),
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n",
    ),
    HYPERCINEMA_PAYMENT_WALLET: trimEnvValue(process.env.HYPERCINEMA_PAYMENT_WALLET),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration: ${missing}`);
  }

  const env = parsed.data;
  cachedEnv = {
    ...env,
    FIREBASE_STORAGE_BUCKET:
      env.FIREBASE_STORAGE_BUCKET ?? `${env.FIREBASE_PROJECT_ID}.appspot.com`,
  };

  return cachedEnv;
}
