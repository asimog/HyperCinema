import { describe, expect, it, vi } from "vitest";

const VALID_MASTER_SEED =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function applyBaseEnv(): void {
  process.env.HELIUS_API_KEY = "test-helius";
  process.env.SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
  process.env.OPENROUTER_API_KEY = "test-openrouter";
  process.env.VIDEO_API_KEY = "test-video";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.PAYMENT_MASTER_SEED_HEX = VALID_MASTER_SEED;
}

describe.sequential("environment validation", () => {
  it("trims whitespace from strict env vars", async () => {
    vi.resetModules();
    applyBaseEnv();
    process.env.VIDEO_ENGINE = " google_veo ";
    process.env.VIDEO_VEO_MODEL = " veo-3.1-fast-generate-001\n";
    process.env.VIDEO_RESOLUTION = " 1080p ";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.VIDEO_ENGINE).toBe("google_veo");
    expect(env.VIDEO_VEO_MODEL).toBe("veo-3.1-fast-generate-001");
    expect(env.VIDEO_RESOLUTION).toBe("1080p");
  });

  it("treats blank HELIUS_API_KEY as undefined", async () => {
    vi.resetModules();
    applyBaseEnv();
    process.env.HELIUS_API_KEY = " \n";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.HELIUS_API_KEY).toBeUndefined();
  });
});
