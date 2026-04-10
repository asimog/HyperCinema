// Inference provider IDs — xAI only
export type TextInferenceProviderId = "xai";
export type VideoInferenceProviderId = "xai";

export function isTextInferenceProvider(
  id: string,
): id is TextInferenceProviderId {
  return id === "xai";
}

export function isVideoInferenceProvider(
  id: string,
): id is VideoInferenceProviderId {
  return id === "xai";
}
