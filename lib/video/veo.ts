import { round } from "@/lib/utils";
import { rankTokenMetadataForStory } from "@/lib/tokens/metadata-selection";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

const MAX_PROMPT_CHARS = 9_000;
const MAX_TOKEN_REFS_IN_PROMPT = 20;
const MAX_SCENES_IN_PROMPT = 12;
const MAX_SCENE_TEXT_CHARS = 220;

export interface VeoTokenMetadata {
  mint: string;
  symbol: string;
  name: string | null;
  imageUrl: string;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  solVolume: number;
  lastSeenTimestamp: number;
}

export interface GoogleVeoRenderPayload {
  provider: "google_veo";
  model: "veo-3.1-fast-generate-001";
  resolution: "720p" | "1080p";
  generateAudio: true;
  prompt: string;
  styleHints: string[];
  tokenMetadata: VeoTokenMetadata[];
  sceneMetadata: Array<{
    sceneNumber: number;
    durationSeconds: number;
    narration: string;
    visualPrompt: string;
    imageUrl: string | null;
  }>;
  storyMetadata: {
    wallet: string;
    rangeDays: number;
    packageType: WalletStory["packageType"];
    durationSeconds: number;
    analytics: WalletStory["analytics"];
  };
}

function buildTokenMetadata(story: WalletStory): VeoTokenMetadata[] {
  return rankTokenMetadataForStory(story).map((item) => ({
    mint: item.mint,
    symbol: item.symbol,
    name: item.name,
    imageUrl: item.imageUrl,
    tradeCount: item.tradeCount,
    buyCount: item.buyCount,
    sellCount: item.sellCount,
    solVolume: round(item.solVolume, 6),
    lastSeenTimestamp: item.lastSeenTimestamp,
  }));
}

