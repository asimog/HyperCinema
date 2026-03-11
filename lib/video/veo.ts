import { round } from "@/lib/utils";
import { rankTokenMetadataForStory } from "@/lib/tokens/metadata-selection";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

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

function buildPrompt(input: {
  story: WalletStory;
  script: GeneratedCinematicScript;
  tokenMetadata: VeoTokenMetadata[];
}): string {
  const walletShort = `${input.story.wallet.slice(0, 4)}...${input.story.wallet.slice(-4)}`;
  const tokenRefs = input.tokenMetadata
    .map(
      (token) =>
        `${token.symbol}(${token.tradeCount} trades, ${token.solVolume} SOL volume, image=${token.imageUrl})`,
    )
    .join("; ");

  const sceneLines = input.script.scenes
    .map(
      (scene) =>
        `Scene ${scene.sceneNumber} (${scene.durationSeconds}s) | visual="${scene.visualPrompt}" | narration="${scene.narration}" | image=${scene.imageUrl ?? "none"}`,
    )
    .join("\n");
  const personalityLine = [
    input.story.walletPersonality,
    input.story.walletSecondaryPersonality,
  ]
    .filter((value): value is string => Boolean(value && value.trim().length))
    .join(" + ");
  const modifiersLine = (input.story.walletModifiers ?? []).slice(0, 4).join(", ");
  const behaviorLine = (input.story.behaviorPatterns ?? []).slice(0, 3).join(" | ");
  const narrativeSummary = input.story.narrativeSummary?.trim() ?? "";
  const keyEventLines = (input.story.keyEvents ?? [])
    .slice(0, 3)
    .map(
      (event, index) =>
        `Key Event ${index + 1}: token=${event.token}, type=${event.type}, interpretation="${event.interpretation}"`,
    )
    .join("\n");

  return [
    "Create a fast-paced, funny-memetic cinematic wallet recap with coherent scene transitions.",
    `Wallet: ${walletShort}, package=${input.story.packageType}, duration=${input.story.durationSeconds}s.`,
    `Facts to preserve: buys=${input.story.analytics.buyCount}, sells=${input.story.analytics.sellCount}, spent=${input.story.analytics.solSpent} SOL, received=${input.story.analytics.solReceived} SOL, pnl=${input.story.analytics.estimatedPnlSol} SOL.`,
    personalityLine ? `Wallet personality profile: ${personalityLine}.` : "Wallet personality profile: unknown.",
    modifiersLine ? `Behavior modifiers: ${modifiersLine}.` : "Behavior modifiers: unavailable.",
    behaviorLine ? `Behavior pattern highlights: ${behaviorLine}.` : "Behavior pattern highlights: unavailable.",
    narrativeSummary ? `Narrative summary: ${narrativeSummary}` : "Narrative summary: unavailable.",
    keyEventLines ? keyEventLines : "Key events: unavailable.",
    `Hook line: ${input.script.hookLine}`,
    `Token media references (prioritize these image assets): ${tokenRefs || "none provided"}.`,
    "Use captions and kinetic motion graphics that match narration timing without fabricating extra trades.",
    "Keep the tone satirical and internet-native, but avoid defamation and unsafe content.",
    "Scene plan:",
    sceneLines,
  ].join("\n");
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
