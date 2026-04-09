import { z } from "zod";

function trimEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

const serviceEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8090),
  VIDEO_API_KEY: z.string().min(1),
  VIDEO_SERVICE_BASE_URL: z.string().url().optional(),
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_VIDEO_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_VIDEO_BASE_URL: z.string().url().optional(),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),
  ELIZAOS_API_KEY: z.string().min(1).optional(),
  ELIZAOS_BASE_URL: z.string().url().default("https://api.elizacloud.ai"),
  ELIZAOS_VIDEO_MODEL: z.string().min(1).default("default"),
  VERTEX_PROJECT_ID: z.string().min(1),
  VERTEX_API_KEY: z.string().min(1).optional(),
  VERTEX_LOCATION: z.string().min(1).default("us-central1"),
  VERTEX_VEO_MODEL: z
    .literal("veo-3.1-fast-generate-001")
    .default("veo-3.1-fast-generate-001"),
  VEO_OUTPUT_RESOLUTION: z.enum(["720p", "1080p"]).default("1080p"),
  VEO_MAX_CLIP_SECONDS: z.coerce.number().int().min(2).max(30).default(8),
  VERTEX_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  VERTEX_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(180),
  RENDER_RECOVERY_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .default(30_000),
  RENDER_STALE_MS: z.coerce.number().int().min(60_000).default(5 * 60_000),
  RENDER_RECOVERY_BATCH_LIMIT: z.coerce.number().int().positive().default(20),
  FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  MYTHX_API_KEY: z.string().min(1).optional(),
  MYTHX_BASE_URL: z.string().url().default("https://cloud.milady.ai"),
  MYTHX_VIDEO_MODEL: z.string().min(1).default("default"),
  // Fal AI video provider
  FAL_API_KEY: z.string().min(1).optional(),
  FAL_VIDEO_API_KEY: z.string().min(1).optional(),
  // Hugging Face video provider
  HUGGINGFACE_API_TOKEN: z.string().min(1).optional(),
  // Generic REST video provider (others)
  VIDEO_INFERENCE_API_KEY: z.string().min(1).optional(),
  OPENMONTAGE_REPO_DIR: z.string().min(1).default("/tmp/openmontage"),
  OPENMONTAGE_GIT_URL: z
    .string()
    .url()
    .default("https://github.com/calesthio/OpenMontage.git"),
  OPENMONTAGE_RUN_COMMAND: z.string().optional(),
  OPENMONTAGE_OUTPUT_ROOT: z.string().min(1).default("/tmp/openmontage-renders"),
  OPENMONTAGE_COMPOSITION_ID: z.string().min(1).default("CinematicRenderer"),
  OPENMONTAGE_NODE_BIN: z.string().min(1).default("npx"),
  OPENMONTAGE_FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
  OPENMONTAGE_VIDEO_WORKER_PROVIDER: z
    .enum(["google_veo", "xai", "elizaos", "mythx"])
    .default("google_veo"),
  OPENMONTAGE_VIDEO_WORKER_MODEL: z.string().optional(),
  OPENMONTAGE_RENDER_TIMEOUT_MS: z.coerce.number().int().min(30_000).default(900_000),
});

export type VideoServiceEnv = z.infer<typeof serviceEnvSchema>;

let cachedEnv: VideoServiceEnv | null = null;

export function getVideoServiceEnv(): VideoServiceEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serviceEnvSchema.safeParse({
    ...process.env,
    XAI_VIDEO_API_KEY: trimEnvValue(process.env.XAI_VIDEO_API_KEY),
    VERTEX_VEO_MODEL: trimEnvValue(process.env.VERTEX_VEO_MODEL),
    XAI_VIDEO_BASE_URL: trimEnvValue(process.env.XAI_VIDEO_BASE_URL),
    VEO_OUTPUT_RESOLUTION: trimEnvValue(process.env.VEO_OUTPUT_RESOLUTION),
    ELIZAOS_API_KEY: trimEnvValue(process.env.ELIZAOS_API_KEY),
    ELIZAOS_BASE_URL: trimEnvValue(process.env.ELIZAOS_BASE_URL),
    ELIZAOS_VIDEO_MODEL: trimEnvValue(process.env.ELIZAOS_VIDEO_MODEL),
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    MYTHX_API_KEY: trimEnvValue(process.env.MYTHX_API_KEY),
    MYTHX_BASE_URL: trimEnvValue(process.env.MYTHX_BASE_URL),
    FAL_API_KEY: trimEnvValue(process.env.FAL_API_KEY),
    FAL_VIDEO_API_KEY: trimEnvValue(process.env.FAL_VIDEO_API_KEY),
    HUGGINGFACE_API_TOKEN: trimEnvValue(process.env.HUGGINGFACE_API_TOKEN),
    VIDEO_INFERENCE_API_KEY: trimEnvValue(process.env.VIDEO_INFERENCE_API_KEY),
    OPENMONTAGE_REPO_DIR: trimEnvValue(process.env.OPENMONTAGE_REPO_DIR),
    OPENMONTAGE_GIT_URL: trimEnvValue(process.env.OPENMONTAGE_GIT_URL),
    OPENMONTAGE_RUN_COMMAND: trimEnvValue(process.env.OPENMONTAGE_RUN_COMMAND),
    OPENMONTAGE_OUTPUT_ROOT: trimEnvValue(process.env.OPENMONTAGE_OUTPUT_ROOT),
    OPENMONTAGE_COMPOSITION_ID: trimEnvValue(process.env.OPENMONTAGE_COMPOSITION_ID),
    OPENMONTAGE_NODE_BIN: trimEnvValue(process.env.OPENMONTAGE_NODE_BIN),
    OPENMONTAGE_FFMPEG_PATH: trimEnvValue(process.env.OPENMONTAGE_FFMPEG_PATH),
    OPENMONTAGE_VIDEO_WORKER_PROVIDER: trimEnvValue(process.env.OPENMONTAGE_VIDEO_WORKER_PROVIDER),
    OPENMONTAGE_VIDEO_WORKER_MODEL: trimEnvValue(process.env.OPENMONTAGE_VIDEO_WORKER_MODEL),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid video-service environment configuration: ${missing}`);
  }

  cachedEnv = {
    ...parsed.data,
    FIREBASE_STORAGE_BUCKET:
      parsed.data.FIREBASE_STORAGE_BUCKET ?? `${parsed.data.FIREBASE_PROJECT_ID}.appspot.com`,
  };

  return cachedEnv;
}
