import { withSolanaRpcFallback } from "@/lib/helius/connection";
import {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";

type ParsedInstructionLike = ParsedInstruction | PartiallyDecodedInstruction;

export interface ParsedNativeTransfer {
  destination: string;
  lamports: number;
}

function isParsedInstruction(
  instruction: ParsedInstructionLike,
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

function normalizeLamports(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return 0;
}

function maybeTransferFromInstruction(
  instruction: ParsedInstructionLike,
): ParsedNativeTransfer | null {
  if (!isParsedInstruction(instruction) || !instruction.parsed) {
    return null;
  }

  const parsed = instruction.parsed as Record<string, unknown>;
  const type = typeof parsed.type === "string" ? parsed.type : null;
  if (type !== "transfer") {
    return null;
  }

  const info =
    parsed.info && typeof parsed.info === "object"
      ? (parsed.info as Record<string, unknown>)
      : null;
  if (!info) {
    return null;
  }

  const destination =
    typeof info.destination === "string"
      ? info.destination
      : typeof info.to === "string"
        ? info.to
        : null;

  if (!destination) {
    return null;
  }

  const lamports = normalizeLamports(info.lamports);
  if (lamports <= 0) {
    return null;
  }

  return {
    destination,
    lamports,
  };
}

export function extractNativeTransfersFromParsedTransaction(
  transaction: ParsedTransactionWithMeta | null,
): ParsedNativeTransfer[] {
  if (!transaction) return [];

  const transfers: ParsedNativeTransfer[] = [];

  for (const instruction of transaction.transaction.message.instructions) {
    const transfer = maybeTransferFromInstruction(instruction);
    if (transfer) {
      transfers.push(transfer);
    }
  }

  for (const inner of transaction.meta?.innerInstructions ?? []) {
    for (const instruction of inner.instructions) {
      const transfer = maybeTransferFromInstruction(instruction);
      if (transfer) {
        transfers.push(transfer);
      }
    }
  }

  return transfers;
}

export function aggregateNativeTransfersByDestination(
  transfers: ParsedNativeTransfer[],
): ParsedNativeTransfer[] {
  const totals = new Map<string, number>();

  for (const transfer of transfers) {
    totals.set(
      transfer.destination,
      (totals.get(transfer.destination) ?? 0) + transfer.lamports,
    );
  }

  return [...totals.entries()].map(([destination, lamports]) => ({
    destination,
    lamports,
  }));
}

export interface OnChainPaymentVerification {
  signature: string;
  confirmed: boolean;
  transfers: ParsedNativeTransfer[];
}

export async function verifyOnChainPayment(signature: string): Promise<OnChainPaymentVerification> {
  const [status, transaction] = await Promise.all([
    withSolanaRpcFallback((connection) =>
      connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      }),
    ),
    withSolanaRpcFallback((connection) =>
      connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }),
    ),
  ]);

  const confirmation = status.value?.confirmationStatus;
  const confirmed =
    confirmation === "confirmed" ||
    confirmation === "finalized" ||
    status.value?.confirmations === null;

  if (!transaction || transaction.meta?.err) {
    return {
      signature,
      confirmed: false,
      transfers: [],
    };
  }

  return {
    signature,
    confirmed,
    transfers: aggregateNativeTransfersByDestination(
      extractNativeTransfersFromParsedTransaction(transaction),
    ),
  };
}

