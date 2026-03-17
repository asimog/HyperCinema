import {
  InterpretationLineTemplate,
  NarrativeTemplate,
  StoryBeatPhase,
  TextTemplate,
} from "./types";

function line(
  id: string,
  text: string,
  tags: string[],
  tone: string,
  suitabilityRules: InterpretationLineTemplate["suitabilityRules"] = [],
): InterpretationLineTemplate {
  return {
    id,
    text,
    tags,
    tone,
    suitabilityRules,
  };
}

function renderOneLinerTemplate(template: string, suffix: string): string {
  if (!suffix) return template;
  if (template.endsWith(".")) {
    return `${template.slice(0, -1)} ${suffix}.`;
  }
  return `${template} ${suffix}`;
}

interface OneLinerFamily {
  id: string;
  tags: string[];
  openings: string[];
  middles: string[];
  closers: string[];
}

const ONE_LINER_FAMILIES: OneLinerFamily[] = [
  {
    id: "chaos",
    tags: ["chaos", "viral", "cinema"],
    openings: [
      "This wallet",
      "Order flow",
      "That session",
      "The trade log",
    ],
    middles: [
      "treated calm like optional DLC",
      "moved like the chart owed it drama",
      "traded like volatility had a loyalty program",
      "kept escalating the plot every few candles",
    ],
    closers: [
      "with zero emotional seatbelt",
      "and still asked for one more candle",
      "like risk management was in airplane mode",
      "while the group chat refreshed in disbelief",
    ],
  },
  {
    id: "late-fomo",
    tags: ["late", "fomo", "momentum", "viral"],
    openings: [
      "Entry timing",
      "This wallet",
      "That click",
      "The buy button",
    ],
    middles: [
      "arrived after the move had already posted receipts",
      "showed up exactly when the candle became expensive",
      "treated breakout confirmation like a starting gun",
      "walked into the party after the screenshots were already circulating",
    ],
    closers: [
      "and still tried to pass it off as foresight",
      "because restraint never made the highlight reel",
      "with the confidence of someone reading delayed alpha",
      "while earlier holders prepared their exit speech",
    ],
  },
  {
    id: "baghold",
    tags: ["baghold", "diamond", "hopium", "cinema"],
    openings: [
      "That position",
      "This wallet",
      "The hold",
      "The bag",
    ],
    middles: [
      "aged from trade to personal philosophy",
      "lasted long enough to develop emotional property rights",
      "kept surviving on conviction and weather damage",
      "turned into a long-form documentary about hope",
    ],
    closers: [
      "while the chart quietly filed for mercy",
      "because exits kept feeling emotionally premature",
      "and at some point became part of the furniture",
      "with zero interest in market closure",
    ],
  },
  {
    id: "revenge",
    tags: ["revenge", "chaos", "combat", "viral"],
    openings: [
      "After the loss",
      "That redraw",
      "This wallet",
      "The next trade",
    ],
    middles: [
      "behaved like a rematch clause was legally binding",
      "came in swinging like the chart talked first",
      "answered red candles with immediate counterfire",
      "treated damage like an invitation to double the storyline",
    ],
    closers: [
      "because peace never got a seat at the table",
      "and cooldown discipline missed the meeting",
      "with all the subtlety of a revenge montage",
      "while rational sizing waited in the lobby",
    ],
  },
  {
    id: "conviction",
    tags: ["conviction", "focus", "diamond", "cinema"],
    openings: [
      "Conviction",
      "This wallet",
      "That thesis",
      "The sizing",
    ],
    middles: [
      "walked in like the screenplay had already been approved",
      "pressed the same idea until it became a worldview",
      "treated exposure like a declaration of faith",
      "kept buying the same story until the story bought back",
    ],
    closers: [
      "and never once checked whether the crowd deserved it",
      "with enough belief to power the captions",
      "while uncertainty got edited out in post",
      "because nuance was terrible for morale",
    ],
  },
  {
    id: "attention",
    tags: ["attention", "timeline", "meta", "culture"],
    openings: [
      "This wallet",
      "The rotation",
      "That setup",
      "Trade selection",
    ],
    middles: [
      "watched attention first and price second",
      "treated crowd focus like a leading indicator",
      "moved like timeline velocity was part of the chart",
      "read social heat before it read candle shape",
    ],
    closers: [
      "because memes kept getting there before spreadsheets",
      "and somehow that was not the worst process choice",
      "while everyone else argued about fundamentals",
      "with the confidence of a trench-native anthropologist",
    ],
  },
  {
    id: "discipline",
    tags: ["discipline", "consistency", "early", "calm"],
    openings: [
      "This wallet",
      "Trade pacing",
      "The process",
      "Execution",
    ],
    middles: [
      "looked annoyingly composed for a memecoin battlefield",
      "waited for cleaner structure before doing something loud",
      "kept emotion on a shorter leash than most trench accounts",
      "showed signs of an actual invalidation plan",
    ],
    closers: [
      "and that alone deserves historical preservation",
      "while the market tried to provoke something reckless",
      "because selectivity was doing more work than adrenaline",
      "with fewer spiritual negotiations mid-candle",
    ],
  },
  {
    id: "night",
    tags: ["night", "goblin", "chaos", "viral"],
    openings: [
      "Goblin hour",
      "The late-night tape",
      "This wallet",
      "That 3AM decision tree",
    ],
    middles: [
      "had full administrative access",
      "started making choices on pure fluorescent instinct",
      "turned insomnia into a trading strategy",
      "kept clicking like sunrise was a rumor",
    ],
    closers: [
      "while healthy sleep schedules watched from a distance",
      "and still expected the chart to be normal about it",
      "because fatigue apparently counts as conviction now",
      "with all the grace of a haunted Bloomberg terminal",
    ],
  },
  {
    id: "luck",
    tags: ["luck", "suspicious-luck", "viral", "cinema"],
    openings: [
      "The process",
      "This wallet",
      "Outcome quality",
      "That trade tape",
    ],
    middles: [
      "looked cursed and occasionally still cashed out",
      "kept failing the eye test and passing the scoreboard",
      "made accidental competence feel like a recurring character",
      "turned questionable execution into sporadic plot armor",
    ],
    closers: [
      "and nobody could fully explain why",
      "because probability briefly lost the room",
      "while the audience argued about whether this counts as skill",
      "with just enough green to keep the delusion hydrated",
    ],
  },
  {
    id: "casino",
    tags: ["casino", "chaos", "viral", "culture"],
    openings: [
      "This wallet",
      "Every new token",
      "That dashboard",
      "The session",
    ],
    middles: [
      "felt like a casino floor with push notifications",
      "looked one lever pull away from becoming folklore",
      "treated each entry like a side quest with financial consequences",
      "had roulette-wheel pacing and zero poker face",
    ],
    closers: [
      "and still called it process optimization",
      "while risk controls asked for a transfer out",
      "because moderation never trended in the trenches",
      "with enough neon to qualify as a problem statement",
    ],
  },
];

