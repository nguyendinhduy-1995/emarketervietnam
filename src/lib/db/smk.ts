import { PrismaClient } from '.prisma/smk-client';

const globalForSmk = globalThis as unknown as { smkDb: PrismaClient };

function createSmkClient() {
    const url = process.env.SMK_DATABASE_URL;
    if (!url && process.env.NODE_ENV === 'production') {
        throw new Error('SMK_DATABASE_URL is required in production');
    }
    return new PrismaClient({
        datasourceUrl: url || 'postgresql://postgres:postgres_dev_2026@localhost:5432/sieuthimatkinh?schema=public',
    });
}

export const smkDb = globalForSmk.smkDb ?? createSmkClient();

if (process.env.NODE_ENV !== 'production') globalForSmk.smkDb = smkDb;

export default smkDb;
