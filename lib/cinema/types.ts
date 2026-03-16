export type RangeHours = 24 | 48 | 72;

export interface Moment {
  title: string;
  description: string;
  explanation: string;
  humorLine: string;
  tradeSignatures?: string[];
  confidence?: number;
}

export interface EmotionalSignals {
  confidence: number;
  chaos: number;
  desperation: number;
  discipline: number;
  luck: number;
}

export type NarrativeArchetypeId =
  | "gambler"
  | "prophet"
  | "survivor"
  | "martyr"
  | "trickster"
  | "pilgrim"
  | "believer"
  | "chaser"
  | "alchemist"
  | "ghost";

export interface NarrativeArchetype {
  id: NarrativeArchetypeId;
  displayName: string;
  tone: string;
  pacing: "slow" | "measured" | "urgent" | "frenetic";
  preferredVisualMotifs: string[];
  preferredSoundProfile: string[];
  preferredActEmphasis: {
    act1: string;
    act2: string;
    act3: string;
  };
}

export type CharacterArcId =
  | "hero"
  | "villain"
  | "jester"
  | "martyr"
  | "survivor"
  | "prophet"
  | "trickster"
  | "fallen_hero"
  | "pilgrim"
  | "ghost";

export interface CharacterArc {
  id: CharacterArcId;
  displayName: string;
  synopsis: string;
}

export interface ThreeActArc {
  act1: string;
  act2: string;
  act3: string;
}

export type EntropyLevel = "low" | "medium" | "high";

export interface SceneEntropyProfile {
  opening: EntropyLevel;
  rise: EntropyLevel;
  damage: EntropyLevel;
  pivot: EntropyLevel;
  climax: EntropyLevel;
  aftermath: EntropyLevel;
}

export type VisualMetaphorId = string;

export interface VisualMetaphorEntry {
  id: VisualMetaphorId;
  triggerTags: string[];
  characterArcCompatibility: CharacterArcId[];
  environment: string;
  symbolicObjects: string[];
  lighting: string;
  colorPalette: string[];
  motionStyle: string;
  soundStyle: string;
  promptLanguageHints: string[];
}

export interface VisualMetaphorSelection {
  entry: VisualMetaphorEntry;
  reason: string;
  continuityMotifs: string[];
}

export interface VisualMetaphorMap {
  globalContinuity: {
    primaryEnvironment: string;
    paletteCanon: string[];
    recurringSymbols: string[];
    soundPalette: string[];
  };
  bySceneType: Partial<Record<SceneType, VisualMetaphorSelection>>;
}

export interface TokenAsset {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  image?: string | null;
  description?: string | null;
  status?: string | null;
}

export interface TokenImageMoment {
  mint: string;
  symbol?: string;
  name?: string;
  image?: string;
  reason: string;
  sceneType: SceneType;
  placementHint: string;
}

export interface TokenImagePlan {
  featuredMints: string[];
  imageMoments: TokenImageMoment[];
}

export type SceneType =
  | "opening"
  | "discovery"
  | "temptation"
  | "first_conviction"
  | "momentum"
  | "damage"
  | "escalation"
  | "villain_turn"
  | "jester_turn"
  | "collapse"
  | "comeback"
  | "main_character"
  | "trench_lore"
  | "absolute_cinema"
  | "aftermath";

export interface TokenImageUsage {
  mints: string[];
  placements: string[];
  imageUrls: string[];
}

export interface SceneDefinition {
  sceneIndex: number;
  sceneType: SceneType;
  actNumber: 1 | 2 | 3;
  durationSeconds: number;
  entropy: EntropyLevel;
  emotionalGoal: string;
  visualTheme: string;
  symbolicObjects: string[];
  tokenImageUsage: TokenImageUsage;
  soundMood: string;
  metaphor?: {
    id: VisualMetaphorId;
    environment: string;
    lighting: string;
    colorPalette: string[];
    motionStyle: string;
    soundStyle: string;
    promptLanguageHints: string[];
  };
}

export interface ScenePlan {
  scenes: SceneDefinition[];
  totalDurationSeconds: number;
}

export interface StoryState {
  wallet: string;
  rangeHours: RangeHours;
  personality: {
    id: string;
    displayName: string;
    explanation: string;
  };
  modifiers: Array<{
    id: string;
    displayName: string;
    explanation: string;
  }>;
  emotionalSignals: EmotionalSignals;
  moments: {
    villainArcMoment?: Moment;
    mainCharacterMoment?: Moment;
    trenchLoreMoment?: Moment;
    absoluteCinemaMoment?: Moment;
  };
  archetype: NarrativeArchetype;
  characterArc: CharacterArc;
  threeActArc: ThreeActArc;
  sceneEntropy: SceneEntropyProfile;
  visualThemes: string[];
  symbolicObjects: string[];
  tokenImagePlan: TokenImagePlan;
}

export interface VeoScenePrompt {
  sceneIndex: number;
  sceneType: SceneType;
  actNumber: 1 | 2 | 3;
  durationSeconds: number;
  entropy: EntropyLevel;
  prompt: string;
  soundCues: string[];
  tokenImageRefs: Array<{ mint: string; image?: string; placementHint: string }>;
  metaphorId?: string;
}

export interface VeoPromptPackage {
  title: string;
  tagline: string;
  storyState: StoryState;
  scenePlan: ScenePlan;
  scenePrompts: VeoScenePrompt[];
  prompt: string;
  promptCompact?: string;
}

