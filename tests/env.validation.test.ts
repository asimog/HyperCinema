import { describe, expect, it, vi } from "vitest";

const VALID_WALLET = "D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z";
const VALID_MASTER_SEED =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_WEBHOOK_ID = "b22ab57c-ed5f-4674-90d7-11a540ecafe6";

function applyBaseEnv(): void {
  process.env.HELIUS_API_KEY = "test-helius";
  process.env.SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
  process.env.OPENROUTER_API_KEY = "test-openrouter";
  process.env.VIDEO_API_KEY = "test-video";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.PAYMENT_MASTER_SEED_HEX = VALID_MASTER_SEED;
  process.env.HYPERCINEMA_PAYMENT_WALLET = VALID_WALLET;
}

describe.sequential("environment validation", () => {
  it("accepts a valid Solana revenue wallet", async () => {
    vi.resetModules();
    applyBaseEnv();

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.HYPERCINEMA_PAYMENT_WALLET).toBe(VALID_WALLET);
  });

  it("rejects an invalid Solana revenue wallet", async () => {
    vi.resetModules();
    applyBaseEnv();
    process.env.HYPERCINEMA_PAYMENT_WALLET = "not-a-solana-wallet";

    const { getEnv } = await import("@/lib/env");

    expect(() => getEnv()).toThrow(/HYPERCINEMA_PAYMENT_WALLET/);
  });

  it("trims whitespace from strict webhook/video env vars", async () => {
    vi.resetModules();
    applyBaseEnv();
    process.env.HELIUS_WEBHOOK_ID = ` ${VALID_WEBHOOK_ID}\n`;
    process.env.VIDEO_ENGINE = " google_veo ";
    process.env.VIDEO_VEO_MODEL = " veo-3.1-fast-generate-001\n";
    process.env.VIDEO_RESOLUTION = " 1080p ";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.HELIUS_WEBHOOK_ID).toBe(VALID_WEBHOOK_ID);
    expect(env.VIDEO_ENGINE).toBe("google_veo");
    expect(env.VIDEO_VEO_MODEL).toBe("veo-3.1-fast-generate-001");
    expect(env.VIDEO_RESOLUTION).toBe("1080p");
  });

  it("treats blank HELIUS_WEBHOOK_ID as undefined", async () => {
    vi.resetModules();
    applyBaseEnv();
    process.env.HELIUS_WEBHOOK_ID = " \n";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.HELIUS_WEBHOOK_ID).toBeUndefined();
  });
});
