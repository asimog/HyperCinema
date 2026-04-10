// Inference provider IDs — xAI primary, OpenRouter fallback
export type TextInferenceProviderId = "xai" | "openrouter";
export type VideoInferenceProviderId = "xai";

export function isTextInferenceProvider(
  id: string,
): id is TextInferenceProviderId {
  return id === "xai" || id === "openrouter";
}

export function isVideoInferenceProvider(
  id: string,
): id is VideoInferenceProviderId {
  return id === "xai";
}
