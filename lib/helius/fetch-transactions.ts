import { getHeliusClient } from "@/lib/helius/client";
import { RetryableError, withRetry } from "@/lib/network/retry";
import type { EnhancedTransaction } from "helius-sdk/enhanced/types";

const PAGE_SIZE = 100;
const MAX_TRANSACTIONS = 800;
const MAX_PAGES = 12;
const PAGE_FETCH_TIMEOUT_MS = 20_000;
const PAGE_FETCH_ATTEMPTS = 3;

async function fetchTransactionsPage(input: {
  wallet: string;
  beforeSignature?: string;
}): Promise<EnhancedTransaction[]> {
  const helius = getHeliusClient();

  return withRetry(
    async () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new RetryableError(
              `Helius transaction fetch timed out after ${PAGE_FETCH_TIMEOUT_MS}ms`,
            ),
          );
        }, PAGE_FETCH_TIMEOUT_MS);
      });

      try {
        return await Promise.race([
          helius.enhanced.getTransactionsByAddress({
            address: input.wallet,
            beforeSignature: input.beforeSignature,
            limit: PAGE_SIZE,
            sortOrder: "desc",
          }),
          timeoutPromise,
        ]);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    },
    {
      attempts: PAGE_FETCH_ATTEMPTS,
      baseDelayMs: 800,
      maxDelayMs: 5_000,
      shouldRetry: (error) =>
        error instanceof RetryableError ||
        (error instanceof TypeError && error.message.length > 0),
    },
  );
}

export async function fetchRecentTransactionsByWallet(
  wallet: string,
  rangeDays: number,
): Promise<EnhancedTransaction[]> {
  const cutoffTs = Math.floor(Date.now() / 1000) - rangeDays * 24 * 60 * 60;

  const results: EnhancedTransaction[] = [];
  let beforeSignature: string | undefined;
  let page = 0;

  while (page < MAX_PAGES && results.length < MAX_TRANSACTIONS) {
    const batch = await fetchTransactionsPage({
      wallet,
      beforeSignature,
    });

    if (!batch.length) {
      break;
    }

    results.push(...batch);
    const oldest = batch[batch.length - 1];
    beforeSignature = oldest?.signature;
    page += 1;

    if (!beforeSignature) {
      break;
    }

    if (oldest?.timestamp && oldest.timestamp < cutoffTs) {
      break;
    }
  }

  return results.filter((tx) => (tx.timestamp ?? 0) >= cutoffTs);
}
