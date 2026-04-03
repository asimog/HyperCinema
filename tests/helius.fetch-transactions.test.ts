import { Keypair, PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTransactionsByAddress: vi.fn(),
  withSolanaRpcFallback: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/helius/client", () => ({
  getHeliusClient: () => ({
    enhanced: {
      getTransactionsByAddress: mocks.getTransactionsByAddress,
    },
  }),
}));

vi.mock("@/lib/helius/connection", () => ({
  withSolanaRpcFallback: mocks.withSolanaRpcFallback,
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { fetchRecentTransactionsByWallet } from "@/lib/helius/fetch-transactions";

describe("fetchRecentTransactionsByWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list for invalid wallet addresses", async () => {
    const result = await fetchRecentTransactionsByWallet("mythx:9fd1", 3);

    expect(result).toEqual([]);
    expect(mocks.getTransactionsByAddress).not.toHaveBeenCalled();
    expect(mocks.withSolanaRpcFallback).not.toHaveBeenCalled();
  });

  it("falls back to parsed Solana RPC transactions when Helius fails", async () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    const destination = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();
    const now = Math.floor(Date.now() / 1000);

    mocks.getTransactionsByAddress.mockRejectedValue(new Error("Helius unavailable"));

    const parsedTransaction = {
      slot: 123,
      blockTime: now,
      meta: {
        err: null,
        fee: 5_000,
        preBalances: [],
        postBalances: [],
        innerInstructions: [],
        logMessages: [],
        preTokenBalances: [
          {
            accountIndex: 1,
            mint,
            owner: wallet,
            uiTokenAmount: {
              amount: "500",
              decimals: 6,
              uiAmount: 0.0005,
              uiAmountString: "0.0005",
            },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 2,
            mint,
            owner: destination,
            uiTokenAmount: {
              amount: "500",
              decimals: 6,
              uiAmount: 0.0005,
              uiAmountString: "0.0005",
            },
          },
        ],
      },
      transaction: {
        signatures: ["sig-rpc"],
        message: {
          accountKeys: [
            { pubkey: new PublicKey(wallet), signer: true, writable: true },
            { pubkey: Keypair.generate().publicKey, signer: false, writable: true },
            { pubkey: new PublicKey(destination), signer: false, writable: true },
          ],
          instructions: [
            {
              program: "system",
              programId: new PublicKey("11111111111111111111111111111111"),
              parsed: {
                type: "transfer",
                info: {
                  source: wallet,
                  destination,
                  lamports: 1_234,
                },
              },
            },
          ],
          recentBlockhash: "blockhash",
        },
      },
      version: 0,
    } as any;

    const fakeConnection = {
      getSignaturesForAddress: vi.fn((_, options?: { before?: string }) => {
        if (options?.before) {
          return Promise.resolve([]);
        }

        return Promise.resolve([
          {
            signature: "sig-rpc",
            slot: 123,
            blockTime: now,
          },
        ]);
      }),
      getParsedTransactions: vi.fn().mockResolvedValue([parsedTransaction]),
    };

    mocks.withSolanaRpcFallback.mockImplementation(async (execute) =>
      execute(fakeConnection as never),
    );

    const result = await fetchRecentTransactionsByWallet(wallet, 3);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      signature: "sig-rpc",
      source: "RPC_FALLBACK",
      type: "SWAP",
      nativeTransfers: [
        {
          fromUserAccount: wallet,
          toUserAccount: destination,
          amount: 1_234,
        },
      ],
      tokenTransfers: [
        {
          fromUserAccount: wallet,
          toUserAccount: destination,
          mint,
          tokenAmount: "500",
          decimals: 6,
        },
      ],
    });
    expect(mocks.getTransactionsByAddress).toHaveBeenCalled();
    expect(mocks.withSolanaRpcFallback).toHaveBeenCalled();
    expect(fakeConnection.getSignaturesForAddress).toHaveBeenCalled();
    expect(fakeConnection.getParsedTransactions).toHaveBeenCalled();
  });
});
