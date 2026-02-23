import IORedis from 'ioredis';

const globalForRedis = globalThis as unknown as {
    redis: IORedis | undefined;
};

export function getRedisConnection(): IORedis {
    if (globalForRedis.redis) return globalForRedis.redis;

    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });

    if (process.env.NODE_ENV !== 'production') {
        globalForRedis.redis = connection;
    }

    return connection;
}
