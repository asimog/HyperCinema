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
    description: "Direct xAI Responses API for Grok and SuperGrok text inference.",
    implemented: true,
    defaultModel: "grok-4.20-reasoning",
    envHint: "XAI_TEXT_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "openrouter",
    surface: "text",
    label: "OpenRouter",
    description: "Multi-model routing with a single OpenRouter key.",
    implemented: true,
    defaultModel: "openai/gpt-4o-mini",
    envHint: "OPENROUTER_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "openai",
    surface: "text",
    label: "OpenAI",
    description: "Direct OpenAI requests for text-only inference.",
    implemented: true,
    defaultModel: "gpt-4.1-mini",
    envHint: "OPENAI_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "claude",
    surface: "text",
    label: "Claude",
    description: "Anthropic text models for structured writing.",
    implemented: true,
    defaultModel: "claude-3-5-sonnet-latest",
    envHint: "ANTHROPIC_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "replicate",
    surface: "text",
    label: "Replicate",
    description: "Bring-your-own model runner for text generation.",
    implemented: false,
    envHint: "REPLICATE_API_TOKEN",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "huggingface",
    surface: "text",
    label: "Hugging Face",
    description: "Hosted inference or local endpoint forwarding.",
    implemented: true,
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    envHint: "HUGGINGFACE_API_TOKEN",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "fal",
    surface: "text",
    label: "Fal",
    description: "Fal AI hosted inference. Authorization uses 'Key' prefix, not Bearer.",
    implemented: true,
    defaultModel: "fal-ai/wizardlm-2-8x22b",
    envHint: "FAL_API_KEY",
    fields: ["apiKey", "model"],
  },
  {
    id: "ollama",
    surface: "text",
    label: "Ollama",
    description: "Local models on your own machine or LAN.",
    implemented: true,
    defaultModel: "llama3.1",
    envHint: "OLLAMA_BASE_URL",
    fields: ["baseUrl", "model"],
  },
  {
    id: "others",
    surface: "text",
    label: "Others",
    description: "Any OpenAI-compatible or custom text API.",
    implemented: true,
    envHint: "TEXT_INFERENCE_BASE_URL",
    fields: ["apiKey", "baseUrl", "model"],
  },
];

export const VIDEO_INFERENCE_PROVIDER_OPTIONS: ProviderOption<VideoInferenceProviderId>[] = [
  {
    id: "google_veo",
    surface: "video",
    label: "Google Veo",
    description: "The current built-in cinematic video renderer.",
    implemented: true,
    defaultModel: "veo-3.1-fast-generate-001",
    envHint: "VERTEX_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "xai",
    surface: "video",
    label: "xAI Video",
    description: "xAI Grok Imagine Video for text-to-video and image-to-video clips.",
    implemented: true,
    defaultModel: "grok-imagine-video",
    envHint: "XAI_VIDEO_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "elizaos",
    surface: "video",
    label: "ElizaOS",
    description: "ElizaOS video generation through its own provider credentials and endpoint.",
    implemented: true,
    defaultModel: "default",
    envHint: "ELIZAOS_API_KEY",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "openmontage",
    surface: "video",
    label: "OpenMontage",
    description:
      "Compose rendered clips through OpenMontage Remotion timelines for stronger editorial control.",
    implemented: true,
    defaultModel: "CinematicRenderer",
    envHint: "OPENMONTAGE_COMPOSITION_ID",
    fields: ["model"],
  },
  {
    id: "openai",
    surface: "video",
    label: "OpenAI",
    description: "Reserved for OpenAI-native video workflows or custom backends.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "replicate",
    surface: "video",
    label: "Replicate",
    description: "Bring-your-own video model endpoint via Replicate.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "huggingface",
    surface: "video",
    label: "Hugging Face",
    description: "Hugging Face Inference API for video generation models. Uses Bearer auth.",
    implemented: true,
    defaultModel: "stabilityai/stable-video-diffusion-img2vid-xt",
    envHint: "HUGGINGFACE_API_TOKEN",
    fields: ["apiKey", "baseUrl", "model"],
  },
  {
    id: "fal",
    surface: "video",
    label: "Fal Video",
    description: "Fal AI text-to-video models. Auth: 'Key' prefix. Polls queue.fal.run for status.",
    implemented: true,
    defaultModel: "fal-ai/wan-pro",
    envHint: "FAL_VIDEO_API_KEY",
    fields: ["apiKey", "model"],
  },
  {
    id: "ollama",
    surface: "video",
    label: "Ollama",
    description: "Local video runtime placeholder for self-hosted setups.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
    fields: ["baseUrl", "model"],
  },
  {
    id: "others",
    surface: "video",
    label: "Others",
    description: "Any custom video inference service you want to wire up.",
    implemented: true,
    envHint: "VIDEO_API_BASE_URL",
    fields: ["apiKey", "baseUrl", "model"],
  },
];

export function isTextInferenceProvider(value: string): value is TextInferenceProviderId {
  return TEXT_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}

export function isVideoInferenceProvider(value: string): value is VideoInferenceProviderId {
  return VIDEO_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}
