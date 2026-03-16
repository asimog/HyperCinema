import { clamp01, toEntropyLevel } from "@/lib/cinema/constants";
import type { CharacterArc, EmotionalSignals, SceneEntropyProfile } from "@/lib/cinema/types";

export function assignSceneEntropy(input: {
  signals: EmotionalSignals;
  characterArc: CharacterArc;
}): SceneEntropyProfile {
  const { confidence, chaos, desperation, discipline, luck } = input.signals;

  const arcHeat =
    input.characterArc.id === "villain" || input.characterArc.id === "jester"
      ? 0.1
      : input.characterArc.id === "ghost" || input.characterArc.id === "martyr"
        ? -0.08
        : 0;

  const opening = clamp01(chaos * 0.35 + desperation * 0.15 + (1 - discipline) * 0.15 + arcHeat);
  const rise = clamp01(chaos * 0.4 + confidence * 0.18 + luck * 0.12 + desperation * 0.18 + arcHeat);
  const damage = clamp01(chaos * 0.38 + desperation * 0.34 + (1 - discipline) * 0.12 + arcHeat);
  const pivot = clamp01(chaos * 0.3 + luck * 0.22 + confidence * 0.18 + desperation * 0.12 + arcHeat);
  const climax = clamp01(chaos * 0.4 + desperation * 0.22 + confidence * 0.16 + luck * 0.14 + arcHeat);
  const aftermath = clamp01(chaos * 0.12 + desperation * 0.18 + (1 - discipline) * 0.12 + (1 - luck) * 0.08 + (arcHeat < 0 ? 0.06 : -0.02));

  return {
    opening: toEntropyLevel(opening),
    rise: toEntropyLevel(rise),
    damage: toEntropyLevel(damage),
    pivot: toEntropyLevel(pivot),
    climax: toEntropyLevel(climax),
    aftermath: toEntropyLevel(aftermath),
  };
}

