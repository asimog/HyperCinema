import { analyzeSeedWalletProfile } from "@/lib/analytics";
import {
  buildSceneStateSequence,
  buildVideoIdentitySheet,
} from "@/lib/analytics/videoCoherence";

describe("analytics video coherence pipeline", () => {
  it("keeps identityId stable when raw trade facts are reordered", async () => {
    const analysis = await analyzeSeedWalletProfile("chaotic-overtrader");

    const original = buildVideoIdentitySheet({
      wallet: analysis.wallet,
      metrics: analysis.metrics,
      personality: analysis.personality.primary.displayName,
      modifiers: analysis.modifiers.map((modifier) => modifier.displayName),
      normalizedTrades: analysis.normalizedTrades,
    });
    const reordered = buildVideoIdentitySheet({
      wallet: analysis.wallet,
      metrics: analysis.metrics,
      personality: analysis.personality.primary.displayName,
      modifiers: [...analysis.modifiers]
        .reverse()
        .map((modifier) => modifier.displayName),
      normalizedTrades: [...analysis.normalizedTrades].reverse(),
    });

    expect(reordered.identityId).toBe(original.identityId);
    expect(reordered.tokenAnchors.map((anchor) => anchor.symbol)).toEqual(
      original.tokenAnchors.map((anchor) => anchor.symbol),
    );
  });

  it("keeps continuity anchors stable across adjacent scene states while allowing deltas", async () => {
    const analysis = await analyzeSeedWalletProfile("pump-chaser");
    const identity = analysis.videoIdentitySheet!;
    const states = buildSceneStateSequence({
      identity,
      storyBeats: analysis.storyBeats,
      moments: analysis.moments,
      metrics: analysis.metrics,
    });

    expect(states.length).toBeGreaterThan(1);
    expect(states[0]?.continuityAnchors).toContain(identity.protagonist);
    expect(states[1]?.continuityAnchors).toContain(identity.protagonist);
    expect(states[0]?.continuityAnchors).toContain(identity.worldCanon[0]);
    expect(states[1]?.continuityAnchors).toContain(identity.worldCanon[0]);
    expect(states[1]?.deltaFromPrevious.length).toBeGreaterThan(0);
    expect(states[1]?.deltaFromPrevious.join(" ")).not.toContain("undefined");
  });

  it("produces materially different coherence profiles for different wallets", async () => {
    const chaotic = await analyzeSeedWalletProfile("chaotic-overtrader");
    const stubborn = await analyzeSeedWalletProfile("stubborn-bagholder");

    expect(chaotic.videoIdentitySheet?.identityId).not.toBe(
      stubborn.videoIdentitySheet?.identityId,
    );
    expect(chaotic.videoIdentitySheet?.archetype).not.toBe(
      stubborn.videoIdentitySheet?.archetype,
    );
    expect(chaotic.sceneStateSequence?.map((scene) => scene.stateRef)).not.toEqual(
      stubborn.sceneStateSequence?.map((scene) => scene.stateRef),
    );
  });
});
