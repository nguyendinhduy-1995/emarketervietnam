import { test, expect } from '@playwright/test';

test.describe('Service Packages Flow', () => {
    let spaSlug = '';
    const timestamp = Date.now();

    test.beforeAll(async () => {
        spaSlug = `pkg-spa-${timestamp}`;
        await fetch('http://localhost:3000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spaName: `Package Spa ${timestamp}`,
                email: `pkg_${timestamp}@test.com`,
                password: 'password123',
                name: 'Package Admin'
            })
        });
    });

    test('should manage package templates', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', `pkg_${timestamp}@test.com`);
        await page.fill('input[type="password"]', 'password123');

        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
            page.click('button[type="submit"]')
        ]);

        // Navigate to Packages
        await page.goto(`/crm/${spaSlug}/packages`);
        await expect(page.locator('h1', { hasText: 'Thẻ Liệu Trình (Combo)' })).toBeVisible({ timeout: 10000 });

        // Create Package
        await page.click('button:has-text("+ Tạo gói mới")');
        await page.fill('input:below(label:has-text("Tên bộ/gói"))', 'Triệt Lông 10 Buổi');
        await page.fill('input:below(label:has-text("Giá bán (VNĐ)"))', '1000000');
        await page.fill('input:below(label:has-text("Số buổi"))', '10');
        await page.click('button:has-text("Lưu thẻ")');

        await expect(page.locator('td', { hasText: 'Triệt Lông 10 Buổi' })).toBeVisible();
    });
});
