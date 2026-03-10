import { computeSweepableLamports } from "@/workers/sweep-payments";

describe("sweep lamport calculation", () => {
  it("returns 0 when balance cannot cover fee and minimum threshold", () => {
    expect(computeSweepableLamports(10_000, 5_000, 6_000)).toBe(0);
  });

  it("returns transferable lamports when above threshold", () => {
    expect(computeSweepableLamports(100_000, 5_000, 10_000)).toBe(95_000);
  });
});

