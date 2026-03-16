import { analyzeSeedWalletProfile } from "@/lib/analytics";
import { buildHashCinemaVeoPromptPackage } from "@/lib/cinema";
import type { TokenAsset } from "@/lib/cinema/types";

function buildMockTokenAssetMap(input: {
  mints: string[];
  symbolByMint: Map<string, string>;
  nameByMint: Map<string, string>;
}): Record<string, TokenAsset> {
  const map: Record<string, TokenAsset> = {};
  for (const mint of input.mints) {
    map[mint] = {
      mint,
      symbol: input.symbolByMint.get(mint) ?? mint.slice(0, 6),
      name: input.nameByMint.get(mint) ?? mint.slice(0, 8),
      image: `https://cdn.example.com/pump/${encodeURIComponent(mint)}.png`,
      description: "Mock Pump.fun metadata for tests.",
      status: "active",
    };
  }
  return map;
}

describe("HashCinema Veo cinema subsystem", () => {
  it("generates 5 distinct cinematic packages from seed wallets", async () => {
    const seeds = [
      { id: "chaotic-overtrader" as const, expectedArcs: ["villain"] as const },
      { id: "early-narrative-trader" as const, expectedArcs: ["prophet", "hero"] as const },
      { id: "stubborn-bagholder" as const, expectedArcs: ["martyr"] as const },
      { id: "pump-chaser" as const, expectedArcs: ["fallen_hero"] as const },
      { id: "improbable-comeback-merchant" as const, expectedArcs: ["jester", "survivor"] as const },
    ];

    const packages = [];

    for (const seed of seeds) {
      const analysis = await analyzeSeedWalletProfile(seed.id);
      const mints = [...new Set(analysis.normalizedTrades.map((trade) => trade.mint))];
      const symbolByMint = new Map<string, string>();
      const nameByMint = new Map<string, string>();
      for (const trade of analysis.normalizedTrades) {
        if (trade.symbol) symbolByMint.set(trade.mint, trade.symbol);
        if (trade.name) nameByMint.set(trade.mint, trade.name);
      }

      const tokenAssetMap = buildMockTokenAssetMap({ mints, symbolByMint, nameByMint });
      const pkg = buildHashCinemaVeoPromptPackage({ analysis, tokenAssetMap });

      expect(seed.expectedArcs).toContain(pkg.storyState.characterArc.id);

      expect(pkg.scenePlan.scenes.length).toBeGreaterThanOrEqual(6);
      expect(pkg.scenePlan.scenes.length).toBeLessThanOrEqual(10);
      expect(pkg.scenePrompts).toHaveLength(pkg.scenePlan.scenes.length);

      expect(pkg.title.length).toBeGreaterThan(3);
      expect(pkg.tagline.length).toBeGreaterThan(10);

      expect(pkg.storyState.tokenImagePlan.featuredMints.length).toBeGreaterThan(0);
      expect(pkg.storyState.tokenImagePlan.imageMoments.length).toBeGreaterThan(0);

      expect(pkg.prompt.includes("Generate one continuous short film for Google Veo WITH SOUND.")).toBe(true);
      expect(pkg.prompt.includes("Scene 1:")).toBe(true);
      expect(pkg.prompt.match(/Sound design:/g)?.length ?? 0).toBeGreaterThanOrEqual(
        pkg.scenePlan.scenes.length,
      );
      expect(pkg.prompt.includes("Token image integration:")).toBe(true);

      // Avoid analytics-y phrasing inside the cinematic prose.
      expect(pkg.prompt.toLowerCase().includes("wallet metrics indicate")).toBe(false);
      expect(pkg.prompt.toLowerCase().includes("volatility index")).toBe(false);
      expect(pkg.prompt.toLowerCase().includes("behavior score")).toBe(false);

      packages.push(pkg);
    }

    // Ensure the 5 packages differ meaningfully.
    const arcs = new Set(packages.map((pkg) => pkg.storyState.characterArc.id));
    expect(arcs.size).toBeGreaterThanOrEqual(4);

    const entropyProfiles = new Set(
      packages.map((pkg) => JSON.stringify(pkg.storyState.sceneEntropy)),
    );
    expect(entropyProfiles.size).toBeGreaterThanOrEqual(3);

    const metaphorFingerprints = new Set(
      packages.map((pkg) =>
        pkg.scenePlan.scenes
          .map((scene) => scene.metaphor?.id ?? "none")
          .slice(0, 6)
          .join("|"),
      ),
    );
    expect(metaphorFingerprints.size).toBeGreaterThanOrEqual(3);
  });

  it("maps arc-specific metaphor expectations (smoke test)", async () => {
    const villainAnalysis = await analyzeSeedWalletProfile("chaotic-overtrader");
    const villainMints = [...new Set(villainAnalysis.normalizedTrades.map((trade) => trade.mint))];
    const villainTokenAssetMap = buildMockTokenAssetMap({
      mints: villainMints,
      symbolByMint: new Map(villainAnalysis.normalizedTrades.flatMap((t) => (t.symbol ? [[t.mint, t.symbol]] : []))),
      nameByMint: new Map(villainAnalysis.normalizedTrades.flatMap((t) => (t.name ? [[t.mint, t.name]] : []))),
    });
    const villainPkg = buildHashCinemaVeoPromptPackage({
      analysis: villainAnalysis,
      tokenAssetMap: villainTokenAssetMap,
    });

    const villainMetaphors = villainPkg.scenePlan.scenes
      .map((scene) => scene.metaphor?.id)
      .filter((id): id is string => Boolean(id));

    // Villain arcs should strongly lean into impact/chaos metaphors.
    expect(
      villainMetaphors.some((id) =>
        ["revenge_trading_boxing_ring", "collapse_storm_bridge", "throne_of_broken_screens", "subway_tunnel_reentry"].includes(id),
      ),
    ).toBe(true);

    const martyrAnalysis = await analyzeSeedWalletProfile("stubborn-bagholder");
    const martyrMints = [...new Set(martyrAnalysis.normalizedTrades.map((trade) => trade.mint))];
    const martyrTokenAssetMap = buildMockTokenAssetMap({
      mints: martyrMints,
      symbolByMint: new Map(martyrAnalysis.normalizedTrades.flatMap((t) => (t.symbol ? [[t.mint, t.symbol]] : []))),
      nameByMint: new Map(martyrAnalysis.normalizedTrades.flatMap((t) => (t.name ? [[t.mint, t.name]] : []))),
    });
    const martyrPkg = buildHashCinemaVeoPromptPackage({
      analysis: martyrAnalysis,
      tokenAssetMap: martyrTokenAssetMap,
    });
    const martyrMetaphors = martyrPkg.scenePlan.scenes
      .map((scene) => scene.metaphor?.id)
      .filter((id): id is string => Boolean(id));

    expect(
      martyrMetaphors.some((id) =>
        ["bagholding_empty_casino", "altar_of_hopium", "digital_funeral_procession", "diamond_hands_warrior"].includes(id),
      ),
    ).toBe(true);
  });
});