function truncateText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxChars - 3))}...`;
}

function compactSentence(value: string): string {
  const trimmed = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sanitizePromptText(value: string): string {
  return compactSentence(
    value
      .replace(/\b\d+(?:\.\d+)?\s*SOL\b/gi, "the bag")
      .replace(/\b\d+\s+(?:buys?|sells?|trades?|tokens?|hours?|minutes?|days?)\b/gi, "a blur of clicks")
      .replace(/\bestimated\s+pnl\b/gi, "fortune")
      .replace(/\bfinal tape\b/gi, "final mood")
      .replace(/\bspent\b/gi, "risked")
      .replace(/\breceived\b/gi, "got back")
      .replace(/\b\d+(?:\.\d+)?\b/g, "")
      .replace(/\s{2,}/g, " "),
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "opening":
      return "Entry Into The Trenches";
    case "rise":
      return "Heat Check";
    case "damage":
      return "Market Chaos";
    case "pivot":
      return "No-Cooldown Decision";
    case "climax":
      return "Main Character Spiral";
    case "aftermath":
      return "Sunrise Aftermath";
    default:
      return "Trailer Beat";
  }
}

function inferArchetype(story: WalletStory): string {
  const source = [
    story.walletPersonality ?? "",
    story.walletSecondaryPersonality ?? "",
    ...(story.walletModifiers ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    source.includes("gambler") ||
    source.includes("casino") ||
    source.includes("degen")
  ) {
    return "The Gambler";
  }

  if (
    source.includes("oracle") ||
    source.includes("visionary") ||
    source.includes("early") ||
    source.includes("sniper")
  ) {
    return "The Prophet";
  }

  if (
    source.includes("comeback") ||
    source.includes("survivor") ||
    source.includes("rug hardened")
  ) {
    return "The Survivor";
  }

  if (
    source.includes("diamond") ||
    source.includes("martyr") ||
    source.includes("bagholder") ||
    source.includes("conviction")
  ) {
    return "The Martyr";
  }

  if (
    source.includes("chaos") ||
    source.includes("trickster") ||
    source.includes("timeline") ||
    source.includes("luck")
  ) {
    return "The Trickster";
  }

  return "The Gambler";
}

function inferProtagonist(archetype: string): string {
  switch (archetype) {
    case "The Prophet":
      return "a sleepless chart oracle under neon monitor glow";
    case "The Survivor":
      return "a battle-worn night trader still refusing to leave the desk";
    case "The Martyr":
      return "a conviction cultist guarding one last glowing thesis";
    case "The Trickster":
      return "a meme-native trench operator with suspicious plot armor";
    default:
      return "a hooded memecoin gambler in a room full of dangerous optimism";
  }
}

function buildFlavorLine(story: WalletStory): string {
  const personalityLine = [
    story.walletPersonality,
    story.walletSecondaryPersonality,
  ]
    .filter((value): value is string => Boolean(value && value.trim().length))
    .join(" + ");
  const modifiersLine = (story.walletModifiers ?? []).slice(0, 4).join(", ");
  const behaviorLine = (story.behaviorPatterns ?? [])
    .slice(0, 3)
    .map((value) => sanitizePromptText(value))
    .join(" | ");

  const parts = [
    personalityLine ? `Personality flavor: ${personalityLine}.` : "",
    modifiersLine ? `Modifier flavor: ${modifiersLine}.` : "",
    behaviorLine ? `Behavior flavor: ${behaviorLine}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildVisualWorldLine(story: WalletStory): string {
  const source = [
    story.walletPersonality ?? "",
    ...(story.walletModifiers ?? []),
    ...(story.behaviorPatterns ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (source.includes("revenge")) {
    return "Visual world: neon boxing-ring energy, storm-lit screens, frantic camera swings, and a trader treating every candle like a rematch clause.";
  }

  if (source.includes("diamond") || source.includes("bagholder")) {
    return "Visual world: glowing chart altars, stubborn red haze, dust-in-sunrise aftermath, and conviction staged like a tragic religion.";
  }

  if (source.includes("oracle") || source.includes("visionary") || source.includes("early")) {
    return "Visual world: cathedral-scale chart walls, omen-like green light, quiet focus, and prophecy dressed as market timing.";
  }

  if (source.includes("chaos") || source.includes("casino")) {
    return "Visual world: casino-cathedral lighting, chart storms on the ceiling, meme captions like trailer cards, and screens that feel one bad decision away from folklore.";
  }

  return "Visual world: dark trading room noir, neon chart glow, group-chat ghosts, storm-blue tension, and meme captions that feel like a trailer instead of a spreadsheet.";
}

function buildTokenReferenceLine(tokenMetadata: VeoTokenMetadata[]): string {
  const tokenRefs = tokenMetadata
    .slice(0, MAX_TOKEN_REFS_IN_PROMPT)
    .map((token) => {
      const name = token.name?.trim() ? `${token.symbol} (${token.name})` : token.symbol;
      return `${name} image=${token.imageUrl}`;
    })
    .join("; ");

  return tokenRefs
    ? `Token image anchors: ${tokenRefs}.`
    : "Token image anchors: none supplied.";
}

function buildDirectorialLines(input: {
  story: WalletStory;
  script: GeneratedCinematicScript;
}): string[] {
  const directorialSequence = (input.story.videoPromptSequence ?? []).slice(
    0,
    MAX_SCENES_IN_PROMPT,
  );

  if (directorialSequence.length > 0) {
    return directorialSequence.map(
      (scene) =>
        `${phaseLabel(scene.phase)} | ${truncateText(scene.providerPrompts.veo, MAX_SCENE_TEXT_CHARS)}`,
    );
  }

  return input.script.scenes.slice(0, MAX_SCENES_IN_PROMPT).map((scene) => {
    const visual = sanitizePromptText(scene.visualPrompt);
    return `Trailer Beat | ${truncateText(visual, MAX_SCENE_TEXT_CHARS)}`;
  });
}

function buildSceneReelLines(script: GeneratedCinematicScript): string[] {
  return script.scenes.slice(0, MAX_SCENES_IN_PROMPT).map((scene) => {
    const visual = sanitizePromptText(scene.visualPrompt);
    const imageAnchor = scene.imageUrl ? ` image=${scene.imageUrl}` : " image=none";
    return `Visual cue | ${truncateText(visual, MAX_SCENE_TEXT_CHARS)} |${imageAnchor}`;
  });
}

function buildPrompt(input: {
  story: WalletStory;
  script: GeneratedCinematicScript;
  tokenMetadata: VeoTokenMetadata[];
}): string {
  const archetype = inferArchetype(input.story);
  const protagonist = inferProtagonist(archetype);
  const flavorLine = buildFlavorLine(input.story);
  const narrativeSummary = input.story.narrativeSummary?.trim()
    ? sanitizePromptText(input.story.narrativeSummary)
    : "";
  const directorialPromptLines = buildDirectorialLines(input);
  const sceneReelLines = buildSceneReelLines(input.script);
  const trailerHook = sanitizePromptText(input.script.hookLine);

  const prompt = [
    "Create a funny, memetic cinematic trailer about a trader's last stretch in the Pump.fun trenches.",
    "This is cinema, not analytics. Never mention balances, PnL, trade counts, percentages, package tiers, or scoreboard numbers in dialogue, captions, or commentary.",
    `Archetype: ${archetype}.`,
    `Protagonist: ${protagonist}.`,
    flavorLine,
    buildVisualWorldLine(input.story),
    narrativeSummary ? `Narrative summary: ${narrativeSummary}` : "",
    `Trailer hook: ${trailerHook}`,
    buildTokenReferenceLine(input.tokenMetadata),
    "When an image URL is supplied, treat it as the featured token's poster, shrine, sticker, hologram, or apparition inside the world of the scene.",
    "Hard constraints: stay faithful to the supplied wallet story, token anchors, and scene metadata. Do not invent extra coins, fake stat overlays, or abstract chart-only scenes without a human presence.",
    "Directorial sequence:",
    ...directorialPromptLines,
    "Visual reel:",
    ...sceneReelLines,
  ]
    .filter(Boolean)
    .join("\n");

  if (prompt.length <= MAX_PROMPT_CHARS) {
    return prompt;
  }

  return `${prompt.slice(0, MAX_PROMPT_CHARS - 60)}\n[Prompt truncated to fit model input budget.]`;
}

export function buildGoogleVeoRenderPayload(input: {
  walletStory: WalletStory;
  script: GeneratedCinematicScript;
  model?: "veo-3.1-fast-generate-001";
  resolution?: "720p" | "1080p";
}): GoogleVeoRenderPayload {
  const tokenMetadata = buildTokenMetadata(input.walletStory);

  return {
    provider: "google_veo",
    model: input.model ?? "veo-3.1-fast-generate-001",
    resolution: input.resolution ?? "1080p",
    generateAudio: true,
    prompt: buildPrompt({
      story: input.walletStory,
      script: input.script,
      tokenMetadata,
    }),
    styleHints: [
      "memetic",
      "cinematic",
      "high-energy-edit",
      "captioned",
      "satirical",
    ],
    tokenMetadata,
    sceneMetadata: input.script.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      durationSeconds: scene.durationSeconds,
      narration: scene.narration,
      visualPrompt: scene.visualPrompt,
      imageUrl: scene.imageUrl,
    })),
    storyMetadata: {
      wallet: input.walletStory.wallet,
      rangeDays: input.walletStory.rangeDays,
      packageType: input.walletStory.packageType,
      durationSeconds: input.walletStory.durationSeconds,
      analytics: input.walletStory.analytics,
    },
  };
}
