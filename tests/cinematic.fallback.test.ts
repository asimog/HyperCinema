import { generateCinematicScript } from "@/lib/ai/cinematic";
import { WalletStory } from "@/lib/types/domain";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/openrouter", () => ({
  openRouterJson: vi.fn(async () => {
    throw new Error("openrouter unavailable");
  }),
}));

function buildStory(): WalletStory {
  return {
    wallet: "8BfH8gV3yZ7d1kY9uJvB3DhR6yQ2pM8P2a8s9s4s4s4s",
    rangeDays: 1,
    packageType: "30s",
    durationSeconds: 30,
    analytics: {
      pumpTokensTraded: 2,
      buyCount: 4,
      sellCount: 3,
      solSpent: 2.4,
      solReceived: 2.1,
      estimatedPnlSol: -0.3,
      bestTrade: "AAA (+0.12 SOL)",
      worstTrade: "BBB (-0.24 SOL)",
      styleClassification: "The Momentum Chaser",
    },
    timeline: [
      {
        timestamp: 100,
        signature: "sig-1",
        mint: "mint-a",
        symbol: "AAA",
        name: "Alpha",
        image: "https://cdn.example.com/a.png",
        side: "buy",
        tokenAmount: 200,
        solAmount: 0.9,
      },
      {
        timestamp: 200,
        signature: "sig-2",
        mint: "mint-b",
        symbol: "BBB",
        name: "Beta",
        image: "https://cdn.example.com/b.png",
        side: "sell",
        tokenAmount: 150,
        solAmount: 0.8,
      },
    ],
    walletPersonality: "The Momentum Chaser",
  };
}

describe("cinematic script fallback", () => {
  it("builds deterministic scenes when OpenRouter fails", async () => {
    const script = await generateCinematicScript(buildStory());
    expect(script.hookLine.length).toBeGreaterThan(10);
    expect(script.scenes.length).toBeGreaterThanOrEqual(3);
    expect(script.scenes[0]?.durationSeconds).toBeGreaterThan(0);
  });
});
