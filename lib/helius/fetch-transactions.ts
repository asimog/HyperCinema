import { getHeliusClient } from "@/lib/helius/client";
import { withSolanaRpcFallback } from "@/lib/helius/connection";
import { logger } from "@/lib/logging/logger";
import { RetryableError, withRetry } from "@/lib/network/retry";
import {
  PublicKey,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  type ParsedTransactionWithMeta,
  type TokenBalance,
} from "@solana/web3.js";
import type {
  EnhancedInstruction,
  EnhancedNativeTransfer,
  EnhancedTokenTransfer,
  EnhancedTransaction,
} from "helius-sdk/enhanced/types";

const PAGE_SIZE = 100;
const MAX_TRANSACTIONS = 800;
const MAX_PAGES = 12;
const PAGE_FETCH_TIMEOUT_MS = 20_000;
const PAGE_FETCH_ATTEMPTS = 3;
const ZERO_BIGINT = BigInt(0);

type ParsedInstructionLike = ParsedInstruction | PartiallyDecodedInstruction;

type TokenBalanceDelta = {
  accountIndex: number;
  amount: bigint;
  decimals: number;
  mint: string;
  owner: string;
};

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isParsedInstruction(
  instruction: ParsedInstructionLike,
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

function collectParsedInstructions(
  transaction: ParsedTransactionWithMeta,
): ParsedInstructionLike[] {
  const instructions: ParsedInstructionLike[] = [
    ...transaction.transaction.message.instructions,
  ];

  for (const inner of transaction.meta?.innerInstructions ?? []) {
    instructions.push(...inner.instructions);
  }

  return instructions;
}

function getAccountAddress(
  transaction: ParsedTransactionWithMeta,
  accountIndex: number,
): string | null {
  return (
    transaction.transaction.message.accountKeys[accountIndex]?.pubkey.toBase58() ??
    null
  );
}

function resolveTokenAccountOwner(
  balance: TokenBalance,
  transaction: ParsedTransactionWithMeta,
): string {
  return (
    readString(balance.owner) ??
    getAccountAddress(transaction, balance.accountIndex) ??
    balance.mint
  );
}

function tokenBalanceAmount(balance: TokenBalance): bigint | null {
  try {
    return BigInt(balance.uiTokenAmount.amount);
  } catch {
    return null;
  }
}

function maybeNativeTransferFromInstruction(
  instruction: ParsedInstructionLike,
): EnhancedNativeTransfer | null {
  if (!isParsedInstruction(instruction) || !instruction.parsed) {
    return null;
  }

  const parsed = instruction.parsed as Record<string, unknown>;
  const type = readString(parsed.type);
  if (type !== "transfer" && type !== "transferWithSeed") {
    return null;
  }

  const info =
    parsed.info && typeof parsed.info === "object"
      ? (parsed.info as Record<string, unknown>)
      : null;
  if (!info) {
    return null;
  }

  const fromUserAccount =
    readString(info.source) ??
    readString(info.from) ??
    readString(info.authority) ??
    null;
  const toUserAccount =
    readString(info.destination) ?? readString(info.to) ?? null;
  const amount = readNumber(info.lamports) ?? readNumber(info.amount);

  if (!fromUserAccount || !toUserAccount || amount === null || amount <= 0) {
    return null;
  }

  return {
    fromUserAccount,
    toUserAccount,
    amount: Math.max(0, Math.floor(amount)),
  };
}

function maybeEnhancedInstructionFromInstruction(
  instruction: ParsedInstructionLike,
): EnhancedInstruction | null {
  if (!isParsedInstruction(instruction) || !instruction.parsed) {
    return null;
  }

  return {
    programId: instruction.programId.toBase58(),
    programName: instruction.program,
    parsed:
      instruction.parsed && typeof instruction.parsed === "object"
        ? (instruction.parsed as Record<string, unknown>)
        : undefined,
  };
}

function extractNativeTransfersFromParsedTransaction(
  transaction: ParsedTransactionWithMeta,
): EnhancedNativeTransfer[] {
  const transfers: EnhancedNativeTransfer[] = [];

  for (const instruction of collectParsedInstructions(transaction)) {
    const transfer = maybeNativeTransferFromInstruction(instruction);
    if (transfer) {
      transfers.push(transfer);
    }
  }

  return transfers;
}

function extractTokenTransfersFromParsedTransaction(
  transaction: ParsedTransactionWithMeta,
): EnhancedTokenTransfer[] {
  const meta = transaction.meta;
  const preBalances = meta?.preTokenBalances ?? [];
  const postBalances = meta?.postTokenBalances ?? [];
  const deltasByMint = new Map<string, TokenBalanceDelta[]>();

  const balanceByAccountIndexAndMint = new Map<
    number,
    { pre?: TokenBalance; post?: TokenBalance }
  >();

  for (const balance of preBalances) {
    const current = balanceByAccountIndexAndMint.get(balance.accountIndex) ?? {};
    current.pre = balance;
    balanceByAccountIndexAndMint.set(balance.accountIndex, current);
  }

  for (const balance of postBalances) {
    const current = balanceByAccountIndexAndMint.get(balance.accountIndex) ?? {};
    current.post = balance;
    balanceByAccountIndexAndMint.set(balance.accountIndex, current);
  }

  for (const [accountIndex, balances] of balanceByAccountIndexAndMint.entries()) {
    const pre = balances.pre;
    const post = balances.post;
    const mint = post?.mint ?? pre?.mint;
    if (!mint) {
      continue;
    }

    const preAmount = pre ? tokenBalanceAmount(pre) : ZERO_BIGINT;
    const postAmount = post ? tokenBalanceAmount(post) : ZERO_BIGINT;
    if (preAmount === null || postAmount === null) {
      continue;
    }

    const delta = postAmount - preAmount;
    if (delta === ZERO_BIGINT) {
      continue;
    }

    const owner =
      resolveTokenAccountOwner(
        delta > ZERO_BIGINT ? post ?? pre! : pre ?? post!,
        transaction,
      );
    const decimals = post?.uiTokenAmount.decimals ?? pre?.uiTokenAmount.decimals ?? 0;
    const current = deltasByMint.get(mint) ?? [];
    current.push({
      accountIndex,
      amount: delta,
      decimals,
      mint,
      owner,
    });
    deltasByMint.set(mint, current);
  }

  const transfers: EnhancedTokenTransfer[] = [];
  const abs = (value: bigint) => (value < ZERO_BIGINT ? -value : value);

  for (const [mint, deltas] of deltasByMint.entries()) {
    const decreases = deltas
      .filter((delta) => delta.amount < ZERO_BIGINT)
      .sort((left, right) => (abs(left.amount) > abs(right.amount) ? -1 : 1));
    const increases = deltas
      .filter((delta) => delta.amount > ZERO_BIGINT)
      .sort((left, right) => (abs(left.amount) > abs(right.amount) ? -1 : 1));

    while (decreases.length > 0 && increases.length > 0) {
      const source = decreases[0]!;
      const destination = increases[0]!;
      const transferable =
        source.amount < ZERO_BIGINT ? -source.amount : source.amount;
      const received =
        destination.amount > ZERO_BIGINT ? destination.amount : -destination.amount;
      const transferAmount = transferable < received ? transferable : received;

      if (transferAmount <= ZERO_BIGINT) {
        break;
      }

      transfers.push({
        fromUserAccount: source.owner,
        toUserAccount: destination.owner,
        mint,
        tokenAmount: transferAmount.toString(),
        decimals: Math.max(source.decimals, destination.decimals),
      });

      source.amount += transferAmount;
      destination.amount -= transferAmount;

      if (source.amount === ZERO_BIGINT) {
        decreases.shift();
      }

      if (destination.amount === ZERO_BIGINT) {
        increases.shift();
      }
    }
  }

  return transfers;
}

function inferTransactionType(
  nativeTransfers: EnhancedNativeTransfer[],
  tokenTransfers: EnhancedTokenTransfer[],
): string {
  if (nativeTransfers.length > 0 && tokenTransfers.length > 0) {
    return "SWAP";
  }

  if (tokenTransfers.length > 0) {
    return "TOKEN_TRANSFER";
  }

  if (nativeTransfers.length > 0) {
    return "TRANSFER";
  }

  return "UNKNOWN";
}

function inferDescription(
  nativeTransfers: EnhancedNativeTransfer[],
  tokenTransfers: EnhancedTokenTransfer[],
): string {
  if (nativeTransfers.length > 0 && tokenTransfers.length > 0) {
    return "RPC fallback parsed native and token transfers";
  }

  if (tokenTransfers.length > 0) {
    return "RPC fallback parsed token transfer";
  }

  if (nativeTransfers.length > 0) {
    return "RPC fallback parsed native transfer";
  }

  return "RPC fallback parsed transaction";
}

function getFeePayer(transaction: ParsedTransactionWithMeta): string | undefined {
  const signerAccount = transaction.transaction.message.accountKeys.find(
    (account) => account.signer,
  );
  return signerAccount?.pubkey.toBase58() ?? transaction.transaction.message.accountKeys[0]?.pubkey.toBase58();
}

function toFallbackEnhancedTransaction(
  transaction: ParsedTransactionWithMeta,
  signature: string,
): EnhancedTransaction {
  const nativeTransfers = extractNativeTransfersFromParsedTransaction(transaction);
  const tokenTransfers = extractTokenTransfersFromParsedTransaction(transaction);
  const instructions = collectParsedInstructions(transaction)
    .map((instruction) => maybeEnhancedInstructionFromInstruction(instruction))
    .filter((instruction): instruction is EnhancedInstruction => instruction !== null);

  return {
    signature,
    slot: transaction.slot,
    timestamp: transaction.blockTime ?? undefined,
    fee: transaction.meta?.fee ?? undefined,
    feePayer: getFeePayer(transaction),
    source: "RPC_FALLBACK",
    type: inferTransactionType(nativeTransfers, tokenTransfers),
    description: inferDescription(nativeTransfers, tokenTransfers),
    nativeTransfers,
    tokenTransfers,
    transactionError: transaction.meta?.err ?? null,
    instructions,
  };
}

async function fetchTransactionsPageFromHelius(input: {
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

async function fetchTransactionsPageFromRpc(input: {
  wallet: string;
  beforeSignature?: string;
}): Promise<EnhancedTransaction[]> {
  const walletKey = new PublicKey(input.wallet);

  return withSolanaRpcFallback(async (connection) => {
    const signatures = await connection.getSignaturesForAddress(walletKey, {
      before: input.beforeSignature,
      limit: PAGE_SIZE,
    });

    if (!signatures.length) {
      return [];
    }

    const parsedTransactions = await connection.getParsedTransactions(
      signatures.map((signature) => signature.signature),
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );

    return parsedTransactions.flatMap((parsedTransaction, index) => {
      if (!parsedTransaction) {
        return [];
      }

      const signature =
        signatures[index]?.signature ?? parsedTransaction.transaction.signatures[0];
      if (!signature) {
        return [];
      }

      return [toFallbackEnhancedTransaction(parsedTransaction, signature)];
    });
  });
}

async function fetchTransactionsPage(input: {
  wallet: string;
  beforeSignature?: string;
}): Promise<EnhancedTransaction[]> {
  if (!isValidSolanaAddress(input.wallet)) {
    logger.warn("wallet_transaction_fetch_invalid_address", {
      component: "helius_fetch",
      stage: "fetch_transactions_page",
      wallet: input.wallet,
      errorCode: "invalid_address",
    });
    return [];
  }

  try {
    return await fetchTransactionsPageFromHelius(input);
  } catch (error) {
    logger.warn("helius_transaction_fetch_failed_falling_back_to_rpc", {
      component: "helius_fetch",
      stage: "fetch_transactions_page",
      wallet: input.wallet,
      beforeSignature: input.beforeSignature ?? null,
      errorCode: "helius_transaction_fetch_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return fetchTransactionsPageFromRpc(input);
  }
}

export async function fetchRecentTransactionsByWallet(
  wallet: string,
  rangeDays: number,
): Promise<EnhancedTransaction[]> {
  if (!isValidSolanaAddress(wallet)) {
    logger.warn("wallet_transaction_fetch_skipped_invalid_address", {
      component: "helius_fetch",
      stage: "fetch_recent_transactions",
      wallet,
      errorCode: "invalid_address",
    });
    return [];
  }

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
