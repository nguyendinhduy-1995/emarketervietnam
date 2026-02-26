/**
 * deployer-server.js — Lightweight HTTP server for CRM auto-deployment
 * 
 * Runs on VPS via PM2, listens on localhost:9876.
 * NOT exposed to the internet — only Hub (localhost:3000) can reach it.
 * 
 * Endpoints:
 *   POST /deploy   — Trigger CRM instance deployment
 *   GET  /health    — Health check
 *   GET  /status    — List running deployments
 * 
 * Start: pm2 start scripts/deployer-server.js --name emk-deployer
 * Logs:  pm2 logs emk-deployer
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.DEPLOYER_PORT || 9876;
const DEPLOY_SECRET = process.env.DEPLOY_CALLBACK_SECRET || 'deploy-secret-key';
const SCRIPT_PATH = path.join(__dirname, 'deploy-crm.sh');
const LOG_FILE = '/var/log/emk-deployer.log';
const HUB_CALLBACK_URL = process.env.HUB_CALLBACK_URL || 'http://localhost:3000/api/hub/deploy/callback';

// ── Simple queue for serial deployment ──
const deployQueue = [];
let isDeploying = false;
const deployHistory = []; // last 20 deploys

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}

function processQueue() {
    if (isDeploying || deployQueue.length === 0) return;
    isDeploying = true;

    const job = deployQueue.shift();
    const { domain, instanceId, dbName, workspaceId, adminEmail, resolve } = job;

    log(`DEPLOY START: ${domain} (instance: ${instanceId})`);

    const startTime = Date.now();
    const child = spawn('bash', [
        SCRIPT_PATH,
        domain,
        instanceId,
        dbName,
        workspaceId,
        adminEmail || `admin@${domain}`,
        HUB_CALLBACK_URL,
    ], {
        env: {
            ...process.env,
            DEPLOY_CALLBACK_SECRET: DEPLOY_SECRET,
        },
        cwd: __dirname,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        log(`[${domain}] ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        log(`[${domain}] ERR: ${text.trim()}`);
    });

    child.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const success = code === 0;
        const result = {
            domain,
            instanceId,
            success,
            code,
            duration: `${duration}s`,
            timestamp: new Date().toISOString(),
        };

        deployHistory.unshift(result);
        if (deployHistory.length > 20) deployHistory.pop();

        if (success) {
            log(`DEPLOY COMPLETE: ${domain} in ${duration}s`);
        } else {
            log(`DEPLOY FAILED: ${domain} (code: ${code}) in ${duration}s`);
            log(`  stderr: ${stderr.slice(-500)}`);
        }

        resolve(result);
        isDeploying = false;
        processQueue(); // next in queue
    });

    child.on('error', (err) => {
        log(`DEPLOY ERROR: ${domain} — ${err.message}`);
        resolve({ domain, instanceId, success: false, error: err.message });
        isDeploying = false;
        processQueue();
    });
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ── CORS & JSON helpers ──
    res.setHeader('Content-Type', 'application/json');
    const json = (data, status = 200) => { res.writeHead(status); res.end(JSON.stringify(data)); };

    // ── Health check ──
    if (req.method === 'GET' && url.pathname === '/health') {
        return json({
            ok: true,
            uptime: process.uptime(),
            queueLength: deployQueue.length,
            isDeploying,
            recentDeploys: deployHistory.length,
        });
    }

    // ── Deploy status ──
    if (req.method === 'GET' && url.pathname === '/status') {
        return json({
            queueLength: deployQueue.length,
            isDeploying,
            history: deployHistory,
        });
    }

    // ── Trigger deploy ──
    if (req.method === 'POST' && url.pathname === '/deploy') {
        // Auth check
        const authHeader = req.headers['authorization'];
        if (authHeader !== `Bearer ${DEPLOY_SECRET}`) {
            return json({ error: 'Unauthorized' }, 401);
        }

        // Parse body
        let body = '';
        for await (const chunk of req) body += chunk;

        let data;
        try {
            data = JSON.parse(body);
        } catch {
            return json({ error: 'Invalid JSON' }, 400);
        }

        const { domain, instanceId, dbName, workspaceId, adminEmail } = data;
        if (!domain || !instanceId || !dbName || !workspaceId) {
            return json({ error: 'domain, instanceId, dbName, workspaceId are required' }, 400);
        }

        // Check for duplicate
        const isDuplicate = deployQueue.some(j => j.instanceId === instanceId) ||
            (isDeploying && deployHistory[0]?.instanceId === instanceId);
        if (isDuplicate) {
            return json({ error: 'Deploy already in queue', instanceId }, 409);
        }

        // Enqueue
        const result = await new Promise((resolve) => {
            deployQueue.push({ domain, instanceId, dbName, workspaceId, adminEmail, resolve });
            log(`QUEUED: ${domain} (queue: ${deployQueue.length})`);
            processQueue();
        });

        return json({ ok: true, ...result });
    }

    // 404
    json({ error: 'Not found' }, 404);
});

server.listen(PORT, '127.0.0.1', () => {
    log(`═══════════════════════════════════════════`);
    log(`eMarketer CRM Deployer listening on 127.0.0.1:${PORT}`);
    log(`Script: ${SCRIPT_PATH}`);
    log(`Log: ${LOG_FILE}`);
    log(`═══════════════════════════════════════════`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('Shutting down deployer...');
    server.close(() => process.exit(0));
});
