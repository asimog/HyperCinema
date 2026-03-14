import { VIDEO_MOTIFS, VIDEO_VISUAL_SYMBOLS } from "./contentBank";
import {
  MetricBucket,
  StoryBeat,
  VideoPromptProvider,
  VideoPromptScene,
  WalletMetrics,
  WalletMoments,
} from "./types";

type EmotionalSignals = {
  confidence: number;
  chaos: number;
  desperation: number;
  discipline: number;
  luck: number;
};

type NarrativeArchetype =
  | "The Gambler"
  | "The Prophet"
  | "The Survivor"
  | "The Martyr"
  | "The Trickster";

type SceneEntropy = "low" | "medium" | "high";

interface SceneDirection {
  archetype: NarrativeArchetype;
  entropy: SceneEntropy;
  signals: EmotionalSignals;
  protagonist: string;
  modifierTone: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
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
      .replace(/\b\d{1,2}:\d{2}\s?(?:AM|PM)\b/gi, "the cursed hour")
      .replace(/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?|sessions?|trades?|tokens?)\b/gi, "the whole ordeal")
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

function buildNarrativePurpose(beat: StoryBeat, momentTitle?: string): string {
  switch (beat.phase) {
    case "opening":
      return "Open the trailer with trench curiosity, first-contact tension, and a human at the center of the chaos.";
    case "rise":
      return "Let the room believe momentum might actually become destiny for a minute.";
    case "damage":
      return momentTitle
        ? `Turn ${momentTitle} into the scene where the chart starts acting like a personal enemy.`
        : "Show the market throwing the first chair while the protagonist still reaches for another click.";
    case "pivot":
      return "Capture the split second where caution loses the argument and plot takes the mouse.";
    case "climax":
      return momentTitle
        ? `Make ${momentTitle} feel like the frame the whole group chat screenshots forever.`
        : "Deliver the quote-worthy peak where the session becomes full trailer material.";
    case "aftermath":
      return "Land the sunrise, the exhaustion, and the joke that still hurts on replay.";
    default:
      return "Translate the wallet into cinematic trench folklore with a visible protagonist.";
  }
}

