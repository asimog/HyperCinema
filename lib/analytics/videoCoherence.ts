import { VIDEO_MOTIFS, VIDEO_VISUAL_SYMBOLS } from "./contentBank";
import {
  MetricBucket,
  NormalizedTrade,
  SceneEmotionVector,
  SceneState,
  StoryBeat,
  StoryBeatPhase,
  VideoIdentitySheet,
  VideoPromptProvider,
  VideoPromptScene,
  VideoTokenAnchor,
  WalletMetrics,
  WalletMoments,
} from "./types";

export interface CompileVideoSceneInput {
  sceneNumber: number;
  phase: StoryBeatPhase;
  narrativeText: string;
  visualHint: string;
  narrationHint?: string;
  symbolicVisualHint?: string;
}

type EmotionalSignals = Omit<SceneEmotionVector, "intensity">;
type NarrativeArchetype =
  | "The Gambler"
  | "The Prophet"
  | "The Survivor"
  | "The Martyr"
  | "The Trickster";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function stableId(parts: string[]): string {
  return hashString(parts.join("|")).toString(36);
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readMetric(bucket: MetricBucket, key: string): number {
  const value = bucket[key];
  return Number.isFinite(value) ? value : 0;
}

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function compactSentence(value: string): string {
  const trimmed = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sanitizeNarrativeText(value?: string): string | undefined {
  if (!value) return undefined;

  const sanitized = compactSentence(
    value
      .replace(/\b\d+(?:\.\d+)?\s*SOL\b/gi, "the bag")
      .replace(/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?|sessions?|trades?|tokens?)\b/gi, "the whole ordeal")
      .replace(/\bestimated\s+pnl\b/gi, "fortune")
      .replace(/\b\d+(?:\.\d+)?\b/g, "")
      .replace(/\s{2,}/g, " "),
  );

  return sanitized || undefined;
}

function signalWord(value: number): string {
  if (value >= 0.8) return "explosive";
  if (value >= 0.65) return "high";
  if (value >= 0.45) return "present";
  if (value >= 0.25) return "muted";
  return "barely-there";
}

function deriveEmotionalSignals(metrics: WalletMetrics): EmotionalSignals {
  const confidence = clamp(
    average([
      readMetric(metrics.behavior, "convictionScore"),
      readMetric(metrics.execution, "entryPrecisionScore"),
      readMetric(metrics.execution, "followThroughScore"),
      readMetric(metrics.execution, "timingEdgeBalance"),
      metrics.profit.winRate,
    ]),
    0,
    1,
  );

  const chaos = clamp(
    average([
      metrics.chaos.chaosIndex,
      readMetric(metrics.chaos, "decisionVolatility"),
      readMetric(metrics.chaos, "impulseTradeRate"),
      readMetric(metrics.risk, "drawdownTolerance"),
      readMetric(metrics.behavior, "revengeBias"),
    ]),
    0,
    1,
  );

  const desperation = clamp(
    average([
      readMetric(metrics.recovery, "revengeTradeIntensity"),
      readMetric(metrics.recovery, "riskAfterLossScore"),
      readMetric(metrics.risk, "panicExitBias"),
      readMetric(metrics.risk, "averagingDownBias"),
      readMetric(metrics.chaos, "emotionalVolatility"),
    ]),
    0,
    1,
  );

  const discipline = clamp(
    average([
      readMetric(metrics.behavior, "patienceScore"),
      readMetric(metrics.execution, "cooldownDisciplineScore"),
      readMetric(metrics.execution, "tradeSelectionQuality"),
      readMetric(metrics.execution, "invalidationRespectScore"),
      readMetric(metrics.execution, "hesitationScore") > 0
        ? 1 - readMetric(metrics.execution, "hesitationScore")
        : 0,
    ]),
    0,
    1,
  );

  const luck = clamp(
    average([
      metrics.profit.winRate,
      readMetric(metrics.recovery, "recoverySuccessRate"),
      readMetric(metrics.attention, "momentumAlignment"),
      metrics.virality.shareabilityScore,
      metrics.virality.memeabilityScore,
    ]),
    0,
    1,
  );

  return {
    confidence,
    chaos,
    desperation,
    discipline,
    luck,
  };
}

function keywordBonus(haystack: string, patterns: string[]): number {
  const normalized = haystack.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern)) ? 0.12 : 0;
}