const RARE_INSERTS = [
  "I need price to go up.",
  "One more trade.",
  "This chart had you spiritually involved.",
  "Dev said community coin.",
  "You were emotionally averaging down.",
  "The comeback narrative had full emotional funding.",
  "Logic was consulted briefly and then outvoted.",
  "You were not trading. You were testifying.",
];

export const GENERATED_INTERPRETATION_LINES: InterpretationLineTemplate[] = [
  line(
    "bank-chaos-01",
    "Execution tempo looked like a keyboard durability test with financial consequences.",
    ["chaos", "overtrading", "viral"],
    "trenches documentary",
    [
      { metricPath: "activity.tradesPerHour", op: "gte", value: 0.3, weight: 1.1 },
      { metricPath: "chaos.chaosIndex", op: "gte", value: 0.55, weight: 1.1 },
    ],
  ),
  line(
    "bank-chaos-02",
    "Trade density outran reflection time, which made the session watchable and expensive.",
    ["chaos", "overtrading", "cinema"],
    "dark comedy",
    [
      { metricPath: "risk.overtradeScore", op: "gte", value: 0.5, weight: 1.3 },
      { metricPath: "activity.tradeClusterCount", op: "gte", value: 3, weight: 0.7 },
    ],
  ),
  line(
    "bank-late-01",
    "Entries often materialized after attention had already done the easy part of the move.",
    ["late", "fomo", "attention"],
    "cautionary",
    [
      { metricPath: "timing.lateEntryScore", op: "gte", value: 0.52, weight: 1.2 },
      { metricPath: "attention.timelineInfluenceScore", op: "gte", value: 0.45, weight: 0.8 },
    ],
  ),
  line(
    "bank-late-02",
    "You found the narrative exactly when the crowd finished explaining why it was obvious.",
    ["late", "fomo", "viral"],
    "dry roast",
    [
      { metricPath: "timing.topChasingRate", op: "gte", value: 0.38, weight: 1.1 },
      { metricPath: "attention.narrativeChasingScore", op: "gte", value: 0.48, weight: 1.0 },
    ],
  ),
  line(
    "bank-early-01",
    "Some entries landed early enough to look like leaked script pages instead of reactive clicks.",
    ["early", "conviction", "cinema"],
    "mythic",
    [
      { metricPath: "timing.earlyEntryScore", op: "gte", value: 0.56, weight: 1.2 },
      { metricPath: "execution.entryPrecisionScore", op: "gte", value: 0.55, weight: 0.9 },
    ],
  ),
  line(
    "bank-baghold-01",
    "Holding behavior crossed from trade management into long-form emotional residency.",
    ["baghold", "diamond", "hopium"],
    "tragic comedy",
    [
      { metricPath: "holding.bagHoldingScore", op: "gte", value: 0.48, weight: 1.3 },
      { metricPath: "risk.lossToleranceScore", op: "gte", value: 0.45, weight: 0.9 },
    ],
  ),
  line(
    "bank-baghold-02",
    "The losing side of the tape received more patience than the winning side ever dreamed of.",
    ["baghold", "risk", "cinema"],
    "observer",
    [
      { metricPath: "holding.lossHoldTolerance", op: "gte", value: 0.5, weight: 1.2 },
      { metricPath: "holding.profitHoldTolerance", op: "lte", value: 0.45, weight: 0.8 },
    ],
  ),
  line(
    "bank-revenge-01",
    "Post-loss behavior kept trying to turn damage into a sequel before the credits cooled down.",
    ["revenge", "chaos", "recovery"],
    "combative",
    [
      { metricPath: "recovery.revengeTradeIntensity", op: "gte", value: 0.45, weight: 1.3 },
      { metricPath: "timing.rapidReentryScore", op: "gte", value: 0.4, weight: 0.9 },
    ],
  ),
  line(
    "bank-revenge-02",
    "Losses regularly triggered fresh deployment logic that looked powered by pride and velocity.",
    ["revenge", "risk", "overtrading"],
    "dark comedy",
    [
      { metricPath: "risk.riskAfterLossScore", op: "gte", value: 0.45, weight: 1.2 },
      { metricPath: "behavior.revengeBias", op: "gte", value: 0.45, weight: 1.1 },
    ],
  ),
  line(
    "bank-attention-01",
    "The wallet traded crowd focus with enough consistency to qualify as social chart-reading.",
    ["attention", "timeline", "culture"],
    "analyst-meme",
    [
      { metricPath: "attention.timelineInfluenceScore", op: "gte", value: 0.5, weight: 1.2 },
      { metricPath: "attention.socialSignalResponse", op: "gte", value: 0.45, weight: 0.8 },
    ],
  ),
  line(
    "bank-attention-02",
    "Price was downstream. Attention was the upstream weather system.",
    ["attention", "meta", "universal"],
    "tactical",
    [
      { metricPath: "attention.attentionSensitivity", op: "gte", value: 0.5, weight: 1.1 },
    ],
  ),
  line(
    "bank-discipline-01",
    "When the wallet slowed down, execution quality improved immediately and visibly.",
    ["discipline", "consistency", "calm"],
    "coaching",
    [
      { metricPath: "behavior.disciplineScore", op: "gte", value: 0.52, weight: 1.2 },
      { metricPath: "execution.tradeSelectionQuality", op: "gte", value: 0.52, weight: 0.8 },
    ],
  ),
  line(
    "bank-discipline-02",
    "The clearest edge appeared when selectivity beat urgency to the keyboard.",
    ["discipline", "consistency", "early"],
    "measured",
    [
      { metricPath: "execution.cooldownDisciplineScore", op: "gte", value: 0.5, weight: 1.1 },
      { metricPath: "activity.tradeCount", op: "gte", value: 6, weight: 0.4 },
    ],
  ),
  line(
    "bank-night-01",
    "A meaningful share of the arc was written while normal circadian judgment was off the clock.",
    ["night", "goblin", "chaos"],
    "trenches dispatch",
    [
      { metricPath: "activity.lateNightTradeRate", op: "gte", value: 0.3, weight: 1.2 },
    ],
  ),
  line(
    "bank-size-01",
    "Sizing rhythm changed with emotion, which made conviction and stress difficult to separate.",
    ["risk", "sizing", "chaos"],
    "observer",
    [
      { metricPath: "position.positionVariance", op: "gte", value: 0.5, weight: 1.2 },
      { metricPath: "risk.riskVolatility", op: "gte", value: 0.45, weight: 0.8 },
    ],
  ),
  line(
    "bank-size-02",
    "Position growth after losses suggested the session occasionally solved pain with more exposure.",
    ["risk", "revenge", "martingale"],
    "warning",
    [
      { metricPath: "position.lossPositionExpansion", op: "gte", value: 0.42, weight: 1.3 },
      { metricPath: "risk.martingaleScore", op: "gte", value: 0.35, weight: 0.9 },
    ],
  ),
  line(
    "bank-recovery-01",
    "Recovery attempts kept the plot alive even when the equity curve was openly skeptical.",
    ["recovery", "comeback", "cinema"],
    "heroic concern",
    [
      { metricPath: "recovery.recoveryAttempts", op: "gte", value: 2, weight: 0.9 },
      { metricPath: "recovery.comebackTrades", op: "gte", value: 1, weight: 1.0 },
    ],
  ),
  line(
    "bank-meta-01",
    "Trade selection suggests narrative pattern recognition was present, even if exits were not always invited.",
    ["meta", "attention", "conviction"],
    "analyst",
    [
      { metricPath: "attention.metaCoinParticipation", op: "gte", value: 0.35, weight: 1.0 },
      { metricPath: "timing.trendAnticipationScore", op: "gte", value: 0.45, weight: 0.9 },
    ],
  ),
  line(
    "bank-pain-01",
    "The chart and this wallet kept having the same disagreement in multiple fonts.",
    ["chaos", "pain", "viral"],
    "roast",
    [{ metricPath: "virality.dramaScore", op: "gte", value: 0.45, weight: 0.9 }],
  ),
  line(
    "bank-cinema-01",
    "This window generated enough emotional structure to storyboard without inventing anything.",
    ["cinema", "viral", "story"],
    "cinematic",
    [
      { metricPath: "virality.cinemaScore", op: "gte", value: 0.52, weight: 1.2 },
      { metricPath: "virality.storyDensityScore", op: "gte", value: 0.45, weight: 0.8 },
    ],
  ),
  line(
    "bank-cinema-02",
    "The tape had a beginning, a collapse, a pivot, and at least one line the village will keep quoting.",
    ["cinema", "viral", "culture"],
    "epic",
    [
      { metricPath: "virality.quotePotentialScore", op: "gte", value: 0.45, weight: 1.0 },
      { metricPath: "virality.loreDensityScore", op: "gte", value: 0.45, weight: 1.0 },
    ],
  ),
  line(
    "bank-universal-01",
    "Facts stayed objective. The emotional routing did not.",
    ["universal", "culture"],
    "dry",
  ),
  line(
    "bank-universal-02",
    "Strategy occasionally took the scenic route through adrenaline.",
    ["universal", "chaos"],
    "trenches dry humor",
  ),
];

