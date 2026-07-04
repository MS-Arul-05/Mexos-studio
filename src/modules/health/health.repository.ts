import { prisma } from '../../config/prisma';

/**
 * Repository layer: all DB access lives here so it can be mocked in tests
 * (02_ARCHITECTURE.md §3).
 */
export const healthRepository = {
  /** Lightweight round-trip to confirm the DB is reachable. */
  async ping(): Promise<boolean> {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
};
