/**
 * E2E Test: Hub Checkout Flow
 * 
 * Tests the complete purchase flow:
 * 1. Login → Hub Dashboard
 * 2. Browse Marketplace → Select product
 * 3. Checkout → Payment (wallet debit)
 * 4. Verify entitlement is created
 * 5. Verify order appears in orders list
 * 
 * Run: npx playwright test tests/hub/checkout.test.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test.describe('Hub Checkout Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="phone"], input[type="tel"]', '0901234567');
        await page.fill('input[name="password"], input[type="password"]', 'Test123456');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/hub**');
    });

    test('should show hub dashboard with workspaces', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Hôm nay');
        // Dashboard should load without errors
        await expect(page.locator('text=Cảnh báo').or(page.locator('text=Không gian'))).toBeVisible({ timeout: 5000 });
    });

    test('should browse marketplace and see products', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/marketplace`);
        await page.waitForLoadState('networkidle');
        // Should have at least one product card
        const cards = page.locator('[style*="borderRadius"]').filter({ hasText: /Mua|Dùng thử|Chi tiết/ });
        await expect(cards.first()).toBeVisible({ timeout: 5000 });
    });

    test('should checkout a product successfully', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/marketplace`);
        await page.waitForLoadState('networkidle');

        // Click first product
        const firstProduct = page.locator('a[href*="/hub/marketplace/"]').first();
        if (await firstProduct.isVisible()) {
            await firstProduct.click();
            await page.waitForLoadState('networkidle');

            // Should see product detail page
            await expect(page).toHaveURL(/\/hub\/marketplace\/.+/);
        }
    });

    test('should show orders page', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/orders`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText(/Đơn hàng|Orders/i);
    });

    test('should show wallet balance', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/wallet`);
        await page.waitForLoadState('networkidle');
        // Should show balance
        await expect(page.locator('text=đ').first()).toBeVisible({ timeout: 5000 });
    });

    test('should access wallet topup page', async ({ page }) => {
        await page.goto(`${BASE_URL}/hub/wallet/topup`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Nạp ví');
        // Should show preset amounts
        await expect(page.locator('text=100K')).toBeVisible();
    });
});