export const GENERATED_TRENCH_COPYPASTA: TextTemplate[] = [
  { id: "generated-copy-general-01", trigger: "general", tags: ["culture"], text: "Brother this wallet did not trade, it released episodes." },
  { id: "generated-copy-general-02", trigger: "general", tags: ["culture"], text: "In case of an investigation, every entry was definitely based on process." },
  { id: "generated-copy-chaos-01", trigger: "chaos", tags: ["chaos"], text: "This chart needed supervision and you brought fireworks." },
  { id: "generated-copy-chaos-02", trigger: "chaos", tags: ["chaos"], text: "Facts were present. So was a measurable lack of chill." },
  { id: "generated-copy-revenge-01", trigger: "revenge", tags: ["revenge"], text: "The market threw a jab and you answered with a full combo." },
  { id: "generated-copy-baghold-01", trigger: "baghold", tags: ["baghold"], text: "Position aged from trade to lore artifact." },
  { id: "generated-copy-cinema-01", trigger: "cinema", tags: ["cinema"], text: "Oscar for Best On-Chain Emotional Performance goes to this wallet." },
  { id: "generated-copy-discipline-01", trigger: "discipline", tags: ["discipline"], text: "The cost of not locking in is spending tomorrow clocking in." },
  { id: "generated-copy-attention-01", trigger: "attention", tags: ["attention"], text: "You were not trading candles, you were trading crowd focus latency." },
  { id: "generated-copy-night-01", trigger: "night", tags: ["night"], text: "Strategy was asleep. Instincts still had admin access." },
];

