import type {
  CharacterArc,
  CharacterArcId,
  EntropyLevel,
  NarrativeArchetype,
} from "@/lib/cinema/types";

export const CINEMA_SYSTEM_ID = "hashcinema_veo_cinema_v1";

export const ENTROPY_ORDER: EntropyLevel[] = ["low", "medium", "high"];

export const CHARACTER_ARCS: Record<CharacterArcId, CharacterArc> = {
  hero: {
    id: "hero",
    displayName: "Hero Arc",
    synopsis:
      "The trader rises through adversity and reaches an earned clarity or comeback triumph.",
  },
  villain: {
    id: "villain",
    displayName: "Villain Arc",
    synopsis:
      "The trader's worst instincts take control: revenge entries, greed, delusion, and a cinematic fall.",
  },
  jester: {
    id: "jester",
    displayName: "Jester Arc",
    synopsis:
      "Absurdity and weird luck collide; clownish momentum becomes strangely effective or catastrophically funny.",
  },
  martyr: {
    id: "martyr",
    displayName: "Martyr Arc",
    synopsis:
      "Stoic suffering and stubborn conviction: holding through pain, refusing to let go, dignified and doomed.",
  },
  survivor: {
    id: "survivor",
    displayName: "Survivor Arc",
    synopsis:
      "Damage lands hard, but the trader stabilizes, escapes, or endures into a quieter aftermath.",
  },
  prophet: {
    id: "prophet",
    displayName: "Prophet Arc",
    synopsis:
      "Uncanny timing and eerie foresight; the trader sees the move early and walks the line between faith and fate.",
  },
  trickster: {
    id: "trickster",
    displayName: "Trickster Arc",
    synopsis:
      "Rule-breaking pivots and strange reversals; the market becomes a maze of traps and magic doors.",
  },
  fallen_hero: {
    id: "fallen_hero",
    displayName: "Fallen Hero Arc",
    synopsis:
      "Starts strong and noble, then overconfidence corrodes judgment until the story breaks into collapse.",
  },
  pilgrim: {
    id: "pilgrim",
    displayName: "Pilgrim Arc",
    synopsis:
      "Searching and uncertain; the trader moves through the trenches with hope, confusion, and fragile resolve.",
  },
  ghost: {
    id: "ghost",
    displayName: "Ghost Arc",
    synopsis:
      "Detached and quiet; the trader is present like a shadow under monitor glow, emotionally distant but watching.",
  },
};

