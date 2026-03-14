import { z } from "zod";

function metricBucketSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).catchall(z.number());
}

export const analyzeWalletProfileInputSchema = z.object({
  wallet: z.string().min(32).max(64),
  rangeHours: z.union([z.literal(24), z.literal(48), z.literal(72)]),
});

export const normalizedTradeSchema = z.object({
  signature: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
  mint: z.string().min(1),
  symbol: z.string().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
  side: z.union([z.literal("BUY"), z.literal("SELL")]),
  solAmount: z.number(),
  tokenAmount: z.number().optional(),
  priceEstimate: z.number().optional(),
  holdDurationMinutes: z.number().nullable().optional(),
  pnlSol: z.number().nullable().optional(),
  isOpenPosition: z.boolean().optional(),
  isPumpToken: z.boolean(),
});

const activityMetricsSchema = metricBucketSchema({
  tradeCount: z.number(),
  distinctTokenCount: z.number(),
  buyCount: z.number(),
  sellCount: z.number(),
  tradesPerHour: z.number(),
  rapidRotationScore: z.number(),
});

const timingMetricsSchema = metricBucketSchema({
  earlyEntryBias: z.number(),
  lateEntryBias: z.number(),
  rapidReentryScore: z.number(),
  nightActivityScore: z.number(),
});

const holdingMetricsSchema = metricBucketSchema({
  avgHoldMinutes: z.number(),
  shortHoldBias: z.number(),
  bagholdBias: z.number(),
});

const sizingMetricsSchema = metricBucketSchema({
  avgSolPerTrade: z.number(),
  sizeVariance: z.number(),
  concentrationScore: z.number(),
});

const positionMetricsSchema = metricBucketSchema({
  averagePositionSizeSOL: z.number(),
  maxPositionSizeSOL: z.number(),
  minPositionSizeSOL: z.number(),
  positionVariance: z.number(),
  sizeEscalationRate: z.number(),
  sizeReductionRate: z.number(),
  allInBehaviorScore: z.number(),
  microTradeRate: z.number(),
  confidencePositionScore: z.number(),
  lossPositionExpansion: z.number(),
  profitPositionExpansion: z.number(),
  positionConcentration: z.number(),
  tokenAllocationVariance: z.number(),
  exposureIntensity: z.number(),
});

const pnlMetricsSchema = metricBucketSchema({
  estimatedPnlSol: z.number(),
  realizedWinRate: z.number(),
  biggestWin: z.number(),
  biggestLoss: z.number(),
});

const profitMetricsSchema = metricBucketSchema({
  realizedPnlSOL: z.number(),
  unrealizedPnlSOL: z.number(),
  averageWinSOL: z.number(),
  averageLossSOL: z.number(),
  largestWinSOL: z.number(),
  largestLossSOL: z.number(),
  winRate: z.number(),
  lossRate: z.number(),
  profitFactor: z.number(),
  maxDrawdownSOL: z.number(),
  profitTakingSpeed: z.number(),
  profitHoldScore: z.number(),
  profitVariance: z.number(),
  profitStreak: z.number(),
  lossStreak: z.number(),
});

const attentionMetricsSchema = metricBucketSchema({
  chaseScore: z.number(),
  momentumAlignment: z.number(),
  attentionSensitivity: z.number(),
});

const riskMetricsSchema = metricBucketSchema({
  drawdownTolerance: z.number(),
  panicExitBias: z.number(),
  averagingDownBias: z.number(),
});

const recoveryMetricsSchema = metricBucketSchema({
  revengeTradeIntensity: z.number(),
  recoveryAttempts: z.number(),
  comebackTrades: z.number(),
  drawdownPersistence: z.number(),
  riskAfterLossScore: z.number(),
  psychologicalResilience: z.number(),
  recoverySuccessRate: z.number(),
});

const chaosMetricsSchema = metricBucketSchema({
  chaosIndex: z.number(),
  decisionVolatility: z.number(),
  behaviorVariance: z.number(),
  tradeTimingVariance: z.number(),
  coinSwitchFrequency: z.number(),
  strategyInstability: z.number(),
  impulseTradeRate: z.number(),
  emotionalVolatility: z.number(),
});

const behaviorMetricsSchema = metricBucketSchema({
  revengeBias: z.number(),
  chaosScore: z.number(),
  patienceScore: z.number(),
  convictionScore: z.number(),
});

const viralityMetricsSchema = metricBucketSchema({
  memeabilityScore: z.number(),
  shareabilityScore: z.number(),
  cinemaScore: z.number(),
});

const sessionMetricsSchema = metricBucketSchema({
  tradeClusterCount: z.number(),
  tradeSessions: z.number(),
  sessionDuration: z.number(),
  openingRushScore: z.number(),
  closingRushScore: z.number(),
});

const executionMetricsSchema = metricBucketSchema({
  entryPrecisionScore: z.number(),
  exitPrecisionScore: z.number(),
  invalidationRespectScore: z.number(),
  followThroughScore: z.number(),
  hesitationScore: z.number(),
  slippageRiskScore: z.number(),
  reriskingSpeedScore: z.number(),
  cooldownDisciplineScore: z.number(),
  tradeSelectionQuality: z.number(),
  timingEdgeBalance: z.number(),
});

