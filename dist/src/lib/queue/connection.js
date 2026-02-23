"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConnection = getRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
const globalForRedis = globalThis;
function getRedisConnection() {
    if (globalForRedis.redis)
        return globalForRedis.redis;
    const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
    if (process.env.NODE_ENV !== 'production') {
        globalForRedis.redis = connection;
    }
    return connection;
}
