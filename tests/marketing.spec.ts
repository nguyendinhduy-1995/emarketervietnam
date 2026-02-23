import { test, expect } from '@playwright/test';

test.describe('Marketing & POS Flow', () => {
    let spaSlug = '';
    const timestamp = Date.now();

    test.beforeAll(async () => {
        spaSlug = `mkt-spa-${timestamp}`;
        await fetch('http://localhost:3000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spaName: `Marketing Spa ${timestamp}`,
                email: `mkt_${timestamp}@test.com`,
                password: 'password123',
                name: 'Marketing Admin'
            })
        });
    });

    test('should create voucher and apply in POS', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', `mkt_${timestamp}@test.com`);
        await page.fill('input[type="password"]', 'password123');

        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
            page.click('button[type="submit"]')
        ]);

        // Navigate to Marketing bypass subdomain redirect
        await page.goto(`/crm/${spaSlug}/marketing`);
        await expect(page.locator('h1', { hasText: 'Marketing & Khuyến Mãi' })).toBeVisible({ timeout: 10000 });

        // Create Voucher
        await page.click('button:has-text("+ Tạo mã khuyến mãi")');
        await page.fill('input[placeholder="VD: TET2024"]', 'TET2025');
        await page.selectOption('select', { label: 'Phần trăm (%)' });
        await page.fill('input:below(label:has-text("Giá trị giảm"))', '10'); // 10%
        await page.click('button:has-text("Lưu mã")');

        await expect(page.locator('td', { hasText: 'TET2025' })).toBeVisible();

        // Navigate to POS
        await page.goto(`/crm/${spaSlug}/receipts`);
        await expect(page.locator('h1', { hasText: 'Phiếu thu' })).toBeVisible();

        await page.click('button:has-text("+ Tạo phiếu thu")');
        await expect(page.locator('input[placeholder="VD: TET2024"]')).toBeVisible();
        await expect(page.locator('button:has-text("Áp dụng")')).toBeVisible();
    });
});