export const GENERATED_CINEMATIC_SUMMARIES: NarrativeTemplate[] = [
  {
    id: "generated-summary-chaos-01",
    tone: "memetic-cinema",
    tags: ["chaos", "cinema", "viral"],
    text: "{walletShort} turned a {rangeHours}h memecoin window into a trailer cut where pacing outran peace and every click raised the stakes.",
  },
  {
    id: "generated-summary-chaos-02",
    tone: "documentary-anxiety",
    tags: ["chaos", "overtrading", "cinema"],
    text: "The session opened loud, accelerated harder, and kept finding new ways to make volatility feel personal.",
  },
  {
    id: "generated-summary-conviction-01",
    tone: "mythic",
    tags: ["conviction", "diamond", "cinema"],
    text: "{walletShort} played {personality} with {modifierOne} energy, dragging conviction through turbulence like it was part of the soundtrack.",
  },
  {
    id: "generated-summary-fomo-01",
    tone: "satirical",
    tags: ["late", "fomo", "momentum"],
    text: "{walletShort} chased heat through a {rangeHours}h sprint, paying premium prices for urgency and premium lore for the audience.",
  },
  {
    id: "generated-summary-discipline-01",
    tone: "cold-and-clinical",
    tags: ["discipline", "consistency", "early"],
    text: "When selectivity showed up, the chart finally stopped feeling like a jump-scare montage.",
  },
  {
    id: "generated-summary-recovery-01",
    tone: "comeback-drama",
    tags: ["recovery", "comeback", "cinema"],
    text: "Damage changed the pacing, but the wallet kept writing comeback attempts into the script anyway.",
  },
  {
    id: "generated-summary-attention-01",
    tone: "analyst-meme",
    tags: ["attention", "meta", "culture"],
    text: "This arc traded crowd focus first, price second, and somehow made that behavior narratively coherent.",
  },
];

