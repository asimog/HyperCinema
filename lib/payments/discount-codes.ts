export const DISCOUNT_CODES = ["MEPH123", "SHAW123", "MILADY"] as const;

export type DiscountCode = (typeof DISCOUNT_CODES)[number];

const DISCOUNT_CODE_SET = new Set<string>(DISCOUNT_CODES);

export function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function resolveDiscountCode(value: string): DiscountCode | null {
  const normalized = normalizeDiscountCode(value);
  return DISCOUNT_CODE_SET.has(normalized) ? (normalized as DiscountCode) : null;
}

export function isAllowedDiscountCode(value: string): boolean {
  return resolveDiscountCode(value) !== null;
}
