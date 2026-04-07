export type AnalysisRangeHours = 24 | 48 | 72;

export type NormalizedTradeSide = "BUY" | "SELL";

export interface AnalyzeWalletProfileInput {
  wallet: string;
  rangeHours: AnalysisRangeHours;
}

export interface PumpTradeLike {
  timestamp: number;
  signature: string;
  source?: string;
  mint: string;
  symbol?: string;
  name?: string;
  image?: string | null;
  side: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
}

export type MetricPath = string;

export interface MetricBucket {
  [key: string]: number;
}

export interface NormalizedTrade {
  signature: string;
  timestamp: number;
  mint: string;
  symbol?: string;
  name?: string;
  image?: string;
  side: NormalizedTradeSide;
  solAmount: number;
  tokenAmount?: number;
  priceEstimate?: number;
  holdDurationMinutes?: number | null;
  pnlSol?: number | null;
  isOpenPosition?: boolean;
  isPumpToken: boolean;
}

export interface ActivityMetrics extends MetricBucket {
  tradeCount: number;
  distinctTokenCount: number;
  buyCount: number;
  sellCount: number;
  tradesPerHour: number;
  rapidRotationScore: number;
}

export interface TimingMetrics extends MetricBucket {
  earlyEntryBias: number;
  lateEntryBias: number;
  rapidReentryScore: number;
  nightActivityScore: number;
}

export interface HoldingMetrics extends MetricBucket {
  avgHoldMinutes: number;
  shortHoldBias: number;
  bagholdBias: number;
}

export interface SizingMetrics extends MetricBucket {
  avgSolPerTrade: number;
  sizeVariance: number;
  concentrationScore: number;
}

export interface PositionMetrics extends MetricBucket {
  averagePositionSizeSOL: number;
  maxPositionSizeSOL: number;
  minPositionSizeSOL: number;
  positionVariance: number;
  sizeEscalationRate: number;
  sizeReductionRate: number;
  allInBehaviorScore: number;
  microTradeRate: number;
  confidencePositionScore: number;
  lossPositionExpansion: number;
  profitPositionExpansion: number;
  positionConcentration: number;
  tokenAllocationVariance: number;
  exposureIntensity: number;
}

export interface PnlMetrics extends MetricBucket {
  estimatedPnlSol: number;
  realizedWinRate: number;
  biggestWin: number;
  biggestLoss: number;
}

export interface ProfitMetrics extends MetricBucket {
  realizedPnlSOL: number;
  unrealizedPnlSOL: number;
  averageWinSOL: number;
  averageLossSOL: number;
  largestWinSOL: number;
  largestLossSOL: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  maxDrawdownSOL: number;
  profitTakingSpeed: number;
  profitHoldScore: number;
  profitVariance: number;
  profitStreak: number;
  lossStreak: number;
}

export interface AttentionMetrics extends MetricBucket {
  chaseScore: number;
  momentumAlignment: number;
  attentionSensitivity: number;
}

export interface RiskMetrics extends MetricBucket {
  drawdownTolerance: number;
  panicExitBias: number;
  averagingDownBias: number;
}

export interface RecoveryMetrics extends MetricBucket {
  revengeTradeIntensity: number;
  recoveryAttempts: number;
  comebackTrades: number;
  drawdownPersistence: number;
  riskAfterLossScore: number;
  psychologicalResilience: number;
  recoverySuccessRate: number;
}

export interface ChaosMetrics extends MetricBucket {
  chaosIndex: number;
  decisionVolatility: number;
  behaviorVariance: number;
  tradeTimingVariance: number;
  coinSwitchFrequency: number;
  strategyInstability: number;
  impulseTradeRate: number;
  emotionalVolatility: number;
}

export interface ViralityMetrics extends MetricBucket {
  memeabilityScore: number;
  shareabilityScore: number;
  cinemaScore: number;
}

export interface BehaviorMetrics extends MetricBucket {
  revengeBias: number;
  chaosScore: number;
  patienceScore: number;
  convictionScore: number;
}

export interface SessionMetrics extends MetricBucket {
  tradeClusterCount: number;
  tradeSessions: number;
  sessionDuration: number;
  openingRushScore: number;
  closingRushScore: number;
}

export interface ExecutionMetrics extends MetricBucket {
  entryPrecisionScore: number;
  exitPrecisionScore: number;
  invalidationRespectScore: number;
  followThroughScore: number;
  hesitationScore: number;
  slippageRiskScore: number;
  reriskingSpeedScore: number;
  cooldownDisciplineScore: number;
  tradeSelectionQuality: number;
  timingEdgeBalance: number;
}

