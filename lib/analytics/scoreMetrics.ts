import { round } from "@/lib/utils";
import { NormalizedTrade, WalletMetrics } from "./types";

const EPSILON = 1e-9;
const SESSION_GAP_SECONDS = 45 * 60;
const BURST_WINDOW_SECONDS = 15 * 60;
const CLUSTER_WINDOW_SECONDS = 30 * 60;

function safeDiv(numerator: number, denominator: number): number {
  if (Math.abs(denominator) <= EPSILON) {
    return 0;
  }
  return numerator / denominator;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }
  return sorted[middle]!;
}

function standardDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function roundMetric(value: number, precision = 4): number {
  return round(value, precision);
}

function hashWindowCount(
  timestamps: number[],
  windowSeconds: number,
  threshold: number,
): number {
  let count = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const start = timestamps[index]!;
    let windowCount = 0;
    for (let scan = index; scan < timestamps.length; scan += 1) {
      if (timestamps[scan]! - start > windowSeconds) break;
      windowCount += 1;
    }
    if (windowCount >= threshold) {
      count += 1;
    }
  }
  return count;
}

function isWeekendTrade(timestamp: number): boolean {
  const day = new Date(timestamp * 1000).getUTCDay();
  return day === 0 || day === 6;
}

function tradeHour(timestamp: number): number {
  return new Date(timestamp * 1000).getUTCHours();
}

function buildSessions(trades: NormalizedTrade[]): NormalizedTrade[][] {
  if (!trades.length) return [];
  const sessions: NormalizedTrade[][] = [[trades[0]!]];

  for (let index = 1; index < trades.length; index += 1) {
    const previous = trades[index - 1]!;
    const current = trades[index]!;
    if (current.timestamp - previous.timestamp > SESSION_GAP_SECONDS) {
      sessions.push([current]);
      continue;
    }
    sessions[sessions.length - 1]!.push(current);
  }

  return sessions;
}

function computeProfitStreaks(pnls: number[]): {
  profitStreak: number;
  lossStreak: number;
} {
  let currentProfit = 0;
  let currentLoss = 0;
  let maxProfit = 0;
  let maxLoss = 0;

  for (const pnl of pnls) {
    if (pnl > 0) {
      currentProfit += 1;
      currentLoss = 0;
    } else if (pnl < 0) {
      currentLoss += 1;
      currentProfit = 0;
    } else {
      currentProfit = 0;
      currentLoss = 0;
    }
    maxProfit = Math.max(maxProfit, currentProfit);
    maxLoss = Math.max(maxLoss, currentLoss);
  }

  return {
    profitStreak: maxProfit,
    lossStreak: maxLoss,
  };
}

function computeMaxDrawdown(pnls: number[]): number {
  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const pnl of pnls) {
    running += pnl;
    peak = Math.max(peak, running);
    maxDrawdown = Math.min(maxDrawdown, running - peak);
  }

  return Math.abs(maxDrawdown);
}

function sprayBehavior(concentrationScore: number): number {
  return clamp(1 - concentrationScore);
}

