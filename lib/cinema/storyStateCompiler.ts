import type { WalletAnalysisResult } from "@/lib/analytics/types";
import { createCinemaRng, stableShuffle } from "@/lib/cinema/constants";
import { buildTokenImagePlan } from "@/lib/cinema/buildTokenImagePlan";
import { deriveEmotionalSignals } from "@/lib/cinema/deriveEmotionalSignals";
import { assignSceneEntropy } from "@/lib/cinema/assignSceneEntropy";
import { buildThreeActArc } from "@/lib/cinema/buildThreeActArc";
import { selectCharacterArc } from "@/lib/cinema/selectCharacterArc";
import { selectNarrativeArchetype } from "@/lib/cinema/selectNarrativeArchetype";
import type { StoryState, TokenImagePlan, TokenAsset, RangeHours } from "@/lib/cinema/types";

function normalizeRangeHours(value: number): RangeHours {
  if (value === 24 || value === 48 || value === 72) return value;
  return 24;
}

function buildVisualThemes(input: {
  archetype: StoryState["archetype"];
  characterArc: StoryState["characterArc"];
  personality: string;
  modifiers: string[];
  signals: StoryState["emotionalSignals"];
  seed: string;
}): string[] {
  const rng = createCinemaRng(`themes:${input.seed}`);
  const base = [
    "neon trenches",
    "screen-lit haze",
    "rain on glass",
    "flickering billboards",
    "casino-cathedral tension",
    "late-night city reflections",
    "holograms in smoke",
  ];

  const archetypeMotifs = input.archetype.preferredVisualMotifs;
  const arcFlavor = (() => {
    switch (input.characterArc.id) {
      case "villain":
        return ["boxing ring rematch energy", "glitch-red warnings", "storm-lit collapse"];
      case "hero":
        return ["dawn after battle", "clean framing through chaos", "breath before the comeback"];
      case "jester":
        return ["funhouse distortion", "absurd carnival signage", "lucky breaks in bad lighting"];
      case "martyr":
        return ["empty casino sunrise", "shrines to a doomed ticker", "slow-motion denial"];
      case "survivor":
        return ["warzone alleyways", "breathing in fog", "quiet sirens at dawn"];
      case "prophet":
        return ["omens in static", "constellation charts", "ritual candles under neon"];
      case "trickster":
        return ["mirrors and trap doors", "glitch-tilt perspectives", "surreal reversals"];
      case "fallen_hero":
        return ["heroic glow turning sour", "gold to rust palette shift", "crown of broken screens"];
      case "pilgrim":
        return ["train platforms", "long corridors", "maps made of light"];
      case "ghost":
        return ["empty trading floor", "blue haze", "silent monitors"];
      default:
        return ["trench mythology", "electric fog", "cinematic silhouettes"];
    }
  })();

  const signalHints =
    input.signals.chaos > 0.7
      ? ["rapid cuts", "shaky tracking shots", "storms of pixel dust"]
      : input.signals.discipline > 0.7
        ? ["steady dolly shots", "clean silhouettes", "controlled shadows"]
        : ["dynamic movement", "readable tension", "hard light transitions"];

  const raw = [...base, ...archetypeMotifs, ...arcFlavor, ...signalHints];
  const shuffled = stableShuffle(raw, rng);

  // Keep the list short enough to be usable downstream.
  return [...new Set(shuffled.map((value) => value.trim()).filter(Boolean))].slice(0, 10);
}

