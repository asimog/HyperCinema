import type { WalletMetrics, WalletMoments } from "@/lib/analytics/types";
import { clamp01 } from "@/lib/cinema/constants";
import type { EmotionalSignals } from "@/lib/cinema/types";

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function scaleCount(value: number, softMax: number): number {
  if (softMax <= 0) return 0;
  return clamp01(value / softMax);
}

export function deriveEmotionalSignals(input: {
  metrics: WalletMetrics;
  moments?: WalletMoments;
}): EmotionalSignals {
  const chaosIndex = clamp01(asNumber(input.metrics.chaos?.chaosIndex));
  const revengeIntensity = clamp01(asNumber(input.metrics.recovery?.revengeTradeIntensity));
  const panicExit = clamp01(asNumber(input.metrics.risk?.panicExitBias));
  const averagingDown = clamp01(asNumber(input.metrics.risk?.averagingDownBias));

  const patience = clamp01(asNumber(input.metrics.behavior?.patienceScore));
  const cooldown = clamp01(asNumber(input.metrics.execution?.cooldownDisciplineScore));
  const tradeSelection = clamp01(asNumber(input.metrics.execution?.tradeSelectionQuality));
  const conviction = clamp01(asNumber(input.metrics.behavior?.convictionScore));
  const positionConfidence = clamp01(asNumber(input.metrics.position?.confidencePositionScore));
  const winRate = clamp01(asNumber(input.metrics.profit?.winRate));

  const recoveryAttempts = asNumber(input.metrics.recovery?.recoveryAttempts);
  const recoverySuccess = clamp01(asNumber(input.metrics.recovery?.recoverySuccessRate));
  const resilience = clamp01(asNumber(input.metrics.recovery?.psychologicalResilience));
  const decisionVolatility = clamp01(asNumber(input.metrics.chaos?.decisionVolatility));

  // Emotional signal design:
  // - Numbers never become narration. They only shape the emotional physics:
  //   pacing, instability, sound pressure, and symbolism intensity.
  //
  // confidence:
  // - rises with conviction + trade selection + controlled position confidence + wins
  // - falls with panic exits and revenge spirals
  const confidence = clamp01(
    conviction * 0.33 +
      tradeSelection * 0.22 +
      positionConfidence * 0.2 +
      winRate * 0.18 -
      panicExit * 0.12 -
      revengeIntensity * 0.08,
  );

  // chaos:
  // - rises with overtrading/rotation/decision volatility (already compressed upstream)
  const chaos = clamp01(chaosIndex * 0.75 + decisionVolatility * 0.25);

  // desperation:
  // - rises with revenge intensity, averaging down, panic exits, rapid recovery attempts
  // - higher means "needs redemption right now" energy
  const desperation = clamp01(
    revengeIntensity * 0.44 +
      averagingDown * 0.16 +
      panicExit * 0.14 +
      scaleCount(recoveryAttempts, 4) * 0.16 +
      (1 - resilience) * 0.1,
  );

  // discipline:
  // - rises with patience + cooldown discipline + trade selection
  // - falls with chaos and desperation
  const discipline = clamp01(
    patience * 0.35 +
      cooldown * 0.2 +
      tradeSelection * 0.25 +
      (1 - chaosIndex) * 0.2 -
      desperation * 0.1,
  );

  // luck:
  // - rises when outcomes exceed process (improbable saves, accidental genius)
  // - we model it as "results quality" minus "process quality" plus recovery saves.
  const profitFactor = asNumber(input.metrics.profit?.profitFactor);
  const resultsQuality = clamp01(winRate * 0.45 + clamp01(profitFactor / 2.2) * 0.55);
  const processQuality = clamp01(
    tradeSelection * 0.35 + discipline * 0.35 + conviction * 0.2 + (1 - chaosIndex) * 0.1,
  );

  const momentBonus =
    input.moments?.absoluteCinemaMoment || input.moments?.comebackMoment ? 0.08 : 0;

  const luck = clamp01(
    (resultsQuality - processQuality) * 0.6 + recoverySuccess * 0.32 + momentBonus,
  );

  return {
    confidence,
    chaos,
    desperation,
    discipline,
    luck,
  };
}

