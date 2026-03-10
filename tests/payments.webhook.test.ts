import {
  totalLamportsByDestination,
  transactionTargetsAddress,
} from "@/lib/payments/webhook";

describe("payment webhook helpers", () => {
  it("totals transfers by destination address", () => {
    const tx = {
      nativeTransfers: [
        {
          fromUserAccount: "sender",
          toUserAccount: "ADDR_A",
          amount: 25_000_000,
        },
        {
          fromUserAccount: "sender",
          toUserAccount: "ADDR_A",
          amount: 5_000_000,
        },
        {
          fromUserAccount: "sender",
          toUserAccount: "ADDR_B",
          amount: 2_000_000,
        },
      ],
    };

    expect(totalLamportsByDestination(tx)).toEqual({
      ADDR_A: 30_000_000,
      ADDR_B: 2_000_000,
    });
  });

  it("checks whether a transaction targets a specific address", () => {
    const tx = {
      nativeTransfers: [
        {
          fromUserAccount: "sender",
          toUserAccount: "ADDR_A",
          amount: 25_000_000,
        },
      ],
    };

    expect(transactionTargetsAddress(tx, "ADDR_A")).toBe(true);
    expect(transactionTargetsAddress(tx, "ADDR_B")).toBe(false);
  });
});
