import type {
  NormalizedTrade,
  WalletAnalysisResult,
  WalletMoment,
  WalletMoments,
} from "@/lib/analytics/types";
import { createCinemaRng, stablePick, stableShuffle } from "@/lib/cinema/constants";
import type {
  CharacterArcId,
  SceneType,
  TokenAsset,
  TokenImageMoment,
  TokenImagePlan,
} from "@/lib/cinema/types";
import { isHttpUrl } from "@/lib/tokens/metadata-selection";

function tradeImage(trade: NormalizedTrade): string | undefined {
  return isHttpUrl(trade.image ?? undefined) ? (trade.image as string) : undefined;
}

function assetFromTrade(trade: NormalizedTrade): TokenAsset {
  return {
    mint: trade.mint,
    symbol: trade.symbol ?? null,
    name: trade.name ?? null,
    image: tradeImage(trade) ?? null,
    description: null,
    status: null,
  };
}

function buildAssetPool(input: {
  normalizedTrades: NormalizedTrade[];
  tokenAssetMap?: Record<string, TokenAsset>;
}): Map<string, TokenAsset> {
  const map = new Map<string, TokenAsset>();

  if (input.tokenAssetMap) {
    for (const [mint, asset] of Object.entries(input.tokenAssetMap)) {
      if (!mint) continue;
      map.set(mint, { ...asset, mint: asset.mint || mint });
    }
  }

  for (const trade of input.normalizedTrades) {
    const existing = map.get(trade.mint);
    if (!existing) {
      map.set(trade.mint, assetFromTrade(trade));
      continue;
    }

    if (!existing.symbol && trade.symbol) existing.symbol = trade.symbol;
    if (!existing.name && trade.name) existing.name = trade.name;
    if (!existing.image) {
      const image = tradeImage(trade);
      if (image) existing.image = image;
    }
  }

  return map;
}

type MomentMintHit = {
  mint: string;
  weight: number;
  sceneType: SceneType;
  reason: string;
};

function mapMomentToHits(input: {
  moment: WalletMoment | undefined;
  sceneType: SceneType;
  weight: number;
  reason: string;
  signatureToMint: Map<string, string>;
}): MomentMintHit[] {
  if (!input.moment?.tradeSignatures?.length) {
    return [];
  }

  const hits: MomentMintHit[] = [];
  for (const signature of input.moment.tradeSignatures) {
    const mint = input.signatureToMint.get(signature);
    if (!mint) continue;
    hits.push({
      mint,
      weight: input.weight,
      sceneType: input.sceneType,
      reason: input.reason,
    });
  }

  return hits;
}

function collectMomentMintHits(input: {
  moments: WalletMoments;
  signatureToMint: Map<string, string>;
  arcId: CharacterArcId;
}): MomentMintHit[] {
  const base: MomentMintHit[] = [];

  base.push(
    ...mapMomentToHits({
      moment: input.moments.absoluteCinemaMoment,
      sceneType: "absolute_cinema",
      weight: 5,
      reason: "Featured token is tied to the absolute cinema moment.",
      signatureToMint: input.signatureToMint,
    }),
  );

  base.push(
    ...mapMomentToHits({
      moment: input.moments.mainCharacterMoment,
      sceneType: "main_character",
      weight: 4,
      reason: "Featured token is tied to the main character moment.",
      signatureToMint: input.signatureToMint,
    }),
  );

  const villainMoment = input.moments.mostUnwellMoment ?? input.moments.overcookedMoment;
  base.push(
    ...mapMomentToHits({
      moment: villainMoment,
      sceneType: "villain_turn",
      weight: 4,
      reason: "Featured token marks the villain-turn pressure point.",
      signatureToMint: input.signatureToMint,
    }),
  );

  const loreMoment = input.moments.trenchLoreMoment ?? input.moments.hadToBeThereMoment;
  base.push(
    ...mapMomentToHits({
      moment: loreMoment,
      sceneType: "trench_lore",
      weight: 3,
      reason: "Featured token is part of trench lore for this stretch.",
      signatureToMint: input.signatureToMint,
    }),
  );

  if (input.arcId === "hero" || input.arcId === "survivor") {
    base.push(
      ...mapMomentToHits({
        moment: input.moments.comebackMoment,
        sceneType: "comeback",
        weight: 3,
        reason: "Featured token is tied to the comeback beat.",
        signatureToMint: input.signatureToMint,
      }),
    );
  }

  return base;
}

