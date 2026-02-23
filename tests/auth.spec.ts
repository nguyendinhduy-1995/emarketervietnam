import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    test('should login successfully as admin', async ({ page }) => {
        // Navigate to login page
        await page.goto('/login');

        // Fill credentials (these should match the seed data)
        await page.fill('input[type="email"]', 'admin@emarketervietnam.vn');
        await page.fill('input[type="password"]', 'admin123');

        // Submit
        await page.click('button[type="submit"]');

        // Admin user should be redirected to admin panel
        await expect(page).toHaveURL('/admin');

        // Admin dashboard element should be visible
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible();
    });

    test('should show error on invalid login', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input[type="email"]', 'admin@emarketervietnam.vn');
        await page.fill('input[type="password"]', 'wrongpassword');

        await page.click('button[type="submit"]');

        // Error text should appear
        await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible();

        // URL remains /login
        await expect(page).toHaveURL('/login');
    });

});
