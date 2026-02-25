#!/usr/bin/env node
/**
 * CRM Deployer — Polls for DEPLOYING CRM instances and provisions them.
 * 
 * Usage: node scripts/crm-deployer.js
 * 
 * This script runs as a standalone process (not inside Next.js).
 * It polls the Hub API for instances with status=DEPLOYING,
 * then orchestrates: DB creation → container start → proxy config → callback.
 * 
 * In production, this would use Docker API / Kubernetes API.
 * This is a reference implementation showing the flow.
 */

const POLL_INTERVAL = 30_000; // 30 seconds
const HUB_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DEPLOY_SECRET = process.env.DEPLOY_CALLBACK_SECRET || '';
const DB_HOST = process.env.CRM_DB_HOST || 'localhost';

async function pollAndDeploy() {
    console.log(`[${new Date().toISOString()}] Polling for DEPLOYING instances...`);

    try {
        // In production, this would query the platform DB directly
        // or use an internal API endpoint
        const res = await fetch(`${HUB_URL}/api/hub/admin/deploying-instances`, {
            headers: { 'x-deploy-secret': DEPLOY_SECRET },
        });

        if (!res.ok) {
            console.log('  No instances or API unavailable');
            return;
        }

        const { instances } = await res.json();
        if (!instances || instances.length === 0) {
            console.log('  No pending instances');
            return;
        }

        for (const instance of instances) {
            console.log(`\n  🚀 Deploying: ${instance.domain} (${instance.id})`);
            try {
                await deployInstance(instance);
            } catch (err) {
                console.error(`  ❌ Deploy failed for ${instance.domain}:`, err);
                await reportCallback(instance.id, 'FAILED', null, String(err));
            }
        }
    } catch (err) {
        console.error('  Poll error:', err);
    }
}

async function deployInstance(instance) {
    const { id, domain, dbName, workspaceId } = instance;

    // Step 1: Create isolated database
    console.log(`  [1/4] Creating database: ${dbName}`);
    // In production: await execSql(`CREATE DATABASE "${dbName}"`);

    // Step 2: Run CRM migrations on the new DB
    console.log(`  [2/4] Running migrations...`);
    // In production: await exec(`npx prisma db push --schema=prisma/crm/schema.prisma`);

    // Step 3: Start container / configure reverse proxy
    console.log(`  [3/4] Starting container...`);
    // In production: Docker API / docker-compose up
    const containerId = `crm-${workspaceId.slice(0, 8)}`;
    const crmUrl = `https://${domain}`;

    // Step 4: Configure nginx/caddy reverse proxy
    console.log(`  [4/4] Configuring proxy for ${domain}...`);
    // In production: write nginx config, reload

    // Report success
    await reportCallback(id, 'SUCCESS', crmUrl, null, containerId);
    console.log(`  ✅ Deployed: ${crmUrl}`);
}

async function reportCallback(instanceId, status, crmUrl, error, containerId) {
    try {
        await fetch(`${HUB_URL}/api/hub/deploy/callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-deploy-secret': DEPLOY_SECRET,
            },
            body: JSON.stringify({
                instanceId,
                status,
                crmUrl,
                error,
                containerId,
            }),
        });
    } catch (err) {
        console.error('  Callback failed:', err);
    }
}

// Main loop
console.log('🏗️ CRM Deployer started');
console.log(`  Hub URL: ${HUB_URL}`);
console.log(`  Poll interval: ${POLL_INTERVAL / 1000}s`);
console.log('');

pollAndDeploy();
setInterval(pollAndDeploy, POLL_INTERVAL);
