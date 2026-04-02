/**
 * HYPERCINEMA Veo Cinema Subsystem (Google Veo with Sound)
 *
 * Integration Notes
 *
 * Expected input (from upstream analytics engine):
 * - `analysis`: wallet-scoped Pump.fun trading analysis for the last 24/48/72 hours.
 *   This repo already models that shape as `WalletAnalysisResult` from `@/lib/analytics`.
 * - `tokenAssetMap` (optional but strongly recommended): Pump metadata cache map keyed by mint.
 *   Each entry should include `{ mint, symbol, name, image, description, status }`.
 *
 * Output:
 * - `VeoPromptPackage`:
 *   - cinematic `title` + 1-line `tagline`
 *   - canonical `storyState` (emotional compression + archetype + character arc + 3-act + entropy)
 *   - `scenePlan` (6-10 scenes, typed metadata, token image usage, entropy)
 *   - `scenePrompts` + one continuous `prompt` for Veo-with-sound
 *
 * How to call:
 *   import { buildHyperCinemaVeoPromptPackage } from "@/lib/cinema";
 *   const pkg = buildHyperCinemaVeoPromptPackage({ analysis, tokenAssetMap });
 *   // Send pkg.prompt to Veo (generateAudio=true) and store pkg.scenePlan/pkg.scenePrompts as metadata.
 */

import type { WalletAnalysisResult } from "@/lib/analytics/types";
import { buildScenePlan } from "@/lib/cinema/buildScenePlan";
import { generateVeoPromptPackage } from "@/lib/cinema/generateVeoPrompt";
import { mapVisualMetaphors } from "@/lib/cinema/mapVisualMetaphors";
import { StoryStateCompiler } from "@/lib/cinema/storyStateCompiler";
import { veoPromptPackageSchema } from "@/lib/cinema/schemas";
import type { TokenAsset, VeoPromptPackage, VisualMetaphorMap } from "@/lib/cinema/types";

function placeholderMetaphorMap(): VisualMetaphorMap {
  return {
    globalContinuity: {
      primaryEnvironment: "neon trenches",
      paletteCanon: ["neon teal", "chart green", "warning red"],
      recurringSymbols: ["glowing chart lines as constellations"],
      soundPalette: ["rain on glass", "keyboard clicks"],
    },
    bySceneType: {},
  };
}

export function buildHyperCinemaVeoPromptPackage(input: {
  analysis: WalletAnalysisResult;
  tokenAssetMap?: Record<string, TokenAsset>;
}): VeoPromptPackage {
  const storyState = new StoryStateCompiler().compile({
    analysis: input.analysis,
    tokenAssetMap: input.tokenAssetMap,
  });

  // Two-pass scene planning:
  // 1) Generate a deterministic scene-type sequence.
  // 2) Select metaphors for those scene types, then re-plan with attached metaphors.
  const draftPlan = buildScenePlan({
    state: storyState,
    metaphorMap: placeholderMetaphorMap(),
  });
  const sceneTypes = draftPlan.scenes.map((scene) => scene.sceneType);
  const metaphorMap = mapVisualMetaphors({ state: storyState, sceneTypes });

  const scenePlan = buildScenePlan({
    state: storyState,
    metaphorMap,
  });

  const generated = generateVeoPromptPackage({
    storyState,
    scenePlan,
  });

  const pkg: VeoPromptPackage = {
    title: generated.title,
    tagline: generated.tagline,
    storyState,
    scenePlan,
    scenePrompts: generated.scenePrompts,
    prompt: generated.prompt,
    promptCompact: generated.promptCompact,
  };

  return veoPromptPackageSchema.parse(pkg);
}

export { StoryStateCompiler, compileStoryState } from "@/lib/cinema/storyStateCompiler";
export { deriveEmotionalSignals } from "@/lib/cinema/deriveEmotionalSignals";
export { selectNarrativeArchetype } from "@/lib/cinema/selectNarrativeArchetype";
export { selectCharacterArc } from "@/lib/cinema/selectCharacterArc";
export { buildThreeActArc } from "@/lib/cinema/buildThreeActArc";
export { assignSceneEntropy } from "@/lib/cinema/assignSceneEntropy";
export { VISUAL_METAPHOR_LIBRARY } from "@/lib/cinema/visualMetaphorLibrary";
export { mapVisualMetaphors } from "@/lib/cinema/mapVisualMetaphors";
export { buildTokenImagePlan } from "@/lib/cinema/buildTokenImagePlan";
export { buildScenePlan } from "@/lib/cinema/buildScenePlan";
export { generateVeoPromptPackage } from "@/lib/cinema/generateVeoPrompt";

export * from "@/lib/cinema/types";
export { buildSoundDirectorPackage } from "@/lib/cinema/soundDirector";
export { executeFinalCut } from "@/lib/cinema/finalCut";
export type { FinalCutInput, FinalCutResult } from "@/lib/cinema/finalCut";
