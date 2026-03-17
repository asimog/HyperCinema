import type { StoryState } from "@/lib/cinema/types";
import {
  createCinemaRng,
  stablePick,
  stableShuffle,
} from "@/lib/cinema/constants";
import type {
  CharacterArcId,
  EntropyLevel,
  SceneType,
  VisualMetaphorEntry,
  VisualMetaphorMap,
  VisualMetaphorSelection,
} from "@/lib/cinema/types";
import { VISUAL_METAPHOR_LIBRARY } from "@/lib/cinema/visualMetaphorLibrary";

function uniq<T>(values: readonly T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function tagHintsForEntropy(entropy: EntropyLevel): string[] {
  switch (entropy) {
    case "high":
      return ["storm", "glitch", "impact", "collision", "strobe"];
    case "medium":
      return ["tension", "movement", "heat", "pressure"];
    case "low":
      return ["quiet", "haze", "slow", "stillness"];
    default:
      return ["tension"];
  }
}

function sceneTypeTags(sceneType: SceneType): string[] {
  switch (sceneType) {
    case "opening":
      return ["opening", "entry", "neon", "trench"];
    case "discovery":
      return ["discovery", "omens", "screens", "neon"];
    case "temptation":
      return ["temptation", "casino", "fomo", "chase"];
    case "first_conviction":
      return ["first_conviction", "shrine", "vow", "belief"];
    case "momentum":
      return ["momentum", "train", "rocket", "chase"];
    case "damage":
      return ["damage", "storm", "shatter", "loss"];
    case "escalation":
      return ["escalation", "heat", "casino", "glitch"];
    case "villain_turn":
      return ["villain_turn", "revenge", "rematch", "boxing"];
    case "jester_turn":
      return ["jester_turn", "funhouse", "absurd", "luck"];
    case "collapse":
      return ["collapse", "bridge", "storm", "failure"];
    case "comeback":
      return ["comeback", "sunrise", "battlefield", "recovery"];
    case "main_character":
      return ["main_character", "arena", "spotlight", "myth"];
    case "trench_lore":
      return ["trench_lore", "alley", "posters", "billboards"];
    case "absolute_cinema":
      return ["absolute_cinema", "set_piece", "epic", "myth"];
    case "aftermath":
      return ["aftermath", "sunrise", "quiet", "empty"];
    default:
      return [sceneType];
  }
}

function signalTags(state: StoryState): string[] {
  const tags: string[] = [];
  if (state.emotionalSignals.chaos >= 0.72) tags.push("storm", "glitch", "collision");
  if (state.emotionalSignals.desperation >= 0.65) tags.push("revenge", "rematch", "impact");
  if (state.emotionalSignals.discipline >= 0.68) tags.push("steady", "ritual", "precision");
  if (state.emotionalSignals.luck >= 0.62) tags.push("slot", "coin_spin", "surreal");
  if (state.emotionalSignals.confidence >= 0.66) tags.push("hero", "spotlight", "crown");
  return tags;
}

function tokenPlanTags(state: StoryState, sceneType: SceneType): string[] {
  const moments = state.tokenImagePlan.imageMoments.filter((moment) => moment.sceneType === sceneType);
  if (!moments.length) return [];
  return ["posters", "billboards", "hologram"];
}

function scoreEntry(input: {
  entry: VisualMetaphorEntry;
  arcId: CharacterArcId;
  tags: string[];
  primaryEnvironment?: string;
}): number {
  if (!input.entry.characterArcCompatibility.includes(input.arcId)) {
    return -1;
  }

  const entryTags = new Set(input.entry.triggerTags.map((t) => t.toLowerCase()));
  const wanted = input.tags.map((t) => t.toLowerCase());

  const matchCount = wanted.reduce((count, tag) => (entryTags.has(tag) ? count + 1 : count), 0);

  const continuityBonus =
    input.primaryEnvironment &&
    input.entry.environment.toLowerCase().includes(input.primaryEnvironment.toLowerCase())
      ? 0.6
      : 0;

  return matchCount + continuityBonus;
}

function pickMetaphorForScene(input: {
  state: StoryState;
  sceneType: SceneType;
  primaryEnvironment?: string;
}): VisualMetaphorSelection {
  const entropyHint = (() => {
    const mapping: Partial<Record<SceneType, keyof StoryState["sceneEntropy"]>> = {
      opening: "opening",
      discovery: "rise",
      temptation: "rise",
      first_conviction: "rise",
      momentum: "rise",
      escalation: "rise",
      damage: "damage",
      villain_turn: "pivot",
      jester_turn: "pivot",
      collapse: "damage",
      comeback: "pivot",
      main_character: "climax",
      trench_lore: "pivot",
      absolute_cinema: "climax",
      aftermath: "aftermath",
    };
    const phase = mapping[input.sceneType] ?? "rise";
    return input.state.sceneEntropy[phase];
  })();

  const tags = uniq([
    ...sceneTypeTags(input.sceneType),
    ...tagHintsForEntropy(entropyHint),
    ...signalTags(input.state),
    ...tokenPlanTags(input.state, input.sceneType),
    input.state.archetype.id,
    input.state.characterArc.id,
  ]);

  const scored = VISUAL_METAPHOR_LIBRARY.map((entry) => ({
    entry,
    score: scoreEntry({
      entry,
      arcId: input.state.characterArc.id,
      tags,
      primaryEnvironment: input.primaryEnvironment,
    }),
  }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  const rng = createCinemaRng(
    `metaphor:${input.state.wallet}:${input.state.rangeHours}:${input.sceneType}`,
  );
  const bestScore = scored[0]?.score ?? 0;
  const contenders = scored
    .filter((item) => item.score >= Math.max(0, bestScore - 1))
    .map((item) => item.entry);

  const entry = contenders.length ? stablePick(contenders, rng) : stablePick(VISUAL_METAPHOR_LIBRARY, rng);

  const continuityMotifs = stableShuffle(
    [...new Set([...entry.symbolicObjects, ...input.state.symbolicObjects])],
    rng,
  ).slice(0, 4);

  const matchedTags = tags.filter((tag) => entry.triggerTags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
  const reason = matchedTags.length
    ? `Matched tags: ${matchedTags.slice(0, 5).join(", ")}.`
    : "Selected for arc compatibility and continuity.";

  return { entry, reason, continuityMotifs };
}

export function mapVisualMetaphors(input: { state: StoryState; sceneTypes: SceneType[] }): VisualMetaphorMap {
  const openingType = input.sceneTypes[0] ?? "opening";
  const openingSelection = pickMetaphorForScene({
    state: input.state,
    sceneType: openingType,
  });
  const primaryEnvironment = openingSelection.entry.environment.split(",")[0]?.trim() || openingSelection.entry.environment;

  const bySceneType: VisualMetaphorMap["bySceneType"] = {};
  for (const sceneType of uniq(input.sceneTypes)) {
    bySceneType[sceneType] = pickMetaphorForScene({
      state: input.state,
      sceneType,
      primaryEnvironment,
    });
  }

  const paletteCanon = uniq([
    ...openingSelection.entry.colorPalette,
    "neon teal",
    "chart green",
    "warning red",
    "ink black",
  ]).slice(0, 6);

  const recurringSymbols = uniq([
    ...openingSelection.entry.symbolicObjects,
    ...input.state.symbolicObjects,
  ]).slice(0, 8);

  const soundPalette = uniq([
    ...input.state.archetype.preferredSoundProfile,
    "keyboard clicks",
    "rain on glass",
  ]).slice(0, 8);

  return {
    globalContinuity: {
      primaryEnvironment,
      paletteCanon,
      recurringSymbols,
      soundPalette,
    },
    bySceneType,
  };
}