export function buildGeneratedXLineBank(): NarrativeTemplate[] {
  const lines: NarrativeTemplate[] = [];
  const seen = new Set<string>();

  for (const family of ONE_LINER_FAMILIES) {
    let index = 0;
    for (const opening of family.openings) {
      for (const middle of family.middles) {
        for (const closer of family.closers) {
          const base = renderOneLinerTemplate(`${opening} ${middle}.`, closer);
          if (seen.has(base)) {
            continue;
          }
          seen.add(base);
          lines.push({
            id: `generated-x-${family.id}-${String(index + 1).padStart(3, "0")}`,
            text: base,
            tags: family.tags,
          });
          index += 1;
        }
      }
    }
  }

  for (const insert of RARE_INSERTS) {
    if (seen.has(insert)) continue;
    seen.add(insert);
    lines.push({
      id: `generated-x-rare-${lines.length + 1}`,
      text: insert,
      tags: ["copypasta", "viral"],
    });
  }

  return lines;
}

export const GENERATED_X_LINES = buildGeneratedXLineBank();

export const VIDEO_VISUAL_SYMBOLS = [
  "neon city billboards",
  "casino lighting",
  "rocket launches",
  "glowing chart lines as skyline texture",
  "storm clouds over a digital skyline",
  "sunrise after a trench night",
  "group-chat screenshots floating like subtitles",
  "boxing gloves hanging on ring ropes",
  "train doors closing under holographic signage",
  "shrine candles and token posters",
  "funhouse mirrors warping neon reflections",
];

export const VIDEO_MOTIFS: Record<
  StoryBeatPhase,
  {
    shotTypes: string[];
    cameraMoves: string[];
    environments: string[];
    actions: string[];
    styles: string[];
    lighting: string[];
    sound: string[];
  }
