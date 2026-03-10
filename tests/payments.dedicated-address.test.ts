import { derivePaymentAddress } from "@/lib/payments/dedicated-address";

vi.mock("@/lib/env", () => ({
  getEnv: () =>
    ({
      PAYMENT_MASTER_SEED_HEX:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      PAYMENT_DERIVATION_PREFIX: "hashcinema-test",
    }) as const,
}));

describe("dedicated payment address derivation", () => {
  it("derives deterministic addresses for the same index", () => {
    const first = derivePaymentAddress(1);
    const second = derivePaymentAddress(1);

    expect(first).toBe(second);
  });

  it("derives unique addresses across indices", () => {
    const first = derivePaymentAddress(1);
    const second = derivePaymentAddress(2);

    expect(first).not.toBe(second);
  });
});

