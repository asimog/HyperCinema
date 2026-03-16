import type { WalletMetrics, WalletMoments } from "@/lib/analytics/types";
import {
  NARRATIVE_ARCHETYPES,
  clamp01,
  createCinemaRng,
  stablePick,
} from "@/lib/cinema/constants";
import type { EmotionalSignals, NarrativeArchetype } from "@/lib/cinema/types";

function includesWord(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function scoreArchetypes(input: {
  signals: EmotionalSignals;
  metrics?: WalletMetrics;
  moments?: WalletMoments;
  personalityLabel?: string;
  modifierLabels?: string[];
}): Array<{ archetype: NarrativeArchetype; score: number }> {
  const { confidence, chaos, desperation, discipline, luck } = input.signals;
  const earlyEntry = clamp01(
    typeof input.metrics?.timing?.earlyEntryBias === "number"
      ? input.metrics.timing.earlyEntryBias
      : 0,
  );
  const chaseScore = clamp01(
    typeof input.metrics?.attention?.chaseScore === "number"
      ? input.metrics.attention.chaseScore
      : 0,
  );
  const memeability = clamp01(
    typeof input.metrics?.virality?.memeabilityScore === "number"
      ? input.metrics.virality.memeabilityScore
      : 0,
  );

  const labelHaystack = [input.personalityLabel ?? "", ...(input.modifierLabels ?? [])].join(
    " ",
  );

  const hasAbsoluteCinema = Boolean(input.moments?.absoluteCinemaMoment);
  const hasUnwell = Boolean(input.moments?.mostUnwellMoment || input.moments?.overcookedMoment);
  const hasLore = Boolean(input.moments?.trenchLoreMoment || input.moments?.hadToBeThereMoment);

  return NARRATIVE_ARCHETYPES.map((archetype) => {
    let score = 0;

    switch (archetype.id) {
      case "gambler":
        score =
          chaos * 0.38 +
          desperation * 0.22 +
          (1 - discipline) * 0.14 +
          luck * 0.14 +
          memeability * 0.12;
        if (hasUnwell) score += 0.06;
        break;
      case "prophet":
        score =
          confidence * 0.36 +
          discipline * 0.26 +
          (1 - chaos) * 0.22 +
          earlyEntry * 0.16;
        if (hasAbsoluteCinema) score += 0.03;
        break;
      case "survivor":
        score = discipline * 0.34 + (1 - desperation) * 0.2 + (1 - chaos) * 0.2 + luck * 0.26;
        break;
      case "martyr":
        score =
          desperation * 0.3 +
          discipline * 0.22 +
          (1 - luck) * 0.22 +
          confidence * 0.16 +
          (hasLore ? 0.02 : 0);
        break;
      case "trickster":
        score = chaos * 0.32 + luck * 0.28 + memeability * 0.22 + (1 - discipline) * 0.18;
        if (hasLore) score += 0.06;
        break;
      case "pilgrim":
        score =
          (1 - confidence) * 0.34 + discipline * 0.18 + (1 - chaos) * 0.22 + luck * 0.14 + 0.12;
        break;
      case "believer":
        score =
          confidence * 0.22 + discipline * 0.24 + desperation * 0.2 + (1 - luck) * 0.14 + 0.2;
        break;
      case "chaser":
        score = chaseScore * 0.3 + chaos * 0.28 + desperation * 0.26 + (1 - discipline) * 0.16;
        if (hasUnwell) score += 0.05;
        break;
      case "alchemist":
        score =
          discipline * 0.3 + confidence * 0.22 + luck * 0.2 + (1 - chaos) * 0.18 + memeability * 0.1;
        if (hasAbsoluteCinema) score += 0.04;
        break;
      case "ghost":
        score = (1 - chaos) * 0.35 + (1 - desperation) * 0.24 + discipline * 0.2 + (1 - confidence) * 0.21;
        break;
      default:
        score = 0.5;
    }

    if (includesWord(labelHaystack, [archetype.displayName.toLowerCase()])) {
      score += 0.08;
    }

    if (archetype.id === "chaser" && includesWord(labelHaystack, ["momentum", "fomo", "chase"])) {
      score += 0.06;
    }

    if (archetype.id === "gambler" && includesWord(labelHaystack, ["casino", "chaos", "gambler"])) {
      score += 0.06;
    }

    if (archetype.id === "ghost" && includesWord(labelHaystack, ["quiet", "detached", "ghost"])) {
      score += 0.05;
    }

    return { archetype, score: clamp01(score) };
  });
}

export function selectNarrativeArchetype(input: {
  signals: EmotionalSignals;
  wallet: string;
  rangeHours: number;
  metrics?: WalletMetrics;
  moments?: WalletMoments;
  personalityLabel?: string;
  modifierLabels?: string[];
}): NarrativeArchetype {
  const rng = createCinemaRng(`archetype:${input.wallet}:${input.rangeHours}`);
  const scored = scoreArchetypes(input).sort((a, b) => b.score - a.score);
  const bestScore = scored[0]?.score ?? 0;
  const contenders = scored
    .filter((entry) => entry.score >= Math.max(0, bestScore - 0.06))
    .map((entry) => entry.archetype);

  return contenders.length ? stablePick(contenders, rng) : stablePick(NARRATIVE_ARCHETYPES, rng);
}
