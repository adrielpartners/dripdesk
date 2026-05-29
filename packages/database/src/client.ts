import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.DRIPDESK_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.DRIPDESK_ENV !== 'production') globalForPrisma.prisma = prisma;
