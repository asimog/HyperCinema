import {
  createX402Server,
  SOLANA_MAINNET_NETWORK,
} from "@dexterai/x402/server";
import { toAtomicUnits } from "@dexterai/x402/utils";

import { getEnv } from "@/lib/env";

let cachedServer: ReturnType<typeof createX402Server> | null = null;

export function getHyperCinemaX402Server() {
  if (cachedServer) {
    return cachedServer;
  }

  const env = getEnv();
  cachedServer = createX402Server({
    payTo: env.HYPERCINEMA_PAYMENT_WALLET,
    facilitatorUrl: env.X402_FACILITATOR_URL,
    network: SOLANA_MAINNET_NETWORK,
  });

  return cachedServer;
}

export function usdToUsdcAtomic(amountUsd: number): string {
  return toAtomicUnits(amountUsd, 6);
}
