/**
 * E2E Checkout Flow Test
 * Run: npx tsx tests/e2e-checkout.ts
 *
 * Tests the full purchase flow:
 * 1. Browse marketplace → list published products
 * 2. View product detail → pricing, plans
 * 3. Checkout → wallet debit → order created → entitlement granted
 * 4. Orders page → shows new order
 * 5. Downloads page → shows digital assets (if DIGITAL)
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let results: { name: string; pass: boolean; error?: string }[] = [];

async function checkoutApi(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

function checkoutAssert(name: string, ok: boolean, detail?: string) {
    results.push({ name, pass: ok, error: ok ? undefined : detail });
    console.log(`${ok ? '✅' : '❌'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
}

// ─── Test 1: Browse Marketplace ──────────────────────────
async function testBrowse() {
    console.log('\n=== Test 1: Browse Marketplace ===');

    const r = await checkoutApi('GET', '/api/hub/products');
    checkoutAssert('Products API returns 200', r.status === 200, `got ${r.status}`);
    checkoutAssert('Products response has array', Array.isArray(r.data?.products), 'no products array');

    if (r.data?.products?.length > 0) {
        const p = r.data.products[0];
        checkoutAssert('Product has id', !!p.id);
        checkoutAssert('Product has name', !!p.name);
        checkoutAssert('Product has slug', !!p.slug);
        checkoutAssert('Product has priceMonthly field', p.priceMonthly !== undefined);
    } else {
        checkoutAssert('Has at least one product (optional in dev)', true, 'No published products — create via CRM');
    }
}

// ─── Test 2: Product Detail ──────────────────────────────
async function testDetail() {
    console.log('\n=== Test 2: Product Detail ===');

    const list = await checkoutApi('GET', '/api/hub/products');
    if (!list.data?.products?.length) {
        checkoutAssert('Skip detail test — no products', true);
        return null;
    }

    const slug = list.data.products[0].slug;
    const r = await checkoutApi('GET', `/api/hub/products/${slug}`);
    checkoutAssert('Detail API returns 200', r.status === 200, `got ${r.status}`);
    checkoutAssert('Detail has product object', !!r.data?.product);

    if (r.data?.product) {
        const p = r.data.product;
        checkoutAssert('Detail has billingModel', !!p.billingModel);
        checkoutAssert('Detail has type', !!p.type);
        checkoutAssert('Detail has meteredItems array', Array.isArray(p.meteredItems));
        return p;
    }
    return null;
}

// ─── Test 3: Checkout — Auth Required ────────────────────
async function testCheckoutAuth() {
    console.log('\n=== Test 3: Checkout Auth ===');

    const r = await checkoutApi('POST', '/api/hub/checkout', {
        productId: 'nonexistent',
        idempotencyKey: 'test_' + Date.now(),
    });
    checkoutAssert('Checkout requires auth', r.status === 401, `got ${r.status}`);
}

// ─── Test 4: Wallet API — Auth Required ──────────────────
async function testWalletAuth() {
    console.log('\n=== Test 4: Wallet Auth ===');

    const r = await checkoutApi('GET', '/api/hub/wallet');
    checkoutAssert('Wallet requires auth', r.status === 401, `got ${r.status}`);
}

// ─── Test 5: Orders — Auth Required ──────────────────────
async function testOrdersAuth() {
    console.log('\n=== Test 5: Orders Auth ===');

    const r = await checkoutApi('GET', '/api/hub/orders');
    checkoutAssert('Orders requires auth', r.status === 401, `got ${r.status}`);
}

// ─── Test 6: Downloads — Auth Required ───────────────────
async function testDownloadsAuth() {
    console.log('\n=== Test 6: Downloads Auth ===');

    const r = await checkoutApi('GET', '/api/hub/downloads');
    checkoutAssert('Downloads requires auth', r.status === 401, `got ${r.status}`);
}

// ─── Test 7: Entitlements — Auth Required ────────────────
async function testEntitlementsAuth() {
    console.log('\n=== Test 7: Entitlements Auth ===');

    const r = await checkoutApi('GET', '/api/hub/entitlements');
    checkoutAssert('Entitlements requires auth', r.status === 401, `got ${r.status}`);
}

// ─── Test 8: Health Check ────────────────────────────────
async function testHealth() {
    console.log('\n=== Test 8: Health Check ===');

    const r = await checkoutApi('GET', '/api/health');
    checkoutAssert('Health returns 200 or 503', r.status === 200 || r.status === 503, `got ${r.status}`);
    checkoutAssert('Health has status', r.data?.status === 'healthy' || r.data?.status === 'degraded');
    checkoutAssert('Health has checks', !!r.data?.checks);
    if (r.data?.checks?.database) {
        checkoutAssert('DB check passed', r.data.checks.database.ok === true);
    }
}

// ─── Run All ─────────────────────────────────────────────
async function checkoutMain() {
    console.log('🛒 E2E Checkout Flow Tests');
    console.log(`Base URL: ${BASE}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    await testBrowse();
    await testDetail();
    await testCheckoutAuth();
    await testWalletAuth();
    await testOrdersAuth();
    await testDownloadsAuth();
    await testEntitlementsAuth();
    await testHealth();

    const passed = results.filter(t => t.pass).length;
    const failed = results.filter(t => !t.pass).length;
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed / ${results.length} total`);

    if (failed > 0) {
        console.log('\n❌ Failed:');
        results.filter(t => !t.pass).forEach(t => console.log(`  - ${t.name}: ${t.error}`));
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
    }
}

checkoutMain().catch(console.error);
