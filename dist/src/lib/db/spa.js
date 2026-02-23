"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.spaDb = void 0;
const spa_1 = require("../../../node_modules/.prisma/spa");
const globalForPrisma = globalThis;
exports.spaDb = (_a = globalForPrisma.spaPrisma) !== null && _a !== void 0 ? _a : new spa_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.spaPrisma = exports.spaDb;
}
