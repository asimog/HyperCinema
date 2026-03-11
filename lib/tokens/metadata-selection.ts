import {
  WalletStory,
  WalletStoryTokenMetadata,
} from "@/lib/types/domain";

const EPSILON = 1e-9;

export interface TokenMetadataSourceTrade {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  image?: string | null;
  side: "buy" | "sell";
  solAmount: number;
  timestamp: number;
}

export interface RankedTokenMetadata extends WalletStoryTokenMetadata {
  impactScore: number;
  keyEventMatchCount: number;
}

function round(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || Math.abs(denominator) <= EPSILON) {
    return 0;
  }
  return numerator / denominator;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function computeTokenImageLimit(durationSeconds: number): number {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(1, Math.round(durationSeconds))
    : 30;

  // 30s => 10, 60s => 20, 90s => 30
  return clamp(Math.round(safeDuration / 3), 1, 60);
}

export function buildTokenMetadataFromTrades(
  trades: TokenMetadataSourceTrade[],
): WalletStoryTokenMetadata[] {
  const byMint = new Map<string, WalletStoryTokenMetadata>();

  for (const trade of trades) {
    if (!isHttpUrl(trade.image)) {
      continue;
    }

    const existing = byMint.get(trade.mint);
    if (!existing) {
      byMint.set(trade.mint, {
        mint: trade.mint,
        symbol: (trade.symbol ?? "").trim() || trade.mint.slice(0, 6),
        name: trade.name?.trim() || null,
        imageUrl: trade.image,
        tradeCount: 1,
        buyCount: trade.side === "buy" ? 1 : 0,
        sellCount: trade.side === "sell" ? 1 : 0,
        solVolume: round(Math.max(0, trade.solAmount), 6),
        netSolFlow: round(
          trade.side === "buy" ? trade.solAmount : -trade.solAmount,
          6,
        ),
        firstSeenTimestamp: trade.timestamp,
        lastSeenTimestamp: trade.timestamp,
      });
      continue;
    }

    existing.tradeCount += 1;
    if (trade.side === "buy") {
      existing.buyCount += 1;
      existing.netSolFlow = round(existing.netSolFlow + trade.solAmount, 6);
    } else {
      existing.sellCount += 1;
      existing.netSolFlow = round(existing.netSolFlow - trade.solAmount, 6);
    }
    existing.solVolume = round(existing.solVolume + Math.max(0, trade.solAmount), 6);
    existing.firstSeenTimestamp = Math.min(
      existing.firstSeenTimestamp,
      trade.timestamp,
    );
    existing.lastSeenTimestamp = Math.max(
      existing.lastSeenTimestamp,
      trade.timestamp,
    );
  }

  return [...byMint.values()];
}

function buildCandidatePool(story: WalletStory): WalletStoryTokenMetadata[] {
  if (story.tokenMetadata?.length) {
    return story.tokenMetadata.filter((item) => isHttpUrl(item.imageUrl));
  }

  return buildTokenMetadataFromTrades(
    story.timeline.map((item) => ({
      mint: item.mint,
      symbol: item.symbol,
      name: item.name ?? null,
      image: item.image ?? null,
      side: item.side,
      solAmount: item.solAmount,
      timestamp: item.timestamp,
    })),
  );
}

