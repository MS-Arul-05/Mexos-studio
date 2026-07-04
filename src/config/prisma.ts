import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';

/**
 * Single shared PrismaClient. In dev, tsx watch can re-import modules; cache the
 * client on globalThis to avoid exhausting DB connections on hot reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
