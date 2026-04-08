import { randomBytes } from "node:crypto";

export type DiscountCode = string;

const GENERATED_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateDiscountCode(length = 8): string {
  const safeLength = Math.max(6, Math.min(24, Math.floor(length)));
  const bytes = randomBytes(safeLength);

  let code = "";
  for (let index = 0; index < safeLength; index += 1) {
    code += GENERATED_CODE_ALPHABET[bytes[index]! % GENERATED_CODE_ALPHABET.length];
  }

  return code;
}

export function isValidIssuedDiscountCode(value: string): boolean {
  const normalized = normalizeDiscountCode(value);
  return /^[A-Z0-9]{6,24}$/.test(normalized);
}