function selectArchetype(input: {
  personality: string;
  modifiers: string[];
  metrics: WalletMetrics;
  signals: EmotionalSignals;
}): NarrativeArchetype {
  const keywordSource = [input.personality, ...input.modifiers].join(" ");
  const scores: Record<NarrativeArchetype, number> = {
    "The Gambler":
      input.signals.chaos * 0.38 +
      input.signals.desperation * 0.24 +
      input.signals.luck * 0.16 +
      keywordBonus(keywordSource, ["gambler", "casino", "degen", "hopium"]),
    "The Prophet":
      input.signals.confidence * 0.34 +
      input.signals.discipline * 0.3 +
      (1 - input.signals.chaos) * 0.16 +
      input.signals.luck * 0.1 +
      keywordBonus(keywordSource, ["oracle", "visionary", "prophet", "early"]),
    "The Survivor":
      input.signals.desperation * 0.22 +
      input.signals.discipline * 0.22 +
      input.signals.confidence * 0.16 +
      readMetric(input.metrics.recovery, "psychologicalResilience") * 0.16 +
      readMetric(input.metrics.recovery, "recoverySuccessRate") * 0.14 +
      keywordBonus(keywordSource, ["comeback", "survivor", "recovery", "rug hardened"]),
    "The Martyr":
      readMetric(input.metrics.holding, "bagholdBias") * 0.28 +
      input.signals.desperation * 0.2 +
      input.signals.confidence * 0.16 +
      (1 - input.signals.luck) * 0.18 +
      readMetric(input.metrics.risk, "drawdownTolerance") * 0.1 +
      keywordBonus(keywordSource, ["martyr", "diamond", "conviction", "bagholder"]),
    "The Trickster":
      input.signals.luck * 0.28 +
      input.signals.chaos * 0.18 +
      readMetric(input.metrics.attention, "attentionSensitivity") * 0.18 +
      readMetric(input.metrics.attention, "chaseScore") * 0.12 +
      input.metrics.virality.memeabilityScore * 0.12 +
      keywordBonus(keywordSource, ["trickster", "chaos", "timeline", "oracle"]),
  };

  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  return ranked[0]![0] as NarrativeArchetype;
}

function buildProtagonist(archetype: NarrativeArchetype, seed: number): string {
  const pool: Record<NarrativeArchetype, string[]> = {
    "The Gambler": [
      "hooded casino pilgrim",
      "lone gambler under chart glow",
      "night trader with roulette-wheel confidence",
    ],
    "The Prophet": [
      "chart oracle in a dark room",
      "cyberpunk seer with sleepless eyes",
      "quiet trench prophet at a wall of monitors",
    ],
    "The Survivor": [
      "battle-worn night trader",
      "storm-tested desk warrior",
      "exhausted protagonist still refusing the exit",
    ],
    "The Martyr": [
      "conviction cultist at a glowing altar of charts",
      "bagholder philosopher in monitor light",
      "sleep-deprived believer defending one last thesis",
    ],
    "The Trickster": [
      "gremlin-genius chart jockey",
      "meme-native trench operator",
      "funhouse-market schemer with suspicious timing",
    ],
  };

  return pick(pool[archetype], seed);
}

