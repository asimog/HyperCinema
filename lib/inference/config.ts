import { getDb } from "@/lib/firebase/admin";
import { getEnv } from "@/lib/env";
import {
  isTextInferenceProvider,
  isVideoInferenceProvider,
  type TextInferenceProviderId,
  type VideoInferenceProviderId,
} from "@/lib/inference/providers";

const CONFIG_DOC_ID = "inference_config";

export interface InferenceRuntimeSelection {
  provider: string;
  model: string | null;
  baseUrl: string | null;
}

export interface InferenceRuntimeConfig {
  text: InferenceRuntimeSelection;
  video: InferenceRuntimeSelection;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface InferenceConfigUpdate {
  text?: Partial<InferenceRuntimeSelection> & { provider?: TextInferenceProviderId };
  video?: Partial<InferenceRuntimeSelection> & { provider?: VideoInferenceProviderId };
  updatedBy?: string | null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function defaultsFromEnv(): InferenceRuntimeConfig {
  const env = getEnv();
  return {
    text: {
      provider: env.TEXT_INFERENCE_PROVIDER,
      model: trimOrNull(env.TEXT_INFERENCE_MODEL) ?? null,
      baseUrl: trimOrNull(env.TEXT_INFERENCE_BASE_URL),
    },
    video: {
      provider: env.VIDEO_INFERENCE_PROVIDER,
      model: trimOrNull(env.VIDEO_INFERENCE_MODEL) ?? trimOrNull(env.VIDEO_VEO_MODEL),
      baseUrl: trimOrNull(env.VIDEO_API_BASE_URL),
    },
    updatedAt: null,
    updatedBy: null,
  };
}

function normalizeSelection(
  selection: Partial<InferenceRuntimeSelection> | undefined,
  fallback: InferenceRuntimeSelection,
): InferenceRuntimeSelection {
  if (!selection) return fallback;

  const provider = typeof selection.provider === "string" && selection.provider.trim().length
    ? selection.provider.trim()
    : fallback.provider;
  const model = trimOrNull(selection.model) ?? fallback.model;
  const baseUrl = trimOrNull(selection.baseUrl) ?? fallback.baseUrl;

  return {
    provider,
    model,
    baseUrl,
  };
}

function normalizeDoc(data: Partial<InferenceRuntimeConfig> | null | undefined): InferenceRuntimeConfig {
  const defaults = defaultsFromEnv();
  return {
    text: normalizeSelection(data?.text, defaults.text),
    video: normalizeSelection(data?.video, defaults.video),
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? null,
  };
}

function inferenceConfigRef() {
  return getDb().collection("_meta").doc(CONFIG_DOC_ID);
}

export async function getInferenceRuntimeConfig(): Promise<InferenceRuntimeConfig> {
  const snap = await inferenceConfigRef().get();
  if (!snap.exists) {
    return defaultsFromEnv();
  }

  return normalizeDoc(snap.data() as Partial<InferenceRuntimeConfig>);
}

export async function updateInferenceRuntimeConfig(
  patch: InferenceConfigUpdate,
): Promise<InferenceRuntimeConfig> {
  const current = await getInferenceRuntimeConfig();
  const next: InferenceRuntimeConfig = {
    text: normalizeSelection(patch.text, current.text),
    video: normalizeSelection(patch.video, current.video),
    updatedAt: new Date().toISOString(),
    updatedBy: patch.updatedBy ?? current.updatedBy ?? null,
  };

  await inferenceConfigRef().set(next, { merge: true });
  return next;
}

export function getInferenceOptionAvailability() {
  const current = defaultsFromEnv();
  return {
    text: current.text.provider,
    video: current.video.provider,
    isTextProviderConfigured(provider: TextInferenceProviderId): boolean {
      return isTextInferenceProvider(provider);
    },
    isVideoProviderConfigured(provider: VideoInferenceProviderId): boolean {
      return isVideoInferenceProvider(provider);
    },
  };
}
