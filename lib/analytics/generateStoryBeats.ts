import { StoryBeat, WalletMetrics, WalletMoment, WalletMoments } from "./types";

function signedSol(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)} SOL`;
}

function fallbackText(primary: WalletMoment | undefined, secondary: WalletMoment | undefined, text: string): string {
  return primary?.description ?? secondary?.description ?? text;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
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
  const modifierThree = input.modifiers[2]?.displayName ?? modifierTwo;
  const paceIsChaotic =
    input.metrics.risk.overtradeScore >= 0.5 || input.metrics.chaos.chaosIndex >= 0.55;
  const timingIsEarly =
    input.metrics.timing.earlyEntryScore > input.metrics.timing.lateEntryScore;
  const endingTone =
    input.metrics.profit.realizedPnlSOL >= 0 ? "haunted triumph" : "battle-worn fatigue";
  const templates = [
    {
      opening: {
        text: paceIsChaotic
          ? `${input.personality.primary.displayName} opened the window like an emergency broadcast: ${input.metrics.activity.tradeCount} Pump.fun decisions across ${input.rangeHours}h with ${input.metrics.session.tradeSessions} active sessions and almost no dead air.`
          : `${input.personality.primary.displayName} entered the window with a cleaner pace than most trench accounts, spreading ${input.metrics.activity.tradeCount} decisions across ${input.metrics.activity.distinctTokenCount} names without full dashboard panic.`,
        tone: paceIsChaotic ? "restless ignition" : "cold focus",
        symbol: paceIsChaotic
          ? "stacked neon screens waking up all at once"
          : "quiet chart wall slowly lighting up",
      },
      rise: {
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
        tone: timingIsEarly ? "adrenaline with edge" : "accelerating temptation",
        symbol: timingIsEarly
          ? "green candles pulsing ahead of the crowd"
          : "zooming chart tunnel and notification streaks",
      },
      pivot: {
        text: fallbackText(
          input.moments.comebackMoment,
          input.moments.convictionMoment,
          input.metrics.recovery.comebackTrades > 0
            ? `Instead of folding, the wallet staged ${input.metrics.recovery.comebackTrades} comeback attempts while ${modifierTwo} energy kept the risk dial uncomfortably high.`
            : `The pivot was not calm, but conviction score ${input.metrics.behavior.convictionScore.toFixed(2)} kept the tape from dissolving into total spray.`,
        ),
        tone: input.metrics.recovery.comebackTrades > 0 ? "desperate resolve" : "forced composure",
        symbol: "split screen of red collapse and green rebound",
      },
    },
    {
      opening: {
        text: fallbackText(
          input.moments.trenchLoreMoment,
          input.moments.mainCharacterMoment,
          `${input.personality.primary.displayName} walked on like a narrator already mid-sentence, carrying ${modifierThree} energy into ${input.rangeHours}h of tape.`,
        ),
        tone: "already in motion",
        symbol: "train doors half-open with neon steam",
      },
      rise: {
        text: fallbackText(
          input.moments.comebackMoment,
          input.moments.trenchLoreMoment,
          `Momentum started messy; timeline influence ${input.metrics.attention.timelineInfluenceScore.toFixed(2)} met conviction ${input.metrics.behavior.convictionScore.toFixed(2)} and decided to sprint anyway.`,
        ),
        tone: "reckless acceleration",
        symbol: "billboards switching faster than footsteps",
      },
      pivot: {
        text: fallbackText(
          input.moments.convictionMoment,
          input.moments.recoveryMoment,
          `Halfway through, recovery logic argued with chaos score ${input.metrics.chaos.chaosIndex.toFixed(2)}, and the room took a breath before the final act.`,
        ),
        tone: "tightrope pause",
        symbol: "metronome slowing in neon light",
      },
    },
  ];

  const chosen = templates[Math.abs(hashString(input.wallet)) % templates.length] ?? templates[0];

  return [
    {
      phase: "opening",
      text: chosen.opening.text,
      emotionalTone: chosen.opening.tone,
      symbolicVisualHint: chosen.opening.symbol,
    },
    {
      phase: "rise",
      text: chosen.rise.text,
      emotionalTone: chosen.rise.tone,
      symbolicVisualHint: chosen.rise.symbol,
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
      text: chosen.pivot.text,
      emotionalTone: chosen.pivot.tone,
      symbolicVisualHint: chosen.pivot.symbol,
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
