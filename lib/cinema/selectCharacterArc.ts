import type { WalletMetrics, WalletMoments } from "@/lib/analytics/types";
import {
  CHARACTER_ARCS,
  clamp01,
  createCinemaRng,
  stablePick,
} from "@/lib/cinema/constants";
import type { CharacterArc, CharacterArcId, EmotionalSignals } from "@/lib/cinema/types";

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function momentFlag(value: unknown): number {
  return value ? 1 : 0;
}

function scaleCount(value: number, softMax: number): number {
  if (!Number.isFinite(value) || softMax <= 0) return 0;
  return clamp01(value / softMax);
}

function scoreArcs(input: {
  signals: EmotionalSignals;
  metrics?: WalletMetrics;
  moments?: WalletMoments;
}): Array<{ arcId: CharacterArcId; score: number }> {
  const { confidence, chaos, desperation, discipline, luck } = input.signals;

  const resilience = clamp01(asNumber(input.metrics?.recovery?.psychologicalResilience));
  const earlyEntry = clamp01(asNumber(input.metrics?.timing?.earlyEntryBias));
  const decisionVolatility = clamp01(asNumber(input.metrics?.chaos?.decisionVolatility));
  const revenge = clamp01(asNumber(input.metrics?.recovery?.revengeTradeIntensity));
  const baghold = clamp01(asNumber(input.metrics?.holding?.bagholdBias));
  const allIn = clamp01(asNumber(input.metrics?.position?.allInBehaviorScore));
  const memeability = clamp01(asNumber(input.metrics?.virality?.memeabilityScore));
  const chase = clamp01(asNumber(input.metrics?.attention?.chaseScore));
  const panicExit = clamp01(asNumber(input.metrics?.risk?.panicExitBias));
  const overtrade = clamp01(asNumber(input.metrics?.risk?.overtradeScore));
  const momentumAlignment = clamp01(asNumber(input.metrics?.attention?.momentumAlignment));
  const trendFollowing = clamp01(asNumber(input.metrics?.attention?.trendFollowingScore));
  const tradeBurstCount = asNumber(input.metrics?.activity?.tradeBurstCount);
  const distinctTokenCount = asNumber(input.metrics?.activity?.distinctTokenCount);
  const thesisLoyalty = clamp01(asNumber(input.metrics?.behavior?.thesisLoyaltyScore));
  const delusion = clamp01(asNumber(input.metrics?.behavior?.delusionScore));

  const hasAbsoluteCinema = momentFlag(input.moments?.absoluteCinemaMoment);
  const hasUnwell = momentFlag(input.moments?.mostUnwellMoment || input.moments?.overcookedMoment);
  const hasComeback = momentFlag(input.moments?.comebackMoment);
  const hasLore = momentFlag(input.moments?.trenchLoreMoment || input.moments?.hadToBeThereMoment);

  const hero =
    confidence * 0.28 +
    discipline * 0.28 +
    (1 - desperation) * 0.14 +
    (1 - chaos) * 0.1 +
    luck * 0.12 +
    hasComeback * 0.06 +
    hasAbsoluteCinema * 0.02;

  const villain =
    desperation * 0.22 +
    chaos * 0.16 +
    (1 - discipline) * 0.14 +
    revenge * 0.14 +
    delusion * 0.18 +
    allIn * 0.06 +
    confidence * 0.1 +
    hasUnwell * 0.06;

  const jester =
    chaos * 0.26 +
    luck * 0.3 +
    memeability * 0.24 +
    (1 - discipline) * 0.08 +
    hasLore * 0.06 +
    hasAbsoluteCinema * 0.06 +
    (luck >= 0.5 && memeability >= 0.45 && chaos >= 0.45 ? 0.07 : 0);

  const martyr =
    baghold * 0.34 +
    thesisLoyalty * 0.12 +
    delusion * 0.1 +
    desperation * 0.16 +
    discipline * 0.12 +
    (1 - luck) * 0.1 +
    confidence * 0.06 +
    hasLore * 0.08;

  const survivor =
    resilience * 0.28 +
    discipline * 0.22 +
    (1 - desperation) * 0.18 +
    luck * 0.2 +
    (1 - chaos) * 0.12;

  const prophet =
    confidence * 0.28 +
    discipline * 0.22 +
    (1 - chaos) * 0.18 +
    earlyEntry * 0.22 +
    (1 - desperation) * 0.12 -
    revenge * 0.08 -
    panicExit * 0.06 -
    chase * 0.06 +
    luck * 0.02;

  const trickster =
    decisionVolatility * 0.26 +
    chaos * 0.22 +
    luck * 0.2 +
    memeability * 0.18 +
    hasLore * 0.08 +
    hasAbsoluteCinema * 0.06;

  const fallenHero =
    chaos * 0.2 +
    desperation * 0.18 +
    panicExit * 0.18 +
    chase * 0.14 +
    (1 - discipline) * 0.1 +
    (1 - luck) * 0.1 +
    confidence * 0.04 +
    hasUnwell * 0.06 +
    momentumAlignment * 0.08 +
    trendFollowing * 0.04 +
    scaleCount(tradeBurstCount, 3) * 0.06 -
    overtrade * 0.12 -
    decisionVolatility * 0.1 -
    scaleCount(distinctTokenCount, 5) * 0.06;

  const pilgrim =
    (1 - confidence) * 0.26 +
    discipline * 0.16 +
    (1 - chaos) * 0.22 +
    (1 - desperation) * 0.18 +
    luck * 0.08 +
    hasLore * 0.04 -
    panicExit * 0.06 -
    revenge * 0.04;

  const ghost =
    (1 - chaos) * 0.34 +
    (1 - desperation) * 0.32 +
    discipline * 0.18 +
    (1 - revenge) * 0.08 +
    (1 - chase) * 0.06 +
    (1 - earlyEntry) * 0.02 -
    confidence * 0.08;

  const scored: Array<{ arcId: CharacterArcId; score: number }> = [
    { arcId: "hero", score: hero },
    { arcId: "villain", score: villain },
    { arcId: "jester", score: jester },
    { arcId: "martyr", score: martyr },
    { arcId: "survivor", score: survivor },
    { arcId: "prophet", score: prophet },
    { arcId: "trickster", score: trickster },
    { arcId: "fallen_hero", score: fallenHero },
    { arcId: "pilgrim", score: pilgrim },
    { arcId: "ghost", score: ghost },
  ];

  return scored.map((entry) => ({
    arcId: entry.arcId,
    score: clamp01(entry.score),
  }));
}

export function selectCharacterArc(input: {
  signals: EmotionalSignals;
  wallet: string;
  rangeHours: number;
  metrics?: WalletMetrics;
  moments?: WalletMoments;
}): CharacterArc {
  const rng = createCinemaRng(`arc:${input.wallet}:${input.rangeHours}`);
  const scored = scoreArcs(input).sort((a, b) => b.score - a.score);
  const bestScore = scored[0]?.score ?? 0;
  const epsilon = 0.025;
  const contenders = scored
    .filter((entry) => entry.score >= Math.max(0, bestScore - epsilon))
    .map((entry) => CHARACTER_ARCS[entry.arcId]);

  return stablePick(contenders.length ? contenders : Object.values(CHARACTER_ARCS), rng);
}
