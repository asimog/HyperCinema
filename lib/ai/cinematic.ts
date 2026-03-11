import { openRouterJson } from "@/lib/ai/openrouter";
import { logger } from "@/lib/logging/logger";
import {
  isHttpUrl,
  rankTokenMetadataForStory,
} from "@/lib/tokens/metadata-selection";
import {
  CinematicScene,
  GeneratedCinematicScript,
  WalletStory,
} from "@/lib/types/domain";
import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";

const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  visualPrompt: z.string().min(10),
  narration: z.string().min(10),
  durationSeconds: z.number().int().positive(),
  imageUrl: z.string().url().nullable().optional(),
});

const scriptSchema = z.object({
  hookLine: z.string().min(10),
  scenes: z.array(sceneSchema).min(3).max(12),
});

interface TokenImageReference {
  mint: string;
  symbol: string;
  name: string | null;
  imageUrl: string;
  tradeCount: number;
  lastSeenTimestamp: number;
  impactScore: number;
}

export function buildPumpImageReferences(story: WalletStory): TokenImageReference[] {
  return rankTokenMetadataForStory(story).map((item) => ({
    mint: item.mint,
    symbol: item.symbol,
    name: item.name,
    imageUrl: item.imageUrl,
    tradeCount: item.tradeCount,
    lastSeenTimestamp: item.lastSeenTimestamp,
    impactScore: item.impactScore,
  }));
}

export function assignSceneImageUrls(
  scenes: CinematicScene[],
  imagePool: string[],
): CinematicScene[] {
  const dedupedPool = [...new Set(imagePool.filter((url) => isHttpUrl(url)))];

  if (!dedupedPool.length) {
    return scenes.map((scene) => ({
      ...scene,
      imageUrl: isHttpUrl(scene.imageUrl) ? scene.imageUrl : null,
    }));
  }

  return scenes.map((scene, index) => ({
    ...scene,
    imageUrl:
      isHttpUrl(scene.imageUrl) ? scene.imageUrl : dedupedPool[index % dedupedPool.length]!,
  }));
}

function normalizeSceneDurations(
  scenes: CinematicScene[],
  targetDuration: number,
): CinematicScene[] {
  const total = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  if (total <= 0) {
    const equal = Math.max(1, Math.floor(targetDuration / scenes.length));
    return scenes.map((scene) => ({ ...scene, durationSeconds: equal }));
  }

  const scaled = scenes.map((scene) => ({
    ...scene,
    durationSeconds: Math.max(
      2,
      Math.round((scene.durationSeconds / total) * targetDuration),
    ),
  }));

  const scaledTotal = scaled.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const diff = targetDuration - scaledTotal;
  if (diff !== 0 && scaled.length) {
    scaled[scaled.length - 1]!.durationSeconds += diff;
  }

  return scaled;
}

function buildFallbackHookLine(story: WalletStory): string {
  const walletShort = `${story.wallet.slice(0, 4)}...${story.wallet.slice(-4)}`;
  const personality = story.walletPersonality ?? story.analytics.styleClassification;
  return `${walletShort} traded like ${personality} and left the chart in cinematic mode.`;
}

export function buildFallbackCinematicScript(
  story: WalletStory,
  tokenImageReferences: TokenImageReference[],
): GeneratedCinematicScript {
  const tokenA = tokenImageReferences[0]?.symbol ?? "top token";
  const tokenB = tokenImageReferences[1]?.symbol ?? tokenA;
  const walletShort = `${story.wallet.slice(0, 4)}...${story.wallet.slice(-4)}`;

  const roughScenes: CinematicScene[] = [
    {
      sceneNumber: 1,
      visualPrompt:
        "Open on a high-energy dashboard montage with on-chain overlays, fast zooms, and meme-style lower thirds.",
      narration: `${walletShort} entered the session with ${story.analytics.buyCount} buys, ${story.analytics.sellCount} sells, and instant momentum pressure.`,
      durationSeconds: Math.max(2, Math.round(story.durationSeconds / 3)),
      imageUrl: tokenImageReferences[0]?.imageUrl ?? null,
    },
    {
      sceneNumber: 2,
      visualPrompt:
        "Transition into volatile mid-act cuts, emphasizing rapid rotations, reversals, and scoreboard flashes.",
      narration: `Mid-session drama centered on ${tokenA} and ${tokenB}, with estimated PnL swinging to ${story.analytics.estimatedPnlSol.toFixed(4)} SOL.`,
      durationSeconds: Math.max(2, Math.round(story.durationSeconds / 3)),
      imageUrl: tokenImageReferences[1]?.imageUrl ?? null,
    },
    {
      sceneNumber: 3,
      visualPrompt:
        "Close with a stylized final recap card, kinetic captions, and a punchline freeze-frame outro.",
      narration: `Final tape: spent ${story.analytics.solSpent.toFixed(4)} SOL, received ${story.analytics.solReceived.toFixed(4)} SOL. Best: ${story.analytics.bestTrade}. Worst: ${story.analytics.worstTrade}.`,
      durationSeconds: Math.max(2, story.durationSeconds),
      imageUrl: tokenImageReferences[2]?.imageUrl ?? null,
    },
  ];

  const normalizedScenes = normalizeSceneDurations(roughScenes, story.durationSeconds);
  const scenesWithImages = assignSceneImageUrls(
    normalizedScenes,
    tokenImageReferences.map((reference) => reference.imageUrl),
  );

  return {
    hookLine: buildFallbackHookLine(story),
    scenes: scenesWithImages,
  };
}

export async function generateCinematicScript(
  story: WalletStory,
): Promise<GeneratedCinematicScript> {
  const tokenImageReferences = buildPumpImageReferences(story);

  try {
    const templatePath = path.join(
      process.cwd(),
      "prompts",
      "cinematic_prompt_template.md",
    );
    const template = await readFile(templatePath, "utf8");
    const imageReferencePayload = tokenImageReferences.map((reference) => ({
      mint: reference.mint,
      symbol: reference.symbol,
      name: reference.name,
      imageUrl: reference.imageUrl,
      tradeCount: reference.tradeCount,
      impactScore: reference.impactScore,
    }));

    const raw = await openRouterJson<unknown>({
      temperature: 0.35,
      maxTokens: 1600,
      messages: [
        {
          role: "system",
          content: template,
        },
        {
          role: "user",
          content:
            `Build a cinematic script from this factual wallet story JSON:\n${JSON.stringify(story)}` +
            `\n\nPump.fun token image metadata to use in scene imageUrl fields when relevant:\n${JSON.stringify(imageReferencePayload)}`,
        },
      ],
    });

    const parsed = scriptSchema.parse(raw);
    const normalizedScenes = normalizeSceneDurations(
      parsed.scenes.map((scene) => ({
        ...scene,
        imageUrl: scene.imageUrl ?? null,
      })),
      story.durationSeconds,
    );
    const scenesWithImages = assignSceneImageUrls(
      normalizedScenes,
      tokenImageReferences.map((reference) => reference.imageUrl),
    );

    return {
      hookLine: parsed.hookLine,
      scenes: scenesWithImages,
    };
  } catch (error) {
    logger.warn("cinematic_script_openrouter_failed_fallback", {
      component: "ai_cinematic",
      stage: "generate_script",
      wallet: story.wallet,
      errorCode: "cinematic_script_openrouter_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackCinematicScript(story, tokenImageReferences);
  }
}
