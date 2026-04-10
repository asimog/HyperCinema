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
  // AI text generation provider
  TEXT_INFERENCE_PROVIDER: z
    .enum([
      "xai",
      "openrouter",
      "openai",
      "claude",
      "replicate",
      "huggingface",
      "fal",
      "ollama",
      "others",
    ])
    .default("xai"),
  TEXT_INFERENCE_MODEL: z.string().min(1).optional(),
  TEXT_INFERENCE_BASE_URL: z.string().url().optional(),
  TEXT_INFERENCE_API_KEY: z.string().min(1).optional(),
  // xAI Grok API access
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_TEXT_API_KEY: z.string().min(1).optional(),
  XAI_VIDEO_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_TEXT_BASE_URL: z.string().url().optional(),
  XAI_VIDEO_BASE_URL: z.string().url().optional(),
  XAI_TEXT_MODEL: z.string().min(1).optional(),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),
  // ElizaOS video access
  ELIZAOS_API_KEY: z.string().min(1).optional(),
  ELIZAOS_BASE_URL: z.string().url().default("https://api.elizacloud.ai"),
  ELIZAOS_VIDEO_MODEL: z.string().min(1).default("default"),
  // OpenRouter multi-model routing
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  // Video render service key
  VIDEO_API_KEY: z.string().default("local-dev-key"),
  // Legacy video engine identifier (used by lib/video/client.ts)
  VIDEO_ENGINE: z.string().default("google_veo"),
  // Google Veo model identifier (used by lib/video/client.ts, lib/video/pipeline.ts, lib/inference/config.ts)
  VIDEO_VEO_MODEL: z.string().default("veo-3.1-fast-generate-001"),
  // Helius RPC/API key for Solana token metadata (used by lib/token-scanner/scanner.ts)
  HELIUS_API_KEY: z.string().optional(),
  // Twitter X API auth
  X_API_BEARER_TOKEN: z.string().min(1).optional(),
  X_API_CONSUMER_KEY: z.string().min(1).optional(),
  X_API_CONSUMER_SECRET: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  X_API_BASE_URL: z.string().url().default("https://api.x.com/2"),
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
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
  // App base URL for links
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  // Background worker config
  WORKER_URL: z.string().url().optional(),
  WORKER_TOKEN: z.string().optional(),
  ALLOW_IN_PROCESS_WORKER: z.coerce.boolean().optional(),
  // Video polling config
  VIDEO_RENDER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .default(5_000),
  VIDEO_RENDER_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(2_160),
  // OpenRouter fallback config
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  // Video generation provider
  VIDEO_INFERENCE_PROVIDER: z
    .enum([
      "google_veo",
      "xai",
      "elizaos",
      "openmontage",
      "openai",
      "replicate",
      "huggingface",
      "fal",
      "ollama",
      "others",
    ])
    .default("xai"),
  VIDEO_INFERENCE_MODEL: z.string().min(1).optional(),
  VIDEO_INFERENCE_API_KEY: z.string().min(1).optional(),
  // Fal AI provider
  FAL_API_KEY: z.string().min(1).optional(),
  FAL_VIDEO_API_KEY: z.string().min(1).optional(),
  FAL_BASE_URL: z.string().url().default("https://fal.run"),
  // Hugging Face video
  HUGGINGFACE_VIDEO_BASE_URL: z
    .string()
    .url()
    .default("https://router.huggingface.co/hf-inference/models"),
  OPENROUTER_APP_NAME: z.string().default("HYPERCINEMA"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  VIDEO_API_BASE_URL: z.string().url().optional(),
  VIDEO_RESOLUTION: z.enum(["480p", "720p", "1080p"]).default("720p"),
  // MoltBook AI social network
  MOLTBOOK_API_BASE_URL: z.string().url().optional(),
  MOLTBOOK_AGENT_API_KEY: z.string().optional(),
  MOLTBOOK_AGENT_HANDLE: z.string().default("mythxmythx"),
  MOLTBOOK_AGENT_DISPLAY_NAME: z.string().default("MythX"),
  MOLTBOOK_AGENT_BIO: z
    .string()
    .default(
      "MythX creates AI autobiographical videos from X profiles and posts them to MoltBook.",
    ),
  MOLTBOOK_SYNC_BATCH_LIMIT: z.coerce.number().int().positive().default(12),
  MOLTBOOK_VERIFICATION_SOLVER: z.enum(["manual", "auto"]).default("manual"),
  // Analytics engine mode
  ANALYTICS_ENGINE_MODE: z
    .enum(["v2_fallback_legacy", "v2", "legacy"])
    .default("v2_fallback_legacy"),
  // Cockpit admin panel auth
  COCKPIT_USERNAME: z.string().default("soboltoshi"),
  COCKPIT_PASSWORD: z.string().default("Kamina6%"),
  // MythX AI agent platform
  MYTHX_API_KEY: z.string().min(1).optional(),
  MYTHX_BASE_URL: z.string().url().default("https://cloud.milady.ai"),
  // Poly MCP system tools
  POLY_MCP_URL: z.string().url().default("http://localhost:8000/mcp"),
  POLY_MCP_TRANSPORT: z.enum(["stdio", "http"]).default("http"),
  POLY_MCP_API_KEY: z.string().optional(),
  POLY_MCP_TIMEOUT: z.string().default("30000"),
  POLY_MCP_RETRY: z.string().optional(),
  POLY_MCP_MAX_RETRIES: z.string().default("3"),
  // Dexter MCP Solana DeFi tools
  DEXTER_MCP_URL: z.string().url().default("https://mcp.dexter.cash/mcp"),
  DEXTER_MCP_TOKEN: z.string().optional(),
  DEXTER_MCP_TOOLSETS: z
    .string()
    .default(
      "solana,x402,markets,pumpstream,onchain,wallet,general,hyperliquid,stream",
    ),
  DEXTER_MCP_TIMEOUT: z.string().default("30000"),
  DEXTER_MCP_RETRY: z.string().optional(),
  DEXTER_MCP_MAX_RETRIES: z.string().default("3"),
  // Job processing stale threshold
  JOB_PROCESSING_STALE_MS: z.coerce.number().int().min(30_000).default(300_000),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse({
    ...process.env,
    TEXT_INFERENCE_PROVIDER: trimEnvValue(process.env.TEXT_INFERENCE_PROVIDER),
    TEXT_INFERENCE_MODEL: trimOptionalEnvValue(
      process.env.TEXT_INFERENCE_MODEL,
    ),
    TEXT_INFERENCE_BASE_URL: trimOptionalEnvValue(
      process.env.TEXT_INFERENCE_BASE_URL,
    ),
    TEXT_INFERENCE_API_KEY: trimOptionalEnvValue(
      process.env.TEXT_INFERENCE_API_KEY,
    ),
    XAI_API_KEY: trimOptionalEnvValue(process.env.XAI_API_KEY),
    XAI_TEXT_API_KEY: trimOptionalEnvValue(process.env.XAI_TEXT_API_KEY),
    XAI_VIDEO_API_KEY: trimOptionalEnvValue(process.env.XAI_VIDEO_API_KEY),
    XAI_BASE_URL: trimEnvValue(process.env.XAI_BASE_URL),
    XAI_TEXT_BASE_URL: trimOptionalEnvValue(process.env.XAI_TEXT_BASE_URL),
    XAI_VIDEO_BASE_URL: trimOptionalEnvValue(process.env.XAI_VIDEO_BASE_URL),
    XAI_TEXT_MODEL: trimOptionalEnvValue(process.env.XAI_TEXT_MODEL),
    XAI_VIDEO_MODEL: trimOptionalEnvValue(process.env.XAI_VIDEO_MODEL),
    ELIZAOS_API_KEY: trimOptionalEnvValue(process.env.ELIZAOS_API_KEY),
    ELIZAOS_BASE_URL: trimEnvValue(process.env.ELIZAOS_BASE_URL),
    ELIZAOS_VIDEO_MODEL: trimOptionalEnvValue(process.env.ELIZAOS_VIDEO_MODEL),
    VIDEO_RESOLUTION: trimEnvValue(process.env.VIDEO_RESOLUTION),
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
    TELEGRAM_BOT_TOKEN: trimOptionalEnvValue(process.env.TELEGRAM_BOT_TOKEN),
    OPENAI_BASE_URL: trimEnvValue(process.env.OPENAI_BASE_URL),
    ANTHROPIC_BASE_URL: trimEnvValue(process.env.ANTHROPIC_BASE_URL),
    REPLICATE_BASE_URL: trimEnvValue(process.env.REPLICATE_BASE_URL),
    HUGGINGFACE_TEXT_BASE_URL: trimEnvValue(
      process.env.HUGGINGFACE_TEXT_BASE_URL,
    ),
    HUGGINGFACE_VIDEO_BASE_URL: trimEnvValue(
      process.env.HUGGINGFACE_VIDEO_BASE_URL,
    ),
    FAL_API_KEY: trimOptionalEnvValue(process.env.FAL_API_KEY),
    FAL_VIDEO_API_KEY: trimOptionalEnvValue(process.env.FAL_VIDEO_API_KEY),
    FAL_BASE_URL: trimEnvValue(process.env.FAL_BASE_URL),
    OLLAMA_BASE_URL: trimEnvValue(process.env.OLLAMA_BASE_URL),
    COCKPIT_USERNAME: trimOptionalEnvValue(process.env.COCKPIT_USERNAME),
    COCKPIT_PASSWORD: trimOptionalEnvValue(process.env.COCKPIT_PASSWORD),
    VIDEO_INFERENCE_PROVIDER: trimEnvValue(
      process.env.VIDEO_INFERENCE_PROVIDER,
    ),
    VIDEO_INFERENCE_MODEL: trimOptionalEnvValue(
      process.env.VIDEO_INFERENCE_MODEL,
    ),
    ALLOW_IN_PROCESS_WORKER:
      process.env.ALLOW_IN_PROCESS_WORKER ??
      (process.env.NODE_ENV === "production" ? "false" : "true"),
    VIDEO_ENGINE: trimOptionalEnvValue(process.env.VIDEO_ENGINE),
    VIDEO_VEO_MODEL: trimOptionalEnvValue(process.env.VIDEO_VEO_MODEL),
    HELIUS_API_KEY: trimOptionalEnvValue(process.env.HELIUS_API_KEY),
    MYTHX_API_KEY: trimOptionalEnvValue(process.env.MYTHX_API_KEY),
    MYTHX_BASE_URL: trimEnvValue(process.env.MYTHX_BASE_URL),
    POLY_MCP_URL: trimEnvValue(process.env.POLY_MCP_URL),
    POLY_MCP_TRANSPORT: trimEnvValue(process.env.POLY_MCP_TRANSPORT),
    POLY_MCP_API_KEY: trimOptionalEnvValue(process.env.POLY_MCP_API_KEY),
    POLY_MCP_TIMEOUT: trimEnvValue(process.env.POLY_MCP_TIMEOUT),
    POLY_MCP_RETRY: trimOptionalEnvValue(process.env.POLY_MCP_RETRY),
    POLY_MCP_MAX_RETRIES: trimEnvValue(process.env.POLY_MCP_MAX_RETRIES),
    DEXTER_MCP_URL: trimEnvValue(process.env.DEXTER_MCP_URL),
    DEXTER_MCP_TOKEN: trimOptionalEnvValue(process.env.DEXTER_MCP_TOKEN),
    DEXTER_MCP_TOOLSETS: trimEnvValue(process.env.DEXTER_MCP_TOOLSETS),
    DEXTER_MCP_TIMEOUT: trimEnvValue(process.env.DEXTER_MCP_TIMEOUT),
    DEXTER_MCP_RETRY: trimOptionalEnvValue(process.env.DEXTER_MCP_RETRY),
    DEXTER_MCP_MAX_RETRIES: trimEnvValue(process.env.DEXTER_MCP_MAX_RETRIES),
    MOLTBOOK_API_BASE_URL: trimOptionalEnvValue(
      process.env.MOLTBOOK_API_BASE_URL,
    ),
    MOLTBOOK_AGENT_API_KEY: trimOptionalEnvValue(
      process.env.MOLTBOOK_AGENT_API_KEY,
    ),
    MOLTBOOK_AGENT_HANDLE:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_HANDLE) ?? "mythxmythx",
    MOLTBOOK_AGENT_DISPLAY_NAME:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_DISPLAY_NAME) ?? "MythX",
    MOLTBOOK_AGENT_BIO:
      trimOptionalEnvValue(process.env.MOLTBOOK_AGENT_BIO) ??
      "MythX creates AI autobiographical videos from X profiles and posts them to MoltBook.",
    MOLTBOOK_VERIFICATION_SOLVER: trimEnvValue(
      process.env.MOLTBOOK_VERIFICATION_SOLVER,
    ),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration: ${missing}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
