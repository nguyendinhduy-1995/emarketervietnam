import { test, expect } from '@playwright/test';

test.describe('Online Booking Flow', () => {

    test('should block booking if entitlement is missing', async ({ page }) => {
        // Assuming 'demo-spa' from seed DOES NOT have ONLINE_BOOKING active initially
        // We expect a 403 error page or a message specifically blocking access.
        await page.goto('/book/demo-spa');

        // Wait for network/UI
        await expect(page.locator('text=Không thể đặt lịch')).toBeVisible();
    });

});
