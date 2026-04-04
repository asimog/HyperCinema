// Production env validation with Zod
import { z } from "zod";

// Trim whitespace from env values
function trimEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

// Clean optional env values safely
function trimOptionalEnvValue(value: string | undefined): string | undefined {
  const trimmed = trimEnvValue(value);
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

// All required and optional env vars
const envSchema = z.object({
  // Solana blockchain access
  HELIUS_API_KEY: z.string().min(1),
  HELIUS_WEBHOOK_ID: z.string().uuid().optional(),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_RPC_FALLBACK_URL: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
  // AI text generation provider
  TEXT_INFERENCE_PROVIDER: z
    .enum(["xai", "openrouter", "openai", "claude", "replicate", "huggingface", "ollama", "others"])
    .default("openrouter"),
  TEXT_INFERENCE_MODEL: z.string().min(1).optional(),
  TEXT_INFERENCE_BASE_URL: z.string().url().optional(),
  TEXT_INFERENCE_API_KEY: z.string().min(1).optional(),
  // xAI Grok API access
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),
  // OpenRouter multi-model routing
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  // Video render service key
  VIDEO_API_KEY: z.string().min(1),
  // Twitter X API auth
  X_API_BEARER_TOKEN: z.string().min(1).optional(),
  X_API_CONSUMER_KEY: z.string().min(1).optional(),
  X_API_CONSUMER_SECRET: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  X_API_BASE_URL: z.string().url().default("https://api.x.com/2"),
  // OpenAI direct access
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  // Anthropic Claude access
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().url().default("https://api.anthropic.com/v1"),
  // Replicate model hosting
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  REPLICATE_BASE_URL: z.string().url().default("https://api.replicate.com/v1"),
  // HuggingFace inference
  HUGGINGFACE_API_TOKEN: z.string().min(1).optional(),
  HUGGINGFACE_TEXT_BASE_URL: z
    .string()
    .url()
    .default("https://api-inference.huggingface.co/models"),
  // Local Ollama runtime
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  // Helius webhook auth
  HELIUS_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Firebase cloud storage
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  // Payment wallet seed
  PAYMENT_MASTER_SEED_HEX: z.string().min(64),
  PAYMENT_DERIVATION_PREFIX: z.string().default("hashcinema-job"),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  // App base URL for links
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  // Background worker config
  WORKER_URL: z.string().url().optional(),
  WORKER_TOKEN: z.string().optional(),
  ALLOW_IN_PROCESS_WORKER: z.coerce.boolean().optional(),
  JOB_DISPATCH_BATCH_LIMIT: z.coerce.number().int().positive().default(25),
  JOB_PROCESSING_STALE_MS: z.coerce.number().int().min(30_000).default(120_000),
  // Video polling config
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
  // OpenRouter fallback config
  OPENROUTER_BASE_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  // Video generation provider
  VIDEO_INFERENCE_PROVIDER: z
    .enum(["google_veo", "xai", "openai", "replicate", "huggingface", "ollama", "others"])
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
  // x402 USDC payment protocol
  X402_FACILITATOR_URL: z
    .string()
    .url()
    .default("https://x402.dexter.cash"),
  // MoltBook AI social network
  MOLTBOOK_API_BASE_URL: z.string().url().optional(),
  MOLTBOOK_AGENT_API_KEY: z.string().optional(),
  MOLTBOOK_AGENT_HANDLE: z.string().default("mythxeliza"),
  MOLTBOOK_AGENT_DISPLAY_NAME: z.string().default("MythXEliza"),
  MOLTBOOK_AGENT_BIO: z
    .string()
    .default("MythXEliza creates AI autobiographical videos from X profiles and posts them to MoltBook."),
  MOLTBOOK_SYNC_BATCH_LIMIT: z.coerce.number().int().positive().default(12),
  MOLTBOOK_VERIFICATION_SOLVER: z.enum(["manual", "auto"]).default("manual"),
  // Wallet sweep config
  SWEEP_MIN_LAMPORTS: z.coerce.number().int().nonnegative().default(5_000),
  SWEEP_BATCH_LIMIT: z.coerce.number().int().positive().default(50),
  // Analytics engine mode
  ANALYTICS_ENGINE_MODE: z
    .enum(["v2_fallback_legacy", "v2", "legacy"])
    .default("v2_fallback_legacy"),
  // MoonPay fiat on-ramp
  MOONPAY_API_KEY: z.string().min(1).optional(),
  MOONPAY_WEBHOOK_SHARED_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_MOONPAY_PAYLINK_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MOONPAY_NETWORK: z.enum(["main", "test"]).optional(),
  // Crossmint wallet auth
  CROSSMINT_SERVER_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CROSSMINT_API_KEY: z.string().min(1).optional(),
  CROSSMINT_COOKIE_DOMAIN: z.string().min(1).optional(),
  CROSSMINT_ADMIN_ALLOWLIST: z.string().optional(),
  // ElizaOS AI agent platform
  ELIZAOS_API_KEY: z.string().min(1).optional(),
  ELIZAOS_BASE_URL: z.string().url().default("https://cloud.milady.ai/api/v1"),
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
    XAI_API_KEY: trimOptionalEnvValue(process.env.XAI_API_KEY),
    XAI_BASE_URL: trimEnvValue(process.env.XAI_BASE_URL),
    XAI_VIDEO_MODEL: trimOptionalEnvValue(process.env.XAI_VIDEO_MODEL),
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
    ELIZAOS_API_KEY: trimOptionalEnvValue(process.env.ELIZAOS_API_KEY),
    ELIZAOS_BASE_URL: trimEnvValue(process.env.ELIZAOS_BASE_URL),
    MOLTBOOK_API_BASE_URL: trimOptionalEnvValue(process.env.MOLTBOOK_API_BASE_URL),
    MOLTBOOK_AGENT_API_KEY: trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_API_KEY),
    MOLTBOOK_AGENT_HANDLE:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_HANDLE) ?? "mythxeliza",
    MOLTBOOK_AGENT_DISPLAY_NAME:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_DISPLAY_NAME) ?? "MythXEliza",
    MOLTBOOK_AGENT_BIO:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_BIO) ??
      "MythXEliza creates AI autobiographical videos from X profiles and posts them to MoltBook.",
    MOLTBOOK_VERIFICATION_SOLVER: trimEnvValue(process.env.MOLTBOOK_VERIFICATION_SOLVER),
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
