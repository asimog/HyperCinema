import { renderCinematicVideo } from "@/lib/video/client";
import type { CinematicScene, GeneratedCinematicScript } from "@/lib/types/domain";
import type { GoogleVeoRenderPayload } from "@/lib/video/veo";
import type { SoundDirectorPackage, VeoPromptPackage } from "@/lib/cinema/types";

export interface FinalCutInput {
  jobId: string;
  wallet: string;
  durationSeconds: number;
  model?: "veo-3.1-fast-generate-001";
  resolution?: "720p" | "1080p";
  generateAudio: boolean;
  cinemaPackage: VeoPromptPackage;
  soundPackage: SoundDirectorPackage;
}

export interface FinalCutResult {
  videoUrl: string;
  thumbnailUrl: string | null;
  prompt: string;
}

function buildScript(pkg: VeoPromptPackage): GeneratedCinematicScript {
  const scenes: CinematicScene[] = pkg.scenePrompts.map((sp) => ({
    sceneNumber: sp.sceneIndex,
    visualPrompt: sp.prompt,
    narration: pkg.storyState.archetype.preferredActEmphasis[
      sp.actNumber === 1 ? "act1" : sp.actNumber === 3 ? "act3" : "act2"
    ],
    durationSeconds: sp.durationSeconds,
    imageUrl: sp.tokenImageRefs[0]?.image ?? null,
    stateRef: sp.metaphorId,
  }));

  return {
    hookLine: pkg.tagline,
    scenes,
  };
}

function mergeSoundIntoPrompt(videoPrompt: string, soundPrompt: string): string {
  return [videoPrompt, "", soundPrompt].join("\n");
}

function buildVeoPayload(input: {
  pkg: VeoPromptPackage;
  soundPackage: SoundDirectorPackage;
  script: GeneratedCinematicScript;
  model: "veo-3.1-fast-generate-001";
  resolution: "720p" | "1080p";
  generateAudio: boolean;
  wallet: string;
  durationSeconds: number;
}): GoogleVeoRenderPayload {
  const mergedPrompt = mergeSoundIntoPrompt(input.pkg.prompt, input.soundPackage.soundPrompt);

  const sceneMetadata = input.script.scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    durationSeconds: scene.durationSeconds,
    narration: scene.narration,
    visualPrompt: scene.visualPrompt,
    imageUrl: scene.imageUrl,
  }));

  return {
    provider: "google_veo",
    model: input.model,
    resolution: input.resolution,
    generateAudio: input.generateAudio,
    prompt: mergedPrompt,
    styleHints: ["cinematic", "coherence-first", "story-led"],
    tokenMetadata: [],
    sceneMetadata,
    storyMetadata: {
      wallet: input.wallet,
      rangeDays: input.pkg.storyState.rangeHours / 24,
      packageType: "30s",
      durationSeconds: input.durationSeconds,
      analytics: {
        pumpTokensTraded: 0,
        buyCount: 0,
        sellCount: 0,
        solSpent: 0,
        solReceived: 0,
        estimatedPnlSol: 0,
        bestTrade: "",
        worstTrade: "",
        styleClassification: input.pkg.storyState.archetype.displayName,
      },
    },
  };
}

export async function executeFinalCut(input: FinalCutInput): Promise<FinalCutResult> {
  const script = buildScript(input.cinemaPackage);
  const model = input.model ?? "veo-3.1-fast-generate-001";
  const resolution = input.resolution ?? "1080p";

  const googleVeo = buildVeoPayload({
    pkg: input.cinemaPackage,
    soundPackage: input.soundPackage,
    script,
    model,
    resolution,
    generateAudio: input.generateAudio,
    wallet: input.wallet,
    durationSeconds: input.durationSeconds,
  });

  const rendered = await renderCinematicVideo({
    jobId: input.jobId,
    wallet: input.wallet,
    durationSeconds: input.durationSeconds,
    script,
    googleVeo,
  });

  return {
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
    prompt: googleVeo.prompt,
  };
}
