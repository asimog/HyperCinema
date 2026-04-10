export type TextInferenceProviderId =
  | "xai"
  | "openrouter"
  | "openai"
  | "claude"
  | "replicate"
  | "huggingface"
  | "fal"
  | "ollama"
  | "others";

export type VideoInferenceProviderId =
  | "google_veo"
  | "xai"
  | "elizaos"
  | "openmontage"
  | "openai"
  | "replicate"
  | "huggingface"
  | "fal"
  | "ollama"
  | "others";

// The 3 canonical providers exposed in the UI.
// Internal dispatch code still supports all provider IDs above.
export const CANONICAL_TEXT_PROVIDERS = ["xai", "openrouter", "huggingface"] as const;
export const CANONICAL_VIDEO_PROVIDERS = ["xai", "huggingface"] as const;

export type InferenceProviderFieldId = "apiKey" | "baseUrl" | "model";
export type InferenceSurface = "text" | "video";

export interface ProviderOption<TProvider extends string = string> {
  id: TProvider;
  surface: InferenceSurface;
  label: string;
  description: string;
  implemented: boolean;
  defaultModel?: string;
  envHint?: string;
  fields: InferenceProviderFieldId[];
}

export interface ProviderFieldOption {
  id: InferenceProviderFieldId;
  label: string;
  type: "text" | "url" | "password";
  placeholder: string;
  helper: string;
}

export const PROVIDER_FIELD_OPTIONS: Record<InferenceProviderFieldId, ProviderFieldOption> = {
  apiKey: {
    id: "apiKey",
    label: "API key",
    type: "password",
    placeholder: "Paste the provider key",
    helper: "Stored server-side and only used for the selected provider.",
  },
  baseUrl: {
    id: "baseUrl",
    label: "Base URL",
    type: "url",
    placeholder: "https://api.example.com/v1",
    helper: "Used only by this provider entry.",
  },
  model: {
    id: "model",
    label: "Model",
    type: "text",
    placeholder: "Model identifier",
    helper: "Saved per provider so switching surfaces does not overwrite other models.",
  },
};

export const TEXT_INFERENCE_PROVIDER_OPTIONS: ProviderOption<TextInferenceProviderId>[] = [
  {
    id: "xai",
    surface: "text",
    label: "xAI",
    description: "Grok text inference via xAI Responses API. Primary provider.",
    implemented: true,
    defaultModel: "grok-3",
    envHint: "XAI_TEXT_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "openrouter",
    surface: "text",
    label: "OpenRouter",
    description: "Multi-model routing with a single OpenRouter key. Alternate inference.",
    implemented: true,
    defaultModel: "openai/gpt-4o-mini",
    envHint: "OPENROUTER_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "huggingface",
    surface: "text",
    label: "Hugging Face",
    description: "Hugging Face Inference API for open-source text models. Alternate inference.",
    implemented: true,
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    envHint: "HUGGINGFACE_API_TOKEN",
    fields: ["apiKey", "baseUrl", "model"],
  },
];

export const VIDEO_INFERENCE_PROVIDER_OPTIONS: ProviderOption<VideoInferenceProviderId>[] = [
  {
    id: "xai",
    surface: "video",
    label: "xAI Video",
    description: "xAI Grok Imagine Video for text-to-video clips. Primary video provider.",
    implemented: true,
    defaultModel: "grok-imagine-video",
    envHint: "XAI_VIDEO_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "huggingface",
    surface: "video",
    label: "Hugging Face",
    description: "Hugging Face Inference API for open-source video generation models. Alternate.",
    implemented: true,
    defaultModel: "stabilityai/stable-video-diffusion-img2vid-xt",
    envHint: "HUGGINGFACE_API_TOKEN",
    fields: ["apiKey", "baseUrl", "model"],
  },
];

export function isTextInferenceProvider(value: string): value is TextInferenceProviderId {
  return TEXT_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}

export function isVideoInferenceProvider(value: string): value is VideoInferenceProviderId {
  return VIDEO_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}