export interface CompositionMetrics extends MetricBucket {
  repeatTokenBias: number;
  oneTickerObsessionScore: number;
  longTailParticipation: number;
  rotationBreadthScore: number;
  concentrationEntropy: number;
  tokenRevisitRate: number;
  churnRate: number;
  pumpStickiness: number;
  focusDriftScore: number;
}

export interface WalletMetrics {
  activity: ActivityMetrics;
  timing: TimingMetrics;
  holding: HoldingMetrics;
  sizing: SizingMetrics;
  position: PositionMetrics;
  pnl: PnlMetrics;
  profit: ProfitMetrics;
  attention: AttentionMetrics;
  risk: RiskMetrics;
  recovery: RecoveryMetrics;
  chaos: ChaosMetrics;
  behavior: BehaviorMetrics;
  virality: ViralityMetrics;
  session: SessionMetrics;
  execution: ExecutionMetrics;
  composition: CompositionMetrics;
}

export type BehaviorSignalKey =
  | "earlyEntryBehavior"
  | "lateEntryBehavior"
  | "rapidReentryAfterLosses"
  | "averageHoldDuration"
  | "sizeVolatility"
  | "tradeFrequency"
  | "smallWinsTooFast"
  | "holdLosers"
  | "behaviorAfterDrawdowns"
  | "chasingAttention"
  | "concentrationBehavior"
  | "sprayBehavior"
  | "consistencyBehavior"
  | "chaosBehavior"
  | "patienceBehavior"
  | "convictionBehavior"
  | "momentumAddiction"
  | "metaAwareness"
  | "comebackPotential"
  | "luckSkew";

export type BehaviorSignalMap = Record<BehaviorSignalKey, number>;

export interface PersonalityDefinition {
  id: string;
  displayName: string;
  description: string;
  humorStyle: string;
  scoringLogicNotes: string;
  preferredThemes: string[];
  signalWeights: Partial<Record<BehaviorSignalKey, number>>;
}

export interface ModifierDefinition {
  id: string;
  displayName: string;
  description: string;
  triggerHints: string[];
  weightRules: string;
  toneEffect: string;
  signalWeights: Partial<Record<BehaviorSignalKey, number>>;
}

export interface PersonalityScoreResult {
  id: string;
  displayName: string;
  score: number;
  explanation: string;
}

export interface PersonalityProfileResult {
  primary: PersonalityScoreResult;
  secondaryCandidates: Array<{
    id: string;
    displayName: string;
    score: number;
  }>;
}

export interface ModifierResult {
  id: string;
  displayName: string;
  score: number;
  explanation: string;
}

export interface WalletMoment {
  title: string;
  description: string;
  tradeSignatures?: string[];
  explanation: string;
  humorLine: string;
  confidence?: number;
}

export interface WalletMoments {
  absoluteCinemaMoment?: WalletMoment;
  mostUnwellMoment?: WalletMoment;
  mainCharacterMoment?: WalletMoment;
  trenchLoreMoment?: WalletMoment;
  paperHandsMoment?: WalletMoment;
  diamondHandsMoment?: WalletMoment;
  comebackMoment?: WalletMoment;
  fumbleMoment?: WalletMoment;
  goblinHourMoment?: WalletMoment;
  convictionMoment?: WalletMoment;
  recoveryMoment?: WalletMoment;
  hadToBeThereMoment?: WalletMoment;
  escapeMoment?: WalletMoment;
  overcookedMoment?: WalletMoment;
}

export type StoryBeatPhase =
  | "opening"
  | "rise"
  | "damage"
  | "pivot"
  | "climax"
  | "aftermath";

export interface StoryBeat {
  phase: StoryBeatPhase;
  text: string;
  emotionalTone: string;
  symbolicVisualHint: string;
}

export interface SceneEmotionVector {
  confidence: number;
  chaos: number;
  desperation: number;
  discipline: number;
  luck: number;
  intensity: number;
}

export interface VideoTokenAnchor {
  mint: string;
  symbol: string;
  name?: string | null;
  imageUrl?: string | null;
  role: "primary" | "secondary" | "supporting";
}

export interface VideoIdentitySheet {
  identityId: string;
  archetype: string;
  protagonist: string;
  paletteCanon: string[];
  worldCanon: string[];
  lightingCanon: string[];
  symbolCanon: string[];
  tokenAnchors: VideoTokenAnchor[];
  negativeConstraints: string[];
}