function buildCanonByArchetype(
  archetype: NarrativeArchetype,
): Pick<VideoIdentitySheet, "paletteCanon" | "worldCanon" | "lightingCanon"> {
  switch (archetype) {
    case "The Prophet":
      return {
        paletteCanon: ["amber prophecy glow", "dark monitor blue", "chart green"],
        worldCanon: ["oracle desk mystique", "cathedral-scale chart walls", "quiet trench suspense"],
        lightingCanon: ["low amber monitor glow", "soft green chart spill", "controlled haze"],
      };
    case "The Survivor":
      return {
        paletteCanon: ["storm blue", "bruised purple", "cold sunrise gray"],
        worldCanon: ["storm-bunker resolve", "after-hours war room", "post-crash recovery corridor"],
        lightingCanon: ["cold screen flicker", "sunrise edge light", "steady practical glow"],
      };
    case "The Martyr":
      return {
        paletteCanon: ["ash black", "sacrificial crimson", "stubborn gold"],
        worldCanon: ["conviction shrine drama", "chart altar", "dusty aftermath hush"],
        lightingCanon: ["altar spotlight", "heavy red spill", "burned-out golden rim"],
      };
    case "The Trickster":
      return {
        paletteCanon: ["acid neon", "meme-glitch cyan", "funhouse crimson"],
        worldCanon: ["funhouse-market surrealism", "meme-native trench maze", "casino-cathedral absurdity"],
        lightingCanon: ["glitch strobe", "color-shift screen wash", "restless neon pulse"],
      };
    case "The Gambler":
    default:
      return {
        paletteCanon: ["neon green", "warning red", "casino gold"],
        worldCanon: ["casino-cathedral tension", "dark trading room noir", "dashboard skyline"],
        lightingCanon: ["hard chart glow", "green-red contrast", "smoky backlight"],
      };
  }
}

function buildTokenAnchors(normalizedTrades: NormalizedTrade[]): VideoTokenAnchor[] {
  const byMint = new Map<
    string,
    {
      mint: string;
      symbol: string;
      name?: string;
      imageUrl?: string;
      tradeCount: number;
      solVolume: number;
      lastSeenTimestamp: number;
    }
  >();

  normalizedTrades.forEach((trade) => {
    const current = byMint.get(trade.mint) ?? {
      mint: trade.mint,
      symbol: trade.symbol ?? trade.mint.slice(0, 6).toUpperCase(),
      name: trade.name,
      imageUrl: trade.image,
      tradeCount: 0,
      solVolume: 0,
      lastSeenTimestamp: 0,
    };

    current.tradeCount += 1;
    current.solVolume += trade.solAmount;
    current.lastSeenTimestamp = Math.max(current.lastSeenTimestamp, trade.timestamp);
    if (!current.imageUrl && trade.image) {
      current.imageUrl = trade.image;
    }
    if (!current.name && trade.name) {
      current.name = trade.name;
    }
    if ((!current.symbol || current.symbol === current.mint.slice(0, 6).toUpperCase()) && trade.symbol) {
      current.symbol = trade.symbol;
    }

    byMint.set(trade.mint, current);
  });

  return [...byMint.values()]
    .sort((left, right) => {
      if (Boolean(left.imageUrl) !== Boolean(right.imageUrl)) {
        return Number(Boolean(right.imageUrl)) - Number(Boolean(left.imageUrl));
      }
      if (right.tradeCount !== left.tradeCount) {
        return right.tradeCount - left.tradeCount;
      }
      if (right.solVolume !== left.solVolume) {
        return right.solVolume - left.solVolume;
      }
      return right.lastSeenTimestamp - left.lastSeenTimestamp;
    })
    .slice(0, 4)
    .map((anchor, index) => ({
      mint: anchor.mint,
      symbol: anchor.symbol,
      name: anchor.name ?? null,
      imageUrl: anchor.imageUrl ?? null,
      role: index === 0 ? "primary" : index === 1 ? "secondary" : "supporting",
    }));
}