> = {
  opening: {
    shotTypes: ["wide shot", "establishing shot", "split-screen opener"],
    cameraMoves: ["slow push-in", "gliding dolly move", "rapid montage snap-zoom"],
    environments: [
      "neon rooftop overlooking a rain-soaked city",
      "dim radar room with sweeping green arcs",
      "lonely train platform under holographic signage",
      "shrine of glowing token posters and candles",
      "empty casino corridor lit in cyan",
    ],
    actions: [
      "the trader steps into the glow as the city hums awake",
      "a token poster flickers like a signal in the distance",
      "the protagonist notices the first omen and leans toward the light",
    ],
    styles: ["hyperreal meme cinema", "neo-noir trench drama", "internet-native trailer realism"],
    lighting: ["cold neon blue with chart-green flickers", "screen glow with rising amber highlights"],
    sound: ["soft synth bed, gentle pulse, airy pad"],
  },
  rise: {
    shotTypes: ["tracking shot", "medium push-in", "overhead sweep"],
    cameraMoves: ["parallax drift", "accelerating push-in", "orbiting handheld energy"],
    environments: [
      "boxing ring under harsh overhead lights",
      "funhouse market with warped reflections",
      "storm bridge with neon pylons and streaking lights",
      "alley of billboards and token posters",
      "casino floor of holographic tables",
    ],
    actions: [
      "the trader chases momentum through the ring as lights pulse",
      "reflections multiply as the move spreads across the city",
      "the environment accelerates, keeping the protagonist centered",
    ],
    styles: ["kinetic trailer realism", "sports-hype cinema", "high-voltage internet myth"],
    lighting: ["green pulses fighting red reflections", "flickering neon gradients"],
    sound: ["driving synth arpeggio, tight low-end pulse, subtle rise"],
  },
  damage: {
    shotTypes: ["close-up", "whip-pan crash cut", "tight profile shot"],
    cameraMoves: ["whip pan", "staccato crash zoom", "shaky locked-off tension"],
    environments: [
      "bridge under storm with cables trembling",
      "battlefield at dusk with sparks and dust",
      "empty casino with dead screens and fading neon",
    ],
    actions: [
      "the set fractures and the trader steadies, refusing to leave the frame",
      "signals collapse into red static across the skyline",
      "the protagonist absorbs the hit and re-enters the scene",
    ],
    styles: ["panic thriller", "digital disaster reel", "memecoin war documentary"],
    lighting: ["violent red strobes", "sudden shadow cuts with emergency glow"],
    sound: ["tense synth drop, dark pad swell, steady rhythmic drive"],
  },
  pivot: {
    shotTypes: ["medium shot", "split-diopter shot", "slow-motion reset frame"],
    cameraMoves: ["measured push forward", "arc turn around the trader", "tempo reset glide"],
    environments: [
      "quiet corridor between neon doors",
      "train platform with doors closing in the distance",
      "rooftop ledge with wind and skyline glow",
    ],
    actions: [
      "the trader pauses, then chooses the next doorway",
      "a new signal appears and the tone shifts toward resolve",
      "the protagonist pivots from chaos into intention",
    ],
    styles: ["comeback drama", "decision-point cinema", "stylized market realism"],
    lighting: ["mixed red-green contrast", "single spotlight with reactive chart glow"],
    sound: ["steady pulse, rising pads, clean transition"],
  },
  climax: {
    shotTypes: ["hero shot", "dramatic crane shot", "full-frame reveal"],
    cameraMoves: ["rapid vertical climb", "360 orbit", "hard snap zoom into the final flare"],
    environments: [
      "rocket launch platform igniting over the skyline",
      "cathedral of light and glass with drifting symbols",
      "ring center spotlight with the city roaring outside",
    ],
    actions: [
      "the final move erupts into a cinematic set piece",
      "the room flashes as the protagonist holds the frame",
      "symbols collide into one unforgettable shot",
    ],
    styles: ["epic trailer payoff", "maximalist memecoin opera", "heroic collapse cinema"],
    lighting: ["blinding green-white burst or catastrophic red flare", "strobing contrast with cinematic haze"],
    sound: ["orchestral swell with synth lift, bright resolve, clean cadence"],
  },
  aftermath: {
    shotTypes: ["static wide", "slow pull-back", "quiet overhead"],
    cameraMoves: ["gradual pull-out", "drifting lateral fade", "steady lock-off"],
    environments: [
      "sunrise rooftop with the city finally quiet",
      "empty casino at dawn with neon fading out",
      "blue morning haze over a calm street",
    ],
    actions: [
      "the trader sits in the quiet, letting the glow fade",
      "the world settles as the story exhales",
      "the final beat lingers in the morning air",
    ],
    styles: ["melancholic documentary", "post-chaos epilogue", "quiet trailer outro"],
    lighting: ["soft dawn light over residual screen glow", "cool gray fade with faint green residue"],
    sound: ["soft synth echo, gentle piano bed, warm fade"],
  },
};
