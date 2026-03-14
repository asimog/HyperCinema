import { StoryBeat, WalletMetrics, WalletMoment, WalletMoments } from "./types";

function signedSol(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)} SOL`;
}

function fallbackText(primary: WalletMoment | undefined, secondary: WalletMoment | undefined, text: string): string {
  return primary?.description ?? secondary?.description ?? text;
}

export function generateStoryBeats(input: {
  wallet: string;
  rangeHours: number;
  metrics: WalletMetrics;
  personality: { primary: { displayName: string } };
  modifiers: Array<{ displayName: string }>;
  moments: WalletMoments;
}): StoryBeat[] {
  const modifierOne = input.modifiers[0]?.displayName ?? "Chaotic Neutral";
  const modifierTwo = input.modifiers[1]?.displayName ?? modifierOne;
  const paceIsChaotic =
    input.metrics.risk.overtradeScore >= 0.5 || input.metrics.chaos.chaosIndex >= 0.55;
  const timingIsEarly =
    input.metrics.timing.earlyEntryScore > input.metrics.timing.lateEntryScore;
  const endingTone =
    input.metrics.profit.realizedPnlSOL >= 0 ? "haunted triumph" : "battle-worn fatigue";

  return [
    {
      phase: "opening",
      text: paceIsChaotic
        ? `${input.personality.primary.displayName} opened the window like an emergency broadcast: ${input.metrics.activity.tradeCount} Pump.fun decisions across ${input.rangeHours}h with ${input.metrics.session.tradeSessions} active sessions and almost no dead air.`
        : `${input.personality.primary.displayName} entered the window with a cleaner pace than most trench accounts, spreading ${input.metrics.activity.tradeCount} decisions across ${input.metrics.activity.distinctTokenCount} names without full dashboard panic.`,
      emotionalTone: paceIsChaotic ? "restless ignition" : "cold focus",
      symbolicVisualHint: paceIsChaotic
        ? "stacked neon screens waking up all at once"
        : "quiet chart wall slowly lighting up",
    },
    {
      phase: "rise",
      text: timingIsEarly
        ? fallbackText(
            input.moments.mainCharacterMoment,
            input.moments.convictionMoment,
            `Early-entry score ${input.metrics.timing.earlyEntryScore.toFixed(2)} gave the rise a head start, and ${modifierOne} behavior turned that edge into momentum.`,
          )
        : fallbackText(
            input.moments.mainCharacterMoment,
            input.moments.trenchLoreMoment,
            `Momentum took over quickly as late-entry score ${input.metrics.timing.lateEntryScore.toFixed(2)} and timeline influence ${input.metrics.attention.timelineInfluenceScore.toFixed(2)} pushed the wallet deeper into the move.`,
          ),
      emotionalTone: timingIsEarly ? "adrenaline with edge" : "accelerating temptation",
      symbolicVisualHint: timingIsEarly
        ? "green candles pulsing ahead of the crowd"
        : "zooming chart tunnel and notification streaks",
    },
    {
      phase: "damage",
      text: fallbackText(
        input.moments.mostUnwellMoment,
        input.moments.fumbleMoment,
        `The damage phase arrived when drawdown hit ${input.metrics.profit.maxDrawdownSOL.toFixed(4)} SOL and the session's emotional-volatility score printed ${input.metrics.chaos.emotionalVolatility.toFixed(2)}.`,
      ),
      emotionalTone: "public pain",
      symbolicVisualHint: "red candles reflected on a sleepless face",
    },
    {
      phase: "pivot",
      text: fallbackText(
        input.moments.comebackMoment,
        input.moments.convictionMoment,
        input.metrics.recovery.comebackTrades > 0
          ? `Instead of folding, the wallet staged ${input.metrics.recovery.comebackTrades} comeback attempts while ${modifierTwo} energy kept the risk dial uncomfortably high.`
          : `The pivot was not calm, but conviction score ${input.metrics.behavior.convictionScore.toFixed(2)} kept the tape from dissolving into total spray.`,
      ),
      emotionalTone:
        input.metrics.recovery.comebackTrades > 0
          ? "desperate resolve"
          : "forced composure",
      symbolicVisualHint: "split screen of red collapse and green rebound",
    },
    {
      phase: "climax",
      text: fallbackText(
        input.moments.absoluteCinemaMoment,
        input.moments.trenchLoreMoment,
        `Cinema peaked when shareability score ${input.metrics.virality.shareabilityScore.toFixed(2)} met quote potential ${input.metrics.virality.quotePotentialScore.toFixed(2)} and turned the final sequence into trench folklore.`,
      ),
      emotionalTone: "full trailer payoff",
      symbolicVisualHint: "rocket flare through a storm of chart particles",
    },
    {
      phase: "aftermath",
      text: `The window closes at ${signedSol(input.metrics.profit.realizedPnlSOL)} after ${input.rangeHours} hours of Pump.fun theater, leaving behind ${input.metrics.activity.distinctTokenCount} tokens, one very clear personality imprint, and an ending that reads like ${endingTone}.`,
      emotionalTone: endingTone,
      symbolicVisualHint: "sunrise over dimmed trading screens and a final PnL card",
    },
  ];
}
