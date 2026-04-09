import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

export interface ElizaOSVideoSceneMetadata {
  sceneNumber: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  imageUrl: string | null;
  stateRef?: string;
  continuityAnchors?: string[];
  continuityPrompt?: string;
}

export interface ElizaOSRenderPayload {
  provider: "elizaos";
  model: string;
  aspectRatio: "16:9";
  style?: string;
  prompt: string;
  sceneMetadata: ElizaOSVideoSceneMetadata[];
  storyMetadata: {
    storyKind?: WalletStory["storyKind"];
    wallet: string;
    subjectName?: string | null;
    subjectDescription?: string | null;
    experience?: WalletStory["experience"];
    visibility?: WalletStory["visibility"];
    sourceMediaUrl?: string | null;
    sourceEmbedUrl?: string | null;
    sourceMediaProvider?: string | null;
    audioEnabled?: boolean | null;
    rangeDays: number;
    packageType: WalletStory["packageType"];
    durationSeconds: number;
  };
}

function compact(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function buildPrompt(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
}): string {
  const story = input.walletStory;
  const sceneLines = input.script.scenes
    .map((scene) =>
      [
        `Scene ${scene.sceneNumber}`,
        `visual=${compact(scene.visualPrompt)}`,
        `narration=${compact(scene.narration)}`,
        scene.imageUrl ? `image=${scene.imageUrl}` : "image=none",
      ].join(" | "),
    )
    .join("\n");

  return [
    "Create a coherent cinematic short with stable continuity across all scenes.",
    "Keep the protagonist, tone, and world consistent from start to finish.",
    "Avoid captions, debug overlays, and off-brief style drift unless explicitly requested.",
    story.requestedPrompt ? `Creative direction: ${compact(story.requestedPrompt)}` : "",
    story.subjectName ? `Subject: ${compact(story.subjectName)}.` : "",
    story.subjectDescription ? `Brief: ${compact(story.subjectDescription)}.` : "",
    story.sourceMediaUrl ? `Primary source reference: ${story.sourceMediaUrl}.` : "",
    story.sourceTranscript ? `Source transcript:\n${story.sourceTranscript}` : "",
    `Hook: ${compact(input.script.hookLine)}`,
    "Scene plan:",
    sceneLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildElizaOSVideoRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model?: string;
  style?: string;
}): ElizaOSRenderPayload {
  return {
    provider: "elizaos",
    model: input.model ?? "default",
    aspectRatio: "16:9",
    style: input.style ?? input.walletStory.stylePreset ?? undefined,
    prompt: buildPrompt(input),
    sceneMetadata: input.script.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      durationSeconds: scene.durationSeconds,
      narration: scene.narration,
      visualPrompt: scene.visualPrompt,
      imageUrl: scene.imageUrl,
      stateRef: scene.stateRef,
      continuityPrompt: scene.continuityNote,
    })),
    storyMetadata: {
      storyKind: input.walletStory.storyKind,
      wallet: input.walletStory.wallet,
      subjectName: input.walletStory.subjectName,
      subjectDescription: input.walletStory.subjectDescription,
      experience: input.walletStory.experience,
      visibility: input.walletStory.visibility,
      sourceMediaUrl: input.walletStory.sourceMediaUrl,
      sourceEmbedUrl: input.walletStory.sourceEmbedUrl,
      sourceMediaProvider: input.walletStory.sourceMediaProvider,
      audioEnabled: input.walletStory.audioEnabled,
      rangeDays: input.walletStory.rangeDays,
      packageType: input.walletStory.packageType,
      durationSeconds: input.walletStory.durationSeconds,
    },
  };
}
