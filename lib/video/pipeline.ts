import { generateCinematicScript } from "@/lib/ai/cinematic";
import { getEnv } from "@/lib/env";
import { getInferenceRuntimeConfig, resolveVideoProviderSelection, ProviderRuntimeSelection } from "@/lib/inference/config";
import { VideoInferenceProviderId } from "@/lib/inference/providers";
import { renderCinematicVideo } from "@/lib/video/client";
import { buildElizaOSVideoRenderPayload } from "@/lib/video/elizaos";
import {
  buildFalVideoRenderPayload,
  buildGenericRestVideoPayload,
  buildHuggingFaceVideoRenderPayload,
  GenericRestVideoRenderPayload,
} from "@/lib/video/generic-rest";
import { buildOpenMontageRenderPayload } from "@/lib/video/openmontage";
import { buildGoogleVeoRenderPayload } from "@/lib/video/veo";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";
import { AppEnv } from "@/lib/env";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

type VideoPayloadParams = {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model: string;
  selection: ProviderRuntimeSelection;
  env: AppEnv;
};

type VideoPayloadResult = {
  xai?: ReturnType<typeof buildXAiVideoRenderPayload>;
  elizaos?: ReturnType<typeof buildElizaOSVideoRenderPayload>;
  openMontage?: ReturnType<typeof buildOpenMontageRenderPayload>;
  generic?: GenericRestVideoRenderPayload;
  googleVeo?: ReturnType<typeof buildGoogleVeoRenderPayload>;
};

type VideoPayloadBuilder = (params: VideoPayloadParams) => VideoPayloadResult;

const VIDEO_PROVIDER_BUILDERS: Partial<Record<VideoInferenceProviderId, VideoPayloadBuilder>> = {
  xai: ({ walletStory, script, model }) => ({
    xai: buildXAiVideoRenderPayload({ walletStory, script, model, resolution: "720p", aspectRatio: "1:1" }),
  }),
  elizaos: ({ walletStory, script, model }) => ({
    elizaos: buildElizaOSVideoRenderPayload({
      walletStory,
      script,
      model,
      style: walletStory.stylePreset ?? undefined,
    }),
  }),
  openmontage: ({ walletStory, script, model, env }) => ({
    openMontage: buildOpenMontageRenderPayload({
      walletStory,
      script,
      compositionId: model,
      resolution: env.VIDEO_RESOLUTION,
    }),
  }),
  fal: ({ walletStory, script, model, selection }) => ({
    generic: buildFalVideoRenderPayload({ walletStory, script, model, selection }),
  }),
  huggingface: ({ walletStory, script, model, selection }) => ({
    generic: buildHuggingFaceVideoRenderPayload({ walletStory, script, model, selection }),
  }),
  others: ({ walletStory, script, model, selection }) => ({
    generic: buildGenericRestVideoPayload({
      walletStory,
      script,
      provider: "others",
      model,
      apiKey: selection.apiKey ?? "",
      baseUrl: selection.baseUrl ?? "",
    }),
  }),
};

export async function buildAndRenderVideo(input: {
  jobId: string;
  walletStory: WalletStory;
}): Promise<{
  script: GeneratedCinematicScript;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  const script = await generateCinematicScript(input.walletStory);
  const env = getEnv();
  const inferenceConfig = await getInferenceRuntimeConfig();
  const { provider, selection } = resolveVideoProviderSelection(inferenceConfig);
  const model =
    selection.model ??
    inferenceConfig.video.model ??
    env.VIDEO_VEO_MODEL;

  const builder = VIDEO_PROVIDER_BUILDERS[provider];
  const providerPayload: VideoPayloadResult = builder
    ? builder({ walletStory: input.walletStory, script, model, selection, env })
    : {
        googleVeo: buildGoogleVeoRenderPayload({
          walletStory: input.walletStory,
          script,
          model: inferenceConfig.video.model ?? env.VIDEO_VEO_MODEL,
          resolution: env.VIDEO_RESOLUTION,
        }),
      };

  const rendered = await renderCinematicVideo({
    jobId: input.jobId,
    wallet: input.walletStory.wallet,
    durationSeconds: input.walletStory.durationSeconds,
    script,
    ...providerPayload,
  });

  return {
    script,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
  };
}
