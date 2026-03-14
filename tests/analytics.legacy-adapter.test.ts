import { analyzeSeedWalletProfile } from "@/lib/analytics";
import {
  adaptWalletAnalysisToLegacyArtifacts,
  buildFallbackAnalysisFromLegacyArtifacts,
} from "@/lib/analytics/legacy-adapter";
import { walletAnalysisResultSchema } from "@/lib/analytics/schemas";

describe("legacy adapter bridge", () => {
  it("maps v2 analytics result into legacy report/story contracts", async () => {
    const analysis = await analyzeSeedWalletProfile("chaotic-overtrader");
    if (analysis.normalizedTrades[0]) {
      analysis.normalizedTrades[0].image = "https://cdn.example.com/seed-0.png";
      analysis.normalizedTrades[0].name = "Seed Token 0";
    }

    const mapped = adaptWalletAnalysisToLegacyArtifacts({
      jobId: "job-test",
      wallet: analysis.wallet,
      rangeDays: 1,
      packageType: "1d",
      durationSeconds: 30,
      analysis,
      analysisEngine: "v2",
    });

    expect(mapped.report.jobId).toBe("job-test");
    expect(mapped.report.walletPersonality).toBe(analysis.personality.primary.displayName);
    expect(mapped.report.analysisV2?.schemaVersion).toBe("wallet-analysis.v1");
    expect(mapped.story.analytics.pumpTokensTraded).toBe(mapped.report.pumpTokensTraded);
    expect(mapped.report.timeline[0]?.image).toBe("https://cdn.example.com/seed-0.png");
    expect(mapped.story.timeline[0]?.image).toBe("https://cdn.example.com/seed-0.png");
    expect(mapped.report.behaviorPatterns?.length).toBeGreaterThanOrEqual(3);
    expect(mapped.report.funObservations?.length).toBeGreaterThanOrEqual(3);
    expect(mapped.story.videoPromptSequence?.length).toBeGreaterThanOrEqual(5);
    if (analysis.moments.mostUnwellMoment) {
      expect(
        mapped.report.keyEvents?.find((event) => event.type === "revenge_trade")?.tradeContext,
      ).toBe(analysis.moments.mostUnwellMoment.description);
    }
  });

  it("builds a schema-valid fallback analysis payload from legacy artifacts", async () => {
    const analysis = await analyzeSeedWalletProfile("pump-chaser");
    const mapped = adaptWalletAnalysisToLegacyArtifacts({
      jobId: "job-fallback",
      wallet: analysis.wallet,
      rangeDays: 2,
      packageType: "2d",
      durationSeconds: 60,
      analysis,
      analysisEngine: "v2",
    });

    const fallback = buildFallbackAnalysisFromLegacyArtifacts({
      report: mapped.report,
      summary: "Legacy fallback summary",
      story: mapped.story,
      rangeHours: 48,
    });

    expect(walletAnalysisResultSchema.parse(fallback)).toEqual(fallback);
    expect(fallback).toEqual(mapped.report.analysisV2?.payload);
    expect(fallback.normalizedTrades[0]?.image).toBe(mapped.report.timeline[0]?.image ?? undefined);
    expect(fallback.behaviorPatterns.length).toBeGreaterThanOrEqual(3);
    expect(fallback.funObservations.length).toBeGreaterThanOrEqual(3);
    expect(fallback.videoPromptSequence.length).toBeGreaterThanOrEqual(5);
  });

  it("parses trade labels safely for legacy-only fallback reports", () => {
    const fallback = buildFallbackAnalysisFromLegacyArtifacts({
      report: {
        jobId: "job-legacy-only",
        wallet: "wallet-legacy",
        rangeDays: 1,
        pumpTokensTraded: 2,
        buyCount: 2,
        sellCount: 2,
        solSpent: 2.5,
        solReceived: 2.1,
        estimatedPnlSol: -0.4,
        bestTrade: "1000X (+0.21 SOL)",
        worstTrade: "A1 (-0.62 SOL)",
        styleClassification: "Legacy style",
        timeline: [
          {
            timestamp: 1,
            signature: "sig-1",
            mint: "mint-a",
            symbol: "1000X",
            side: "buy",
            tokenAmount: 10,
            solAmount: 1.2,
          },
          {
            timestamp: 2,
            signature: "sig-2",
            mint: "mint-b",
            symbol: "A1",
            side: "sell",
            tokenAmount: 8,
            solAmount: 0.9,
          },
        ],
        walletPersonality: "Legacy Personality",
        walletSecondaryPersonality: null,
        walletModifiers: ["Legacy Modifier"],
        behaviorPatterns: ["Legacy behavior pattern one", "Legacy behavior pattern two", "Legacy behavior pattern three"],
        memorableMoments: ["Legacy moment one"],
        funObservations: ["Legacy fun one", "Legacy fun two", "Legacy fun three"],
        narrativeSummary: "Legacy summary",
        storyBeats: [
          "Opening beat",
          "Rise beat",
          "Damage beat",
          "Pivot beat",
          "Climax beat",
          "Aftermath beat",
        ],
        keyEvents: [],
        walletProfile: {
          personality: "Legacy Personality",
          secondaryPersonality: null,
          modifiers: ["Legacy Modifier"],
          behavioralSummary: [
            "Legacy behavior pattern one",
            "Legacy behavior pattern two",
            "Legacy behavior pattern three",
          ],
          keyEvents: [],
          tradingStyle: "Legacy style",
          narrativeSummary: "Legacy summary",
          storyBeats: [
            "Opening beat",
            "Rise beat",
            "Damage beat",
            "Pivot beat",
            "Climax beat",
            "Aftermath beat",
          ],
          metrics: {
            totalTrades: 2,
            buyCount: 2,
            sellCount: 2,
            closedTradeCount: 2,
            openPositionCount: 0,
            tradesPerDay: 2,
            medianMinutesBetweenTrades: 1,
            nightTradeRatio: 0,
            lateMomentumEntryRatio: 0.4,
            prematureExitRatio: 0.3,
            rapidFlipRatio: 0.3,
            rapidRotationRatio: 0.2,
            postLossReentryCount: 1,
            averageHoldingMinutes: 20,
            medianHoldingMinutes: 20,
            averageWinnerHoldMinutes: 12,
            averageLoserHoldMinutes: 45,
            positionSizeConsistency: 0.25,
            tokenConcentration: 0.4,
          },
        },
      },
      summary: "Legacy summary",
      story: {
        wallet: "wallet-legacy",
        rangeDays: 1,
        packageType: "1d",
        durationSeconds: 30,
        analytics: {
          pumpTokensTraded: 2,
          buyCount: 2,
          sellCount: 2,
          solSpent: 2.5,
          solReceived: 2.1,
          estimatedPnlSol: -0.4,
          bestTrade: "1000X (+0.21 SOL)",
          worstTrade: "A1 (-0.62 SOL)",
          styleClassification: "Legacy style",
        },
        timeline: [],
        storyBeats: [
          "Opening beat",
          "Rise beat",
          "Damage beat",
          "Pivot beat",
          "Climax beat",
          "Aftermath beat",
        ],
      },
      rangeHours: 24,
    });

    expect(fallback.metrics.pnl.biggestWin).toBe(0.21);
    expect(fallback.metrics.pnl.biggestLoss).toBe(-0.62);
    expect(fallback.metrics.profit.largestWinSOL).toBe(0.21);
    expect(fallback.metrics.profit.largestLossSOL).toBe(-0.62);
    expect(fallback.metrics.profit.winRate).toBe(0.5);
    expect(fallback.metrics.profit.lossRate).toBe(0.5);
  });
});
