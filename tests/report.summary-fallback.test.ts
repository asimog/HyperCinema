import { generateReportSummary } from "@/lib/ai/report";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/openrouter", () => ({
  openRouterJson: vi.fn(async () => {
    throw new Error("openrouter unavailable");
  }),
}));

describe("report summary fallback", () => {
  it("returns deterministic summary when OpenRouter fails", async () => {
    const summary = await generateReportSummary({
      jobId: "job-fallback",
      wallet: "7cQjAvzJsmdePPMk8TiW8hYHHhCfdNtEaaNK3o46YP12",
      rangeDays: 1,
      pumpTokensTraded: 4,
      buyCount: 12,
      sellCount: 9,
      solSpent: 8.25,
      solReceived: 7.9,
      estimatedPnlSol: -0.35,
      bestTrade: "AAA (+0.22 SOL)",
      worstTrade: "BBB (-0.48 SOL)",
      styleClassification: "The Chaos Gambler",
      timeline: [],
      walletPersonality: "The Chaos Gambler",
    });

    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain("spent 8.2500 SOL");
    expect(summary).toContain("Best trade: AAA (+0.22 SOL)");
  });
});
