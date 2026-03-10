import {
  aggregateNativeTransfersByDestination,
  extractNativeTransfersFromParsedTransaction,
} from "@/lib/payments/onchain-verify";
import { ParsedTransactionWithMeta } from "@solana/web3.js";

function mockParsedTransaction(): ParsedTransactionWithMeta {
  return {
    slot: 1,
    blockTime: 1,
    meta: {
      err: null,
      fee: 5000,
      preBalances: [],
      postBalances: [],
      innerInstructions: [],
      logMessages: [],
      preTokenBalances: [],
      postTokenBalances: [],
      loadedAddresses: {
        readonly: [],
        writable: [],
      },
    },
    transaction: {
      signatures: ["sig-1"],
      message: {
        accountKeys: [],
        instructions: [
          {
            program: "system",
            programId: { toBase58: () => "11111111111111111111111111111111" },
            parsed: {
              type: "transfer",
              info: {
                source: "sender",
                destination: "PLATFORM_WALLET",
                lamports: 22_000_000,
              },
            },
          },
        ],
        recentBlockhash: "blockhash",
      },
    },
    version: 0,
  } as unknown as ParsedTransactionWithMeta;
}

describe("on-chain parser helpers", () => {
  it("extracts native transfers from parsed transaction", () => {
    const transfers = extractNativeTransfersFromParsedTransaction(
      mockParsedTransaction(),
    );
    expect(transfers).toEqual([
      {
        destination: "PLATFORM_WALLET",
        lamports: 22_000_000,
      },
    ]);
  });

  it("returns safe defaults for null transactions", () => {
    expect(extractNativeTransfersFromParsedTransaction(null)).toEqual([]);
  });

  it("aggregates transfers by destination", () => {
    const aggregated = aggregateNativeTransfersByDestination([
      { destination: "A", lamports: 1_000 },
      { destination: "B", lamports: 2_000 },
      { destination: "A", lamports: 3_000 },
    ]);

    expect(aggregated).toEqual([
      { destination: "A", lamports: 4_000 },
      { destination: "B", lamports: 2_000 },
    ]);
  });
});
