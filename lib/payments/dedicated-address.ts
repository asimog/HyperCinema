import { getEnv } from "@/lib/env";
import { createHmac } from "crypto";
import { Keypair } from "@solana/web3.js";

const PAYMENT_SEED_LENGTH_BYTES = 32;

function hexToBytes(hex: string): Buffer {
  const normalized = hex.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("PAYMENT_MASTER_SEED_HEX must be valid hex");
  }

  const bytes = Buffer.from(normalized, "hex");
  if (bytes.length < PAYMENT_SEED_LENGTH_BYTES) {
    throw new Error("PAYMENT_MASTER_SEED_HEX must be at least 32 bytes");
  }

  return bytes;
}

function deriveSeedForIndex(index: number): Buffer {
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`Invalid payment index: ${index}`);
  }

  const env = getEnv();
  const masterSeed = hexToBytes(env.PAYMENT_MASTER_SEED_HEX);
  const hmac = createHmac("sha256", masterSeed);
  hmac.update(`${env.PAYMENT_DERIVATION_PREFIX}:${index}`);
  return hmac.digest().subarray(0, PAYMENT_SEED_LENGTH_BYTES);
}

export function derivePaymentKeypair(index: number): Keypair {
  return Keypair.fromSeed(deriveSeedForIndex(index));
}

export function derivePaymentAddress(index: number): string {
  return derivePaymentKeypair(index).publicKey.toBase58();
}