function buildSymbolicObjects(input: {
  archetype: StoryState["archetype"];
  characterArc: StoryState["characterArc"];
  signals: StoryState["emotionalSignals"];
  seed: string;
}): string[] {
  const rng = createCinemaRng(`objects:${input.seed}`);
  const objects = new Set<string>([
    "glowing chart lines as constellations",
    "a cracked phone screen",
    "a sticky-note prophecy",
    "an empty chair lit by monitors",
    "a coin-shaped talisman",
  ]);

  for (const motif of input.archetype.preferredVisualMotifs) {
    if (objects.size >= 12) break;
    objects.add(motif);
  }

  if (input.signals.desperation > 0.65) {
    objects.add("bloodied hand wraps");
    objects.add("a rematch bell");
  }
  if (input.signals.discipline > 0.68) {
    objects.add("a metronome ticking in the dark");
    objects.add("a chess knight near the keyboard");
  }
  if (input.signals.luck > 0.62) {
    objects.add("a coin spinning forever");
    objects.add("a slot machine that pays in light");
  }
  if (input.characterArc.id === "martyr") {
    objects.add("a candle shrine to a doomed mascot");
  }
  if (input.characterArc.id === "ghost") {
    objects.add("a fogged window with fingerprints");
  }

  return stableShuffle([...objects], rng).slice(0, 10);
}

export interface StoryStateCompilerInput {
  analysis: WalletAnalysisResult;
  tokenAssetMap?: Record<string, TokenAsset>;
}

export class StoryStateCompiler {
  compile(input: StoryStateCompilerInput): StoryState {
    const rangeHours = normalizeRangeHours(input.analysis.rangeHours);
    const seed = `${input.analysis.wallet}:${rangeHours}`;

    const emotionalSignals = deriveEmotionalSignals({
      metrics: input.analysis.metrics,
      moments: input.analysis.moments,
    });

    const characterArc = selectCharacterArc({
      signals: emotionalSignals,
      wallet: input.analysis.wallet,
      rangeHours,
      metrics: input.analysis.metrics,
      moments: input.analysis.moments,
    });

    const archetype = selectNarrativeArchetype({
      signals: emotionalSignals,
      wallet: input.analysis.wallet,
      rangeHours,
      metrics: input.analysis.metrics,
      moments: input.analysis.moments,
      personalityLabel: input.analysis.personality.primary.displayName,
      modifierLabels: input.analysis.modifiers.map((modifier) => modifier.displayName),
    });

    const sceneEntropy = assignSceneEntropy({
      signals: emotionalSignals,
      characterArc,
    });

    const threeActArc = buildThreeActArc({
      archetype,
      characterArc,
      signals: emotionalSignals,
      protagonistPresence: `${input.analysis.wallet.slice(0, 4)}...${input.analysis.wallet.slice(-4)}`,
    });

    const visualThemes = buildVisualThemes({
      archetype,
      characterArc,
      personality: input.analysis.personality.primary.displayName,
      modifiers: input.analysis.modifiers.map((modifier) => modifier.displayName),
      signals: emotionalSignals,
      seed,
    });

    const symbolicObjects = buildSymbolicObjects({
      archetype,
      characterArc,
      signals: emotionalSignals,
      seed,
    });

    const tokenImagePlan: TokenImagePlan = buildTokenImagePlan({
      analysis: input.analysis,
      arcId: characterArc.id,
      tokenAssetMap: input.tokenAssetMap,
    });

    return {
      wallet: input.analysis.wallet,
      rangeHours,
      personality: {
        id: input.analysis.personality.primary.id,
        displayName: input.analysis.personality.primary.displayName,
        explanation: input.analysis.personality.primary.explanation,
      },
      modifiers: input.analysis.modifiers.map((modifier) => ({
        id: modifier.id,
        displayName: modifier.displayName,
        explanation: modifier.explanation,
      })),
      emotionalSignals,
      moments: {
        villainArcMoment:
          input.analysis.moments.mostUnwellMoment ?? input.analysis.moments.overcookedMoment,
        mainCharacterMoment:
          input.analysis.moments.mainCharacterMoment ?? input.analysis.moments.comebackMoment,
        trenchLoreMoment:
          input.analysis.moments.trenchLoreMoment ?? input.analysis.moments.hadToBeThereMoment,
        absoluteCinemaMoment: input.analysis.moments.absoluteCinemaMoment,
      },
      archetype,
      characterArc,
      threeActArc,
      sceneEntropy,
      visualThemes,
      symbolicObjects,
      tokenImagePlan,
    };
  }
}

export function compileStoryState(input: StoryStateCompilerInput): StoryState {
  return new StoryStateCompiler().compile(input);
}
