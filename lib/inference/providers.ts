export type TextInferenceProviderId =
  | "openrouter"
  | "openai"
  | "claude"
  | "replicate"
  | "huggingface"
  | "ollama"
  | "others";

export type VideoInferenceProviderId =
  | "google_veo"
  | "openai"
  | "replicate"
  | "huggingface"
  | "ollama"
  | "others";

export interface ProviderOption<TProvider extends string = string> {
  id: TProvider;
  label: string;
  description: string;
  implemented: boolean;
  defaultModel?: string;
  envHint?: string;
}

export const TEXT_INFERENCE_PROVIDER_OPTIONS: ProviderOption<TextInferenceProviderId>[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Multi-model routing with a single OpenRouter key.",
    implemented: true,
    defaultModel: "openai/gpt-4o-mini",
    envHint: "OPENROUTER_API_KEY",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Direct OpenAI requests for text-only inference.",
    implemented: true,
    defaultModel: "gpt-4.1-mini",
    envHint: "OPENAI_API_KEY",
  },
  {
    id: "claude",
    label: "Claude",
    description: "Anthropic text models for structured writing.",
    implemented: true,
    defaultModel: "claude-3-5-sonnet-latest",
    envHint: "ANTHROPIC_API_KEY",
  },
  {
    id: "replicate",
    label: "Replicate",
    description: "Bring-your-own model runner for text generation.",
    implemented: false,
    envHint: "REPLICATE_API_TOKEN",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    description: "Hosted inference or local endpoint forwarding.",
    implemented: true,
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    envHint: "HUGGINGFACE_API_TOKEN",
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local models on your own machine or LAN.",
    implemented: true,
    defaultModel: "llama3.1",
    envHint: "OLLAMA_BASE_URL",
  },
  {
    id: "others",
    label: "Others",
    description: "Any OpenAI-compatible or custom text API.",
    implemented: true,
    envHint: "TEXT_INFERENCE_BASE_URL",
  },
];

export const VIDEO_INFERENCE_PROVIDER_OPTIONS: ProviderOption<VideoInferenceProviderId>[] = [
  {
    id: "google_veo",
    label: "Google Veo",
    description: "The current built-in cinematic video renderer.",
    implemented: true,
    defaultModel: "veo-3.1-fast-generate-001",
    envHint: "VIDEO_API_BASE_URL",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Reserved for OpenAI-native video workflows or custom backends.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
  },
  {
    id: "replicate",
    label: "Replicate",
    description: "Bring-your-own video model endpoint.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    description: "Hosted or local video inference endpoint.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local video runtime placeholder for self-hosted setups.",
    implemented: false,
    envHint: "VIDEO_API_BASE_URL",
  },
  {
    id: "others",
    label: "Others",
    description: "Any custom video inference service you want to wire up.",
    implemented: true,
    envHint: "VIDEO_API_BASE_URL",
  },
];

export function isTextInferenceProvider(value: string): value is TextInferenceProviderId {
  return TEXT_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}

export function isVideoInferenceProvider(value: string): value is VideoInferenceProviderId {
  return VIDEO_INFERENCE_PROVIDER_OPTIONS.some((option) => option.id === value);
}

