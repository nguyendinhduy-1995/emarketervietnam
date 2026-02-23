import { createProvisioningWorker } from '../src/lib/queue/provisioning';
import { createDunningWorker, scheduleDunningScan } from '../src/lib/queue/dunning';

async function main() {
    console.log('🚀 Starting workers...');

    // Create workers
    const provWorker = createProvisioningWorker();
    const dunWorker = createDunningWorker();

    // Schedule recurring jobs
    await scheduleDunningScan();

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
