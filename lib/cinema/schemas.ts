import { z } from "zod";

export const rangeHoursSchema = z.union([z.literal(24), z.literal(48), z.literal(72)]);

export const emotionalSignalsSchema = z.object({
  confidence: z.number().min(0).max(1),
  chaos: z.number().min(0).max(1),
  desperation: z.number().min(0).max(1),
  discipline: z.number().min(0).max(1),
  luck: z.number().min(0).max(1),
});

export const momentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  explanation: z.string().min(1),
  humorLine: z.string().min(1),
  tradeSignatures: z.array(z.string().min(1)).optional(),
  confidence: z.number().optional(),
});

export const narrativeArchetypeSchema = z.object({
  id: z.union([
    z.literal("gambler"),
    z.literal("prophet"),
    z.literal("survivor"),
    z.literal("martyr"),
    z.literal("trickster"),
    z.literal("pilgrim"),
    z.literal("believer"),
    z.literal("chaser"),
    z.literal("alchemist"),
    z.literal("ghost"),
  ]),
  displayName: z.string().min(1),
  tone: z.string().min(1),
  pacing: z.union([
    z.literal("slow"),
    z.literal("measured"),
    z.literal("urgent"),
    z.literal("frenetic"),
  ]),
  preferredVisualMotifs: z.array(z.string().min(1)).min(1),
  preferredSoundProfile: z.array(z.string().min(1)).min(1),
  preferredActEmphasis: z.object({
    act1: z.string().min(1),
    act2: z.string().min(1),
    act3: z.string().min(1),
  }),
});

export const characterArcSchema = z.object({
  id: z.union([
    z.literal("hero"),
    z.literal("villain"),
    z.literal("jester"),
    z.literal("martyr"),
    z.literal("survivor"),
    z.literal("prophet"),
    z.literal("trickster"),
    z.literal("fallen_hero"),
    z.literal("pilgrim"),
    z.literal("ghost"),
  ]),
  displayName: z.string().min(1),
  synopsis: z.string().min(1),
});

export const threeActArcSchema = z.object({
  act1: z.string().min(1),
  act2: z.string().min(1),
  act3: z.string().min(1),
});

export const entropyLevelSchema = z.union([
  z.literal("low"),
  z.literal("medium"),
  z.literal("high"),
]);

export const sceneEntropyProfileSchema = z.object({
  opening: entropyLevelSchema,
  rise: entropyLevelSchema,
  damage: entropyLevelSchema,
  pivot: entropyLevelSchema,
  climax: entropyLevelSchema,
  aftermath: entropyLevelSchema,
});

export const tokenAssetSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1).nullable().optional(),
  name: z.string().min(1).nullable().optional(),
  image: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const tokenImageMomentSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  reason: z.string().min(1),
  sceneType: z.union([
    z.literal("opening"),
    z.literal("discovery"),
    z.literal("temptation"),
    z.literal("first_conviction"),
    z.literal("momentum"),
    z.literal("damage"),
    z.literal("escalation"),
    z.literal("villain_turn"),
    z.literal("jester_turn"),
    z.literal("collapse"),
    z.literal("comeback"),
    z.literal("main_character"),
    z.literal("trench_lore"),
    z.literal("absolute_cinema"),
    z.literal("aftermath"),
  ]),
  placementHint: z.string().min(1),
});

export const tokenImagePlanSchema = z.object({
  featuredMints: z.array(z.string().min(1)),
  imageMoments: z.array(tokenImageMomentSchema),
});

export const storyStateSchema = z.object({
  wallet: z.string().min(1),
  rangeHours: rangeHoursSchema,
  personality: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    explanation: z.string().min(1),
  }),
  modifiers: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  emotionalSignals: emotionalSignalsSchema,
  moments: z.object({
    villainArcMoment: momentSchema.optional(),
    mainCharacterMoment: momentSchema.optional(),
    trenchLoreMoment: momentSchema.optional(),
    absoluteCinemaMoment: momentSchema.optional(),
  }),
  archetype: narrativeArchetypeSchema,
  characterArc: characterArcSchema,
  threeActArc: threeActArcSchema,
  sceneEntropy: sceneEntropyProfileSchema,
  visualThemes: z.array(z.string().min(1)),
  symbolicObjects: z.array(z.string().min(1)),
  tokenImagePlan: tokenImagePlanSchema,
});

export const tokenImageUsageSchema = z.object({
  mints: z.array(z.string().min(1)),
  placements: z.array(z.string().min(1)),
  imageUrls: z.array(z.string().min(1)),
});

export const sceneDefinitionSchema = z.object({
  sceneIndex: z.number().int().positive(),
  sceneType: z.union([
    z.literal("opening"),
    z.literal("discovery"),
    z.literal("temptation"),
    z.literal("first_conviction"),
    z.literal("momentum"),
    z.literal("damage"),
    z.literal("escalation"),
    z.literal("villain_turn"),
    z.literal("jester_turn"),
    z.literal("collapse"),
    z.literal("comeback"),
    z.literal("main_character"),
    z.literal("trench_lore"),
    z.literal("absolute_cinema"),
    z.literal("aftermath"),
  ]),
  actNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  durationSeconds: z.number().int().positive(),
  entropy: entropyLevelSchema,
  emotionalGoal: z.string().min(1),
  visualTheme: z.string().min(1),
  symbolicObjects: z.array(z.string().min(1)),
  tokenImageUsage: tokenImageUsageSchema,
  soundMood: z.string().min(1),
  metaphor: z
    .object({
      id: z.string().min(1),
      environment: z.string().min(1),
      lighting: z.string().min(1),
      colorPalette: z.array(z.string().min(1)).min(1),
      motionStyle: z.string().min(1),
      soundStyle: z.string().min(1),
      promptLanguageHints: z.array(z.string().min(1)),
    })
    .optional(),
});

export const scenePlanSchema = z.object({
  scenes: z.array(sceneDefinitionSchema).min(6).max(10),
  totalDurationSeconds: z.number().int().positive(),
});

export const veoScenePromptSchema = z.object({
  sceneIndex: z.number().int().positive(),
  sceneType: sceneDefinitionSchema.shape.sceneType,
  actNumber: sceneDefinitionSchema.shape.actNumber,
  durationSeconds: sceneDefinitionSchema.shape.durationSeconds,
  entropy: sceneDefinitionSchema.shape.entropy,
  prompt: z.string().min(1),
  soundCues: z.array(z.string().min(1)).min(1),
  tokenImageRefs: z.array(
    z.object({
      mint: z.string().min(1),
      image: z.string().min(1).optional(),
      placementHint: z.string().min(1),
    }),
  ),
  metaphorId: z.string().min(1).optional(),
});

export const veoPromptPackageSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1),
  storyState: storyStateSchema,
  scenePlan: scenePlanSchema,
  scenePrompts: z.array(veoScenePromptSchema).min(6).max(10),
  prompt: z.string().min(1),
  promptCompact: z.string().min(1).optional(),
});

