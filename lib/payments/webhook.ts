export interface HeliusWebhookNativeTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number;
}

export interface HeliusWebhookInstruction {
  programId?: string;
  programName?: string;
  parsed?: unknown;
}

export interface HeliusEnhancedWebhookTransaction {
  signature?: string;
  slot?: number;
  transactionError?: unknown;
  description?: string;
  nativeTransfers?: HeliusWebhookNativeTransfer[];
  instructions?: HeliusWebhookInstruction[];
  events?: Record<string, unknown>;
}

export function totalLamportsByDestination(
  tx: HeliusEnhancedWebhookTransaction,
): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const transfer of tx.nativeTransfers ?? []) {
    const destination = transfer.toUserAccount;
    const amount = Math.max(0, Math.floor(transfer.amount ?? 0));
    if (!destination || amount <= 0) {
      continue;
    }
    totals[destination] = (totals[destination] ?? 0) + amount;
  }

  return totals;
}

export function transactionTargetsAddress(
  tx: HeliusEnhancedWebhookTransaction,
  address: string,
): boolean {
  return (tx.nativeTransfers ?? []).some(
    (transfer) => transfer.toUserAccount === address,
  );
}