function deriveKeywordBias(story: WalletStory): {
  momentum: number;
  conviction: number;
  reversal: number;
} {
  const haystack = [
    story.walletPersonality ?? "",
    story.walletSecondaryPersonality ?? "",
    ...(story.walletModifiers ?? []),
    ...(story.behaviorPatterns ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const includesOne = (keywords: string[]) =>
    keywords.some((keyword) => haystack.includes(keyword));

  return {
    momentum: includesOne([
      "momentum",
      "fomo",
      "chase",
      "rapid",
      "sniper",
      "rotation",
      "goblin",
    ])
      ? 1
      : 0,
    conviction: includesOne([
      "conviction",
      "accumulator",
      "diamond",
      "holder",
      "bag",
      "maximalist",
    ])
      ? 1
      : 0,
    reversal: includesOne([
      "revenge",
      "flip",
      "panic",
      "comeback",
      "reentry",
      "re-entry",
    ])
      ? 1
      : 0,
  };
}

function countKeyEventMatches(story: WalletStory, token: WalletStoryTokenMetadata): number {
  if (!story.keyEvents?.length) {
    return 0;
  }

  const mint = normalizeLabel(token.mint);
  const symbol = normalizeLabel(token.symbol);
  return story.keyEvents.reduce((count, event) => {
    const tokenLabel = normalizeLabel(event.token);
    return tokenLabel.includes(mint) || tokenLabel.includes(symbol)
      ? count + 1
      : count;
  }, 0);
}

export function rankTokenMetadataForStory(
  story: WalletStory,
  options?: { limit?: number },
): RankedTokenMetadata[] {
  const pool = buildCandidatePool(story);
  if (!pool.length) {
    return [];
  }

  const maxVolume = pool.reduce(
    (max, item) => Math.max(max, item.solVolume),
    EPSILON,
  );
  const maxTrades = pool.reduce(
    (max, item) => Math.max(max, item.tradeCount),
    1,
  );
  const minLastSeen = pool.reduce(
    (min, item) => Math.min(min, item.lastSeenTimestamp),
    Number.POSITIVE_INFINITY,
  );
  const maxLastSeen = pool.reduce(
    (max, item) => Math.max(max, item.lastSeenTimestamp),
    0,
  );
  const recencyRange = Math.max(EPSILON, maxLastSeen - minLastSeen);

  const metrics = story.walletProfile?.metrics;
  const keywordBias = deriveKeywordBias(story);
  const momentumBias = clamp(
    (metrics?.lateMomentumEntryRatio ?? 0) * 0.65 +
      (metrics?.rapidRotationRatio ?? 0) * 0.35 +
      keywordBias.momentum * 0.2,
    0,
    1.5,
  );
  const flipBias = clamp(
    (metrics?.rapidFlipRatio ?? 0) * 0.7 +
      (metrics?.prematureExitRatio ?? 0) * 0.3 +
      keywordBias.reversal * 0.2,
    0,
    1.5,
  );
  const concentrationBias = clamp(
    (metrics?.tokenConcentration ?? 0) + keywordBias.conviction * 0.2,
    0,
    1.5,
  );
  const convictionBias = clamp(
    ratio(metrics?.averageHoldingMinutes ?? 0, 180) * 0.5 +
      (metrics?.tokenConcentration ?? 0) * 0.5 +
      keywordBias.conviction * 0.2,
    0,
    1.5,
  );
  const reentryBias = clamp(
    ratio(
      metrics?.postLossReentryCount ?? 0,
      Math.max(1, metrics?.buyCount ?? story.analytics.buyCount),
    ),
    0,
    1,
  );

  const eventMatchesByMint = new Map<string, number>();
  for (const item of pool) {
    eventMatchesByMint.set(item.mint, countKeyEventMatches(story, item));
  }
  const maxEventMatches = Math.max(
    1,
    ...[...eventMatchesByMint.values(), 0],
  );

  const ranked = pool.map<RankedTokenMetadata>((item) => {
    const volumeScore = clamp(ratio(item.solVolume, maxVolume), 0, 1);
    const frequencyScore = clamp(ratio(item.tradeCount, maxTrades), 0, 1);
    const recencyScore = clamp(
      ratio(item.lastSeenTimestamp - minLastSeen, recencyRange),
      0,
      1,
    );
    const turnoverScore = clamp(
      ratio(Math.min(item.buyCount, item.sellCount), Math.max(1, item.tradeCount)),
      0,
      1,
    );
    const directionalityScore = clamp(
      ratio(Math.abs(item.netSolFlow), Math.max(item.solVolume, EPSILON)),
      0,
      1,
    );
    const keyEventMatchCount = eventMatchesByMint.get(item.mint) ?? 0;
    const eventScore = clamp(ratio(keyEventMatchCount, maxEventMatches), 0, 1);

    const baseScore =
      volumeScore * 0.34 +
      frequencyScore * 0.2 +
      recencyScore * 0.14 +
      eventScore * 0.1 +
      turnoverScore * 0.11 +
      directionalityScore * 0.11;

    const personalityWeightedScore =
      momentumBias * (recencyScore * 0.1 + turnoverScore * 0.06 + volumeScore * 0.04) +
      flipBias * (turnoverScore * 0.1 + frequencyScore * 0.05) +
      concentrationBias * (volumeScore * 0.1 + directionalityScore * 0.06) +
      convictionBias * (directionalityScore * 0.08 + volumeScore * 0.04) +
      reentryBias * (frequencyScore * 0.04 + recencyScore * 0.04);

    return {
      ...item,
      impactScore: round(baseScore + personalityWeightedScore, 6),
      keyEventMatchCount,
    };
  });

  ranked.sort((a, b) => {
    if (b.impactScore !== a.impactScore) {
      return b.impactScore - a.impactScore;
    }
    if (b.solVolume !== a.solVolume) {
      return b.solVolume - a.solVolume;
    }
    if (b.tradeCount !== a.tradeCount) {
      return b.tradeCount - a.tradeCount;
    }
    return b.lastSeenTimestamp - a.lastSeenTimestamp;
  });

  const limit = options?.limit ?? computeTokenImageLimit(story.durationSeconds);
  return ranked.slice(0, Math.max(1, limit));
}
