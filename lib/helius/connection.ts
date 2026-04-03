import { getEnv } from "@/lib/env";
import { Connection } from "@solana/web3.js";

const PUBLIC_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

let cachedPrimaryConnection: Connection | null = null;
let cachedFallbackConnection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (cachedPrimaryConnection) {
    return cachedPrimaryConnection;
  }

  const env = getEnv();
  cachedPrimaryConnection = new Connection(env.SOLANA_RPC_URL, "confirmed");
  return cachedPrimaryConnection;
}

export function getSolanaFallbackConnection(): Connection {
  if (cachedFallbackConnection) {
    return cachedFallbackConnection;
  }

  cachedFallbackConnection = new Connection(PUBLIC_SOLANA_RPC_URL, "confirmed");
  return cachedFallbackConnection;
}

export async function withSolanaRpcFallback<T>(
  execute: (connection: Connection) => Promise<T>,
): Promise<T> {
  const primary = getSolanaConnection();

  try {
    return await execute(primary);
  } catch (primaryError) {
    const env = getEnv();

    // Avoid duplicate retry when the primary already points at the public RPC.
    if (env.SOLANA_RPC_URL === PUBLIC_SOLANA_RPC_URL) {
      throw primaryError;
    }

    const fallback = getSolanaFallbackConnection();
    return execute(fallback);
  }
}

