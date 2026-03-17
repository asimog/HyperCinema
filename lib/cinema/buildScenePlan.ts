import { createCinemaRng, stablePick } from "@/lib/cinema/constants";
import type {
  SceneDefinition,
  ScenePlan,
  SceneType,
  StoryState,
  TokenImageMoment,
  TokenImageUsage,
  VisualMetaphorMap,
} from "@/lib/cinema/types";

function uniq<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function totalDurationSecondsForRange(rangeHours: number): number {
  // Product context: 24h/48h/72h maps to 30s/60s/90s cinematic micro-films.
  if (rangeHours === 24) return 30;
  if (rangeHours === 48) return 60;
  if (rangeHours === 72) return 90;
  return 60;
}

function sceneCountForDuration(totalSeconds: number): number {
  if (totalSeconds <= 36) return 6;
  if (totalSeconds <= 72) return 8;
  return 10;
}

function hasMoment(state: StoryState, key: keyof StoryState["moments"]): boolean {
  return Boolean(state.moments[key]);
}

function baseSequenceForArc(state: StoryState, targetCount: number): SceneType[] {
  const arcId = state.characterArc.id;
  const hasLore = hasMoment(state, "trenchLoreMoment");

  const essentials: SceneType[] = ["opening", "damage", "absolute_cinema", "aftermath"];

  const eight: SceneType[] = (() => {
    switch (arcId) {
      case "hero":
        return [
          "opening",
          "discovery",
          "damage",
          "escalation",
          "comeback",
          "main_character",
          "absolute_cinema",
          "aftermath",
        ];
      case "villain":
        return [
          "opening",
          "temptation",
          "first_conviction",
          "escalation",
          "villain_turn",
          "collapse",
          "absolute_cinema",
          "aftermath",
        ];
      case "jester":
        return [
          "opening",
          "discovery",
          "momentum",
          "damage",
          "jester_turn",
          "escalation",
          hasLore ? "trench_lore" : "main_character",
          "aftermath",
        ];
      case "martyr":
        return [
          "opening",
          "first_conviction",
          "discovery",
          "damage",
          hasLore ? "trench_lore" : "escalation",
          "main_character",
          "absolute_cinema",
          "aftermath",
        ];
      case "survivor":
        return [
          "opening",
          "discovery",
          hasLore ? "trench_lore" : "momentum",
          "damage",
          "escalation",
          "comeback",
          "absolute_cinema",
          "aftermath",
        ];
      case "prophet":
        return [
          "opening",
          "discovery",
          "first_conviction",
          "momentum",
          "damage",
          "escalation",
          "absolute_cinema",
          "aftermath",
        ];
      case "trickster":
        return [
          "opening",
          "discovery",
          "momentum",
          "damage",
          "jester_turn",
          "escalation",
          "absolute_cinema",
          "aftermath",
        ];
      case "fallen_hero":
        return [
          "opening",
          "discovery",
          "momentum",
          "escalation",
          "damage",
          "villain_turn",
          "collapse",
          "aftermath",
        ];
      case "pilgrim":
        return [
          "opening",
          "discovery",
          "first_conviction",
          "momentum",
          "damage",
          hasLore ? "trench_lore" : "main_character",
          "absolute_cinema",
          "aftermath",
        ];
      case "ghost":
        return [
          "opening",
          "discovery",
          "damage",
          "trench_lore",
          "escalation",
          "main_character",
          "absolute_cinema",
          "aftermath",
        ];
      default:
        return [
          "opening",
          "discovery",
          "damage",
          "escalation",
          "absolute_cinema",
          "aftermath",
          "aftermath",
          "aftermath",
        ];
    }
  })();

  if (targetCount <= 6) {
    const core: SceneType[] = [
      "opening",
      arcId === "villain" ? "temptation" : "discovery",
      "damage",
      arcId === "villain" ? "villain_turn" : arcId === "jester" ? "jester_turn" : "comeback",
      "absolute_cinema",
      "aftermath",
    ];
    return core;
  }

  if (targetCount === 8) {
    const seq = eight.slice(0, 8);
    if (!seq.includes("absolute_cinema")) {
      seq[seq.length - 2] = "absolute_cinema";
    }
    seq[seq.length - 1] = "aftermath";
    return seq;
  }

  // 10 scenes: add density to Act 2 and include trench lore if present.
  const ten = [
    eight[0],
    eight[1],
    "momentum",
    eight[2],
    eight[3],
    hasLore ? "trench_lore" : "main_character",
    arcId === "villain" ? "villain_turn" : arcId === "jester" ? "jester_turn" : "escalation",
    "collapse",
    "absolute_cinema",
    "aftermath",
  ]
    .filter(Boolean)
    .slice(0, 10) as SceneType[];

  // Ensure essentials exist.
  for (const need of essentials) {
    if (!ten.includes(need)) {
      ten.splice(Math.max(1, ten.length - 2), 0, need);
    }
  }

  return ten.slice(0, 10);
}

