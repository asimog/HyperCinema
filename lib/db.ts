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

  // Prisma v7 requires explicit connection config:
  //   prisma+postgres:// → Prisma Postgres / Accelerate (accelerateUrl)
  //   postgresql:// / postgres:// → direct connection via pg adapter
  if (databaseUrl.startsWith("prisma+postgres://") || databaseUrl.startsWith("prisma://")) {
    _db = globalForPrisma.prisma ?? new PrismaClient({ accelerateUrl: databaseUrl });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    _db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _db;
  }

  return _db;
}

export const db = getPrismaClient();

export { PrismaClient, Prisma };
