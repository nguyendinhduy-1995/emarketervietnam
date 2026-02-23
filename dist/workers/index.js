"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provisioning_1 = require("../src/lib/queue/provisioning");
const dunning_1 = require("../src/lib/queue/dunning");
async function main() {
    console.log('🚀 Starting workers...');
    // Create workers
    const provWorker = (0, provisioning_1.createProvisioningWorker)();
    const dunWorker = (0, dunning_1.createDunningWorker)();
    // Schedule recurring jobs
    await (0, dunning_1.scheduleDunningScan)();
    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down workers...');
        await provWorker.close();
        await dunWorker.close();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    console.log('✅ Workers running:');
    console.log('  - Provisioning worker');
    console.log('  - Dunning worker (daily @ 8:00 AM)');
}
main().catch(console.error);