function placementOptions(sceneType: SceneType, arcId: CharacterArcId): string[] {
  switch (sceneType) {
    case "opening":
      return [
        "a flickering billboard above the alley",
        "a sticker shrine on the trading desk",
        "a hologram reflection in rain on glass",
      ];
    case "temptation":
      return ["a casino marquee sign", "a departing-train departure board", "a neon poster wall"];
    case "first_conviction":
      return ["a candle-lit altar poster", "a talisman pendant close-up", "a banner hanging like a vow"];
    case "villain_turn":
      return ["a torn boxing-ring banner", "a wanted poster under red strobe", "a glitching throne emblem"];
    case "jester_turn":
      return ["a funhouse prize wheel", "a clownish arcade sign", "a warped mirror mascot reflection"];
    case "damage":
      return ["a cracked screen flicker", "a billboard shorting out", "a poster shredded by wind"];
    case "collapse":
      return ["a falling neon sign", "a bridge billboard snapping in half", "a symbol drowning in static"];
    case "comeback":
      return ["a sunrise banner unfurling", "a rocket decal in ignition glow", "a poster re-lit after darkness"];
    case "trench_lore":
      return ["a wall of posters and graffiti stencils", "a hologram ad in the alley fog", "a sticker map on concrete"];
    case "absolute_cinema":
      return ["a skyline-wide projection", "a colossal hologram hovering over the set piece", "a cinematic poster erupting into particles"];
    case "aftermath":
      return arcId === "ghost" || arcId === "martyr"
        ? ["a peeling poster in an empty room", "a faint reflection on a dead monitor", "a torn banner on the floor"]
        : ["a poster fading into morning light", "a sticker half-peeled at dawn", "a quiet billboard powering down"];
    default:
      return ["a flickering billboard", "a hologram poster", "a sticker shrine"];
  }
}

function resolveSymbol(asset: TokenAsset): string | undefined {
  const value = (asset.symbol ?? "").trim();
  return value.length ? value : undefined;
}

function resolveName(asset: TokenAsset): string | undefined {
  const value = (asset.name ?? "").trim();
  return value.length ? value : undefined;
}

function resolveImage(asset: TokenAsset): string | undefined {
  return isHttpUrl(asset.image ?? undefined) ? (asset.image as string) : undefined;
}

function maxFeaturedForRange(rangeHours: number, arcId: CharacterArcId): number {
  const base = rangeHours === 24 ? 3 : rangeHours === 48 ? 4 : 4;
  if (arcId === "ghost" || arcId === "pilgrim") return Math.min(3, base);
  if (arcId === "jester" || arcId === "villain" || arcId === "fallen_hero") return base;
  return Math.max(2, base - 1);
}

