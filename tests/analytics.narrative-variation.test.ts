import { analyzeSeedWalletProfile } from "@/lib/analytics";

function overlapCount(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

describe("analytics narrative generation", () => {
  it("keeps report sections distinct within a single analysis", async () => {
    const analysis = await analyzeSeedWalletProfile("chaotic-overtrader");

    expect(analysis.behaviorPatterns.length).toBeGreaterThanOrEqual(3);
    expect(analysis.funObservations.length).toBeGreaterThanOrEqual(3);
    expect(analysis.xReadyLines.length).toBeGreaterThanOrEqual(5);
    expect(analysis.videoPromptSequence.length).toBeGreaterThanOrEqual(5);
    expect(analysis.videoPromptSequence.length).toBeLessThanOrEqual(8);

    expect(overlapCount(analysis.behaviorPatterns, analysis.funObservations)).toBe(0);
    expect(overlapCount(analysis.behaviorPatterns, analysis.xReadyLines)).toBeLessThanOrEqual(2);
    expect(analysis.videoPromptSequence[0]?.providerPrompts.veo.length).toBeGreaterThan(0);
    expect(analysis.videoPromptSequence[0]?.narrationHook.length).toBeGreaterThan(0);
    expect(analysis.videoPromptSequence[0]?.providerPrompts.veo.includes("This is memecoin cinema, not analytics.")).toBe(true);
    expect(/\b\d+(?:\.\d+)?\s*SOL\b/i.test(analysis.videoPromptSequence[0]?.providerPrompts.veo ?? "")).toBe(false);
    expect(/\b\d+(?:\.\d+)?\s*SOL\b/i.test(analysis.videoPromptSequence[0]?.narrationHook ?? "")).toBe(false);
  });

  it("produces meaningfully different narrative outputs for different wallet profiles", async () => {
    const chaotic = await analyzeSeedWalletProfile("chaotic-overtrader");
    const early = await analyzeSeedWalletProfile("early-narrative-trader");

    expect(chaotic.personality.primary.displayName).not.toBe(early.personality.primary.displayName);
    expect(chaotic.walletVibeCheck).not.toBe(early.walletVibeCheck);
    expect(chaotic.cinematicSummary.lines.join(" ")).not.toBe(
      early.cinematicSummary.lines.join(" "),
    );
    expect(chaotic.behaviorPatterns.join(" ")).not.toBe(early.behaviorPatterns.join(" "));
    expect(chaotic.funObservations.join(" ")).not.toBe(early.funObservations.join(" "));
    expect(chaotic.videoPromptSequence[0]?.providerPrompts.veo).not.toBe(
      early.videoPromptSequence[0]?.providerPrompts.veo,
    );
  });
});