function pickMomentText(input: {
  phase: StoryBeat["phase"];
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

  return undefined;
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
      readMetric(metrics.risk, "overtradeScore"),
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
  return ranked[0]?.[0] as NarrativeArchetype;
}

function selectEntropy(input: {
  phase: StoryBeat["phase"];
  signals: EmotionalSignals;
}): SceneEntropy {
  let score = average([input.signals.chaos, input.signals.desperation]);

  if (input.phase === "damage" || input.phase === "climax") {
    score += 0.12;
  }

  if (input.phase === "aftermath") {
    score -= 0.3;
  }

  if (input.phase === "opening") {
    score -= 0.12;
  }

  if (score >= 0.7) return "high";
  if (score >= 0.38) return "medium";
  return "low";
}

function buildModifierTone(modifiers: string[], seed: number): string {
  const raw = modifiers.join(" ").toLowerCase();

  if (raw.includes("revenge")) {
    return "revenge-montage electricity";
  }
  if (raw.includes("hopium")) {
    return "hopium-with-production-budget energy";
  }
  if (raw.includes("diamond")) {
    return "diamond-hand stubbornness";
  }
  if (raw.includes("discipline")) {
    return "cold-process tension";
  }
  if (raw.includes("casino") || raw.includes("degen")) {
    return "full-casino-mode confidence";
  }

  return pick(
    [
      "late-night trench suspense",
      "internet-forged bravado",
      "questionable but cinematic conviction",
      "group-chat-lore momentum",
    ],
    seed,
  );
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

function buildEnvironment(base: string, input: {
  archetype: NarrativeArchetype;
  phase: StoryBeat["phase"];
  entropy: SceneEntropy;
}): string {
  const archetypeFlavor: Record<NarrativeArchetype, string> = {
    "The Gambler": "casino-cathedral tension",
    "The Prophet": "oracle-desk mystique",
    "The Survivor": "storm-bunker resolve",
    "The Martyr": "conviction-shrine drama",
    "The Trickster": "funhouse-market surrealism",
  };

  const phaseFlavor: Record<StoryBeat["phase"], string> = {
    opening: "where the first candle feels like prophecy",
    rise: "where momentum starts flirting back",
    damage: "while the walls flash like a market panic attack",
    pivot: "split between comeback fantasy and caution tape",
    climax: "as the whole room turns into trench folklore",
    aftermath: "after the storm finally admits it happened",
  };

  const entropyFlavor: Record<SceneEntropy, string> = {
    low: "kept readable and deliberate",
    medium: "with pressure steadily building in the background",
    high: "with panic leaking through every light source",
  };

  return `${base}, carrying ${archetypeFlavor[input.archetype]} ${phaseFlavor[input.phase]}, ${entropyFlavor[input.entropy]}`;
}

function buildCharacterAction(base: string, input: {
  archetype: NarrativeArchetype;
  modifierTone: string;
  phase: StoryBeat["phase"];
}): string {
  const archetypeFlavor: Record<NarrativeArchetype, string> = {
    "The Gambler": "like the market talked first",
    "The Prophet": "with eerie calm and dangerous certainty",
    "The Survivor": "with battle-worn focus and zero interest in folding",
    "The Martyr": "like conviction has become a religious object",
    "The Trickster": "with gremlin confidence and suspicious plot armor",
  };

  const phaseFlavor: Record<StoryBeat["phase"], string> = {
    opening: "before the room has time to call it a bad idea",
    rise: "as the screens start rewarding the delusion",
    damage: "while the market keeps testing their dignity",
    pivot: "at the exact moment caution leaves the building",
    climax: "when everyone watching realizes this became a trailer",
    aftermath: "after the adrenaline has already spent itself",
  };

  return `${base} ${archetypeFlavor[input.archetype]} under ${input.modifierTone}, ${phaseFlavor[input.phase]}`;
}

function buildVisualStyle(base: string, input: {
  archetype: NarrativeArchetype;
  phase: StoryBeat["phase"];
  entropy: SceneEntropy;
}): string {
  const palette: Record<NarrativeArchetype, string> = {
    "The Gambler": "neon green, warning red, and casino gold",
    "The Prophet": "amber prophecy glow, dark monitor blues, and chart green",
    "The Survivor": "storm blue, bruised purple, and cold sunrise gray",
    "The Martyr": "ash black, sacrificial crimson, and stubborn gold",
    "The Trickster": "acid neon, meme-glitch cyan, and funhouse crimson",
  };

  const phaseTexture: Record<StoryBeat["phase"], string> = {
    opening: "slow-burn trailer framing",
    rise: "high-voltage escalation",
    damage: "panic-thriller texture",
    pivot: "decision-point drama",
    climax: "maximum trailer payoff",
    aftermath: "melancholic epilogue grain",
  };

  const entropyTexture: Record<SceneEntropy, string> = {
    low: "clean composition and patient focus",
    medium: "mounting motion and layered tension",
    high: "restless motion and controlled visual overload",
  };

  return `${base} with ${palette[input.archetype]}, ${phaseTexture[input.phase]}, and ${entropyTexture[input.entropy]}`;
}

function buildLighting(base: string, input: {
  phase: StoryBeat["phase"];
  entropy: SceneEntropy;
}): string {
  const entropyFlavor: Record<SceneEntropy, string> = {
    low: "kept steady like a held breath",
    medium: "flickering like the room senses trouble",
    high: "pulsing like the chart has seized control of the building",
  };

  const phaseFlavor: Record<StoryBeat["phase"], string> = {
    opening: "with first-contact suspense",
    rise: "with seductive momentum",
    damage: "with emergency red spill",
    pivot: "with split-color indecision",
    climax: "with trailer-grade spectacle",
    aftermath: "with tired sunrise honesty",
  };

  return `${base}, ${phaseFlavor[input.phase]}, ${entropyFlavor[input.entropy]}`;
}

function buildSoundDesign(base: string, input: {
  phase: StoryBeat["phase"];
  signals: EmotionalSignals;
}): string {
  const phaseFlavor: Record<StoryBeat["phase"], string> = {
    opening: "soft tension music, keyboard clicks, and a room preparing to get weird",
    rise: "accelerating synth pressure, notification pings, and rising trailer drums",
    damage: "heartbeat bass, distorted alerts, and a collective oh-no in the mix",
    pivot: "brief silence followed by a risky inhale and a harder beat",
    climax: "orchestral lift colliding with electronic impact and crowd-energy static",
    aftermath: "soft piano residue, cooling fans, and one last guilty click",
  };

  const chaosFlavor =
    input.signals.chaos >= 0.65
      ? "The mix should feel slightly out of breath."
      : "The mix should stay cinematic and readable.";

  return `${base}; ${phaseFlavor[input.phase]}. ${chaosFlavor}`;
}

function buildNarrationHook(input: {
  beat: StoryBeat;
  momentHint?: string;
  direction: SceneDirection;
  seed: number;
}): string {
  const momentHint = sanitizeNarrativeText(input.momentHint);

  switch (input.beat.phase) {
    case "opening":
      return pick(
        [
          `The night opens like the chart already owes ${input.direction.protagonist} a storyline.`,
          `The first candle wakes up and the whole room immediately mistakes it for destiny.`,
          `${input.direction.modifierTone} arrives before caution even logs in.`,
        ],
        input.seed,
      );
    case "rise":
      return pick(
        [
          `Momentum starts flirting back and everybody acts like this was always the script.`,
          `Confidence gets louder, the screens get greener, and the room forgets how consequences work.`,
          `The play starts looking real enough to screenshot and dangerous enough to keep clicking.`,
        ],
        input.seed,
      );
    case "damage":
      return (
        momentHint ??
        pick(
          [
            `Then the chart throws a chair and somebody still decides this is a buying environment.`,
            `This is the chapter where logic goes for a walk and adrenaline grabs the keyboard.`,
            `The room stops being a war room and starts behaving like an intervention nobody attends.`,
          ],
          input.seed,
        )
      );
    case "pivot":
      return (
        momentHint ??
        pick(
          [
            `Somewhere between comeback and bad idea, the next click becomes the whole movie.`,
            `The room pauses just long enough for hope to sneak back in wearing a fake mustache.`,
            `This is the breath before the sequel where caution loses by split decision.`,
          ],
          input.seed,
        )
      );
    case "climax":
      return (
        momentHint ??
        pick(
          [
            `This is the frame the group chat will retell like eyewitness mythology.`,
            `The chart finally gives the trailer its money shot and nobody in the room acts normal about it.`,
            `Heroism, delusion, and timing collide hard enough to become trench folklore.`,
          ],
          input.seed,
        )
      );
    case "aftermath":
      return pick(
        [
          `Sunrise enters quietly while the lesson refuses to do the same.`,
          `The monitors cool off, the room gets honest, and the joke still lands a little too hard.`,
          `The night ends with leftover glow, emotional smoke, and one unforgettable screenshot energy.`,
        ],
        input.seed,
      );
    default:
      return sanitizeNarrativeText(input.beat.text) ?? "The trenches turn one more night into a watchable cautionary tale.";
  }
}

function providerPrompt(
  provider: VideoPromptProvider,
  scene: Omit<VideoPromptScene, "providerPrompts">,
  direction: SceneDirection,
): string {
  const common = [
    `${scene.shotType} inside ${scene.environment}.`,
    `Camera movement: ${scene.cameraMovement}.`,
    `The protagonist is a ${direction.protagonist}.`,
    `Character action: ${scene.characterAction}.`,
    `Visual style: ${scene.visualStyle}.`,
    `Lighting: ${scene.lighting}.`,
    `Sound design: ${scene.soundDesign}.`,
    `Symbolic visuals: ${scene.symbolicVisuals.join(", ")}.`,
    `Narrative hook: ${scene.narrationHook}.`,
    `Emotional steering: confidence ${signalWord(direction.signals.confidence)}, chaos ${signalWord(direction.signals.chaos)}, desperation ${signalWord(direction.signals.desperation)}, discipline ${signalWord(direction.signals.discipline)}, luck ${signalWord(direction.signals.luck)}.`,
    `Archetype: ${direction.archetype}. Scene entropy: ${direction.entropy}.`,
    "This is memecoin cinema, not analytics. Show charts as atmosphere, not as accounting. Never show raw PnL, balances, trade counts, or stat overlays as exposition.",
  ];

  if (provider === "veo") {
    return [
      ...common,
      "Favor trailer-grade realism, meme-native symbolism, and clean visual continuity between acts.",
      "Let the market feel like an antagonist and the protagonist feel visibly human inside the chaos.",
    ].join(" ");
  }

  if (provider === "runway") {
    return [
      ...common,
      "Favor stylized realism, strong silhouette framing, and readable motion that still feels internet-native.",
      "Keep the scene playful, cinematic, and emotionally legible even at peak chaos.",
    ].join(" ");
  }

  return [
    ...common,
    "Favor bold spectacle, crisp subject separation, and glossy cinematic motion with surreal chart symbolism.",
    "Keep the energy high without turning the frame into abstract noise.",
  ].join(" ");
}

export function generateVideoPromptSequence(input: {
  wallet: string;
  metrics: WalletMetrics;
  personality: string;
  modifiers: string[];
  storyBeats: StoryBeat[];
  moments: WalletMoments;
}): VideoPromptScene[] {
  const seedBase = hashString(
    [
      input.wallet,
      input.personality,
      ...input.modifiers,
      readMetric(input.metrics.activity, "tradeCount"),
      readMetric(input.metrics.profit, "realizedPnlSOL"),
    ].join("|"),
  );
  const signals = deriveEmotionalSignals(input.metrics);
  const archetype = selectArchetype({
    personality: input.personality,
    modifiers: input.modifiers,
    metrics: input.metrics,
    signals,
  });
  const protagonist = buildProtagonist(archetype, seedBase + 41);
  const modifierTone = buildModifierTone(input.modifiers, seedBase + 59);
  const beatCount = clamp(input.storyBeats.length, 5, 8);

  return input.storyBeats.slice(0, beatCount).map((beat, index) => {
    const motif = VIDEO_MOTIFS[beat.phase];
    const localSeed = seedBase + index * 97;
    const entropy = selectEntropy({
      phase: beat.phase,
      signals,
    });
    const momentText = pickMomentText({
      phase: beat.phase,
      moments: input.moments,
    });
    const momentHint = sanitizeNarrativeText(momentText);
    const symbolicVisuals = [
      pick(VIDEO_VISUAL_SYMBOLS, localSeed),
      pick(VIDEO_VISUAL_SYMBOLS, localSeed + 11),
      sanitizeNarrativeText(beat.symbolicVisualHint),
    ].filter(
      (value, position, values): value is string =>
        Boolean(value) && values.indexOf(value) === position,
    );

    const direction: SceneDirection = {
      archetype,
      entropy,
      signals,
      protagonist,
      modifierTone,
    };

    const shotType = pick(motif.shotTypes, localSeed + 3);
    const cameraMovement = `${pick(motif.cameraMoves, localSeed + 5)} with ${
      entropy === "high"
        ? "frantic trailer energy and sudden lurches"
        : entropy === "medium"
          ? "mounting tension and controlled drift"
          : "patient, deliberate suspense"
    }`;

    const sceneBase: Omit<VideoPromptScene, "providerPrompts"> = {
      sceneNumber: index + 1,
      phase: beat.phase,
      narrativePurpose: buildNarrativePurpose(beat, momentHint),
      shotType,
      cameraMovement,
      environment: buildEnvironment(pick(motif.environments, localSeed + 7), {
        archetype,
        phase: beat.phase,
        entropy,
      }),
      characterAction: buildCharacterAction(pick(motif.actions, localSeed + 13), {
        archetype,
        modifierTone,
        phase: beat.phase,
      }),
      visualStyle: buildVisualStyle(pick(motif.styles, localSeed + 17), {
        archetype,
        phase: beat.phase,
        entropy,
      }),
      lighting: buildLighting(pick(motif.lighting, localSeed + 19), {
        phase: beat.phase,
        entropy,
      }),
      soundDesign: buildSoundDesign(pick(motif.sound, localSeed + 23), {
        phase: beat.phase,
        signals,
      }),
      symbolicVisuals,
      narrationHook: buildNarrationHook({
        beat,
        momentHint,
        direction,
        seed: localSeed + 29,
      }),
    };

    return {
      ...sceneBase,
      providerPrompts: {
        veo: providerPrompt("veo", sceneBase, direction),
        runway: providerPrompt("runway", sceneBase, direction),
        kling: providerPrompt("kling", sceneBase, direction),
      },
    };
  });
}
