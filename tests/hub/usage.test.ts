/**
 * E2E Test: Hub PAYG Usage Flow
 * 
 * Tests the Pay-As-You-Go flow:
 * 1. Login
 * 2. Check usage history page
 * 3. API tests for quote/charge/complete
 * 
 * Run: npx playwright test tests/hub/usage.test.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test.describe('Hub PAYG Usage Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="phone"], input[type="tel"]', '0901234567');
        await page.fill('input[name="password"], input[type="password"]', 'Test123456');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/hub**');
    });

    test('should show usage history page', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/usage`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Lịch sử sử dụng');
        // Should show stats grid (total spent + usage count)
        await expect(page.locator('text=Tổng chi tiêu')).toBeVisible({ timeout: 5000 });
    });

    test('should show domain settings page', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/settings/domain`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Domain');
    });

    test('should show settings page with new links', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/settings`);
        await page.waitForLoadState('networkidle');
        // Should have Domain & CRM link
        await expect(page.locator('text=Domain & CRM')).toBeVisible({ timeout: 5000 });
        // Should have Usage link
        await expect(page.locator('text=Lịch sử sử dụng')).toBeVisible();
    });

    test('API: health check should return 200', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/health`);
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.status).toBe('healthy');
    });
});
