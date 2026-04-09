import { ProviderRuntimeSelection } from "@/lib/inference/config";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

export interface GenericRestVideoSceneMetadata {
  sceneNumber: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  imageUrl: string | null;
}

/**
 * Generic REST video render payload — used by Fal, HuggingFace video, and "others".
 * The video-service routes this to GenericRestVideoClient which handles provider-specific
 * auth (FAL uses "Key" prefix) and URL patterns.
 */
export interface GenericRestVideoRenderPayload {
  provider: string;
  model: string;
  prompt: string;
  apiKey: string;
  baseUrl: string;
  sceneMetadata: GenericRestVideoSceneMetadata[];
  storyMetadata: {
    wallet: string;
    rangeDays: number;
    packageType: string;
    durationSeconds: number;
    audioEnabled?: boolean | null;
  };
}

function buildPrompt(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
}): string {
  const story = input.walletStory;
  const lines: string[] = [
    "Create a cinematic video with strong scene continuity.",
  ];
  if (story.subjectName) lines.push(`Subject: ${story.subjectName}.`);
  if (input.script.hookLine) lines.push(`Hook: ${input.script.hookLine}`);
  for (const scene of input.script.scenes) {
    lines.push(`Scene ${scene.sceneNumber}: ${scene.visualPrompt}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function buildGenericRestVideoPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}): GenericRestVideoRenderPayload {
  return {
    provider: input.provider,
    model: input.model,
    prompt: buildPrompt({ walletStory: input.walletStory, script: input.script }),
    apiKey: input.apiKey,
    baseUrl: input.baseUrl.replace(/\/+$/, ""),
    sceneMetadata: input.script.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      durationSeconds: scene.durationSeconds,
      narration: scene.narration,
      visualPrompt: scene.visualPrompt,
      imageUrl: scene.imageUrl ?? null,
    })),
    storyMetadata: {
      wallet: input.walletStory.wallet,
      rangeDays: input.walletStory.rangeDays,
      packageType: input.walletStory.packageType,
      durationSeconds: input.walletStory.durationSeconds,
      audioEnabled: input.walletStory.audioEnabled,
    },
  };
}

export function buildFalVideoRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model: string;
  selection: ProviderRuntimeSelection;
}): GenericRestVideoRenderPayload {
  return buildGenericRestVideoPayload({
    walletStory: input.walletStory,
    script: input.script,
    provider: "fal",
    model: input.model,
    apiKey: input.selection.apiKey ?? "",
    baseUrl: (input.selection.baseUrl ?? "https://fal.run").replace(/\/+$/, ""),
  });
}

export function buildHuggingFaceVideoRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model: string;
  selection: ProviderRuntimeSelection;
}): GenericRestVideoRenderPayload {
  return buildGenericRestVideoPayload({
    walletStory: input.walletStory,
    script: input.script,
    provider: "huggingface",
    model: input.model,
    apiKey: input.selection.apiKey ?? "",
    baseUrl: (input.selection.baseUrl ?? "https://router.huggingface.co/hf-inference/models").replace(/\/+$/, ""),
  });
}
