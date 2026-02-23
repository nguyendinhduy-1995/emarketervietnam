import { PrismaClient } from '../../../node_modules/.prisma/platform';

const globalForPrisma = globalThis as unknown as {
  platformPrisma: PrismaClient | undefined;
};

export const platformDb =
  globalForPrisma.platformPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.platformPrisma = platformDb;
}
