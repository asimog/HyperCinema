import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

export interface XAiVideoSceneMetadata {
  sceneNumber: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  imageUrl: string | null;
  stateRef?: string;
  continuityAnchors?: string[];
  continuityPrompt?: string;
}

export interface XAiVideoRenderPayload {
  provider: "xai";
  model: string;
  resolution: "480p" | "720p";
  aspectRatio: "16:9";
  prompt: string;
  styleHints: string[];
  sceneMetadata: XAiVideoSceneMetadata[];
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
    "Create a coherent cinematic short with strong visual continuity across all scenes.",
    "Keep the same protagonist, tone, and visual world across the full video.",
    "Avoid subtitles, debug text, overlays, and inconsistent character drift unless explicitly requested.",
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

export function buildXAiVideoRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model?: string;
  resolution?: "480p" | "720p";
}): XAiVideoRenderPayload {
  return {
    provider: "xai",
    model: input.model ?? "grok-imagine-video",
    resolution: input.resolution ?? "720p",
    aspectRatio: "16:9",
    prompt: buildPrompt(input),
    styleHints: [
      "cinematic",
      "continuity-first",
      "high-coherence",
      "text-free-by-default",
      ...(input.walletStory.experience === "mythx" ? ["mythx", "autobiographical"] : []),
    ],
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