export function buildTokenImagePlan(input: {
  analysis: WalletAnalysisResult;
  arcId: CharacterArcId;
  tokenAssetMap?: Record<string, TokenAsset>;
}): TokenImagePlan {
  const rangeHours = input.analysis.rangeHours;
  const rng = createCinemaRng(`tokenplan:${input.analysis.wallet}:${rangeHours}`);

  const assets = buildAssetPool({
    normalizedTrades: input.analysis.normalizedTrades,
    tokenAssetMap: input.tokenAssetMap,
  });

  const signatureToMint = new Map<string, string>();
  const mintStats = new Map<string, { tradeCount: number; volume: number; lastSeen: number }>();
  for (const trade of input.analysis.normalizedTrades) {
    signatureToMint.set(trade.signature, trade.mint);
    const stats = mintStats.get(trade.mint) ?? { tradeCount: 0, volume: 0, lastSeen: 0 };
    stats.tradeCount += 1;
    stats.volume += Math.abs(trade.solAmount);
    stats.lastSeen = Math.max(stats.lastSeen, trade.timestamp);
    mintStats.set(trade.mint, stats);
  }

  const maxVolume = Math.max(1e-9, ...[...mintStats.values()].map((s) => s.volume));
  const maxTrades = Math.max(1, ...[...mintStats.values()].map((s) => s.tradeCount));

  const momentHits = collectMomentMintHits({
    moments: input.analysis.moments,
    signatureToMint,
    arcId: input.arcId,
  });
  const momentBoost = new Map<string, { weight: number; sceneType: SceneType; reason: string }>();
  for (const hit of momentHits) {
    const existing = momentBoost.get(hit.mint);
    if (!existing || hit.weight > existing.weight) {
      momentBoost.set(hit.mint, { weight: hit.weight, sceneType: hit.sceneType, reason: hit.reason });
    }
  }

  const scored = [...mintStats.entries()].map(([mint, stats]) => {
    const base =
      (stats.tradeCount / maxTrades) * 0.55 +
      (stats.volume / maxVolume) * 0.35 +
      Math.min(1, stats.lastSeen > 0 ? 0.1 : 0);
    const moment = momentBoost.get(mint);
    const boost = moment ? Math.min(1, moment.weight / 6) * 0.7 : 0;
    const asset = assets.get(mint);
    const hasImage = asset ? Boolean(resolveImage(asset)) : false;
    return {
      mint,
      score: base + boost + (hasImage ? 0.12 : 0),
      moment,
      hasImage,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxFeatured = maxFeaturedForRange(rangeHours, input.arcId);
  const featured = scored
    .filter((entry) => entry.hasImage)
    .slice(0, maxFeatured)
    .map((entry) => entry.mint);

  const featuredMints = featured.length ? featured : scored.slice(0, Math.min(2, scored.length)).map((e) => e.mint);

  const primaryMint = featuredMints[0];
  const primaryMomentScene = primaryMint ? momentBoost.get(primaryMint)?.sceneType : undefined;

  const sceneSlots: SceneType[] = stableShuffle(
    [
      "opening",
      primaryMomentScene ?? (input.arcId === "villain" ? "villain_turn" : input.arcId === "jester" ? "jester_turn" : "comeback"),
      "trench_lore",
      "absolute_cinema",
      "aftermath",
    ].filter((value, index, arr) => value && arr.indexOf(value) === index) as SceneType[],
    rng,
  ).slice(0, rangeHours === 24 ? 4 : rangeHours === 48 ? 6 : 7);

  const imageMoments: TokenImageMoment[] = [];
  for (const sceneType of sceneSlots) {
    const momentMint = momentHits.find((hit) => hit.sceneType === sceneType)?.mint;
    const mint =
      (momentMint && featuredMints.includes(momentMint) ? momentMint : undefined) ??
      (primaryMint ?? featuredMints[0]);

    if (!mint) continue;

    const asset = assets.get(mint) ?? { mint };
    const symbol = resolveSymbol(asset);
    const name = resolveName(asset);
    const image = resolveImage(asset);
    if (!image) continue;

    const reason =
      momentBoost.get(mint)?.reason ??
      (sceneType === "opening"
        ? "Primary token establishes the night's visual anchor."
        : "Token appears as a recurring trench artifact for continuity.");

    const placementHint = stablePick(placementOptions(sceneType, input.arcId), rng);

    imageMoments.push({
      mint,
      symbol,
      name,
      image,
      reason,
      sceneType,
      placementHint,
    });
  }

  const deduped = new Map<string, TokenImageMoment>();
  for (const moment of imageMoments) {
    const key = `${moment.sceneType}:${moment.mint}`;
    if (!deduped.has(key)) {
      deduped.set(key, moment);
    }
  }

  return {
    featuredMints: featuredMints.filter(Boolean),
    imageMoments: [...deduped.values()],
  };
}

