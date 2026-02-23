import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard Flow', () => {
    let spaSlug = '';
    const timestamp = Date.now();

    test.beforeAll(async () => {
        spaSlug = `anl-spa-${timestamp}`;
        await fetch('http://localhost:3000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spaName: `Analytics Spa ${timestamp}`,
                email: `anl_${timestamp}@test.com`,
                password: 'password123',
                name: 'Analytics Admin'
            })
        });
    });

    test('should render Analytics Dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', `anl_${timestamp}@test.com`);
        await page.fill('input[type="password"]', 'password123');

        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
            page.click('button[type="submit"]')
        ]);

        // Navigate to Analytics
        await page.goto(`/crm/${spaSlug}/analytics`);
        await expect(page.locator('h1', { hasText: 'Báo Cáo Kinh Doanh' })).toBeVisible({ timeout: 10000 });

        // Verify KPI Cards load properly
        await expect(page.locator('text=Doanh thu thực nhận')).toBeVisible();
        await expect(page.locator('text=Doanh thu dự kiến')).toBeVisible();
        await expect(page.locator('text=Tổng Khách hàng')).toBeVisible();
        await expect(page.locator('text=Lịch hẹn hôm nay')).toBeVisible();

        // Check recent transactions table
        await expect(page.locator('h3', { hasText: '5 Giao dịch (Phiếu Thu) Gần Nhất' })).toBeVisible();
    });
});
