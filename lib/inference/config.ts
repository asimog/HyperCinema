// Inference runtime config — xAI primary, OpenRouter fallback
import { getEnv } from "@/lib/env";

export interface ProviderRuntimeSelection {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export function getTextProviderConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.XAI_TEXT_API_KEY ?? env.XAI_API_KEY ?? null,
    baseUrl: env.XAI_BASE_URL,
    model: env.XAI_TEXT_MODEL ?? "grok-3",
  };
}

export function getVideoProviderConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY ?? null,
    baseUrl: env.XAI_BASE_URL,
    model: env.XAI_VIDEO_MODEL ?? "grok-imagine-video",
  };
}
