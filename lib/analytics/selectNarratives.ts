import {
  FALLBACK_CINEMATIC_SUMMARIES,
  FALLBACK_TRENCH_COPYPASTA,
  FALLBACK_X_LINES,
  MAX_X_LINES,
  MIN_X_LINES,
} from "./constants";
import {
  GENERATED_CINEMATIC_SUMMARIES,
  GENERATED_TRENCH_COPYPASTA,
  GENERATED_X_LINES,
} from "./contentBank";
import {
  InterpretationSelectionResult,
  NarrativeSelectionResult,
  NarrativeTemplate,
  TextTemplate,
  WalletMetrics,
  WalletMoment,
  WalletMoments,
  WritersRoomContent,
} from "./types";

type RankedSource = "writers" | "generated" | "fallback";
type RankedKind = "behavior" | "observation" | "x" | "copypasta" | "summary" | "moment";

interface RankedLine {
  id: string;
  text: string;
  score: number;
  tags: string[];
  source: RankedSource;
  kind: RankedKind;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeMetric(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function primaryTag(tags: string[]): string {
  return tags.find((tag) => !["general", "universal", "culture"].includes(tag)) ?? tags[0] ?? "general";
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function scoreTemplate(template: NarrativeTemplate, activeTags: Set<string>): number {
  let score = 0.25;
  for (const tag of template.tags ?? []) {
    if (activeTags.has(slugify(tag))) {
      score += 0.45;
    }
  }
  return score;
}

function scoreTextTemplate(template: TextTemplate, activeTags: Set<string>): number {
  let score = 0.2;
  if (template.trigger && activeTags.has(slugify(template.trigger))) {
    score += 0.9;
  }
  for (const tag of template.tags ?? []) {
    if (activeTags.has(slugify(tag))) {
      score += 0.45;
    }
  }
  return score;
}

function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }, template);
}

function buildActiveTags(input: {
  metrics: WalletMetrics;
  personalityId: string;
  personalityName: string;
  modifierIds: string[];
  moments: WalletMoments;
}): Set<string> {
  const tags = new Set<string>([
    "general",
    slugify(input.personalityId),
    slugify(input.personalityName),
    ...input.modifierIds.map(slugify),
  ]);

  if (input.metrics.behavior.chaosScore >= 0.55) tags.add("chaos");
  if (input.metrics.behavior.convictionScore >= 0.55) tags.add("conviction");
  if (input.metrics.behavior.disciplineScore >= 0.52) tags.add("discipline");
  if (input.metrics.timing.lateEntryBias >= 0.42) tags.add("late");
  if (input.metrics.timing.earlyEntryBias >= 0.5) tags.add("early");
  if (input.metrics.holding.bagholdBias >= 0.35) tags.add("baghold");
  if (input.metrics.virality.cinemaScore >= 0.5) tags.add("cinema");
  if (input.metrics.virality.memeabilityScore >= 0.5) tags.add("viral");
  if (input.metrics.virality.quotePotentialScore >= 0.45) tags.add("quote");
  if (input.metrics.attention.attentionSensitivity >= 0.5) tags.add("attention");
  if (input.metrics.attention.narrativeChasingScore >= 0.45) tags.add("fomo");
  if (input.metrics.attention.metaCoinParticipation >= 0.38) tags.add("meta");
  if (input.metrics.activity.lateNightTradeRate >= 0.25) tags.add("night");
  if (input.metrics.recovery.revengeTradeIntensity >= 0.4) tags.add("revenge");
  if (input.metrics.recovery.comebackTrades >= 1) tags.add("comeback");
  if (input.metrics.position.allInBehaviorScore >= 0.45) tags.add("casino");
  if (input.metrics.activity.tradesPerHour >= 0.35) tags.add("overtrading");
  if (input.metrics.execution.entryPrecisionScore >= 0.5) tags.add("timing");
  tags.add("culture");

  if (input.moments.mostUnwellMoment) tags.add("unwell");
  if (input.moments.mainCharacterMoment) tags.add("hero");
  if (input.moments.trenchLoreMoment) tags.add("lore");
  if (input.moments.overcookedMoment) tags.add("overcooked");
  if (input.moments.goblinHourMoment) tags.add("goblin");

  return tags;
}

function formatSignedSol(value: number): string {
  return `${value >= 0 ? "+" : ""}${safeMetric(value).toFixed(4)} SOL`;
}