export function buildVideoIdentitySheet(input: {
  wallet: string;
  metrics: WalletMetrics;
  personality: string;
  modifiers: string[];
  normalizedTrades: NormalizedTrade[];
}): VideoIdentitySheet {
  const seed = hashString(
    [
      input.wallet,
      input.personality,
      ...[...input.modifiers].sort((left, right) => left.localeCompare(right)),
    ].join("|"),
  );
  const signals = deriveEmotionalSignals(input.metrics);
  const archetype = selectArchetype({
    personality: input.personality,
    modifiers: input.modifiers,
    metrics: input.metrics,
    signals,
  });
  const protagonist = buildProtagonist(archetype, seed + 17);
  const canon = buildCanonByArchetype(archetype);
  const tokenAnchors = buildTokenAnchors(input.normalizedTrades);
  const symbolCanon = unique(
    [
      ...VIDEO_VISUAL_SYMBOLS.slice(0, 2),
      pick(VIDEO_VISUAL_SYMBOLS, seed + 31),
      pick(VIDEO_VISUAL_SYMBOLS, seed + 47),
      tokenAnchors[0]?.symbol ? `${tokenAnchors[0].symbol} shrine iconography` : undefined,
      tokenAnchors[1]?.symbol ? `${tokenAnchors[1].symbol} poster fragments` : undefined,
    ].filter((value): value is string => Boolean(value)),
  ).slice(0, 5);

  const negativeConstraints = [
    "Do not replace the protagonist with abstract charts only.",
    "Do not invent new tokens, fake dashboards, or stat overlays.",
    "Do not drift away from the identity palette or world canon.",
    "Do not lose continuity of the primary token anchor once introduced.",
  ];

  const identityId = stableId([
    input.wallet,
    archetype,
    protagonist,
    ...canon.paletteCanon,
    ...canon.worldCanon,
    ...canon.lightingCanon,
    ...symbolCanon,
    ...tokenAnchors.map((anchor) => `${anchor.role}:${anchor.symbol}:${anchor.mint}`),
  ]);

  return {
    identityId,
    archetype,
    protagonist,
    paletteCanon: canon.paletteCanon,
    worldCanon: canon.worldCanon,
    lightingCanon: canon.lightingCanon,
    symbolCanon,
    tokenAnchors,
    negativeConstraints,
  };
}

function phaseAdjustments(phase: StoryBeatPhase): EmotionalSignals {
  switch (phase) {
    case "opening":
      return {
        confidence: 0.05,
        chaos: -0.08,
        desperation: -0.12,
        discipline: 0.08,
        luck: 0,
      };
    case "rise":
      return {
        confidence: 0.1,
        chaos: 0.05,
        desperation: -0.04,
        discipline: -0.02,
        luck: 0.08,
      };
    case "damage":
      return {
        confidence: -0.14,
        chaos: 0.18,
        desperation: 0.24,
        discipline: -0.16,
        luck: -0.1,
      };
    case "pivot":
      return {
        confidence: 0.04,
        chaos: -0.03,
        desperation: 0.08,
        discipline: 0.12,
        luck: 0.04,
      };
    case "climax":
      return {
        confidence: 0.14,
        chaos: 0.14,
        desperation: 0.02,
        discipline: -0.04,
        luck: 0.12,
      };
    case "aftermath":
    default:
      return {
        confidence: -0.02,
        chaos: -0.16,
        desperation: -0.12,
        discipline: 0.1,
        luck: -0.04,
      };
  }
}

function pickMomentText(input: {
  phase: StoryBeatPhase;
  moments: WalletMoments;
}): string | undefined {
  if (input.phase === "damage") {
    return (
      input.moments.mostUnwellMoment?.title ??
      input.moments.mostUnwellMoment?.description ??
      input.moments.fumbleMoment?.title ??
      input.moments.overcookedMoment?.title
    );
  }

  if (input.phase === "climax") {
    return (
      input.moments.mainCharacterMoment?.title ??
      input.moments.mainCharacterMoment?.description ??
      input.moments.trenchLoreMoment?.title ??
      input.moments.absoluteCinemaMoment?.title
    );
  }

  if (input.phase === "pivot") {
    return (
      input.moments.comebackMoment?.title ??
      input.moments.comebackMoment?.description ??
      input.moments.convictionMoment?.title
    );
  }

  if (input.phase === "aftermath") {
    return input.moments.escapeMoment?.title ?? input.moments.hadToBeThereMoment?.title;
  }

  return undefined;
}

