import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _db: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;

  // No DATABASE_URL = build/SSG worker context; return undefined.
  // Routes that need DB will fail at runtime (expected), not at build time.
  if (!databaseUrl) {
    return undefined as unknown as PrismaClient;
  }

  // Prisma v7 changed the constructor API: must use accelerateUrl (for prisma+postgres://)
  // or adapter (for direct DB). datasourceUrl/datasources no longer exist.
  _db = globalForPrisma.prisma ?? new PrismaClient({ accelerateUrl: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _db;
  }

  return _db;
}

export const db = getPrismaClient();

export { PrismaClient, Prisma };