export function scoreMetrics(input: {
  normalizedTrades: NormalizedTrade[];
  rangeHours: number;
}): WalletMetrics {
  const trades = [...input.normalizedTrades].sort((a, b) => a.timestamp - b.timestamp);
  const buyTrades = trades.filter((trade) => trade.side === "BUY");
  const sellTrades = trades.filter((trade) => trade.side === "SELL");
  const closedSells = sellTrades.filter(
    (trade) => typeof trade.pnlSol === "number" && trade.holdDurationMinutes !== null,
  );
  const winningSells = closedSells.filter((trade) => (trade.pnlSol ?? 0) > 0);
  const losingSells = closedSells.filter((trade) => (trade.pnlSol ?? 0) < 0);

  const tradeCount = trades.length;
  const buyCount = buyTrades.length;
  const sellCount = sellTrades.length;
  const distinctTokenCount = new Set(trades.map((trade) => trade.mint)).size;
  const tradesPerHour = safeDiv(tradeCount, Math.max(1, input.rangeHours));
  const tokensPerHour = safeDiv(distinctTokenCount, Math.max(1, input.rangeHours));
  const averageTradesPerToken = safeDiv(tradeCount, Math.max(1, distinctTokenCount));

  const timestamps = trades.map((trade) => trade.timestamp);
  const sessions = buildSessions(trades);
  const sessionLengthsMinutes = sessions.map((session) =>
    session.length > 1
      ? (session[session.length - 1]!.timestamp - session[0]!.timestamp) / 60
      : 0,
  );
  const sessionDurationMinutes =
    trades.length > 1 ? (trades[trades.length - 1]!.timestamp - trades[0]!.timestamp) / 60 : 0;

  const gapsSeconds = trades
    .slice(1)
    .map((trade, index) => trade.timestamp - trades[index]!.timestamp);
  const gapsMinutes = gapsSeconds.map((gap) => gap / 60);
  const medianGapMinutes = median(gapsMinutes);
  const meanGapMinutes = average(gapsMinutes);
  const tradeTimingVariance = clamp(
    safeDiv(standardDeviation(gapsMinutes), Math.max(1, meanGapMinutes)),
  );
  const tradeAccelerationRate =
    gapsMinutes.length >= 4
      ? clamp(
          safeDiv(
            average(gapsMinutes.slice(0, Math.ceil(gapsMinutes.length / 2))) -
              average(gapsMinutes.slice(Math.floor(gapsMinutes.length / 2))),
            Math.max(1, meanGapMinutes),
          ),
          -1,
          1,
        )
      : 0;

  let rapidRotationCount = 0;
  let coinSwitchCount = 0;
  for (let index = 1; index < trades.length; index += 1) {
    const previous = trades[index - 1]!;
    const current = trades[index]!;
    if (previous.mint !== current.mint) {
      coinSwitchCount += 1;
    }
    if (previous.mint !== current.mint && current.timestamp - previous.timestamp <= 15 * 60) {
      rapidRotationCount += 1;
    }
  }

  const rapidRotationScore = clamp(safeDiv(rapidRotationCount, Math.max(1, tradeCount - 1)));
  const tokenRotationRate = clamp(safeDiv(coinSwitchCount, Math.max(1, tradeCount - 1)));
  const coinSwitchFrequency = tokenRotationRate;

  const tradeBurstCount = hashWindowCount(timestamps, BURST_WINDOW_SECONDS, 4);
  const tradeClusterCount = hashWindowCount(timestamps, CLUSTER_WINDOW_SECONDS, 6);
  const burstTradeIntensity = clamp(
    safeDiv(
      sessions.reduce((max, session) => Math.max(max, session.length), 0),
      Math.max(1, tradeCount),
    ) * 1.8,
  );

  const midnightTrades = trades.filter((trade) => {
    const hour = tradeHour(trade.timestamp);
    return hour >= 0 && hour < 3;
  });
  const lateNightTrades = trades.filter((trade) => {
    const hour = tradeHour(trade.timestamp);
    return hour >= 0 && hour < 6;
  });
  const earlyMorningTrades = trades.filter((trade) => {
    const hour = tradeHour(trade.timestamp);
    return hour >= 5 && hour < 9;
  });
  const weekendTrades = trades.filter((trade) => isWeekendTrade(trade.timestamp));
  const midnightTradeRate = clamp(safeDiv(midnightTrades.length, Math.max(1, tradeCount)));
  const lateNightTradeRate = clamp(safeDiv(lateNightTrades.length, Math.max(1, tradeCount)));
  const earlyMorningTradeRate = clamp(
    safeDiv(earlyMorningTrades.length, Math.max(1, tradeCount)),
  );
  const weekendTradeRate = clamp(safeDiv(weekendTrades.length, Math.max(1, tradeCount)));
  const sleepDeprivationScore = clamp(
    lateNightTradeRate * 0.55 +
      midnightTradeRate * 0.25 +
      clamp(tradeBurstCount / 6) * 0.2,
  );

  let earlyBuyCount = 0;
  let lateBuyCount = 0;
  let topChasingCount = 0;
  let breakoutEntryCount = 0;
  let fakeoutEntryCount = 0;
  let momentumEntryCount = 0;
  let panicEntryCount = 0;
  let revengeEntryCount = 0;
  let averageEntryDelayMinutesTotal = 0;
  let entryDelayCount = 0;
  let narrativeEntryCount = 0;
  let liquidityEntryWins = 0;
  let trendAnticipationHits = 0;
  const previousTradeByReference = new Map<NormalizedTrade, NormalizedTrade | undefined>();
  let lastStrictPrevious: NormalizedTrade | undefined;
  for (let index = 0; index < trades.length; index += 1) {
    const trade = trades[index]!;
    previousTradeByReference.set(trade, lastStrictPrevious);
    const nextTrade = trades[index + 1];
    if (!nextTrade || nextTrade.timestamp > trade.timestamp) {
      lastStrictPrevious = trade;
    }
  }
  const priorBuysByMint = new Map<string, NormalizedTrade[]>();
  const priorTradesByMint = new Map<string, NormalizedTrade[]>();
  const closedSellsByMint = new Map<string, NormalizedTrade[]>();
  for (const sellTrade of closedSells) {
    const existing = closedSellsByMint.get(sellTrade.mint) ?? [];
    existing.push(sellTrade);
    closedSellsByMint.set(sellTrade.mint, existing);
  }
  const pushTradeHistory = (trade: NormalizedTrade) => {
    const priorTrades = priorTradesByMint.get(trade.mint) ?? [];
    priorTrades.push(trade);
    priorTradesByMint.set(trade.mint, priorTrades);

    if (trade.side === "BUY") {
      const priorBuys = priorBuysByMint.get(trade.mint) ?? [];
      priorBuys.push(trade);
      priorBuysByMint.set(trade.mint, priorBuys);
    }
  };
  let tradeCursor = 0;

  for (const buyTrade of buyTrades) {
    while (tradeCursor < trades.length && trades[tradeCursor]!.timestamp < buyTrade.timestamp) {
      pushTradeHistory(trades[tradeCursor]!);
      tradeCursor += 1;
    }

    const mintPriorBuys = priorBuysByMint.get(buyTrade.mint) ?? [];
    const mintPriorTrades = priorTradesByMint.get(buyTrade.mint) ?? [];
    const priorSameTokenBuys = mintPriorBuys.filter(
      (candidate) =>
        buyTrade.timestamp - candidate.timestamp <= 60 * 60,
    );
    const priorSameTokenTrades = mintPriorTrades.filter(
      (candidate) =>
        buyTrade.timestamp - candidate.timestamp <= 60 * 60,
    );

    if (priorSameTokenBuys.length === 0) {
      earlyBuyCount += 1;
    } else {
      averageEntryDelayMinutesTotal +=
        (buyTrade.timestamp - priorSameTokenBuys[priorSameTokenBuys.length - 1]!.timestamp) / 60;
      entryDelayCount += 1;
    }

    const recentSameTokenBuys = priorSameTokenBuys.filter(
      (candidate) => buyTrade.timestamp - candidate.timestamp <= 20 * 60,
    );
    if (recentSameTokenBuys.length >= 2) {
      lateBuyCount += 1;
      momentumEntryCount += 1;
    }

    const priorPrices = priorSameTokenTrades
      .map((candidate) => candidate.priceEstimate ?? 0)
      .filter((value) => value > EPSILON);
    const currentPrice = buyTrade.priceEstimate ?? 0;
    if (priorPrices.length && currentPrice > EPSILON) {
      const priorMax = Math.max(...priorPrices);
      const priorMin = Math.min(...priorPrices);
      const priorAvg = average(priorPrices);
      if (currentPrice >= priorMax * 0.95) {
        topChasingCount += 1;
      }
      if (currentPrice >= priorAvg * 1.15) {
        breakoutEntryCount += 1;
      }
      if (currentPrice <= priorMin * 1.05) {
        trendAnticipationHits += 1;
      }
    }

    const laterSameTokenSell = (closedSellsByMint.get(buyTrade.mint) ?? []).find(
      (candidate) =>
        candidate.timestamp > buyTrade.timestamp &&
        candidate.timestamp <= buyTrade.timestamp + 2 * 60 * 60,
    );
    if (
      laterSameTokenSell &&
      breakoutEntryCount > 0 &&
      (laterSameTokenSell.pnlSol ?? 0) < 0
    ) {
      fakeoutEntryCount += 1;
    }
    if (laterSameTokenSell && (laterSameTokenSell.pnlSol ?? 0) > 0) {
      liquidityEntryWins += 1;
    }

    const previousTrade = previousTradeByReference.get(buyTrade);
    if (previousTrade && previousTrade.side === "SELL") {
      const delayMinutes = (buyTrade.timestamp - previousTrade.timestamp) / 60;
      if (delayMinutes <= 10) {
        panicEntryCount += 1;
      }
      const previousSellPnl = previousTrade.pnlSol ?? 0;
      if (previousSellPnl < 0 && delayMinutes <= 20) {
        revengeEntryCount += 1;
      }
    }

    if (priorSameTokenBuys.length === 0 && (buyTrade.image || buyTrade.symbol || buyTrade.name)) {
      narrativeEntryCount += 1;
    }
  }

  const averageEntryDelay = averageEntryDelayMinutesTotal / Math.max(1, entryDelayCount);
  const earlyEntryBias = clamp(safeDiv(earlyBuyCount, Math.max(1, buyCount)));
  const earlyEntryScore = earlyEntryBias;
  const lateEntryBias = clamp(safeDiv(lateBuyCount, Math.max(1, buyCount)));
  const lateEntryScore = clamp(
    (lateEntryBias + safeDiv(topChasingCount, Math.max(1, buyCount))) / 2,
  );
  const topChasingRate = clamp(safeDiv(topChasingCount, Math.max(1, buyCount)));
  const breakoutEntryRate = clamp(safeDiv(breakoutEntryCount, Math.max(1, buyCount)));
  const fakeoutEntryRate = clamp(
    safeDiv(fakeoutEntryCount, Math.max(1, Math.max(1, breakoutEntryCount))),
  );
  const momentumEntryRate = clamp(safeDiv(momentumEntryCount, Math.max(1, buyCount)));
  const panicEntryRate = clamp(safeDiv(panicEntryCount, Math.max(1, buyCount)));
  const revengeEntryRate = clamp(safeDiv(revengeEntryCount, Math.max(1, buyCount)));
  const rapidReentryScore = revengeEntryRate;
  const reEntrySpeed = clamp(1 - safeDiv(averageEntryDelay, 60));
  const reactionDelay = averageEntryDelay;
  const narrativeEntryScore = clamp(
    earlyEntryBias * 0.4 +
      safeDiv(narrativeEntryCount, Math.max(1, buyCount)) * 0.35 +
      breakoutEntryRate * 0.25,
  );
  const trendAnticipationScore = clamp(
    earlyEntryBias * 0.45 +
      clamp(safeDiv(trendAnticipationHits, Math.max(1, buyCount))) * 0.35 +
      reEntrySpeed * 0.2,
  );
  const liquidityEntryTiming = clamp(
    safeDiv(liquidityEntryWins, Math.max(1, closedSells.length || buyCount)),
  );

  const holdDurations = closedSells
    .map((trade) => trade.holdDurationMinutes ?? 0)
    .filter((value) => value >= 0);
  const avgHoldMinutes = roundMetric(average(holdDurations), 2);
  const averageHoldMinutes = avgHoldMinutes;
  const medianHoldMinutes = roundMetric(median(holdDurations), 2);
  const longestHoldMinutes = roundMetric(Math.max(...holdDurations, 0), 2);
  const shortestHoldMinutes = roundMetric(
    holdDurations.length ? Math.min(...holdDurations) : 0,
    2,
  );
  const instantFlipRate = clamp(
    safeDiv(holdDurations.filter((value) => value <= 5).length, Math.max(1, holdDurations.length)),
  );
  const quickExitRate = clamp(
    safeDiv(holdDurations.filter((value) => value <= 20).length, Math.max(1, holdDurations.length)),
  );
  const shortHoldBias = quickExitRate;
  const diamondHandsRate = clamp(
    safeDiv(
      holdDurations.filter((value) => value >= 180).length,
      Math.max(1, holdDurations.length),
    ),
  );
  const bagholdBias = clamp(
    safeDiv(
      closedSells.filter((trade) => {
        const hold = trade.holdDurationMinutes ?? 0;
        const pnl = trade.pnlSol ?? 0;
        return hold >= 240 || (pnl < 0 && hold >= 90);
      }).length,
      Math.max(1, closedSells.length),
    ),
  );
  const bagHoldingScore = bagholdBias;
  const averageHoldVariance = clamp(
    safeDiv(standardDeviation(holdDurations), Math.max(1, avgHoldMinutes)),
  );
  const prematureExitScore = quickExitRate;
  const panicExitScore = clamp(
    safeDiv(
      losingSells.filter((trade) => (trade.holdDurationMinutes ?? 0) <= 8).length,
      Math.max(1, losingSells.length),
    ),
  );
  const averageWinnerHoldMinutes = average(
    winningSells.map((trade) => trade.holdDurationMinutes ?? 0),
  );
  const averageLoserHoldMinutes = average(
    losingSells.map((trade) => trade.holdDurationMinutes ?? 0),
  );
  const lossHoldTolerance = clamp(
    safeDiv(averageLoserHoldMinutes, Math.max(1, avgHoldMinutes || averageWinnerHoldMinutes)),
  );
  const profitHoldTolerance = clamp(
    safeDiv(averageWinnerHoldMinutes, Math.max(1, avgHoldMinutes)),
  );
  const convictionHoldScore = clamp(
    diamondHandsRate * 0.35 +
      profitHoldTolerance * 0.25 +
      clamp(longestHoldMinutes / 360) * 0.4,
  );
  const confidenceHoldScore = clamp(
    (1 - panicExitScore) * 0.45 + profitHoldTolerance * 0.3 + (1 - shortHoldBias) * 0.25,
  );

  const solAmounts = trades.map((trade) => trade.solAmount);
  const buySolAmounts = buyTrades.map((trade) => trade.solAmount);
  const avgSolPerTrade = roundMetric(average(solAmounts), 6);
  const averagePositionSizeSOL = roundMetric(average(buySolAmounts), 6);
  const maxPositionSizeSOL = roundMetric(Math.max(...buySolAmounts, 0), 6);
  const minPositionSizeSOL = roundMetric(
    buySolAmounts.length ? Math.min(...buySolAmounts) : 0,
    6,
  );
  const sizeVariance = roundMetric(
    clamp(safeDiv(standardDeviation(solAmounts), Math.max(EPSILON, avgSolPerTrade)), 0, 4),
    4,
  );
  const positionVariance = sizeVariance;
  const microTradeRate = clamp(
    safeDiv(
      buySolAmounts.filter((value) => value <= Math.max(0.02, averagePositionSizeSOL * 0.25))
        .length,
      Math.max(1, buySolAmounts.length),
    ),
  );
  const allInBehaviorScore = clamp(
    safeDiv(
      maxPositionSizeSOL,
      Math.max(0.1, buyTrades.reduce((sum, trade) => sum + trade.solAmount, 0)),
    ) * 4,
  );

  let sizeEscalationCount = 0;
  let sizeReductionCount = 0;
  let lossPositionExpansionCount = 0;
  let profitPositionExpansionCount = 0;
  for (let index = 1; index < buyTrades.length; index += 1) {
    const previous = buyTrades[index - 1]!;
    const current = buyTrades[index]!;
    if (current.solAmount > previous.solAmount * 1.1) {
      sizeEscalationCount += 1;
    }
    if (current.solAmount < previous.solAmount * 0.9) {
      sizeReductionCount += 1;
    }

    const previousSell = sellTrades.findLast((trade) => trade.timestamp < current.timestamp);
    if (!previousSell) continue;
    if ((previousSell.pnlSol ?? 0) < 0 && current.solAmount > previous.solAmount * 1.05) {
      lossPositionExpansionCount += 1;
    }
    if ((previousSell.pnlSol ?? 0) > 0 && current.solAmount > previous.solAmount * 1.05) {
      profitPositionExpansionCount += 1;
    }
  }
  const sizeEscalationRate = clamp(safeDiv(sizeEscalationCount, Math.max(1, buyCount - 1)));
  const sizeReductionRate = clamp(safeDiv(sizeReductionCount, Math.max(1, buyCount - 1)));
  const lossPositionExpansion = clamp(
    safeDiv(lossPositionExpansionCount, Math.max(1, buyCount - 1)),
  );
  const profitPositionExpansion = clamp(
    safeDiv(profitPositionExpansionCount, Math.max(1, buyCount - 1)),
  );

  const tokenBuyTotals = new Map<string, number>();
  for (const trade of buyTrades) {
    tokenBuyTotals.set(trade.mint, (tokenBuyTotals.get(trade.mint) ?? 0) + trade.solAmount);
  }
  const mintTradeCounts = new Map<string, number>();
  for (const trade of trades) {
    mintTradeCounts.set(trade.mint, (mintTradeCounts.get(trade.mint) ?? 0) + 1);
  }
  const topMintTrades = Math.max(...mintTradeCounts.values(), 0);
  const concentrationScore = clamp(safeDiv(topMintTrades, Math.max(1, tradeCount)));
  const positionConcentration = concentrationScore;
  const tokenAllocationValues = [...tokenBuyTotals.values()];
  const tokenAllocationVariance = clamp(
    safeDiv(
      standardDeviation(tokenAllocationValues),
      Math.max(EPSILON, average(tokenAllocationValues)),
    ),
  );
  const confidencePositionScore = clamp(
    positionConcentration * 0.35 +
      (1 - microTradeRate) * 0.25 +
      allInBehaviorScore * 0.2 +
      profitPositionExpansion * 0.2,
  );
  const exposureIntensity = clamp(
    safeDiv(maxPositionSizeSOL, Math.max(0.1, averagePositionSizeSOL)) / 4,
  );

  const solSpent = buyTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
  const solReceived = sellTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
  const estimatedPnlSol = roundMetric(solReceived - solSpent, 6);
  const realizedPnlSOL = estimatedPnlSol;
  const unrealizedPnlSOL = 0;
  const pnlValues = closedSells.map((trade) => trade.pnlSol ?? 0);
  const averageWinSOL = roundMetric(average(pnlValues.filter((value) => value > 0)), 6);
  const averageLossSOL = roundMetric(average(pnlValues.filter((value) => value < 0)), 6);
  const realizedWinRate = clamp(safeDiv(winningSells.length, Math.max(1, closedSells.length)));
  const winRate = realizedWinRate;
  const lossRate = clamp(1 - winRate);
  const biggestWin = roundMetric(
    closedSells.reduce((max, trade) => Math.max(max, trade.pnlSol ?? 0), 0),
    6,
  );
  const biggestLoss = roundMetric(
    closedSells.reduce((min, trade) => Math.min(min, trade.pnlSol ?? 0), 0),
    6,
  );
  const largestWinSOL = biggestWin;
  const largestLossSOL = biggestLoss;
  const grossProfit = pnlValues
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(
    pnlValues.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
  );
  const profitFactor = roundMetric(safeDiv(grossProfit, Math.max(EPSILON, grossLoss)), 4);
  const maxDrawdownSOL = roundMetric(computeMaxDrawdown(pnlValues), 6);
  const profitTakingSpeed = clamp(1 - safeDiv(averageWinnerHoldMinutes, 180));
  const profitHoldScore = clamp(
    safeDiv(averageWinnerHoldMinutes, Math.max(1, avgHoldMinutes || averageWinnerHoldMinutes)),
  );
  const profitVariance = roundMetric(standardDeviation(pnlValues), 6);
  const streaks = computeProfitStreaks(pnlValues);

  const panicSellRate = clamp(
    safeDiv(
      losingSells.filter((trade) => (trade.holdDurationMinutes ?? 0) <= 8).length,
      Math.max(1, sellCount),
    ),
  );
  const panicBuyRate = clamp(safeDiv(panicEntryCount, Math.max(1, buyCount)));
  const drawdownTolerance = clamp(
    safeDiv(
      averageLoserHoldMinutes,
      Math.max(1, averageWinnerHoldMinutes || avgHoldMinutes || 1),
    ) / 1.8,
  );
  const lossToleranceScore = clamp((drawdownTolerance + lossHoldTolerance) / 2);
  const averagingDownCount = buyTrades.reduce((count, buyTrade) => {
    const previousBuy = buyTrades.findLast(
      (candidate) =>
        candidate.mint === buyTrade.mint &&
        candidate.timestamp < buyTrade.timestamp &&
        buyTrade.timestamp - candidate.timestamp <= 4 * 60 * 60,
    );
    if (!previousBuy) return count;
    const previousPrice = previousBuy.priceEstimate ?? 0;
    const currentPrice = buyTrade.priceEstimate ?? 0;
    if (previousPrice > EPSILON && currentPrice < previousPrice * 0.9) {
      return count + 1;
    }
    return count;
  }, 0);
  const averagingDownBias = clamp(safeDiv(averagingDownCount, Math.max(1, buyCount)));
  const martingaleScore = clamp(
    (averagingDownBias + lossPositionExpansion + sizeEscalationRate) / 3,
  );
  const overtradeScore = clamp(
    clamp(tradesPerHour / 0.45) * 0.45 +
      clamp(tradeClusterCount / 5) * 0.25 +
      burstTradeIntensity * 0.3,
  );
  const riskEscalationRate = clamp(
    (sizeEscalationRate + lossPositionExpansion + martingaleScore) / 3,
  );
  const lossPersistence = clamp((lossHoldTolerance + averagingDownBias) / 2);
  const recoveryAttempts = losingSells.reduce((count, trade) => {
    const reboundBuy = buyTrades.find(
      (buyTrade) =>
        buyTrade.timestamp > trade.timestamp &&
        buyTrade.timestamp <= trade.timestamp + 20 * 60,
    );
    return reboundBuy ? count + 1 : count;
  }, 0);
  const comebackTrades = losingSells.reduce((count, losingTrade) => {
    const recovery = winningSells.find(
      (winningTrade) =>
        winningTrade.timestamp > losingTrade.timestamp &&
        winningTrade.timestamp <= losingTrade.timestamp + 6 * 60 * 60,
    );
    return recovery ? count + 1 : count;
  }, 0);
  const lossRecoveryRate = clamp(safeDiv(comebackTrades, Math.max(1, losingSells.length)));
  const recoverySuccessRate = lossRecoveryRate;
  const drawdownPersistence = clamp((lossPersistence + lossToleranceScore) / 2);
  const riskAfterLossScore = clamp(
    (lossPositionExpansion + revengeEntryRate + panicBuyRate) / 3,
  );
  const convictionAfterLoss = clamp(
    (revengeEntryRate + lossPositionExpansion + averagingDownBias) / 3,
  );
  const riskConfidence = clamp(
    (confidencePositionScore + convictionAfterLoss + (1 - panicSellRate)) / 3,
  );
  const riskVolatility = clamp(
    (positionVariance +
      martingaleScore +
      maxDrawdownSOL / Math.max(0.2, solSpent || 0.2)) /
      3,
  );
  const emotionalTradingScore = clamp(
    (panicBuyRate + panicSellRate + revengeEntryRate + clamp(tradeClusterCount / 6)) / 4,
  );
  const psychologicalResilience = clamp(
    lossRecoveryRate * 0.4 + (1 - panicSellRate) * 0.3 + drawdownTolerance * 0.3,
  );
  const revengeTradeIntensity = clamp(
    (revengeEntryRate + riskAfterLossScore + overtradeScore) / 3,
  );

  const quickMomentumSells = closedSells.filter(
    (trade) => (trade.holdDurationMinutes ?? 0) <= 60,
  );
  const momentumAlignment = clamp(
    safeDiv(
      quickMomentumSells.filter((trade) => (trade.pnlSol ?? 0) > 0).length,
      Math.max(1, quickMomentumSells.length),
    ),
  );
  const chaseScore = clamp(
    lateEntryBias * 0.35 +
      rapidReentryScore * 0.15 +
      rapidRotationScore * 0.15 +
      topChasingRate * 0.2 +
      clamp(tradesPerHour / 0.5) * 0.15,
  );
  const attentionSensitivity = clamp(
    chaseScore * 0.4 +
      lateNightTradeRate * 0.1 +
      rapidRotationScore * 0.2 +
      narrativeEntryScore * 0.3,
  );
  const timelineInfluenceScore = clamp(
    (chaseScore + narrativeEntryScore + momentumEntryRate) / 3,
  );
  const narrativeChasingScore = clamp(
    (chaseScore + topChasingRate + breakoutEntryRate) / 3,
  );
  const trendFollowingScore = clamp(
    (momentumAlignment + breakoutEntryRate + momentumEntryRate) / 3,
  );
  const hotTokenParticipation = clamp(
    safeDiv(
      [...mintTradeCounts.keys()].filter((mint) => (mintTradeCounts.get(mint) ?? 0) >= 3).length,
      Math.max(1, distinctTokenCount),
    ),
  );
  const viralCoinParticipation = clamp((hotTokenParticipation + attentionSensitivity) / 2);
  const attentionRotationRate = clamp((rapidRotationScore + tokenRotationRate) / 2);
  const metaCoinParticipation = clamp((narrativeEntryScore + trendAnticipationScore) / 2);
  const socialSignalResponse = clamp(
    (timelineInfluenceScore + attentionSensitivity) / 2,
  );
  const pumpParticipationRate = tradeCount > 0 ? 1 : 0;

  const chaosIndex = clamp(
    overtradeScore * 0.2 +
      rapidRotationScore * 0.15 +
      positionVariance * 0.15 +
      lateNightTradeRate * 0.1 +
      revengeTradeIntensity * 0.15 +
      emotionalTradingScore * 0.25,
  );
  const decisionVolatility = clamp(
    (tradeTimingVariance + positionVariance + chaseScore) / 3,
  );
  const behaviorVariance = clamp((chaosIndex + (1 - clamp(confidenceHoldScore))) / 2);
  const strategyInstability = clamp(
    (coinSwitchFrequency + positionVariance + fakeoutEntryRate + overtradeScore) / 4,
  );
  const impulseTradeRate = clamp(
    (panicBuyRate + revengeEntryRate + topChasingRate) / 3,
  );
  const emotionalVolatility = clamp(
    (emotionalTradingScore + revengeTradeIntensity + panicSellRate) / 3,
  );

  const patienceScore = clamp(
    (1 - shortHoldBias) * 0.35 +
      (1 - chaosIndex) * 0.25 +
      clamp(avgHoldMinutes / 180) * 0.2 +
      (1 - overtradeScore) * 0.2,
  );
  const repeatBuyRatio = clamp(
    safeDiv(
      buyTrades.filter((trade) =>
        buyTrades.some(
          (candidate) =>
            candidate !== trade &&
            candidate.mint === trade.mint &&
            candidate.timestamp !== trade.timestamp,
        ),
      ).length,
      Math.max(1, buyCount),
    ),
  );
  const convictionScore = clamp(
    positionConcentration * 0.25 +
      clamp(avgHoldMinutes / 180) * 0.2 +
      repeatBuyRatio * 0.15 +
      (1 - shortHoldBias) * 0.1 +
      confidencePositionScore * 0.15 +
      narrativeEntryScore * 0.15,
  );
  const revengeBias = clamp((revengeEntryRate + rapidReentryScore) / 2);
  const chaosScore = chaosIndex;
  const disciplineScore = clamp(
    (1 - chaosIndex) * 0.35 +
      (1 - overtradeScore) * 0.25 +
      clamp(earlyEntryScore) * 0.15 +
      confidenceHoldScore * 0.25,
  );
  const thesisLoyaltyScore = clamp(
    (repeatBuyRatio + positionConcentration + convictionScore) / 3,
  );
  const casinoModeScore = clamp(
    (overtradeScore + chaosIndex + topChasingRate + allInBehaviorScore) / 4,
  );
  const attentionAddictionScore = clamp(
    (timelineInfluenceScore + chaseScore + narrativeChasingScore) / 3,
  );
  const survivalScore = clamp(
    (lossRecoveryRate + psychologicalResilience + (1 - panicSellRate)) / 3,
  );
  const delusionScore = clamp(
    (bagHoldingScore + averagingDownBias + thesisLoyaltyScore) / 3,
  );

  const memeabilityScore = clamp(
    chaosIndex * 0.24 +
      lateNightTradeRate * 0.08 +
      revengeTradeIntensity * 0.14 +
      bagHoldingScore * 0.1 +
      clamp(
        (Math.abs(biggestLoss) + biggestWin) /
          Math.max(0.5, averagePositionSizeSOL || 0.5),
      ) *
        0.16 +
      attentionSensitivity * 0.12 +
      casinoModeScore * 0.16,
  );
  const storyDensityScore = clamp(
    clamp(tradeCount / Math.max(8, input.rangeHours * 2)) * 0.25 +
      recoveryAttempts * 0.03 +
      clamp(tradeClusterCount / 5) * 0.15 +
      clamp(
        (Math.abs(biggestLoss) + biggestWin) /
          Math.max(0.5, averagePositionSizeSOL || 0.5),
      ) *
        0.2 +
      safeDiv(distinctTokenCount, Math.max(3, distinctTokenCount + 3)) * 0.1 +
      chaosIndex * 0.3,
  );
  const dramaScore = clamp(
    clamp(maxDrawdownSOL / Math.max(0.5, solSpent || 0.5)) * 0.25 +
      revengeTradeIntensity * 0.2 +
      safeDiv(comebackTrades, Math.max(1, losingSells.length || 1)) * 0.15 +
      lateNightTradeRate * 0.1 +
      storyDensityScore * 0.3,
  );
  const shareabilityScore = clamp(
    memeabilityScore * 0.35 +
      storyDensityScore * 0.2 +
      dramaScore * 0.25 +
      clamp(safeDiv(comebackTrades, Math.max(1, closedSells.length))) * 0.1 +
      timelineInfluenceScore * 0.1,
  );
  const quotePotentialScore = clamp(
    dramaScore * 0.3 +
      memeabilityScore * 0.25 +
      attentionSensitivity * 0.15 +
      revengeTradeIntensity * 0.15 +
      bagHoldingScore * 0.15,
  );
  const embarrassmentScore = clamp(
    topChasingRate * 0.25 +
      fakeoutEntryRate * 0.2 +
      panicSellRate * 0.2 +
      bagHoldingScore * 0.2 +
      casinoModeScore * 0.15,
  );
  const heroMomentScore = clamp(
    biggestWin > 0
      ? clamp(biggestWin / Math.max(0.3, averagePositionSizeSOL || 0.3)) * 0.45 +
          earlyEntryScore * 0.2 +
          trendAnticipationScore * 0.15 +
          lossRecoveryRate * 0.2
      : 0,
  );
  const chaosEntertainmentScore = clamp(
    (chaosIndex + memeabilityScore + dramaScore) / 3,
  );
  const cinemaScore = clamp(
    shareabilityScore * 0.35 +
      dramaScore * 0.2 +
      storyDensityScore * 0.2 +
      heroMomentScore * 0.1 +
      embarrassmentScore * 0.05 +
      chaosEntertainmentScore * 0.1,
  );
  const trailerNarrativeScore = clamp(
    (cinemaScore + storyDensityScore + heroMomentScore) / 3,
  );
  const loreDensityScore = clamp(
    (quotePotentialScore + embarrassmentScore + bagHoldingScore + lateNightTradeRate) / 4,
  );

  const bottomSellingRate = panicSellRate;
  const peakEntryRate = topChasingRate;
  const peakExitRate = clamp(
    safeDiv(
      winningSells.filter((trade) => (trade.holdDurationMinutes ?? 0) <= 30).length,
      Math.max(1, winningSells.length),
    ),
  );
  const averageExitDelay = avgHoldMinutes;

  const activeWindowMinutes = sessionDurationMinutes;
  const longestInactiveGapMinutes = gapsMinutes.length ? Math.max(...gapsMinutes) : 0;
  const openingRushScore = clamp(
    safeDiv(
      trades.filter((trade) => trade.timestamp <= (trades[0]?.timestamp ?? 0) + 30 * 60).length,
      Math.max(1, tradeCount),
    ),
  );
  const closingRushScore = clamp(
    safeDiv(
      trades.filter(
        (trade) => trade.timestamp >= (trades[trades.length - 1]?.timestamp ?? 0) - 30 * 60,
      ).length,
      Math.max(1, tradeCount),
    ),
  );
  const sessionCompressionScore = clamp(
    safeDiv(tradeClusterCount, Math.max(1, sessions.length)) / 2,
  );

  const entryPrecisionScore = clamp(
    (earlyEntryScore + trendAnticipationScore + liquidityEntryTiming) / 3,
  );
  const exitPrecisionScore = clamp(
    (peakExitRate + (1 - panicSellRate) + (1 - shortHoldBias)) / 3,
  );
  const invalidationRespectScore = clamp(
    (1 - averagingDownBias) * 0.45 +
      (1 - revengeEntryRate) * 0.3 +
      (1 - bagHoldingScore) * 0.25,
  );
  const followThroughScore = clamp(
    (profitHoldScore + convictionHoldScore + momentumAlignment) / 3,
  );
  const hesitationScore = clamp(
    (1 - reEntrySpeed) * 0.45 +
      clamp(meanGapMinutes / 60) * 0.25 +
      (1 - entryPrecisionScore) * 0.3,
  );
  const slippageRiskScore = clamp(
    (lateEntryScore +
      topChasingRate +
      safeDiv(tradesPerHour, Math.max(0.3, tradesPerHour + 1))) /
      3,
  );
  const reriskingSpeedScore = rapidReentryScore;
  const cooldownDisciplineScore = clamp(
    (1 - revengeEntryRate) * 0.5 + (1 - panicBuyRate) * 0.5,
  );
  const tradeSelectionQuality = clamp(
    (entryPrecisionScore + invalidationRespectScore + (1 - overtradeScore)) / 3,
  );
  const timingEdgeBalance = clamp(
    (entryPrecisionScore + exitPrecisionScore + trendFollowingScore) / 3,
  );

  const repeatTokenBias = repeatBuyRatio;
  const oneTickerObsessionScore = positionConcentration;
  const longTailParticipation = clamp(1 - positionConcentration);
  const rotationBreadthScore = clamp(safeDiv(distinctTokenCount, Math.max(1, tradeCount)) * 4);
  const concentrationEntropy = clamp(1 - tokenAllocationVariance / 2);
  const tokenRevisitRate = repeatBuyRatio;
  const churnRate = clamp((tokenRotationRate + overtradeScore) / 2);
  const pumpStickiness = clamp((thesisLoyaltyScore + concentrationScore) / 2);
  const focusDriftScore = clamp((tokenRotationRate + sprayBehavior(positionConcentration)) / 2);

  return {
    activity: {
      tradeCount,
      distinctTokenCount,
      uniqueTokenCount: distinctTokenCount,
      buyCount,
      sellCount,
      tradesPerHour: roundMetric(tradesPerHour, 4),
      tokensPerHour: roundMetric(tokensPerHour, 4),
      tradeBurstCount,
      tradeClusterCount,
      tradeFrequency: roundMetric(tradesPerHour, 4),
      tradeDensityPerHour: roundMetric(tradesPerHour, 4),
      tradeSessions: sessions.length,
      tokenRotationRate: roundMetric(tokenRotationRate, 4),
      averageTradesPerToken: roundMetric(averageTradesPerToken, 4),
      tradeAccelerationRate: roundMetric(tradeAccelerationRate, 4),
      burstTradeIntensity: roundMetric(burstTradeIntensity, 4),
      sessionDuration: roundMetric(sessionDurationMinutes, 2),
      sessionDurationMinutes: roundMetric(sessionDurationMinutes, 2),
      midnightTradeRate: roundMetric(midnightTradeRate, 4),
      lateNightTradeRate: roundMetric(lateNightTradeRate, 4),
      earlyMorningTradeRate: roundMetric(earlyMorningTradeRate, 4),
      weekendTradeRate: roundMetric(weekendTradeRate, 4),
      sleepDeprivationScore: roundMetric(sleepDeprivationScore, 4),
      rapidRotationScore: roundMetric(rapidRotationScore, 4),
    },
    timing: {
      averageEntryDelay: roundMetric(averageEntryDelay, 4),
      averageExitDelay: roundMetric(averageExitDelay, 4),
      earlyEntryScore: roundMetric(earlyEntryScore, 4),
      lateEntryScore: roundMetric(lateEntryScore, 4),
      topChasingRate: roundMetric(topChasingRate, 4),
      bottomSellingRate: roundMetric(bottomSellingRate, 4),
      breakoutEntryRate: roundMetric(breakoutEntryRate, 4),
      fakeoutEntryRate: roundMetric(fakeoutEntryRate, 4),
      momentumEntryRate: roundMetric(momentumEntryRate, 4),
      trendFollowScore: roundMetric(trendFollowingScore, 4),
      panicEntryRate: roundMetric(panicEntryRate, 4),
      revengeEntryRate: roundMetric(revengeEntryRate, 4),
      reEntrySpeed: roundMetric(reEntrySpeed, 4),
      reactionDelay: roundMetric(reactionDelay, 4),
      timingVariance: roundMetric(tradeTimingVariance, 4),
      trendAnticipationScore: roundMetric(trendAnticipationScore, 4),
      narrativeEntryScore: roundMetric(narrativeEntryScore, 4),
      liquidityEntryTiming: roundMetric(liquidityEntryTiming, 4),
      peakEntryRate: roundMetric(peakEntryRate, 4),
      peakExitRate: roundMetric(peakExitRate, 4),
      earlyEntryBias: roundMetric(earlyEntryBias, 4),
      lateEntryBias: roundMetric(lateEntryBias, 4),
      rapidReentryScore: roundMetric(rapidReentryScore, 4),
      nightActivityScore: roundMetric(lateNightTradeRate, 4),
    },
    holding: {
      avgHoldMinutes,
      averageHoldMinutes,
      medianHoldMinutes,
      longestHoldMinutes,
      shortestHoldMinutes,
      instantFlipRate: roundMetric(instantFlipRate, 4),
      quickExitRate: roundMetric(quickExitRate, 4),
      diamondHandsRate: roundMetric(diamondHandsRate, 4),
      bagHoldingScore: roundMetric(bagHoldingScore, 4),
      lossHoldTolerance: roundMetric(lossHoldTolerance, 4),
      profitHoldTolerance: roundMetric(profitHoldTolerance, 4),
      averageHoldVariance: roundMetric(averageHoldVariance, 4),
      prematureExitScore: roundMetric(prematureExitScore, 4),
      panicExitScore: roundMetric(panicExitScore, 4),
      confidenceHoldScore: roundMetric(confidenceHoldScore, 4),
      convictionHoldScore: roundMetric(convictionHoldScore, 4),
      shortHoldBias: roundMetric(shortHoldBias, 4),
      bagholdBias: roundMetric(bagholdBias, 4),
    },
    sizing: {
      avgSolPerTrade,
      sizeVariance: roundMetric(sizeVariance, 4),
      concentrationScore: roundMetric(concentrationScore, 4),
    },
    position: {
      averagePositionSizeSOL,
      maxPositionSizeSOL,
      minPositionSizeSOL,
      positionVariance: roundMetric(positionVariance, 4),
      sizeEscalationRate: roundMetric(sizeEscalationRate, 4),
      sizeReductionRate: roundMetric(sizeReductionRate, 4),
      allInBehaviorScore: roundMetric(allInBehaviorScore, 4),
      microTradeRate: roundMetric(microTradeRate, 4),
      confidencePositionScore: roundMetric(confidencePositionScore, 4),
      lossPositionExpansion: roundMetric(lossPositionExpansion, 4),
      profitPositionExpansion: roundMetric(profitPositionExpansion, 4),
      positionConcentration: roundMetric(positionConcentration, 4),
      tokenAllocationVariance: roundMetric(tokenAllocationVariance, 4),
      exposureIntensity: roundMetric(exposureIntensity, 4),
    },
    pnl: {
      estimatedPnlSol,
      realizedWinRate: roundMetric(realizedWinRate, 4),
      biggestWin,
      biggestLoss,
    },
    profit: {
      realizedPnlSOL,
      unrealizedPnlSOL,
      averageWinSOL,
      averageLossSOL,
      largestWinSOL,
      largestLossSOL,
      winRate: roundMetric(winRate, 4),
      lossRate: roundMetric(lossRate, 4),
      profitFactor,
      maxDrawdownSOL,
      profitTakingSpeed: roundMetric(profitTakingSpeed, 4),
      profitHoldScore: roundMetric(profitHoldScore, 4),
      profitVariance,
      profitStreak: streaks.profitStreak,
      lossStreak: streaks.lossStreak,
    },
    attention: {
      timelineInfluenceScore: roundMetric(timelineInfluenceScore, 4),
      narrativeChasingScore: roundMetric(narrativeChasingScore, 4),
      trendFollowingScore: roundMetric(trendFollowingScore, 4),
      hotTokenParticipation: roundMetric(hotTokenParticipation, 4),
      viralCoinParticipation: roundMetric(viralCoinParticipation, 4),
      attentionRotationRate: roundMetric(attentionRotationRate, 4),
      metaCoinParticipation: roundMetric(metaCoinParticipation, 4),
      socialSignalResponse: roundMetric(socialSignalResponse, 4),
      pumpParticipationRate,
      chaseScore: roundMetric(chaseScore, 4),
      momentumAlignment: roundMetric(momentumAlignment, 4),
      attentionSensitivity: roundMetric(attentionSensitivity, 4),
    },
    risk: {
      lossToleranceScore: roundMetric(lossToleranceScore, 4),
      riskEscalationRate: roundMetric(riskEscalationRate, 4),
      overtradeScore: roundMetric(overtradeScore, 4),
      martingaleScore: roundMetric(martingaleScore, 4),
      panicSellRate: roundMetric(panicSellRate, 4),
      panicBuyRate: roundMetric(panicBuyRate, 4),
      lossPersistence: roundMetric(lossPersistence, 4),
      lossRecoveryRate: roundMetric(lossRecoveryRate, 4),
      riskConfidence: roundMetric(riskConfidence, 4),
      riskVolatility: roundMetric(riskVolatility, 4),
      convictionAfterLoss: roundMetric(convictionAfterLoss, 4),
      emotionalTradingScore: roundMetric(emotionalTradingScore, 4),
      drawdownTolerance: roundMetric(drawdownTolerance, 4),
      panicExitBias: roundMetric(panicExitScore, 4),
      averagingDownBias: roundMetric(averagingDownBias, 4),
      riskAfterLossScore: roundMetric(riskAfterLossScore, 4),
    },
    recovery: {
      revengeTradeIntensity: roundMetric(revengeTradeIntensity, 4),
      recoveryAttempts,
      comebackTrades,
      drawdownPersistence: roundMetric(drawdownPersistence, 4),
      riskAfterLossScore: roundMetric(riskAfterLossScore, 4),
      psychologicalResilience: roundMetric(psychologicalResilience, 4),
      recoverySuccessRate: roundMetric(recoverySuccessRate, 4),
    },
    chaos: {
      chaosIndex: roundMetric(chaosIndex, 4),
      decisionVolatility: roundMetric(decisionVolatility, 4),
      behaviorVariance: roundMetric(behaviorVariance, 4),
      tradeTimingVariance: roundMetric(tradeTimingVariance, 4),
      coinSwitchFrequency: roundMetric(coinSwitchFrequency, 4),
      strategyInstability: roundMetric(strategyInstability, 4),
      impulseTradeRate: roundMetric(impulseTradeRate, 4),
      emotionalVolatility: roundMetric(emotionalVolatility, 4),
    },
    behavior: {
      revengeBias: roundMetric(revengeBias, 4),
      chaosScore: roundMetric(chaosScore, 4),
      patienceScore: roundMetric(patienceScore, 4),
      convictionScore: roundMetric(convictionScore, 4),
      disciplineScore: roundMetric(disciplineScore, 4),
      thesisLoyaltyScore: roundMetric(thesisLoyaltyScore, 4),
      casinoModeScore: roundMetric(casinoModeScore, 4),
      attentionAddictionScore: roundMetric(attentionAddictionScore, 4),
      survivalScore: roundMetric(survivalScore, 4),
      delusionScore: roundMetric(delusionScore, 4),
    },
    virality: {
      memeabilityScore: roundMetric(memeabilityScore, 4),
      storyDensityScore: roundMetric(storyDensityScore, 4),
      dramaScore: roundMetric(dramaScore, 4),
      shareabilityScore: roundMetric(shareabilityScore, 4),
      quotePotentialScore: roundMetric(quotePotentialScore, 4),
      embarrassmentScore: roundMetric(embarrassmentScore, 4),
      heroMomentScore: roundMetric(heroMomentScore, 4),
      chaosEntertainmentScore: roundMetric(chaosEntertainmentScore, 4),
      cinemaScore: roundMetric(cinemaScore, 4),
      trailerNarrativeScore: roundMetric(trailerNarrativeScore, 4),
      loreDensityScore: roundMetric(loreDensityScore, 4),
    },
    session: {
      tradeClusterCount,
      tradeSessions: sessions.length,
      sessionDuration: roundMetric(activeWindowMinutes, 2),
      activeWindowMinutes: roundMetric(activeWindowMinutes, 2),
      idleGapMean: roundMetric(meanGapMinutes, 4),
      idleGapMedian: roundMetric(medianGapMinutes, 4),
      longestInactiveGapMinutes: roundMetric(longestInactiveGapMinutes, 4),
      openingRushScore: roundMetric(openingRushScore, 4),
      closingRushScore: roundMetric(closingRushScore, 4),
      averageSessionLengthMinutes: roundMetric(average(sessionLengthsMinutes), 4),
      sessionVariance: roundMetric(standardDeviation(sessionLengthsMinutes), 4),
      sessionCompressionScore: roundMetric(sessionCompressionScore, 4),
    },
    execution: {
      entryPrecisionScore: roundMetric(entryPrecisionScore, 4),
      exitPrecisionScore: roundMetric(exitPrecisionScore, 4),
      invalidationRespectScore: roundMetric(invalidationRespectScore, 4),
      followThroughScore: roundMetric(followThroughScore, 4),
      hesitationScore: roundMetric(hesitationScore, 4),
      slippageRiskScore: roundMetric(slippageRiskScore, 4),
      reriskingSpeedScore: roundMetric(reriskingSpeedScore, 4),
      cooldownDisciplineScore: roundMetric(cooldownDisciplineScore, 4),
      tradeSelectionQuality: roundMetric(tradeSelectionQuality, 4),
      timingEdgeBalance: roundMetric(timingEdgeBalance, 4),
    },
    composition: {
      repeatTokenBias: roundMetric(repeatTokenBias, 4),
      oneTickerObsessionScore: roundMetric(oneTickerObsessionScore, 4),
      longTailParticipation: roundMetric(longTailParticipation, 4),
      rotationBreadthScore: roundMetric(rotationBreadthScore, 4),
      concentrationEntropy: roundMetric(concentrationEntropy, 4),
      tokenRevisitRate: roundMetric(tokenRevisitRate, 4),
      churnRate: roundMetric(churnRate, 4),
      pumpStickiness: roundMetric(pumpStickiness, 4),
      focusDriftScore: roundMetric(focusDriftScore, 4),
    },
  };
}