const compositionMetricsSchema = metricBucketSchema({
  repeatTokenBias: z.number(),
  oneTickerObsessionScore: z.number(),
  longTailParticipation: z.number(),
  rotationBreadthScore: z.number(),
  concentrationEntropy: z.number(),
  tokenRevisitRate: z.number(),
  churnRate: z.number(),
  pumpStickiness: z.number(),
  focusDriftScore: z.number(),
});

export const walletMetricsSchema = z.object({
  activity: activityMetricsSchema,
  timing: timingMetricsSchema,
  holding: holdingMetricsSchema,
  sizing: sizingMetricsSchema,
  position: positionMetricsSchema,
  pnl: pnlMetricsSchema,
  profit: profitMetricsSchema,
  attention: attentionMetricsSchema,
  risk: riskMetricsSchema,
  recovery: recoveryMetricsSchema,
  chaos: chaosMetricsSchema,
  behavior: behaviorMetricsSchema,
  virality: viralityMetricsSchema,
  session: sessionMetricsSchema,
  execution: executionMetricsSchema,
  composition: compositionMetricsSchema,
});

const personalityScoreSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  score: z.number(),
  explanation: z.string().min(1),
});

const personalityCandidateSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  score: z.number(),
});

export const personalityProfileSchema = z.object({
  primary: personalityScoreSchema,
  secondaryCandidates: z.array(personalityCandidateSchema),
});

export const modifierResultSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  score: z.number(),
  explanation: z.string().min(1),
});

export const walletMomentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tradeSignatures: z.array(z.string()).optional(),
  explanation: z.string().min(1),
  humorLine: z.string().min(1),
  confidence: z.number().optional(),
});

export const walletMomentsSchema = z.object({
  absoluteCinemaMoment: walletMomentSchema.optional(),
  mostUnwellMoment: walletMomentSchema.optional(),
  mainCharacterMoment: walletMomentSchema.optional(),
  trenchLoreMoment: walletMomentSchema.optional(),
  paperHandsMoment: walletMomentSchema.optional(),
  diamondHandsMoment: walletMomentSchema.optional(),
  comebackMoment: walletMomentSchema.optional(),
  fumbleMoment: walletMomentSchema.optional(),
  goblinHourMoment: walletMomentSchema.optional(),
  convictionMoment: walletMomentSchema.optional(),
  hadToBeThereMoment: walletMomentSchema.optional(),
  escapeMoment: walletMomentSchema.optional(),
  overcookedMoment: walletMomentSchema.optional(),
});

export const cinematicSummarySchema = z.object({
  title: z.string().min(1),
  tone: z.string().min(1),
  lines: z.array(z.string().min(1)).min(3).max(6),
  templateId: z.string().optional(),
});

export const storyBeatSchema = z.object({
  phase: z.union([
    z.literal("opening"),
    z.literal("rise"),
    z.literal("damage"),
    z.literal("pivot"),
    z.literal("climax"),
    z.literal("aftermath"),
  ]),
  text: z.string().min(1),
  emotionalTone: z.string().min(1),
  symbolicVisualHint: z.string().min(1),
});

const videoPromptSceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  phase: z.union([
    z.literal("opening"),
    z.literal("rise"),
    z.literal("damage"),
    z.literal("pivot"),
    z.literal("climax"),
    z.literal("aftermath"),
  ]),
  narrativePurpose: z.string().min(1),
  shotType: z.string().min(1),
  cameraMovement: z.string().min(1),
  environment: z.string().min(1),
  characterAction: z.string().min(1),
  visualStyle: z.string().min(1),
  lighting: z.string().min(1),
  soundDesign: z.string().min(1),
  symbolicVisuals: z.array(z.string().min(1)).min(1),
  narrationHook: z.string().min(1),
  providerPrompts: z.object({
    veo: z.string().min(1),
    runway: z.string().min(1),
    kling: z.string().min(1),
  }),
});

export const writersRoomSelectionsSchema = z.object({
  contentSource: z.union([
    z.literal("file"),
    z.literal("missing"),
    z.literal("malformed"),
    z.literal("fallback-only"),
  ]),
  interpretationLineIds: z.array(z.string()),
  xLineIds: z.array(z.string()),
  cinematicSummaryId: z.string().optional(),
  copypastaIds: z.array(z.string()),
});

export const walletAnalysisResultSchema = z.object({
  wallet: z.string().min(1),
  rangeHours: z.number(),
  normalizedTrades: z.array(normalizedTradeSchema),
  metrics: walletMetricsSchema,
  personality: personalityProfileSchema,
  modifiers: z.array(modifierResultSchema),
  behaviorPatterns: z.array(z.string().min(1)).min(3).max(8),
  funObservations: z.array(z.string().min(1)).min(3).max(8),
  interpretationLines: z.array(z.string().min(1)).min(5).max(10),
  moments: walletMomentsSchema,
  walletVibeCheck: z.string().min(1),
  cinematicSummary: cinematicSummarySchema,
  xReadyLines: z.array(z.string().min(1)).min(5).max(10),
  storyBeats: z.array(storyBeatSchema).min(5).max(8),
  videoPromptSequence: z.array(videoPromptSceneSchema).min(5).max(8),
  writersRoomSelections: writersRoomSelectionsSchema,
});
