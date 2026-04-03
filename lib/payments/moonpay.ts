import crypto from "crypto";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
}

function readNestedNumber(input: unknown, path: string[]): number | null {
  let current: unknown = input;
  for (const key of path) {
    const object = asObject(current);
    if (!object) return null;
    current = object[key];
  }
  return readNumber(current);
}

export interface MoonpayWebhookTransactionLike {
  signature: string | null;
  transactionStatus: string | null;
  additionalJSON: JsonObject | null;
  amountLamports: number | null;
  paylinkId: string | null;
}

export function extractMoonpayWebhookTransactions(payload: unknown): MoonpayWebhookTransactionLike[] {
  const objectPayload = asObject(payload);
  const transactions = objectPayload?.transactions;
  const entries: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(transactions)
      ? transactions
      : [payload];

  return entries.map((entry) => {
    const object = asObject(entry);
    const meta = asObject(object?.meta);
    const additionalJSON =
      asObject(object?.additionalJSON) ??
      asObject(object?.additionalJson) ??
      asObject(meta?.additionalJSON) ??
      asObject(meta?.additionalJson) ??
      null;

    return {
      signature:
        readString(object?.signature) ??
        readString(object?.transactionSignature) ??
        readString(meta?.transactionSignature) ??
        readString(meta?.signature),
      transactionStatus:
        readString(object?.transactionStatus) ??
        readString(object?.status) ??
        readString(meta?.transactionStatus) ??
        readString(meta?.status),
      additionalJSON,
      amountLamports:
        readNestedNumber(entry, ["meta", "amount"]) ??
        readNestedNumber(entry, ["meta", "totalAmount"]) ??
        readNestedNumber(entry, ["amount"]) ??
        readNestedNumber(entry, ["totalAmount"]) ??
        readNestedNumber(entry, ["paymentAmount"]),
      paylinkId:
        readString(object?.paylinkId) ??
        readString(object?.paymentRequestId) ??
        readString(meta?.paylinkId) ??
        readString(meta?.paymentRequestId),
    };
  });
}

export function isMoonpaySuccessfulStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toUpperCase() ?? "";
  return (
    normalized === "SUCCESS" ||
    normalized === "SUCCEEDED" ||
    normalized === "COMPLETED" ||
    normalized === "PAID" ||
    normalized === "CONFIRMED"
  );
}

export function extractMoonpayJobId(entry: MoonpayWebhookTransactionLike): string | null {
  return (
    readString(entry.additionalJSON?.jobId) ??
    readString(entry.additionalJSON?.job_id) ??
    readString(entry.additionalJSON?.jobID) ??
    null
  );
}

export function verifyMoonpayWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  sharedToken: string,
): boolean {
  const normalizedSignature = receivedSignature.trim();
  if (!normalizedSignature) return false;

  const computedSignature = crypto
    .createHmac("sha256", sharedToken)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(normalizedSignature, "hex");
  const computedBuffer = Buffer.from(computedSignature, "hex");

  if (receivedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, computedBuffer);
}
