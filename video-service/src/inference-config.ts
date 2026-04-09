import { getVideoServiceDb } from "./firebase";
import { getVideoServiceEnv } from "./env";

const CONFIG_COLLECTION = "_meta";
const CONFIG_DOC_ID = "inference_config";

export type VideoProviderConfigId =
  | "google_veo"
  | "xai"
  | "elizaos"
  | "openmontage"
  | "mythx"
  | "fal"
  | "huggingface"
  | "others";

export interface VideoProviderRuntimeConfig {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

interface LegacyRuntimeSelection {
  provider?: string | null;
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
}

interface InferenceConfigDoc {
  video?: LegacyRuntimeSelection | null;
  providers?: {
    video?: Record<string, Partial<VideoProviderRuntimeConfig> | undefined> | null;
  } | null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeProviderConfig(
  value: Partial<VideoProviderRuntimeConfig> | LegacyRuntimeSelection | null | undefined,
): VideoProviderRuntimeConfig {
  return {
    apiKey: trimOrNull(value?.apiKey),
    baseUrl: trimOrNull(value?.baseUrl),
    model: trimOrNull(value?.model),
  };
}

function mergeProviderConfig(
  fallback: VideoProviderRuntimeConfig,
  override?: VideoProviderRuntimeConfig | null,
): VideoProviderRuntimeConfig {
  if (!override) {
    return fallback;
  }

  return {
    apiKey: override.apiKey ?? fallback.apiKey,
    baseUrl: override.baseUrl ?? fallback.baseUrl,
    model: override.model ?? fallback.model,
  };
}

function defaultsForProvider(provider: VideoProviderConfigId): VideoProviderRuntimeConfig {
  const env = getVideoServiceEnv();

  switch (provider) {
    case "google_veo":
      return {
        apiKey: trimOrNull(env.VERTEX_API_KEY),
        baseUrl: null,
        model: trimOrNull(env.VERTEX_VEO_MODEL),
      };
    case "xai":
      return {
        apiKey: trimOrNull(env.XAI_API_KEY),
        baseUrl: trimOrNull(env.XAI_BASE_URL),
        model: trimOrNull(env.XAI_VIDEO_MODEL),
      };
    case "elizaos":
      return {
        apiKey: trimOrNull(env.ELIZAOS_API_KEY),
        baseUrl: trimOrNull(env.ELIZAOS_BASE_URL),
        model: trimOrNull(env.ELIZAOS_VIDEO_MODEL),
      };
    case "openmontage":
      return {
        apiKey: null,
        baseUrl: null,
        model: trimOrNull(env.OPENMONTAGE_COMPOSITION_ID),
      };
    case "mythx":
      return {
        apiKey: trimOrNull(env.MYTHX_API_KEY),
        baseUrl: trimOrNull(env.MYTHX_BASE_URL),
        model: trimOrNull(env.MYTHX_VIDEO_MODEL),
      };
    case "fal":
      return {
        apiKey: trimOrNull(env.FAL_VIDEO_API_KEY ?? env.FAL_API_KEY),
        baseUrl: "https://fal.run",
        model: null,
      };
    case "huggingface":
      return {
        apiKey: trimOrNull(env.HUGGINGFACE_API_TOKEN),
        baseUrl: "https://router.huggingface.co/hf-inference/models",
        model: null,
      };
    case "others":
      return {
        apiKey: trimOrNull(env.VIDEO_INFERENCE_API_KEY),
        baseUrl: null,
        model: null,
      };
  }
}

function configRef() {
  return getVideoServiceDb().collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
}

export async function getVideoProviderRuntimeConfig(
  provider: VideoProviderConfigId,
): Promise<VideoProviderRuntimeConfig> {
  const fallback = defaultsForProvider(provider);
  const snap = await configRef().get();

  if (!snap.exists) {
    return fallback;
  }

  const data = snap.data() as InferenceConfigDoc | undefined;
  const registryEntry = normalizeProviderConfig(data?.providers?.video?.[provider]);
  const legacyEntry =
    data?.video?.provider?.trim() === provider ? normalizeProviderConfig(data.video) : null;

  return mergeProviderConfig(
    mergeProviderConfig(fallback, legacyEntry),
    registryEntry,
  );
}
