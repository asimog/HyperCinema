import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  TEXT_INFERENCE_PROVIDER_OPTIONS,
  VIDEO_INFERENCE_PROVIDER_OPTIONS,
  isTextInferenceProvider,
  isVideoInferenceProvider,
  type TextInferenceProviderId,
  type VideoInferenceProviderId,
} from "@/lib/inference/providers";

export interface ProviderRuntimeSelection {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export type InferenceProviderConfig = ProviderRuntimeSelection;

export interface InferenceSurfaceRuntimeConfig<TProvider extends string> {
  provider: TProvider;
  model: string | null;
  /**
   * @deprecated Compatibility fields for older callers. New code should read
   * provider-specific values from `providers`.
   */
  apiKey?: string | null;
  /**
   * @deprecated Compatibility fields for older callers. New code should read
   * provider-specific values from `providers`.
   */
  baseUrl?: string | null;
}

export interface InferenceRuntimeConfig {
  text: InferenceSurfaceRuntimeConfig<TextInferenceProviderId>;
  video: InferenceSurfaceRuntimeConfig<VideoInferenceProviderId>;
  providers: {
    text: Record<TextInferenceProviderId, ProviderRuntimeSelection>;
    video: Record<VideoInferenceProviderId, ProviderRuntimeSelection>;
  };
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface InferenceConfigUpdate {
  text?: Partial<InferenceSurfaceRuntimeConfig<TextInferenceProviderId>>;
  video?: Partial<InferenceSurfaceRuntimeConfig<VideoInferenceProviderId>>;
  providers?: {
    text?: Partial<
      Record<TextInferenceProviderId, Partial<ProviderRuntimeSelection>>
    >;
    video?: Partial<
      Record<VideoInferenceProviderId, Partial<ProviderRuntimeSelection>>
    >;
  };
  updatedBy?: string | null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function readEnv(name: string): string | null {
  return trimOrNull(process.env[name]);
}

function providerSelection(
  provider: string,
  surface: "text" | "video",
): ProviderRuntimeSelection {
  const env = getEnv();

  if (surface === "text") {
    switch (provider as TextInferenceProviderId) {
      case "xai":
        return {
          apiKey: readEnv("XAI_TEXT_API_KEY") ?? readEnv("XAI_API_KEY"),
          baseUrl: readEnv("XAI_TEXT_BASE_URL") ?? env.XAI_BASE_URL,
          model: readEnv("XAI_TEXT_MODEL"),
        };
      case "openrouter":
        return {
          apiKey: env.OPENROUTER_API_KEY ?? null,
          baseUrl: env.OPENROUTER_BASE_URL,
          model: env.OPENROUTER_MODEL ?? null,
        };
      case "openai":
        return {
          apiKey: env.OPENAI_API_KEY ?? null,
          baseUrl: env.OPENAI_BASE_URL,
          model: null,
        };
      case "claude":
        return {
          apiKey: env.ANTHROPIC_API_KEY ?? null,
          baseUrl: env.ANTHROPIC_BASE_URL,
          model: null,
        };
      case "replicate":
        return {
          apiKey: env.REPLICATE_API_TOKEN ?? null,
          baseUrl: env.REPLICATE_BASE_URL,
          model: null,
        };
      case "huggingface":
        return {
          apiKey: env.HUGGINGFACE_API_TOKEN ?? null,
          baseUrl: env.HUGGINGFACE_TEXT_BASE_URL,
          model: null,
        };
      case "fal":
        return {
          apiKey: env.FAL_API_KEY ?? null,
          baseUrl: env.FAL_BASE_URL,
          model: null,
        };
      case "ollama":
        return {
          apiKey: null,
          baseUrl: env.OLLAMA_BASE_URL,
          model: null,
        };
      case "others":
        return {
          apiKey: env.TEXT_INFERENCE_API_KEY ?? null,
          baseUrl: env.TEXT_INFERENCE_BASE_URL ?? null,
          model: env.TEXT_INFERENCE_MODEL ?? null,
        };
      default:
        return {
          apiKey: null,
          baseUrl: null,
          model: null,
        };
    }
  }

  switch (provider as VideoInferenceProviderId) {
    case "google_veo":
      return {
        apiKey: env.VIDEO_API_KEY ?? null,
        baseUrl: env.VIDEO_API_BASE_URL ?? null,
        model: env.VIDEO_VEO_MODEL ?? null,
      };
    case "xai":
      return {
        apiKey: readEnv("XAI_VIDEO_API_KEY") ?? readEnv("XAI_API_KEY"),
        baseUrl: readEnv("XAI_VIDEO_BASE_URL") ?? env.XAI_BASE_URL,
        model: env.XAI_VIDEO_MODEL ?? null,
      };
    case "elizaos":
      return {
        apiKey: readEnv("ELIZAOS_API_KEY"),
        baseUrl: readEnv("ELIZAOS_BASE_URL"),
        model: readEnv("ELIZAOS_VIDEO_MODEL"),
      };
    case "openmontage":
      return {
        apiKey: null,
        baseUrl: null,
        model: null,
      };
    case "openai":
      return {
        apiKey: env.OPENAI_API_KEY ?? null,
        baseUrl: env.OPENAI_BASE_URL,
        model: null,
      };
    case "replicate":
      return {
        apiKey: env.REPLICATE_API_TOKEN ?? null,
        baseUrl: env.REPLICATE_BASE_URL,
        model: null,
      };
    case "huggingface":
      return {
        apiKey: env.HUGGINGFACE_API_TOKEN ?? null,
        baseUrl: env.HUGGINGFACE_VIDEO_BASE_URL,
        model: null,
      };
    case "fal":
      return {
        apiKey: env.FAL_VIDEO_API_KEY ?? env.FAL_API_KEY ?? null,
        baseUrl: env.FAL_BASE_URL,
        model: null,
      };
    case "ollama":
      return {
        apiKey: null,
        baseUrl: env.OLLAMA_BASE_URL,
        model: null,
      };
    case "others":
      return {
        apiKey: env.VIDEO_INFERENCE_API_KEY ?? null,
        baseUrl: env.VIDEO_API_BASE_URL ?? null,
        model: env.VIDEO_INFERENCE_MODEL ?? null,
      };
    default:
      return {
        apiKey: null,
        baseUrl: null,
        model: null,
      };
  }
}

function buildDefaultRegistry<TProvider extends string>(input: {
  options: readonly { id: TProvider }[];
  surface: "text" | "video";
}): Record<TProvider, ProviderRuntimeSelection> {
  return input.options.reduce(
    (acc, option) => {
      acc[option.id] = providerSelection(option.id, input.surface);
      return acc;
    },
    {} as Record<TProvider, ProviderRuntimeSelection>,
  );
}

function surfaceConfigFromSelection<TProvider extends string>(
  provider: TProvider,
  selection: ProviderRuntimeSelection,
): InferenceSurfaceRuntimeConfig<TProvider> {
  return {
    provider,
    model: selection.model ?? null,
    apiKey: selection.apiKey ?? null,
    baseUrl: selection.baseUrl ?? null,
  };
}

function mergeProviderSelection(
  current: ProviderRuntimeSelection,
  patch: Partial<ProviderRuntimeSelection> | undefined,
): ProviderRuntimeSelection {
  if (!patch) {
    return current;
  }

  return {
    apiKey:
      patch.apiKey !== undefined ? trimOrNull(patch.apiKey) : current.apiKey,
    baseUrl:
      patch.baseUrl !== undefined ? trimOrNull(patch.baseUrl) : current.baseUrl,
    model: patch.model !== undefined ? trimOrNull(patch.model) : current.model,
  };
}

function normalizeRegistry<TProvider extends string>(input: {
  options: readonly { id: TProvider }[];
  surface: "text" | "video";
  currentProvider: TProvider;
  patch?: Partial<Record<TProvider, Partial<ProviderRuntimeSelection>>>;
}): Record<TProvider, ProviderRuntimeSelection> {
  const defaults = buildDefaultRegistry({
    options: input.options,
    surface: input.surface,
  });

  return input.options.reduce(
    (acc, option) => {
      acc[option.id] = mergeProviderSelection(
        defaults[option.id],
        input.patch?.[option.id],
      );
      return acc;
    },
    {} as Record<TProvider, ProviderRuntimeSelection>,
  );
}

function normalizeDoc(
  data: Partial<InferenceRuntimeConfig> | null | undefined,
): InferenceRuntimeConfig {
  const env = getEnv();
  const defaults = defaultsFromEnv();

  const textProvider = isTextInferenceProvider(
    String(data?.text?.provider ?? ""),
  )
    ? (data?.text?.provider as TextInferenceProviderId)
    : env.TEXT_INFERENCE_PROVIDER;
  const videoProvider = isVideoInferenceProvider(
    String(data?.video?.provider ?? ""),
  )
    ? (data?.video?.provider as VideoInferenceProviderId)
    : env.VIDEO_INFERENCE_PROVIDER;

  const legacyText = data?.text as
    | Partial<ProviderRuntimeSelection>
    | undefined;
  const legacyVideo = data?.video as
    | Partial<ProviderRuntimeSelection>
    | undefined;

  const textProviders = normalizeRegistry({
    options: TEXT_INFERENCE_PROVIDER_OPTIONS,
    surface: "text",
    currentProvider: textProvider,
    patch: data?.providers?.text ?? undefined,
  });
  const videoProviders = normalizeRegistry({
    options: VIDEO_INFERENCE_PROVIDER_OPTIONS,
    surface: "video",
    currentProvider: videoProvider,
    patch: data?.providers?.video ?? undefined,
  });

  if (legacyText) {
    textProviders[textProvider] = mergeProviderSelection(
      textProviders[textProvider],
      legacyText,
    );
  }

  if (legacyVideo) {
    videoProviders[videoProvider] = mergeProviderSelection(
      videoProviders[videoProvider],
      legacyVideo,
    );
  }

  return {
    text: surfaceConfigFromSelection(
      textProvider,
      textProviders[textProvider] ?? defaults.providers.text[textProvider],
    ),
    video: surfaceConfigFromSelection(
      videoProvider,
      videoProviders[videoProvider] ?? defaults.providers.video[videoProvider],
    ),
    providers: {
      text: textProviders,
      video: videoProviders,
    },
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? null,
  };
}

function defaultsFromEnv(): InferenceRuntimeConfig {
  const env = getEnv();
  const textProviders = buildDefaultRegistry({
    options: TEXT_INFERENCE_PROVIDER_OPTIONS,
    surface: "text",
  });
  const videoProviders = buildDefaultRegistry({
    options: VIDEO_INFERENCE_PROVIDER_OPTIONS,
    surface: "video",
  });

  return {
    text: surfaceConfigFromSelection(
      env.TEXT_INFERENCE_PROVIDER,
      textProviders[env.TEXT_INFERENCE_PROVIDER],
    ),
    video: surfaceConfigFromSelection(
      env.VIDEO_INFERENCE_PROVIDER,
      videoProviders[env.VIDEO_INFERENCE_PROVIDER],
    ),
    providers: {
      text: textProviders,
      video: videoProviders,
    },
    updatedAt: null,
    updatedBy: null,
  };
}

function docToConfig(data: {
  textProvider: string | null;
  textModel: string | null;
  textApiKey: string | null;
  textBaseUrl: string | null;
  videoProvider: string | null;
  videoModel: string | null;
  videoApiKey: string | null;
  videoBaseUrl: string | null;
  openrouterApiKey: string | null;
  openrouterModel: string | null;
  openrouterBaseUrl: string | null;
  xaiApiKey: string | null;
  xaiModel: string | null;
  xaiBaseUrl: string | null;
  falApiKey: string | null;
  falBaseUrl: string | null;
  huggingfaceApiKey: string | null;
  huggingfaceBaseUrl: string | null;
  ollamaBaseUrl: string | null;
  updatedAt: Date;
}): Partial<InferenceRuntimeConfig> {
  const textProvider = isTextInferenceProvider(String(data.textProvider ?? ""))
    ? (data.textProvider as TextInferenceProviderId)
    : undefined;
  const videoProvider = isVideoInferenceProvider(
    String(data.videoProvider ?? ""),
  )
    ? (data.videoProvider as VideoInferenceProviderId)
    : undefined;

  const text: Partial<InferenceSurfaceRuntimeConfig<TextInferenceProviderId>> =
    {};
  if (textProvider) {
    text.provider = textProvider;
    text.model = data.textModel;
    text.apiKey = data.textApiKey;
    text.baseUrl = data.textBaseUrl;
  }

  const video: Partial<
    InferenceSurfaceRuntimeConfig<VideoInferenceProviderId>
  > = {};
  if (videoProvider) {
    video.provider = videoProvider;
    video.model = data.videoModel;
    video.apiKey = data.videoApiKey;
    video.baseUrl = data.videoBaseUrl;
  }

  const providers: {
    text?: Partial<
      Record<TextInferenceProviderId, Partial<ProviderRuntimeSelection>>
    >;
    video?: Partial<
      Record<VideoInferenceProviderId, Partial<ProviderRuntimeSelection>>
    >;
  } = {};

  if (data.openrouterApiKey || data.openrouterBaseUrl || data.openrouterModel) {
    providers.text = providers.text ?? {};
    providers.text["openrouter"] = {
      apiKey: data.openrouterApiKey,
      baseUrl: data.openrouterBaseUrl,
      model: data.openrouterModel,
    };
  }

  if (data.xaiApiKey || data.xaiBaseUrl || data.xaiModel) {
    providers.text = providers.text ?? {};
    providers.text["xai"] = {
      apiKey: data.xaiApiKey,
      baseUrl: data.xaiBaseUrl,
      model: data.xaiModel,
    };
  }

  if (data.falApiKey || data.falBaseUrl) {
    providers.text = providers.text ?? {};
    providers.text["fal"] = {
      apiKey: data.falApiKey,
      baseUrl: data.falBaseUrl,
      model: null,
    };
    providers.video = providers.video ?? {};
    providers.video["fal"] = {
      apiKey: data.falApiKey,
      baseUrl: data.falBaseUrl,
      model: null,
    };
  }

  if (data.huggingfaceApiKey || data.huggingfaceBaseUrl) {
    providers.text = providers.text ?? {};
    providers.text["huggingface"] = {
      apiKey: data.huggingfaceApiKey,
      baseUrl: data.huggingfaceBaseUrl,
      model: null,
    };
    providers.video = providers.video ?? {};
    providers.video["huggingface"] = {
      apiKey: data.huggingfaceApiKey,
      baseUrl: data.huggingfaceBaseUrl,
      model: null,
    };
  }

  if (data.ollamaBaseUrl) {
    providers.text = providers.text ?? {};
    providers.text["ollama"] = {
      apiKey: null,
      baseUrl: data.ollamaBaseUrl,
      model: null,
    };
    providers.video = providers.video ?? {};
    providers.video["ollama"] = {
      apiKey: null,
      baseUrl: data.ollamaBaseUrl,
      model: null,
    };
  }

  return {
    ...(Object.keys(text).length > 0
      ? { text: text as InferenceSurfaceRuntimeConfig<TextInferenceProviderId> }
      : {}),
    ...(Object.keys(video).length > 0
      ? {
          video:
            video as InferenceSurfaceRuntimeConfig<VideoInferenceProviderId>,
        }
      : {}),
    ...(Object.keys(providers).length > 0
      ? { providers: providers as InferenceRuntimeConfig["providers"] }
      : {}),
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: null,
  };
}

function configToDoc(config: InferenceRuntimeConfig): {
  textProvider: string | null;
  textModel: string | null;
  textApiKey: string | null;
  textBaseUrl: string | null;
  videoProvider: string | null;
  videoModel: string | null;
  videoApiKey: string | null;
  videoBaseUrl: string | null;
  openrouterApiKey: string | null;
  openrouterModel: string | null;
  openrouterBaseUrl: string | null;
  xaiApiKey: string | null;
  xaiModel: string | null;
  xaiBaseUrl: string | null;
  falApiKey: string | null;
  falBaseUrl: string | null;
  huggingfaceApiKey: string | null;
  huggingfaceBaseUrl: string | null;
  ollamaBaseUrl: string | null;
} {
  const openrouter = config.providers.text["openrouter"];
  const xai = config.providers.text["xai"];
  const falText = config.providers.text["fal"];
  const hfText = config.providers.text["huggingface"];
  const ollamaText = config.providers.text["ollama"];
  const falVideo = config.providers.video["fal"];
  const hfVideo = config.providers.video["huggingface"];
  const ollamaVideo = config.providers.video["ollama"];

  return {
    textProvider: config.text.provider ?? null,
    textModel: config.text.model ?? null,
    textApiKey: config.text.apiKey ?? null,
    textBaseUrl: config.text.baseUrl ?? null,
    videoProvider: config.video.provider ?? null,
    videoModel: config.video.model ?? null,
    videoApiKey: config.video.apiKey ?? null,
    videoBaseUrl: config.video.baseUrl ?? null,
    openrouterApiKey: openrouter?.apiKey ?? null,
    openrouterModel: openrouter?.model ?? null,
    openrouterBaseUrl: openrouter?.baseUrl ?? null,
    xaiApiKey: xai?.apiKey ?? null,
    xaiModel: xai?.model ?? null,
    xaiBaseUrl: xai?.baseUrl ?? null,
    falApiKey: falText?.apiKey ?? falVideo?.apiKey ?? null,
    falBaseUrl: falText?.baseUrl ?? falVideo?.baseUrl ?? null,
    huggingfaceApiKey: hfText?.apiKey ?? hfVideo?.apiKey ?? null,
    huggingfaceBaseUrl: hfText?.baseUrl ?? hfVideo?.baseUrl ?? null,
    ollamaBaseUrl: ollamaText?.baseUrl ?? ollamaVideo?.baseUrl ?? null,
  };
}

export async function getInferenceRuntimeConfig(): Promise<InferenceRuntimeConfig> {
  // Fail-safe: fall back to env defaults if DB is unavailable
  if (!db) return defaultsFromEnv();

  try {
    const row = await db.inferenceConfig.findUnique({
      where: { id: "inference_config" },
    });

    if (!row) {
      return defaultsFromEnv();
    }

    return normalizeDoc(docToConfig(row));
  } catch {
    return defaultsFromEnv();
  }
}

function mergeSurfaceConfig<TProvider extends string>(input: {
  current: InferenceSurfaceRuntimeConfig<TProvider>;
  currentProviders: Record<TProvider, ProviderRuntimeSelection>;
  patch?: Partial<InferenceSurfaceRuntimeConfig<TProvider>>;
  patchProviders?: Partial<
    Record<TProvider, Partial<ProviderRuntimeSelection>>
  >;
}): {
  config: InferenceSurfaceRuntimeConfig<TProvider>;
  providers: Record<TProvider, ProviderRuntimeSelection>;
} {
  const providers = { ...input.currentProviders };

  if (input.patchProviders) {
    for (const [key, value] of Object.entries(input.patchProviders) as [
      TProvider,
      Partial<ProviderRuntimeSelection>,
    ][]) {
      if (!providers[key]) {
        continue;
      }

      providers[key] = mergeProviderSelection(providers[key], value);
    }
  }

  const provider = input.patch?.provider ?? input.current.provider;
  providers[provider] = mergeProviderSelection(providers[provider], {
    model: input.patch?.model,
    apiKey: input.patch?.apiKey,
    baseUrl: input.patch?.baseUrl,
  });

  return {
    config: surfaceConfigFromSelection(provider, providers[provider]),
    providers,
  };
}

export async function updateInferenceRuntimeConfig(
  patch: InferenceConfigUpdate,
): Promise<InferenceRuntimeConfig> {
  const current = await getInferenceRuntimeConfig();

  const nextText = mergeSurfaceConfig({
    current: current.text,
    currentProviders: current.providers.text,
    patch: patch.text,
    patchProviders: patch.providers?.text,
  });

  const nextVideo = mergeSurfaceConfig({
    current: current.video,
    currentProviders: current.providers.video,
    patch: patch.video,
    patchProviders: patch.providers?.video,
  });

  const next: InferenceRuntimeConfig = {
    text: nextText.config,
    video: nextVideo.config,
    providers: {
      text: nextText.providers,
      video: nextVideo.providers,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: patch.updatedBy ?? current.updatedBy ?? null,
  };

  const docData = configToDoc(next);

  await db.inferenceConfig.upsert({
    where: { id: "inference_config" },
    create: { ...docData, id: "inference_config" },
    update: docData,
  });

  return next;
}

export function resolveTextProviderSelection(
  config: InferenceRuntimeConfig,
  provider?: TextInferenceProviderId,
): {
  provider: TextInferenceProviderId;
  selection: ProviderRuntimeSelection;
} {
  const resolvedProvider = provider ?? config.text.provider;
  return {
    provider: resolvedProvider,
    selection:
      config.providers.text[resolvedProvider] ??
      defaultsFromEnv().providers.text[resolvedProvider],
  };
}

export function resolveVideoProviderSelection(
  config: InferenceRuntimeConfig,
  provider?: VideoInferenceProviderId,
): {
  provider: VideoInferenceProviderId;
  selection: ProviderRuntimeSelection;
} {
  const resolvedProvider = provider ?? config.video.provider;
  return {
    provider: resolvedProvider,
    selection:
      config.providers.video[resolvedProvider] ??
      defaultsFromEnv().providers.video[resolvedProvider],
  };
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
