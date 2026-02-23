"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformDb = void 0;
const platform_1 = require("../../../node_modules/.prisma/platform");
const globalForPrisma = globalThis;
exports.platformDb = (_a = globalForPrisma.platformPrisma) !== null && _a !== void 0 ? _a : new platform_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.platformPrisma = exports.platformDb;
}
