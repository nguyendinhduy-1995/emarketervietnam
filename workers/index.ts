import { createProvisioningWorker } from '../src/lib/queue/provisioning';
import { createDunningWorker, scheduleDunningScan } from '../src/lib/queue/dunning';
import { createAppointmentWorker, scheduleAppointmentScan } from '../src/lib/queue/appointment';

async function main() {
    console.log('🚀 Starting workers...');

    // Create workers
    const provWorker = createProvisioningWorker();
    const dunWorker = createDunningWorker();
    const apptWorker = createAppointmentWorker();

    // Schedule recurring jobs
    await scheduleDunningScan();
    await scheduleAppointmentScan();

    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down workers...');
        await provWorker.close();
        await dunWorker.close();
        await apptWorker.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    console.log('✅ Workers running:');
    console.log('  - Provisioning worker');
    console.log('  - Dunning worker (daily @ 8:00 AM)');
    console.log('  - Appointment worker (hourly)');
}

main().catch(console.error);