function buildEmotionVector(
  baseSignals: EmotionalSignals,
  phase: StoryBeatPhase,
): SceneEmotionVector {
  const adjusted = phaseAdjustments(phase);
  const confidence = clamp(baseSignals.confidence + adjusted.confidence, 0, 1);
  const chaos = clamp(baseSignals.chaos + adjusted.chaos, 0, 1);
  const desperation = clamp(baseSignals.desperation + adjusted.desperation, 0, 1);
  const discipline = clamp(baseSignals.discipline + adjusted.discipline, 0, 1);
  const luck = clamp(baseSignals.luck + adjusted.luck, 0, 1);
  const intensity = clamp(average([confidence, chaos, desperation, 1 - discipline, luck]), 0, 1);

  return {
    confidence,
    chaos,
    desperation,
    discipline,
    luck,
    intensity,
  };
}

function buildSubjectFocus(input: {
  identity: VideoIdentitySheet;
  beat: StoryBeat;
  moments: WalletMoments;
}): string {
  const momentText = sanitizeNarrativeText(
    pickMomentText({
      phase: input.beat.phase,
      moments: input.moments,
    }),
  );
  const primaryAnchor = input.identity.tokenAnchors[0]?.symbol;

  if (momentText) {
    return momentText;
  }

  if (input.beat.phase === "opening") {
    return primaryAnchor
      ? `introduce ${primaryAnchor} as the first signal in the room`
      : "introduce the protagonist and the room before the pace spikes";
  }

  if (input.beat.phase === "climax" && primaryAnchor) {
    return `${primaryAnchor} turns into the poster image of the session`;
  }

  return sanitizeNarrativeText(input.beat.text) ?? "hold the protagonist in frame";
}

function describeDelta(previous: SceneEmotionVector | null, next: SceneEmotionVector): string[] {
  if (!previous) {
    return ["establish the identity sheet before any drift is allowed"];
  }

  const deltas: string[] = [];
  const diff = (label: string, value: number) => {
    if (value >= 0.12) {
      deltas.push(`${label} rises`);
    } else if (value <= -0.12) {
      deltas.push(`${label} cools`);
    }
  };

  diff("confidence", next.confidence - previous.confidence);
  diff("chaos", next.chaos - previous.chaos);
  diff("desperation", next.desperation - previous.desperation);
  diff("discipline", next.discipline - previous.discipline);
  diff("luck", next.luck - previous.luck);

  return deltas.length ? deltas : ["hold the emotional contour steady while the scene advances"];
}

export function buildSceneContinuityPrompt(
  identity: VideoIdentitySheet,
  state: SceneState,
): string {
  return compactSentence(
    [
      `Preserve ${identity.protagonist}.`,
      `Keep ${state.continuityAnchors.slice(0, 3).join(", ")} readable in the frame.`,
      `Let the transition feel like ${state.transitionNote.toLowerCase()}.`,
      `Avoid ${identity.negativeConstraints
        .slice(0, 2)
        .map((constraint) => constraint.replace(/^Do not /i, "").replace(/\.$/, ""))
        .join(" and ")}.`,
    ].join(" "),
  );
}

