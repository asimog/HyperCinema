import { createCinemaRng, stablePick } from "@/lib/cinema/constants";
import type { CharacterArc, EmotionalSignals, NarrativeArchetype, ThreeActArc } from "@/lib/cinema/types";

function tonePhrase(input: { archetype: NarrativeArchetype; arc: CharacterArc }): string {
  switch (input.arc.id) {
    case "villain":
      return "temptation curdles into obsession";
    case "hero":
      return "fear becomes focus";
    case "jester":
      return "absurdity becomes momentum";
    case "martyr":
      return "conviction becomes weight";
    case "survivor":
      return "damage becomes endurance";
    case "prophet":
      return "omens become decisions";
    case "trickster":
      return "rules dissolve into riddles";
    case "fallen_hero":
      return "glory becomes a trap";
    case "pilgrim":
      return "searching becomes a path";
    case "ghost":
      return "silence becomes a presence";
    default:
      return "the night becomes a myth";
  }
}

export function buildThreeActArc(input: {
  archetype: NarrativeArchetype;
  characterArc: CharacterArc;
  signals: EmotionalSignals;
  protagonistPresence: string;
}): ThreeActArc {
  const actTone = tonePhrase({ archetype: input.archetype, arc: input.characterArc });

  const act1 = [
    "Act 1 - Entry Into The Trenches:",
    `A trader steps into the Pump.fun night where ${input.archetype.tone}.`,
    "The first click is not math; it's a vow.",
  ].join(" ");

  const act2 = [
    "Act 2 - Conflict / Character Arc:",
    `The world tightens until ${actTone}.`,
    "Every cut feels personal; every re-entry feels like fate tapping the shoulder.",
  ].join(" ");

  const act3 = [
    "Act 3 - Resolution:",
    "Sunrise arrives like a verdict.",
    input.characterArc.id === "hero" || input.characterArc.id === "survivor"
      ? "The trader stands up, battered but legible."
      : input.characterArc.id === "ghost"
        ? "The trader is still there, but almost not."
        : "The trader watches the last light fade and understands too late.",
  ].join(" ");

  return { act1, act2, act3 };
}