function selectRankedLines(input: {
  candidates: RankedLine[];
  desiredCount: number;
  minCount: number;
  avoidTexts?: Set<string>;
  maxPerTag?: number;
}): RankedLine[] {
  const avoidTexts = input.avoidTexts ?? new Set<string>();
  const maxPerTag = input.maxPerTag ?? 2;
  const selected: RankedLine[] = [];
  const seenTexts = new Set<string>(avoidTexts);
  const tagUsage = new Map<string, number>();

  const ordered = [...input.candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  for (const candidate of ordered) {
    if (selected.length >= input.desiredCount) break;
    if (seenTexts.has(candidate.text)) continue;

    const tag = primaryTag(candidate.tags);
    const usage = tagUsage.get(tag) ?? 0;
    if (usage >= maxPerTag && candidate.score < 1.9) continue;

    selected.push(candidate);
    seenTexts.add(candidate.text);
    tagUsage.set(tag, usage + 1);
  }

  if (selected.length < input.minCount) {
    for (const candidate of ordered) {
      if (selected.length >= input.minCount) break;
      if (seenTexts.has(candidate.text)) continue;

      selected.push(candidate);
      seenTexts.add(candidate.text);
    }
  }

  return selected;
}

function buildBehaviorPatternCandidates(input: {
  rangeHours: number;
  metrics: WalletMetrics;
  personalityDisplay: string;
  modifiers: string[];
  moments: WalletMoments;
}): RankedLine[] {
  const modifierLabel = input.modifiers.slice(0, 2).join(" + ") || "Chaotic Neutral";
  const candidates: RankedLine[] = [];

  candidates.push({
    id: "behavior-pace-chaos",
    text:
      input.metrics.risk.overtradeScore >= 0.5
        ? `Pace skewed aggressive: ${input.metrics.activity.tradeCount} trades across ${input.rangeHours}h, ${input.metrics.session.tradeSessions} sessions, and ${input.metrics.session.tradeClusterCount} compressed bursts left very little idle time for reflection.`
        : `The tape was active without turning into pure spray: ${input.metrics.activity.tradeCount} trades across ${input.metrics.activity.distinctTokenCount} Pump names kept the window moving without full dashboard panic.`,
    score:
      input.metrics.risk.overtradeScore >= 0.5
        ? 1.7 + input.metrics.risk.overtradeScore
        : 1.15 + input.metrics.behavior.disciplineScore,
    tags: [input.metrics.risk.overtradeScore >= 0.5 ? "chaos" : "discipline", "pace"],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-entry-timing",
    text:
      input.metrics.timing.earlyEntryScore > input.metrics.timing.lateEntryScore
        ? `Entry timing leaned earlier than average: early-entry score ${input.metrics.timing.earlyEntryScore.toFixed(2)} beat late-entry score ${input.metrics.timing.lateEntryScore.toFixed(2)}, which is how ${input.personalityDisplay} kept finding the script before the crowd finished quoting it.`
        : `Entry timing leaned reactive: late-entry score ${input.metrics.timing.lateEntryScore.toFixed(2)} and top-chasing rate ${input.metrics.timing.topChasingRate.toFixed(2)} suggest the wallet regularly paid for candles that were already popular.`,
    score: 1.4 + Math.max(input.metrics.timing.earlyEntryScore, input.metrics.timing.lateEntryScore),
    tags: [
      input.metrics.timing.earlyEntryScore > input.metrics.timing.lateEntryScore ? "early" : "late",
      "timing",
    ],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-holding-style",
    text:
      input.metrics.holding.bagHoldingScore >= input.metrics.holding.quickExitRate
        ? `Holding behavior ran long on emotion: bag-holding score ${input.metrics.holding.bagHoldingScore.toFixed(2)} and loss-hold tolerance ${input.metrics.holding.lossHoldTolerance.toFixed(2)} point to positions being asked to become life lessons.`
        : `Holding behavior skewed impatient: quick-exit rate ${input.metrics.holding.quickExitRate.toFixed(2)} and instant-flip rate ${input.metrics.holding.instantFlipRate.toFixed(2)} show the wallet often preferred immediate relief over full follow-through.`,
    score:
      1.25 +
      Math.max(input.metrics.holding.bagHoldingScore, input.metrics.holding.quickExitRate),
    tags: [
      input.metrics.holding.bagHoldingScore >= input.metrics.holding.quickExitRate
        ? "baghold"
        : "discipline",
      "holding",
    ],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-sizing",
    text:
      input.metrics.position.lossPositionExpansion >= 0.35
        ? `Sizing changed with stress: loss-position expansion ${input.metrics.position.lossPositionExpansion.toFixed(2)} and martingale score ${input.metrics.risk.martingaleScore.toFixed(2)} imply pain regularly translated into larger follow-up exposure.`
        : `Sizing stayed relatively coherent: position variance ${input.metrics.position.positionVariance.toFixed(2)} and trade-selection quality ${input.metrics.execution.tradeSelectionQuality.toFixed(2)} kept the wallet from full all-in improv.`,
    score:
      1.1 +
      Math.max(
        input.metrics.position.lossPositionExpansion,
        input.metrics.execution.tradeSelectionQuality,
      ),
    tags: [
      input.metrics.position.lossPositionExpansion >= 0.35 ? "revenge" : "discipline",
      "risk",
    ],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-attention",
    text:
      input.metrics.attention.attentionSensitivity >= 0.5
        ? `Trade selection clearly tracked attention flows: timeline-influence score ${input.metrics.attention.timelineInfluenceScore.toFixed(2)}, hot-token participation ${input.metrics.attention.hotTokenParticipation.toFixed(2)}, and attention-rotation rate ${input.metrics.attention.attentionRotationRate.toFixed(2)} all point to crowd focus leading the route map.`
        : `The wallet was not completely crowd-led: attention sensitivity ${input.metrics.attention.attentionSensitivity.toFixed(2)} sat below the true trench-goblin threshold, which helped ${modifierLabel} avoid some of the usual timeline tax.`,
    score: 1.2 + Math.max(input.metrics.attention.attentionSensitivity, input.metrics.attention.timelineInfluenceScore),
    tags: [
      input.metrics.attention.attentionSensitivity >= 0.5 ? "attention" : "discipline",
      "meta",
    ],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-recovery",
    text:
      input.metrics.recovery.revengeTradeIntensity >= 0.4
        ? `Loss recovery leaned emotional before it leaned elegant: revenge intensity ${input.metrics.recovery.revengeTradeIntensity.toFixed(2)}, ${input.metrics.recovery.recoveryAttempts} recovery attempts, and risk-after-loss score ${input.metrics.recovery.riskAfterLossScore.toFixed(2)} kept the comeback arc alive at noticeable psychological cost.`
        : `Recovery behavior showed more restraint than chaos merchants usually manage: psychological resilience ${input.metrics.recovery.psychologicalResilience.toFixed(2)} and cooldown discipline ${input.metrics.execution.cooldownDisciplineScore.toFixed(2)} prevented every red candle from becoming a rematch clause.`,
    score:
      1.25 +
      Math.max(
        input.metrics.recovery.revengeTradeIntensity,
        input.metrics.recovery.psychologicalResilience,
      ),
    tags: [
      input.metrics.recovery.revengeTradeIntensity >= 0.4 ? "revenge" : "discipline",
      "recovery",
    ],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-night",
    text:
      input.metrics.activity.lateNightTradeRate >= 0.25
        ? `A meaningful chunk of the script was written at bad hours: late-night trade rate ${input.metrics.activity.lateNightTradeRate.toFixed(2)} and sleep-deprivation score ${input.metrics.activity.sleepDeprivationScore.toFixed(2)} gave the window a definite goblin-hour accent.`
        : `Session timing stayed mostly daylight-compatible, which is rarer than it should be for Pump.fun theater.`,
    score:
      1 +
      Math.max(input.metrics.activity.lateNightTradeRate, input.metrics.activity.sleepDeprivationScore),
    tags: [input.metrics.activity.lateNightTradeRate >= 0.25 ? "night" : "discipline", "session"],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-profit-shape",
    text:
      input.metrics.profit.maxDrawdownSOL > Math.abs(input.metrics.profit.realizedPnlSOL)
        ? `The profit profile had more turbulence than payoff: max drawdown hit ${input.metrics.profit.maxDrawdownSOL.toFixed(4)} SOL against realized PnL of ${formatSignedSol(input.metrics.profit.realizedPnlSOL)}, which is why the story felt harsher than the closing scoreboard.`
        : `The closing scoreboard held together better than the path there: realized PnL settled at ${formatSignedSol(input.metrics.profit.realizedPnlSOL)} with profit factor ${input.metrics.profit.profitFactor.toFixed(2)} and win rate ${input.metrics.profit.winRate.toFixed(2)}.`,
    score:
      1.2 +
      Math.max(
        clamp(input.metrics.profit.maxDrawdownSOL / Math.max(0.2, Math.abs(input.metrics.profit.realizedPnlSOL) + 0.2), 0, 1),
        input.metrics.profit.winRate,
      ),
    tags: ["profit", input.metrics.profit.maxDrawdownSOL > Math.abs(input.metrics.profit.realizedPnlSOL) ? "damage" : "hero"],
    source: "generated",
    kind: "behavior",
  });

  candidates.push({
    id: "behavior-personality-overlay",
    text: `${input.personalityDisplay} was the correct headline, but the modifier stack ${modifierLabel} is what made the session feel narratively unstable.`,
    score: 1.05 + input.metrics.virality.cinemaScore,
    tags: ["personality", "cinema"],
    source: "generated",
    kind: "behavior",
  });

  if (input.moments.mostUnwellMoment) {
    candidates.push({
      id: "behavior-most-unwell",
      text: `${input.moments.mostUnwellMoment.description} That sequence alone explains why the wallet's emotional-volatility score landed at ${input.metrics.chaos.emotionalVolatility.toFixed(2)}.`,
      score: 1.9 + (input.moments.mostUnwellMoment.confidence ?? 0.5),
      tags: ["unwell", "chaos"],
      source: "generated",
      kind: "behavior",
    });
  }

  return candidates;
}

function momentObservation(moment: WalletMoment | undefined, id: string, tag: string): RankedLine[] {
  if (!moment) return [];
  return [
    {
      id,
      text: moment.humorLine,
      score: 1.6 + safeMetric(moment.confidence, 0.4),
      tags: [tag, "moment"],
      source: "generated",
      kind: "observation",
    },
  ];
}

function buildObservationCandidates(input: {
  activeTags: Set<string>;
  moments: WalletMoments;
  personalityDisplay: string;
  walletShort: string;
}): RankedLine[] {
  const generatedX = GENERATED_X_LINES.map((line) => ({
    id: line.id,
    text: line.text,
    score: scoreTemplate(line, input.activeTags),
    tags: line.tags ?? [],
    source: "generated" as const,
    kind: "observation" as const,
  }));
  const fallbackX = FALLBACK_X_LINES.map((line) => ({
    id: line.id,
    text: line.text,
    score: scoreTemplate(line, input.activeTags),
    tags: line.tags ?? [],
    source: "fallback" as const,
    kind: "observation" as const,
  }));

  const directObservations: RankedLine[] = [
    {
      id: "observation-personality",
      text: `${input.walletShort} traded like ${input.personalityDisplay} with a live audience and no shame filter.`,
      score: 1.7,
      tags: ["cinema", "personality"],
      source: "generated",
      kind: "observation",
    },
    ...momentObservation(input.moments.trenchLoreMoment, "observation-lore", "lore"),
    ...momentObservation(input.moments.mainCharacterMoment, "observation-hero", "hero"),
    ...momentObservation(input.moments.mostUnwellMoment, "observation-unwell", "unwell"),
    ...momentObservation(input.moments.goblinHourMoment, "observation-goblin", "night"),
  ];

  return [...directObservations, ...generatedX, ...fallbackX];
}

function buildCopypastaCandidates(input: {
  activeTags: Set<string>;
  writersRoom: WritersRoomContent;
}): RankedLine[] {
  const writers = input.writersRoom.trenchCopypasta.map((line) => ({
    id: line.id,
    text: line.text,
    score: scoreTextTemplate(line, input.activeTags),
    tags: line.tags ?? [],
    source: "writers" as const,
    kind: "copypasta" as const,
  }));
  const generated = GENERATED_TRENCH_COPYPASTA.map((line) => ({
    id: line.id,
    text: line.text,
    score: scoreTextTemplate(line, input.activeTags),
    tags: line.tags ?? [],
    source: "generated" as const,
    kind: "copypasta" as const,
  }));
  const fallback = FALLBACK_TRENCH_COPYPASTA.map((line) => ({
    id: line.id,
    text: line.text,
    score: scoreTextTemplate(line, input.activeTags),
    tags: line.tags ?? [],
    source: "fallback" as const,
    kind: "copypasta" as const,
  }));

  return [...writers, ...generated, ...fallback];
}

export function selectNarratives(input: {
  wallet: string;
  rangeHours: number;
  metrics: WalletMetrics;
  personality: { primary: { id: string; displayName: string } };
  modifiers: Array<{ id: string; displayName: string }>;
  moments: WalletMoments;
  interpretationSelection: InterpretationSelectionResult;
  writersRoom: WritersRoomContent;
}): NarrativeSelectionResult {
  const walletShort = `${input.wallet.slice(0, 4)}...${input.wallet.slice(-4)}`;
  const personalityEntry = input.writersRoom.personalities[input.personality.primary.id];
  const personalityDisplay =
    personalityEntry?.displayName ?? input.personality.primary.displayName;
  const personalityDescription =
    personalityEntry?.description ?? input.personality.primary.displayName;
  const modifiers = input.modifiers.map((modifier) => modifier.displayName);
  const activeTags = buildActiveTags({
    metrics: input.metrics,
    personalityId: input.personality.primary.id,
    personalityName: personalityDisplay,
    modifierIds: input.modifiers.map((modifier) => modifier.id),
    moments: input.moments,
  });

  const templateVariables = {
    walletShort,
    rangeHours: input.rangeHours,
    tradeCount: input.metrics.activity.tradeCount,
    distinctTokenCount: input.metrics.activity.distinctTokenCount,
    personality: personalityDisplay,
    personalityDescription,
    modifierOne: modifiers[0] ?? "Chaotic Neutral",
    modifierTwo: modifiers[1] ?? modifiers[0] ?? "Chaotic Neutral",
    pnl: formatSignedSol(input.metrics.profit.realizedPnlSOL),
  };

  const desiredBehaviorCount = clamp(
    Math.round(3 + input.metrics.virality.storyDensityScore * 3),
    3,
    6,
  );
  const behaviorSelection = selectRankedLines({
    candidates: buildBehaviorPatternCandidates({
      rangeHours: input.rangeHours,
      metrics: input.metrics,
      personalityDisplay,
      modifiers,
      moments: input.moments,
    }),
    desiredCount: desiredBehaviorCount,
    minCount: 3,
    maxPerTag: 1,
  });
  const behaviorPatterns = behaviorSelection.map((entry) => entry.text);

  const observationAvoid = new Set<string>(behaviorPatterns);
  const desiredObservationCount = clamp(
    Math.round(3 + input.metrics.virality.quotePotentialScore * 4),
    3,
    6,
  );
  const observationSelection = selectRankedLines({
    candidates: [
      ...buildObservationCandidates({
        activeTags,
        moments: input.moments,
        personalityDisplay,
        walletShort,
      }),
      ...buildCopypastaCandidates({
        activeTags,
        writersRoom: input.writersRoom,
      }),
    ],
    desiredCount: desiredObservationCount,
    minCount: 3,
    avoidTexts: observationAvoid,
    maxPerTag: 2,
  });
  const funObservations = observationSelection.map((entry) => entry.text);

  const xTarget = clamp(
    Math.round(
      MIN_X_LINES +
        input.metrics.virality.shareabilityScore * 2 +
        input.metrics.virality.quotePotentialScore * 2,
    ),
    MIN_X_LINES,
    MAX_X_LINES,
  );

  const xCandidates: RankedLine[] = [
    ...input.writersRoom.xLines.map((line) => ({
      id: line.id,
      text: line.text,
      score: scoreTemplate(line, activeTags),
      tags: line.tags ?? [],
      source: "writers" as const,
      kind: "x" as const,
    })),
    ...GENERATED_X_LINES.map((line) => ({
      id: line.id,
      text: line.text,
      score: scoreTemplate(line, activeTags),
      tags: line.tags ?? [],
      source: "generated" as const,
      kind: "x" as const,
    })),
    ...FALLBACK_X_LINES.map((line) => ({
      id: line.id,
      text: line.text,
      score: scoreTemplate(line, activeTags),
      tags: line.tags ?? [],
      source: "fallback" as const,
      kind: "x" as const,
    })),
    ...buildCopypastaCandidates({
      activeTags,
      writersRoom: input.writersRoom,
    }),
  ];

  const xSelection = selectRankedLines({
    candidates: xCandidates,
    desiredCount: xTarget,
    minCount: MIN_X_LINES,
    avoidTexts: new Set<string>(behaviorPatterns),
    maxPerTag: 2,
  });

  const xReadySeed = uniqueStrings([
    ...funObservations.slice(0, 2),
    ...xSelection.map((entry) => entry.text),
    ...input.interpretationSelection.lines.slice(0, 2),
  ]);
  const xReadyLines = xReadySeed.slice(0, xTarget);

  const cinematicCandidates = [
    ...input.writersRoom.cinematicSummaries.map((summary) => ({
      id: summary.id,
      tone: summary.tone ?? "writers-room",
      text: summary.text,
      tags: summary.tags ?? [],
      source: "writers" as const,
    })),
    ...GENERATED_CINEMATIC_SUMMARIES.map((summary) => ({
      id: summary.id,
      tone: summary.tone ?? "generated",
      text: summary.text,
      tags: summary.tags ?? [],
      source: "generated" as const,
    })),
    ...FALLBACK_CINEMATIC_SUMMARIES.map((summary) => ({
      id: summary.id,
      tone: summary.tone ?? "fallback",
      text: summary.text,
      tags: summary.tags ?? [],
      source: "fallback" as const,
    })),
  ].sort((a, b) => {
    const scoreDiff =
      scoreTemplate({ id: b.id, text: b.text, tone: b.tone, tags: b.tags }, activeTags) -
      scoreTemplate({ id: a.id, text: a.text, tone: a.tone, tags: a.tags }, activeTags);
    if (scoreDiff !== 0) return scoreDiff;
    return a.id.localeCompare(b.id);
  });

  const selectedCinematic = cinematicCandidates[0] ?? {
    id: "generated-summary-default",
    tone: "generated",
    text: `${walletShort} turned ${input.rangeHours}h of Pump.fun behavior into a chart-lit character study.`,
    tags: ["cinema"],
    source: "generated" as const,
  };

  const cinematicLines = uniqueStrings([
    renderTemplate(selectedCinematic.text, templateVariables),
    input.moments.mainCharacterMoment?.description,
    input.moments.mostUnwellMoment?.description ?? input.moments.fumbleMoment?.description,
    input.moments.trenchLoreMoment?.description ?? input.moments.comebackMoment?.description,
    behaviorPatterns[0],
    `Final board: ${input.metrics.activity.tradeCount} trades, ${input.metrics.activity.distinctTokenCount} Pump tokens, ${formatSignedSol(input.metrics.profit.realizedPnlSOL)} realized, cinema score ${input.metrics.virality.cinemaScore.toFixed(2)}.`,
    funObservations[0],
  ]).slice(0, 6);

  while (cinematicLines.length < 3) {
    cinematicLines.push("The chart supplied volatility. The wallet supplied plot.");
  }

  const vibeSentences = uniqueStrings([
    `${walletShort} ran ${input.metrics.activity.tradeCount} Pump.fun trades across ${input.metrics.activity.distinctTokenCount} tokens in ${input.rangeHours}h and closed the window at ${formatSignedSol(input.metrics.profit.realizedPnlSOL)}.`,
    `Primary archetype: ${personalityDisplay}${modifiers.length ? `, modified by ${modifiers.slice(0, 2).join(" and ")}` : ""}.`,
    behaviorPatterns[0],
    behaviorPatterns[1],
    input.moments.mostUnwellMoment?.humorLine ??
      input.moments.mainCharacterMoment?.humorLine ??
      funObservations[0],
  ]);
  const walletVibeCheck = vibeSentences.slice(0, 4).join(" ");

  const usedWriterContent =
    input.interpretationSelection.source === "writers-room" ||
    xSelection.some((entry) => entry.source === "writers") ||
    selectedCinematic.source === "writers";

  return {
    behaviorPatterns,
    funObservations,
    walletVibeCheck,
    cinematicSummary: {
      title: "Wallet Cinema Cut",
      tone: selectedCinematic.tone,
      lines: cinematicLines,
      templateId: selectedCinematic.id,
    },
    xReadyLines,
    writersRoomSelections: {
      contentSource:
        input.writersRoom.source === "file"
          ? usedWriterContent
            ? "file"
            : "fallback-only"
          : input.writersRoom.source,
      interpretationLineIds: input.interpretationSelection.ids,
      xLineIds: xSelection.map((entry) => entry.id).slice(0, xTarget),
      cinematicSummaryId: selectedCinematic.id,
      copypastaIds: xSelection
        .filter((entry) => entry.kind === "copypasta")
        .map((entry) => entry.id),
    },
  };
}