export function buildSceneStateSequence(input: {
  identity: VideoIdentitySheet;
  storyBeats: StoryBeat[];
  moments: WalletMoments;
  metrics: WalletMetrics;
}): SceneState[] {
  const baseSignals = deriveEmotionalSignals(input.metrics);

  return input.storyBeats.map((beat, index) => {
    const sceneNumber = index + 1;
    const emotionVector = buildEmotionVector(baseSignals, beat.phase);
    const subjectFocus = buildSubjectFocus({
      identity: input.identity,
      beat,
      moments: input.moments,
    });
    const continuityAnchors = unique(
      [
        input.identity.protagonist,
        input.identity.worldCanon[0],
        input.identity.paletteCanon[0],
        input.identity.symbolCanon[index % input.identity.symbolCanon.length],
        input.identity.tokenAnchors[0]?.symbol
          ? `${input.identity.tokenAnchors[0].symbol} remains the recurring token anchor`
          : undefined,
      ].filter((value): value is string => Boolean(value)),
    );
    const previousVector = index > 0 ? buildEmotionVector(baseSignals, input.storyBeats[index - 1]!.phase) : null;
    const deltaFromPrevious = describeDelta(previousVector, emotionVector);
    const transitionNote = compactSentence(
      `${beat.phase} phase pushes focus toward ${subjectFocus.toLowerCase()} while ${deltaFromPrevious.join(", ")}.`,
    );

    return {
      sceneNumber,
      phase: beat.phase,
      stateRef: `${input.identity.identityId}-state-${sceneNumber}`,
      emotionVector,
      subjectFocus,
      continuityAnchors,
      deltaFromPrevious,
      transitionNote,
    };
  });
}

export function alignSceneStatesToCount(input: {
  identity: VideoIdentitySheet;
  sceneStates: SceneState[];
  targetCount: number;
  phases?: StoryBeatPhase[];
}): SceneState[] {
  if (input.targetCount <= 0) {
    return [];
  }

  if (!input.sceneStates.length) {
    return Array.from({ length: input.targetCount }, (_, index) => ({
      sceneNumber: index + 1,
      phase: input.phases?.[index] ?? "opening",
      stateRef: `${input.identity.identityId}-scene-${index + 1}`,
      emotionVector: {
        confidence: 0.5,
        chaos: 0.4,
        desperation: 0.3,
        discipline: 0.5,
        luck: 0.5,
        intensity: 0.45,
      },
      subjectFocus: "keep the protagonist and token anchors stable",
      continuityAnchors: [
        input.identity.protagonist,
        input.identity.worldCanon[0] ?? "dark trading room",
        input.identity.paletteCanon[0] ?? "neon chart glow",
      ],
      deltaFromPrevious: ["hold the identity sheet steady"],
      transitionNote: "Carry the same identity sheet into the next cut.",
    }));
  }

  const lastIndex = input.sceneStates.length - 1;
  return Array.from({ length: input.targetCount }, (_, index) => {
    const sourceIndex =
      input.targetCount === 1
        ? Math.floor(lastIndex / 2)
        : Math.round((index * lastIndex) / (input.targetCount - 1));
    const source = input.sceneStates[sourceIndex] ?? input.sceneStates[lastIndex]!;
    return {
      ...source,
      sceneNumber: index + 1,
      phase: input.phases?.[index] ?? source.phase,
      stateRef: `${input.identity.identityId}-scene-${index + 1}`,
      continuityAnchors: unique(
        [
          ...source.continuityAnchors,
          input.identity.protagonist,
          input.identity.worldCanon[0],
          input.identity.paletteCanon[0],
        ].filter((value): value is string => Boolean(value)),
      ).slice(0, 5),
    };
  });
}

function providerFlavor(provider: VideoPromptProvider): string {
  switch (provider) {
    case "runway":
      return "Favor stylized realism, clear silhouette framing, and readable motion with coherent subject persistence.";
    case "kling":
      return "Favor crisp subject separation, glossy motion, and cinematic escalation without identity drift.";
    case "veo":
    default:
      return "Favor trailer-grade realism, stable continuity, and consistent subject persistence across every cut.";
  }
}