export interface SceneState {
  sceneNumber: number;
  phase: StoryBeatPhase;
  stateRef: string;
  emotionVector: SceneEmotionVector;
  subjectFocus: string;
  continuityAnchors: string[];
  deltaFromPrevious: string[];
  transitionNote: string;
}

export type VideoPromptProvider = "veo" | "runway" | "kling";

export interface VideoPromptScene {
  sceneNumber: number;
  phase: StoryBeatPhase;
  narrativePurpose: string;
  shotType: string;
  cameraMovement: string;
  environment: string;
  characterAction: string;
  visualStyle: string;
  lighting: string;
  soundDesign: string;
  symbolicVisuals: string[];
  narrationHook: string;
  stateRef?: string;
  continuityAnchors?: string[];
  continuityNote?: string;
  providerPrompts: Record<VideoPromptProvider, string>;
}

export interface SuitabilityRule {
  metricPath: MetricPath;
  op: "gte" | "lte";
  value: number;
  weight?: number;
}

export interface InterpretationLineTemplate {
  id: string;
  text: string;
  tags: string[];
  suitabilityRules: SuitabilityRule[];
  tone: string;
}

export interface TextTemplate {
  id: string;
  trigger?: string;
  text: string;
  tags?: string[];
}

export interface NarrativeTemplate {
  id: string;
  tone?: string;
  text: string;
  tags?: string[];
}

export interface WritersRoomPersonalityEntry {
  id: string;
  displayName: string;
  description?: string;
  humorStyle?: string;
  themes?: string[];
}

export interface WritersRoomModifierEntry {
  id: string;
  displayName: string;
  description?: string;
  toneEffect?: string;
  triggerHints?: string[];
}

export interface WritersRoomMomentTemplate {
  id: string;
  titleTemplate?: string;
  humorTemplate?: string;
}

export type WritersRoomSource = "file" | "missing" | "malformed";

export interface WritersRoomContent {
  source: WritersRoomSource;
  filePath: string;
  loadedAt: string;
  warnings: string[];
  personalities: Record<string, WritersRoomPersonalityEntry>;
  modifiers: Record<string, WritersRoomModifierEntry>;
  interpretationLines: InterpretationLineTemplate[];
  trenchCopypasta: TextTemplate[];
  moments: Record<string, WritersRoomMomentTemplate>;
  cinematicSummaries: NarrativeTemplate[];
  xLines: NarrativeTemplate[];
}

export interface CinematicSummary {
  title: string;
  tone: string;
  lines: string[];
  templateId?: string;
}

export interface WritersRoomSelections {
  contentSource: WritersRoomSource | "fallback-only";
  interpretationLineIds: string[];
  xLineIds: string[];
  cinematicSummaryId?: string;
  copypastaIds: string[];
}

export interface WalletAnalysisResult {
  wallet: string;
  rangeHours: number;
  normalizedTrades: NormalizedTrade[];
  metrics: WalletMetrics;
  personality: PersonalityProfileResult;
  modifiers: ModifierResult[];
  behaviorPatterns: string[];
  funObservations: string[];
  interpretationLines: string[];
  moments: WalletMoments;
  walletVibeCheck: string;
  cinematicSummary: CinematicSummary;
  xReadyLines: string[];
  storyBeats: StoryBeat[];
  videoIdentitySheet?: VideoIdentitySheet;
  sceneStateSequence?: SceneState[];
  videoPromptSequence: VideoPromptScene[];
  writersRoomSelections: WritersRoomSelections;
}

export interface InterpretationSelectionResult {
  lines: string[];
  ids: string[];
  source: "writers-room" | "fallback";
}

export interface NarrativeSelectionResult {
  behaviorPatterns: string[];
  funObservations: string[];
  walletVibeCheck: string;
  cinematicSummary: CinematicSummary;
  xReadyLines: string[];
  writersRoomSelections: WritersRoomSelections;
}

export type SeedWalletProfileId =
  | "chaotic-overtrader"
  | "early-narrative-trader"
  | "stubborn-bagholder"
  | "pump-chaser"
  | "improbable-comeback-merchant";

export interface SeedWalletBehaviorProfile {
  id: SeedWalletProfileId;
  label: string;
  description: string;
  wallet: string;
  rangeHours: AnalysisRangeHours;
  normalizedTrades: NormalizedTrade[];
}
