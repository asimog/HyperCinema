import { db, Prisma } from "@/lib/db";

export interface RateLimitRule {
  windowSec: number;
  limit: number;
  name: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  exceededRule?: string;
}

function encodeKey(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function bucketStart(nowSec: number, windowSec: number): number {
  return Math.floor(nowSec / windowSec) * windowSec;
}

export async function enforceRateLimit(input: {
  scope: string;
  key: string;
  rules: RateLimitRule[];
  now?: Date;
}): Promise<RateLimitResult> {
  // Fail-open: if DB is unavailable, allow all requests
  if (!db) {
    return { allowed: true, retryAfterSec: 0 };
  }

  try {
    return await _enforceRateLimitWithDb(input);
  } catch {
    // DB error — fail-open so users aren't blocked by infra issues
    return { allowed: true, retryAfterSec: 0 };
  }
}

async function _enforceRateLimitWithDb(input: {
  scope: string;
  key: string;
  rules: RateLimitRule[];
  now?: Date;
}): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const encodedKey = encodeKey(`${input.scope}:${input.key}`);

  const ruleEntries = input.rules.map((rule) => {
    const start = bucketStart(nowSec, rule.windowSec);
    const id = `${input.scope}:${rule.name}:${rule.windowSec}:${start}:${encodedKey}`;
    return { rule, start, id };
  });

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Read all counters in parallel
    const reads = ruleEntries.map((entry) =>
      tx.rateLimit.findUnique({ where: { id: entry.id } }),
    );
    const existing = await Promise.all(reads);

    let retryAfterSec = 0;
    let exceededRule: string | undefined;
    for (let index = 0; index < ruleEntries.length; index += 1) {
      const entry = ruleEntries[index]!;
      const current = existing[index];
      const count = current?.count ?? 0;
      if (count >= entry.rule.limit) {
        const remaining = entry.start + entry.rule.windowSec - nowSec;
        retryAfterSec = Math.max(retryAfterSec, Math.max(1, remaining));
        exceededRule = entry.rule.name;
      }
    }

    if (retryAfterSec > 0) {
      return {
        allowed: false,
        retryAfterSec,
        exceededRule,
      };
    }

    // Increment all counters via upsert
    for (let index = 0; index < ruleEntries.length; index += 1) {
      const entry = ruleEntries[index]!;
      const expiresAt = new Date((entry.start + entry.rule.windowSec) * 1000);
      await tx.rateLimit.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          count: 1,
          windowEnd: expiresAt,
          updatedAt: now,
        },
        update: {
          count: { increment: 1 },
          updatedAt: now,
        },
      });
    }

    return {
      allowed: true,
      retryAfterSec: 0,
    };
  });
}