function actNumberForSceneType(sceneType: SceneType): 1 | 2 | 3 {
  switch (sceneType) {
    case "opening":
    case "discovery":
    case "temptation":
    case "first_conviction":
      return 1;
    case "absolute_cinema":
    case "aftermath":
      return 3;
    default:
      return 2;
  }
}

function entropyForSceneType(state: StoryState, sceneType: SceneType): SceneDefinition["entropy"] {
  const phase: keyof StoryState["sceneEntropy"] = (() => {
    switch (sceneType) {
      case "opening":
        return "opening";
      case "damage":
      case "collapse":
        return "damage";
      case "villain_turn":
      case "jester_turn":
      case "comeback":
      case "trench_lore":
        return "pivot";
      case "absolute_cinema":
      case "main_character":
        return "climax";
      case "aftermath":
        return "aftermath";
      default:
        return "rise";
    }
  })();
  return state.sceneEntropy[phase];
}

function emotionalGoal(state: StoryState, sceneType: SceneType): string {
  switch (sceneType) {
    case "opening":
      return "Establish the trader protagonist and the trench world with immediate temptation.";
    case "discovery":
      return "Reveal the first omen and lure the protagonist deeper into the night.";
    case "temptation":
      return "Make the chase feel like salvation, even before the damage arrives.";
    case "first_conviction":
      return "Turn the click into a vow; make belief feel cinematic, not rational.";
    case "momentum":
      return "Accelerate into motion with readable tension and rising sound pressure.";
    case "damage":
      return "Land the first real wound; make consequences feel physical.";
    case "escalation":
      return "Increase heat and instability; the world begins to flicker.";
    case "villain_turn":
      return "Let obsession take the wheel; revenge becomes choreography.";
    case "jester_turn":
      return "Make chaos funny and terrifying; the market turns into a prank.";
    case "collapse":
      return "Break the illusion of control; the set collapses around the protagonist.";
    case "comeback":
      return "Carve a pivot toward survival or triumph; reset the breath of the film.";
    case "main_character":
      return "Put the protagonist under the spotlight; mythic presence, human stakes.";
    case "trench_lore":
      return "Show the city keeping receipts; posters, mascots, and trench myth continuity.";
    case "absolute_cinema":
      return "Deliver the set-piece climax: a symbolic payoff that feels like a trailer finale.";
    case "aftermath":
      return "Resolve into sunrise: acceptance, exhaustion, hollow victory, or quiet ruin.";
    default:
      return "Advance the arc with symbolic clarity.";
  }
}

function pickThemes(state: StoryState): string[] {
  return state.visualThemes.length ? state.visualThemes : ["neon trenches", "screen-lit haze"];
}

function pickThemeForScene(input: {
  state: StoryState;
  sceneIndex: number;
  sceneType: SceneType;
}): string {
  const rng = createCinemaRng(`theme:${input.state.wallet}:${input.state.rangeHours}:${input.sceneIndex}`);
  const themes = pickThemes(input.state);
  const bias = input.sceneType === "aftermath" ? ["sunrise aftermath", "quiet ruin"] : [];
  const pool = uniq([...bias, ...themes]);
  return stablePick(pool, rng);
}

function momentsForSceneType(
  moments: TokenImageMoment[],
  sceneType: SceneType,
): TokenImageMoment[] {
  return moments.filter((moment) => moment.sceneType === sceneType);
}

function tokenImageUsageForScene(state: StoryState, sceneType: SceneType): TokenImageUsage {
  const moments = momentsForSceneType(state.tokenImagePlan.imageMoments, sceneType);
  const mints = uniq(moments.map((moment) => moment.mint));
  const placements = moments.map((moment) => moment.placementHint);
  const imageUrls = moments.flatMap((moment) => (moment.image ? [moment.image] : []));
  return { mints, placements, imageUrls };
}