export const NARRATIVE_ARCHETYPES: NarrativeArchetype[] = [
  {
    id: "gambler",
    displayName: "The Gambler",
    tone: "high-stakes neon risk, casino-cathedral tension",
    pacing: "frenetic",
    preferredVisualMotifs: ["casino lights", "roulette shadows", "dice in slow motion"],
    preferredSoundProfile: ["casino crowd murmur", "heartbeat bass", "chip clacks"],
    preferredActEmphasis: {
      act1: "temptation and first wager",
      act2: "double-down chaos",
      act3: "the house collects, or the player escapes",
    },
  },
  {
    id: "prophet",
    displayName: "The Prophet",
    tone: "mystic clarity, omen-heavy trench mythology",
    pacing: "measured",
    preferredVisualMotifs: ["omens", "holographic runes", "moonlit charts as constellations"],
    preferredSoundProfile: ["choir pads", "distant thunder", "sub-bass prophecy hum"],
    preferredActEmphasis: {
      act1: "signs appear",
      act2: "belief meets conflict",
      act3: "the omen resolves",
    },
  },
  {
    id: "survivor",
    displayName: "The Survivor",
    tone: "warzone endurance, battered but moving",
    pacing: "urgent",
    preferredVisualMotifs: ["battlefield dawn", "scarred alleyways", "breathing in fog"],
    preferredSoundProfile: ["wind through concrete", "boots on wet pavement", "quiet sirens"],
    preferredActEmphasis: {
      act1: "enter with hope",
      act2: "take damage and keep moving",
      act3: "escape into sunrise",
    },
  },
  {
    id: "martyr",
    displayName: "The Martyr",
    tone: "stoic pain, faith under fluorescent ruin",
    pacing: "slow",
    preferredVisualMotifs: ["empty casino at sunrise", "shrines", "cold rain on glass"],
    preferredSoundProfile: ["hollow room tone", "rain on glass", "low cello grief"],
    preferredActEmphasis: {
      act1: "conviction is sworn",
      act2: "suffering deepens",
      act3: "acceptance, or quiet ruin",
    },
  },
  {
    id: "trickster",
    displayName: "The Trickster",
    tone: "surreal reversals, glitch comedy, knife-edge irony",
    pacing: "urgent",
    preferredVisualMotifs: ["mirrors", "glitch signage", "doors that lead nowhere"],
    preferredSoundProfile: ["glitch synth tension", "rubber-band snaps", "laugh-echo reverb"],
    preferredActEmphasis: {
      act1: "odd discovery",
      act2: "twists and pivots",
      act3: "the punchline lands",
    },
  },
  {
    id: "pilgrim",
    displayName: "The Pilgrim",
    tone: "searching and tender, trench journey imagery",
    pacing: "measured",
    preferredVisualMotifs: ["train platforms", "long corridors", "maps made of light"],
    preferredSoundProfile: ["distant trains", "soft footsteps", "morning ambience"],
    preferredActEmphasis: {
      act1: "step onto the path",
      act2: "wander through conflict",
      act3: "arrive changed, or simply tired",
    },
  },
  {
    id: "believer",
    displayName: "The Believer",
    tone: "religious conviction, shrine-building, hopium hymns",
    pacing: "measured",
    preferredVisualMotifs: ["candles", "banners", "icons glowing in smoke"],
    preferredSoundProfile: ["hymn-like pads", "chant rhythms", "subtle bells"],
    preferredActEmphasis: {
      act1: "faith is lit",
      act2: "belief is tested",
      act3: "revelation or heartbreak",
    },
  },
  {
    id: "chaser",
    displayName: "The Chaser",
    tone: "FOMO propulsion, sprinting toward light",
    pacing: "frenetic",
    preferredVisualMotifs: ["departing trains", "neon alley posters", "sirens and streaks"],
    preferredSoundProfile: ["siren-like market tension", "fast hi-hats", "breath in mic"],
    preferredActEmphasis: {
      act1: "spot the flare",
      act2: "run until collapse",
      act3: "wake up at dawn, or not at all",
    },
  },
  {
    id: "alchemist",
    displayName: "The Alchemist",
    tone: "labs, transformations, turning chaos into meaning",
    pacing: "measured",
    preferredVisualMotifs: ["alchemy labs", "liquid light", "metals becoming neon"],
    preferredSoundProfile: ["electric hum", "glass clinks", "orchestral rise"],
    preferredActEmphasis: {
      act1: "ingredients gathered",
      act2: "reaction goes unstable",
      act3: "transformation completes",
    },
  },
  {
    id: "ghost",
    displayName: "The Ghost",
    tone: "eerie quiet, blue haze, detached observation",
    pacing: "slow",
    preferredVisualMotifs: ["empty trading floors", "dim monitors", "fogged windows"],
    preferredSoundProfile: ["hollow room tone", "soft electrical buzz", "distant rain"],
    preferredActEmphasis: {
      act1: "presence without confession",
      act2: "silent conflict",
      act3: "a vanished exit",
    },
  },
];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function toEntropyLevel(intensity01: number): EntropyLevel {
  const value = clamp01(intensity01);
  if (value >= 0.72) return "high";
  if (value >= 0.38) return "medium";
  return "low";
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCinemaRng(seed: string): () => number {
  return mulberry32(fnv1a32(seed));
}

export function stablePick<T>(values: T[], rng: () => number): T {
  if (!values.length) {
    throw new Error("stablePick requires a non-empty array");
  }
  const index = Math.floor(rng() * values.length);
  return values[Math.max(0, Math.min(values.length - 1, index))]!;
}

export function stableShuffle<T>(values: T[], rng: () => number): T[] {
  const array = [...values];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const tmp = array[index];
    array[index] = array[swapIndex]!;
    array[swapIndex] = tmp!;
  }
  return array;
}

