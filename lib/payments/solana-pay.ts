import { getEnv } from "@/lib/env";

export function solToLamports(solAmount: number): number {
  return Math.round(solAmount * 1_000_000_000);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function getRevenueWalletAddress(): string {
  return getEnv().HASHCINEMA_PAYMENT_WALLET;
}

