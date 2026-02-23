import { PrismaClient } from '../../../node_modules/.prisma/spa';

const globalForPrisma = globalThis as unknown as {
    spaPrisma: PrismaClient | undefined;
};

export const spaDb = globalForPrisma.spaPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.spaPrisma = spaDb;
}
