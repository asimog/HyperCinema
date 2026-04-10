// Provider config — reads xAI creds from env only, no external DB
import { getVideoServiceEnv } from "./env";

// Config shape for a video provider
export interface VideoProviderRuntimeConfig {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

// Returns xAI config from environment variables
export function getVideoProviderConfig(): VideoProviderRuntimeConfig {
  const env = getVideoServiceEnv();
  return {
    apiKey: env.XAI_API_KEY ?? null,
    baseUrl: env.XAI_BASE_URL,
    model: env.XAI_VIDEO_MODEL,
  };
}
