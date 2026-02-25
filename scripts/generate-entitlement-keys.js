#!/usr/bin/env node
/**
 * Ed25519 Key Generator for eMarketer Entitlement Signing
 * 
 * Usage:
 *   node scripts/generate-entitlement-keys.js
 * 
 * Output:
 *   ENTITLEMENT_PRIVATE_KEY=<base64>  → Hub .env only
 *   ENTITLEMENT_PUBLIC_KEY=<base64>   → Hub + all CRM instances
 */
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const pubB64 = Buffer.from(publicKey).toString('base64');
const privB64 = Buffer.from(privateKey).toString('base64');

console.log('═══════════════════════════════════════════');
console.log('  eMarketer Entitlement Signing Keys');
console.log('  Algorithm: Ed25519 (EdDSA)');
console.log('═══════════════════════════════════════════');
console.log();
console.log('# Hub .env ONLY (KEEP SECRET):');
console.log(`ENTITLEMENT_PRIVATE_KEY=${privB64}`);
console.log();
console.log('# Hub + ALL CRM instances:');
console.log(`ENTITLEMENT_PUBLIC_KEY=${pubB64}`);
console.log();
console.log('═══════════════════════════════════════════');
console.log('⚠️  PRIVATE KEY must NEVER be shared with instances.');
console.log('✅  PUBLIC KEY is safe to distribute to all CRM instances.');
console.log('═══════════════════════════════════════════');

// Quick self-test
const testData = Buffer.from('test-payload-123');
const sig = crypto.sign(null, testData, privateKey);
const ok = crypto.verify(null, testData, publicKey, sig);
console.log(`\nSelf-test: ${ok ? '✅ PASSED' : '❌ FAILED'}`);
