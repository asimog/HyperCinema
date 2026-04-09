import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _db: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (_db) return _db;

  // During build/SSG, DATABASE_URL may not be available.
  // Return a dummy client that will fail only when actually used.
  if (!process.env.DATABASE_URL) {
    // In build mode, return undefined to allow compilation
    // Pages that actually need DB will fail at runtime (expected)
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return undefined as unknown as PrismaClient;
    }
  }

  _db = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _db;
  }

  return _db;
}

export const db = getPrismaClient();

export { PrismaClient, Prisma };
