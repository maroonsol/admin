import { PrismaClient } from "../../prisma/generated/admin";

declare global {
  var adminPrisma: PrismaClient | undefined;
}

export const adminPrisma: PrismaClient = global.adminPrisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== "production") {
  global.adminPrisma = adminPrisma;
}