function soundMoodForScene(state: StoryState, sceneType: SceneType, entropy: SceneDefinition["entropy"]): string {
  const base = state.archetype.preferredSoundProfile;
  const act = actNumberForSceneType(sceneType);
  const actHint =
    act === 1 ? ["rain on glass", "keyboard clicks"] : act === 3 ? ["morning ambience", "hollow room tone"] : ["glitch synth tension", "heartbeat bass"];

  const entropyHint =
    entropy === "high"
      ? ["distant thunder", "impact hits"]
      : entropy === "low"
        ? ["electric hum", "soft room tone"]
        : ["siren-like market tension"];

  const pool = uniq([...actHint, ...entropyHint, ...base]);
  return pool.slice(0, 4).join(", ");
}

function sceneWeight(sceneType: SceneType): number {
  switch (sceneType) {
    case "absolute_cinema":
      return 1.65;
    case "aftermath":
      return 1.15;
    case "opening":
      return 1.05;
    case "damage":
    case "collapse":
      return 1.2;
    case "villain_turn":
    case "jester_turn":
    case "comeback":
      return 1.25;
    default:
      return 1;
  }
}

function entropyMultiplier(entropy: SceneDefinition["entropy"]): number {
  if (entropy === "high") return 1.12;
  if (entropy === "low") return 0.92;
  return 1;
}

function allocateDurations(total: number, weights: number[]): number[] {
  const minSeconds = 3;
  const weightSum = Math.max(1e-9, weights.reduce((sum, w) => sum + w, 0));
  const raw = weights.map((w) => (w / weightSum) * total);
  const floored = raw.map((v) => Math.max(minSeconds, Math.floor(v)));
  let remaining = total - floored.reduce((sum, v) => sum + v, 0);

  // Distribute remaining seconds to the scenes with the largest fractional parts.
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
    .map((item) => item.index);

  let cursor = 0;
  while (remaining > 0) {
    const index = order[cursor % order.length]!;
    floored[index] += 1;
    remaining -= 1;
    cursor += 1;
  }

  return floored;
}

export function buildScenePlan(input: {
  state: StoryState;
  metaphorMap: VisualMetaphorMap;
}): ScenePlan {
  const totalDurationSeconds = totalDurationSecondsForRange(input.state.rangeHours);
  const sceneCount = sceneCountForDuration(totalDurationSeconds);
  const sceneTypes = baseSequenceForArc(input.state, sceneCount).slice(0, sceneCount);

  const entropyByScene = sceneTypes.map((sceneType) => entropyForSceneType(input.state, sceneType));
  const weights = sceneTypes.map((sceneType, index) => {
    const base = sceneWeight(sceneType);
    const entropy = entropyByScene[index]!;
    const act = actNumberForSceneType(sceneType);
    const actMultiplier = act === 2 ? 1.06 : act === 1 ? 0.96 : 1.02;
    return base * entropyMultiplier(entropy) * actMultiplier;
  });

  const durations = allocateDurations(totalDurationSeconds, weights);

  const scenes: SceneDefinition[] = sceneTypes.map((sceneType, index) => {
    const sceneIndex = index + 1;
    const actNumber = actNumberForSceneType(sceneType);
    const entropy = entropyByScene[index]!;
    const theme = pickThemeForScene({ state: input.state, sceneIndex, sceneType });
    const tokenImageUsage = tokenImageUsageForScene(input.state, sceneType);
    const metaphorSelection = input.metaphorMap.bySceneType[sceneType];

    const metaphor = metaphorSelection
      ? {
          id: metaphorSelection.entry.id,
          environment: metaphorSelection.entry.environment,
          lighting: metaphorSelection.entry.lighting,
          colorPalette: metaphorSelection.entry.colorPalette,
          motionStyle: metaphorSelection.entry.motionStyle,
          soundStyle: metaphorSelection.entry.soundStyle,
          promptLanguageHints: metaphorSelection.entry.promptLanguageHints,
        }
      : undefined;

    const symbolicObjects = uniq([
      ...input.state.symbolicObjects.slice(0, 6),
      ...(metaphorSelection?.continuityMotifs ?? []),
    ]).slice(0, 10);

    return {
      sceneIndex,
      sceneType,
      actNumber,
      durationSeconds: durations[index] ?? 5,
      entropy,
      emotionalGoal: emotionalGoal(input.state, sceneType),
      visualTheme: theme,
      symbolicObjects,
      tokenImageUsage,
      soundMood: soundMoodForScene(input.state, sceneType, entropy),
      metaphor,
    };
  });

  return {
    scenes,
    totalDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
  };
}