function buildCameraMovement(
  phase: StoryBeatPhase,
  intensity: number,
  seed: number,
): string {
  const motif = VIDEO_MOTIFS[phase];
  const base = pick(motif.cameraMoves, seed);
  if (intensity >= 0.72) {
    return `${base} with urgent trailer momentum and controlled instability`;
  }
  if (intensity >= 0.48) {
    return `${base} with mounting pressure and restrained drift`;
  }
  return `${base} with deliberate continuity-first pacing`;
}

function buildSoundDesign(phase: StoryBeatPhase, emotionVector: SceneEmotionVector, seed: number): string {
  const motif = VIDEO_MOTIFS[phase];
  const base = pick(motif.sound, seed);
  const policy =
    "background music bed + sparse voiceover commentary only; no character dialogue, no SFX, no distortion or clipping";
  if (emotionVector.chaos >= 0.65) {
    return `${base}, with the mix slightly out of breath but still readable; ${policy}`;
  }
  if (emotionVector.discipline >= 0.65) {
    return `${base}, with cleaner cadence and precise transitions; ${policy}`;
  }
  return `${base}, balanced for cinematic momentum and narration clarity; ${policy}`;
}

function buildProviderPrompt(input: {
  provider: VideoPromptProvider;
  identity: VideoIdentitySheet;
  state: SceneState;
  scene: CompileVideoSceneInput;
  shotType: string;
  cameraMovement: string;
  environment: string;
  characterAction: string;
  visualStyle: string;
  lighting: string;
  soundDesign: string;
  symbolicVisuals: string[];
  continuityNote: string;
}): string {
  return [
    `${input.shotType} inside ${input.environment}.`,
    `Camera movement: ${input.cameraMovement}.`,
    `Protagonist: ${input.identity.protagonist}.`,
    `State ref: ${input.state.stateRef}.`,
    `Subject focus: ${input.state.subjectFocus}.`,
    `Character action: ${input.characterAction}.`,
    `Visual style: ${input.visualStyle}.`,
    `Lighting: ${input.lighting}.`,
    `Sound design: ${input.soundDesign}.`,
    `Symbolic visuals: ${input.symbolicVisuals.join(", ")}.`,
    `Continuity anchors: ${input.state.continuityAnchors.join(", ")}.`,
    `Transition note: ${input.state.transitionNote}.`,
    `Continuity note: ${input.continuityNote}.`,
    `Emotional steering: confidence ${signalWord(input.state.emotionVector.confidence)}, chaos ${signalWord(input.state.emotionVector.chaos)}, desperation ${signalWord(input.state.emotionVector.desperation)}, discipline ${signalWord(input.state.emotionVector.discipline)}, luck ${signalWord(input.state.emotionVector.luck)}.`,
    "This is memecoin cinema, not analytics. Show charts as atmosphere, not as accounting. Never show raw PnL, balances, trade counts, or stat overlays as exposition.",
    providerFlavor(input.provider),
    `Identity bible: ${input.identity.archetype}; palette ${input.identity.paletteCanon.join(", ")}; world ${input.identity.worldCanon.join(", ")}; negative constraints ${input.identity.negativeConstraints.join(" ")}`,
  ].join(" ");
}

export function buildStoryBeatSceneInputs(storyBeats: StoryBeat[]): CompileVideoSceneInput[] {
  return storyBeats.map((beat, index) => ({
    sceneNumber: index + 1,
    phase: beat.phase,
    narrativeText: beat.text,
    visualHint: beat.symbolicVisualHint,
    narrationHint: beat.emotionalTone,
    symbolicVisualHint: beat.symbolicVisualHint,
  }));
}

