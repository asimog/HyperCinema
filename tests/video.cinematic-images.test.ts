import { assignSceneImageUrls, buildPumpImageReferences } from "@/lib/ai/cinematic";
import { CinematicScene, WalletStory } from "@/lib/types/domain";

function createStory(): WalletStory {
  return {
    wallet: "wallet-test",
    rangeDays: 1,
    packageType: "30s",
    durationSeconds: 30,
    analytics: {
      pumpTokensTraded: 2,
      buyCount: 3,
      sellCount: 2,
      solSpent: 2.4,
      solReceived: 2.1,
      estimatedPnlSol: -0.3,
      bestTrade: "ABC (+0.2 SOL)",
      worstTrade: "XYZ (-0.4 SOL)",
      styleClassification: "Momentum",
    },
    timeline: [
      {
        timestamp: 100,
        signature: "sig-a-1",
        mint: "mint-a",
        symbol: "AAA",
        image: "https://cdn.example.com/a.png",
        side: "buy",
        tokenAmount: 10,
        solAmount: 0.5,
      },
      {
        timestamp: 110,
        signature: "sig-a-2",
        mint: "mint-a",
        symbol: "AAA",
        image: "https://cdn.example.com/a.png",
        side: "sell",
        tokenAmount: 5,
        solAmount: 0.4,
      },
      {
        timestamp: 120,
        signature: "sig-b-1",
        mint: "mint-b",
        symbol: "BBB",
        image: "https://cdn.example.com/b.png",
        side: "buy",
        tokenAmount: 9,
        solAmount: 0.8,
      },
    ],
  };
}

describe("cinematic image plumbing", () => {
  it("builds deduped pump image references ranked by impact", () => {
    const references = buildPumpImageReferences(createStory());
    expect(references).toHaveLength(2);
    expect(references.map((item) => item.mint).sort()).toEqual(["mint-a", "mint-b"]);
    const byMint = new Map(references.map((item) => [item.mint, item]));
    expect(byMint.get("mint-a")?.tradeCount).toBe(2);
    expect(byMint.get("mint-b")?.tradeCount).toBe(1);
  });

  it("limits image candidates by duration and keeps high-impact coins", () => {
    const story: WalletStory = {
      ...createStory(),
      durationSeconds: 30,
      timeline: [],
      tokenMetadata: Array.from({ length: 12 }, (_, index) => ({
        mint: `mint-${index}`,
        symbol: `TOK${index}`,
        name: `Token ${index}`,
        imageUrl: `https://cdn.example.com/${index}.png`,
        tradeCount: 1,
        buyCount: 1,
        sellCount: 0,
        solVolume: index === 0 ? 25 : index === 1 ? 14 : 0.1,
        netSolFlow: index === 0 ? 25 : index === 1 ? 14 : 0.1,
        firstSeenTimestamp: index + 1,
        lastSeenTimestamp: index + 1,
      })),
    };

    const references = buildPumpImageReferences(story);

    // 30s package should cap image references at 10.
    expect(references).toHaveLength(10);
    // Ensure high-impact early coins are retained, not dropped by recency slicing.
    expect(references.some((item) => item.mint === "mint-0")).toBe(true);
    expect(references.some((item) => item.mint === "mint-1")).toBe(true);
  });

  it("fills missing scene image urls using the available image pool", () => {
    const scenes: CinematicScene[] = [
      {
        sceneNumber: 1,
        visualPrompt: "Scene one",
        narration: "Narration one",
        durationSeconds: 8,
        imageUrl: null,
      },
      {
        sceneNumber: 2,
        visualPrompt: "Scene two",
        narration: "Narration two",
        durationSeconds: 9,
        imageUrl: "https://cdn.example.com/custom.png",
      },
      {
        sceneNumber: 3,
        visualPrompt: "Scene three",
        narration: "Narration three",
        durationSeconds: 13,
        imageUrl: null,
      },
    ];

    const result = assignSceneImageUrls(scenes, [
      "https://cdn.example.com/a.png",
      "https://cdn.example.com/b.png",
    ]);

    expect(result[0]?.imageUrl).toBe("https://cdn.example.com/a.png");
    expect(result[1]?.imageUrl).toBe("https://cdn.example.com/custom.png");
    expect(result[2]?.imageUrl).toBe("https://cdn.example.com/a.png");
  });

  it("normalizes invalid urls to null when no pool is available", () => {
    const scenes: CinematicScene[] = [
      {
        sceneNumber: 1,
        visualPrompt: "Scene one",
        narration: "Narration one",
        durationSeconds: 10,
        imageUrl: "not-a-url",
      },
    ];

    const result = assignSceneImageUrls(scenes, []);
    expect(result[0]?.imageUrl).toBeNull();
  });
});
