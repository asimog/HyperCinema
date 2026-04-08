import { generateCinematicScript } from "@/lib/ai/cinematic";
import { getEnv } from "@/lib/env";
import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import { renderCinematicVideo } from "@/lib/video/client";
import { buildOpenMontageRenderPayload } from "@/lib/video/openmontage";
import { buildGoogleVeoRenderPayload } from "@/lib/video/veo";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

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

  const rendered =
    inferenceConfig.video.provider === "xai"
      ? await renderCinematicVideo({
          jobId: input.jobId,
          wallet: input.walletStory.wallet,
          durationSeconds: input.walletStory.durationSeconds,
          script,
          xai: buildXAiVideoRenderPayload({
            walletStory: input.walletStory,
            script,
            model: inferenceConfig.video.model ?? env.XAI_VIDEO_MODEL,
            resolution: "720p",
          }),
        })
      : inferenceConfig.video.provider === "openmontage"
        ? await renderCinematicVideo({
            jobId: input.jobId,
            wallet: input.walletStory.wallet,
            durationSeconds: input.walletStory.durationSeconds,
            script,
            openMontage: buildOpenMontageRenderPayload({
              walletStory: input.walletStory,
              script,
              compositionId: inferenceConfig.video.model ?? "CinematicRenderer",
              resolution: env.VIDEO_RESOLUTION,
            }),
          })
        : await renderCinematicVideo({
            jobId: input.jobId,
            wallet: input.walletStory.wallet,
            durationSeconds: input.walletStory.durationSeconds,
            script,
            googleVeo: buildGoogleVeoRenderPayload({
              walletStory: input.walletStory,
              script,
              model: inferenceConfig.video.model ?? env.VIDEO_VEO_MODEL,
              resolution: env.VIDEO_RESOLUTION,
            }),
          });

  return {
    script,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
  };
}
