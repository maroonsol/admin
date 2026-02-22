import { PrismaClient } from "../../prisma/generated/admin";

declare global {
  // eslint-disable-next-line no-var
  var adminPrisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as {
  adminPrisma: PrismaClient | undefined;
};

export const adminPrisma: PrismaClient =
  globalForPrisma.adminPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL
      }
    }
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.adminPrisma = adminPrisma;
}