export function compileVideoPromptSequence(input: {
  identity: VideoIdentitySheet;
  sceneStates: SceneState[];
  sceneInputs: CompileVideoSceneInput[];
}): VideoPromptScene[] {
  return input.sceneInputs.map((sceneInput, index) => {
    const state = input.sceneStates[index] ?? input.sceneStates[input.sceneStates.length - 1]!;
    const motif = VIDEO_MOTIFS[sceneInput.phase];
    const seed = hashString(`${input.identity.identityId}|${state.stateRef}|${sceneInput.sceneNumber}`);
    const shotType = pick(motif.shotTypes, seed + 3);
    const continuityNote = buildSceneContinuityPrompt(input.identity, state);
    const symbolicVisuals = unique(
      [
        input.identity.symbolCanon[index % input.identity.symbolCanon.length],
        sceneInput.symbolicVisualHint,
        input.identity.tokenAnchors[0]?.symbol
          ? `${input.identity.tokenAnchors[0].symbol} appears as a persistent prop`
          : undefined,
        pick(VIDEO_VISUAL_SYMBOLS, seed + 11),
      ].filter((value): value is string => Boolean(value)),
    ).slice(0, 4);
    const environment = compactSentence(
      `${pick(motif.environments, seed + 5)} carrying ${input.identity.worldCanon[0]} and ${input.identity.worldCanon[1] ?? input.identity.worldCanon[0]}`,
    );
    const characterAction = compactSentence(
      `${sanitizeNarrativeText(sceneInput.visualHint) ?? "the protagonist keeps the trade drama embodied"} while ${state.subjectFocus.toLowerCase()}`,
    );
    const visualStyle = compactSentence(
      `${pick(motif.styles, seed + 7)} with ${input.identity.paletteCanon.join(", ")} and ${input.identity.symbolCanon.slice(0, 2).join(", ")}`,
    );
    const lighting = compactSentence(
      `${pick(motif.lighting, seed + 9)} anchored to ${input.identity.lightingCanon.join(", ")}`,
    );
    const soundDesign = buildSoundDesign(sceneInput.phase, state.emotionVector, seed + 13);
    const narrationHook =
      sanitizeNarrativeText(sceneInput.narrationHint) ??
      sanitizeNarrativeText(sceneInput.narrativeText) ??
      "The frame keeps the protagonist and the chaos in the same story.";

    return {
      sceneNumber: sceneInput.sceneNumber,
      phase: sceneInput.phase,
      narrativePurpose: compactSentence(
        `Carry ${input.identity.archetype} through ${sceneInput.phase} while ${state.deltaFromPrevious.join(", ")}`,
      ),
      shotType,
      cameraMovement: buildCameraMovement(sceneInput.phase, state.emotionVector.intensity, seed + 15),
      environment,
      characterAction,
      visualStyle,
      lighting,
      soundDesign,
      symbolicVisuals,
      narrationHook,
      stateRef: state.stateRef,
      continuityAnchors: state.continuityAnchors,
      continuityNote,
      providerPrompts: {
        veo: buildProviderPrompt({
          provider: "veo",
          identity: input.identity,
          state,
          scene: sceneInput,
          shotType,
          cameraMovement: buildCameraMovement(sceneInput.phase, state.emotionVector.intensity, seed + 15),
          environment,
          characterAction,
          visualStyle,
          lighting,
          soundDesign,
          symbolicVisuals,
          continuityNote,
        }),
        runway: buildProviderPrompt({
          provider: "runway",
          identity: input.identity,
          state,
          scene: sceneInput,
          shotType,
          cameraMovement: buildCameraMovement(sceneInput.phase, state.emotionVector.intensity, seed + 15),
          environment,
          characterAction,
          visualStyle,
          lighting,
          soundDesign,
          symbolicVisuals,
          continuityNote,
        }),
        kling: buildProviderPrompt({
          provider: "kling",
          identity: input.identity,
          state,
          scene: sceneInput,
          shotType,
          cameraMovement: buildCameraMovement(sceneInput.phase, state.emotionVector.intensity, seed + 15),
          environment,
          characterAction,
          visualStyle,
          lighting,
          soundDesign,
          symbolicVisuals,
          continuityNote,
        }),
      },
    };
  });
}
