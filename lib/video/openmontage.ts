import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

export interface OpenMontageSceneMetadata {
  sceneNumber: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  imageUrl: string | null;
  stateRef?: string;
  continuityAnchors?: string[];
  continuityPrompt?: string;
}

export interface OpenMontageRenderPayload {
  provider: "openmontage";
  compositionId: string;
  resolution: "720p" | "1080p";
  prompt: string;
  workerProvider?: "google_veo" | "xai" | "mythx";
  workerModel?: string;
  sceneMetadata: OpenMontageSceneMetadata[];
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
    "Compose a coherent cinematic montage from generated clips.",
    "Preserve the same protagonist, pacing, and world across the full cut.",
    "Use editorial transitions and title-card restraint instead of adding random overlays.",
    story.requestedPrompt ? `Creative direction: ${compact(story.requestedPrompt)}` : "",
    story.subjectName ? `Subject: ${compact(story.subjectName)}.` : "",
    story.subjectDescription ? `Brief: ${compact(story.subjectDescription)}.` : "",
    story.sourceMediaUrl ? `Primary source reference: ${story.sourceMediaUrl}.` : "",
    `Hook: ${compact(input.script.hookLine)}`,
    "Scene plan:",
    sceneLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOpenMontageRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  compositionId?: string;
  resolution?: "720p" | "1080p";
  workerProvider?: "google_veo" | "xai" | "mythx";
  workerModel?: string;
}): OpenMontageRenderPayload {
  return {
    provider: "openmontage",
    compositionId: input.compositionId ?? "CinematicRenderer",
    resolution: input.resolution ?? "720p",
    prompt: buildPrompt(input),
    workerProvider: input.workerProvider,
    workerModel: input.workerModel,
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
