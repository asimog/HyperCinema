import { randomBytes } from "node:crypto";

export const DISCOUNT_CODES = [
  "MEPH123",
  "SHAW123",
  "MILADY",
  "DYLAN",
  "MODALPH",
  "MEPH",
  "MARIO",
  "HIHIHI",
  "PROL1",
  "PROL2",
  "PROL3",
  "PROL4",
  "PROL5",
] as const;

export type DiscountCode = (typeof DISCOUNT_CODES)[number];

const DISCOUNT_CODE_SET = new Set<string>(DISCOUNT_CODES);

export function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function resolveDiscountCode(value: string): DiscountCode | null {
  const normalized = normalizeDiscountCode(value);
  return DISCOUNT_CODE_SET.has(normalized) ? (normalized as DiscountCode) : null;
}

export function isBuiltinDiscountCode(value: string): value is DiscountCode {
  return DISCOUNT_CODE_SET.has(normalizeDiscountCode(value));
}

export function isAllowedDiscountCode(value: string): boolean {
  return resolveDiscountCode(value) !== null;
}

const GENERATED_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
  return /^[A-Z0-9]{6,24}$/.test(normalized) && !isBuiltinDiscountCode(normalized);
}
