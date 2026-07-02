import { test, expect } from '@playwright/test';

test.describe('API Mocking & Edge Cases', () => {
  test('gracefully handles 500 Internal Server Error', async ({ page }) => {
    // Intercept the API call and return a 500 error
    await page.route('**/get-market-status*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Look for the specific error message rendered in Storefront.jsx
    const errorMessage = page.locator('text=Unable to load market data. Make sure the backend server is running.');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // The retry button should also be visible
    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });

  test('gracefully handles empty database state', async ({ page }) => {
    // Intercept the API call and return 0 games
    await page.route('**/get-market-status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          data: [], 
          pagination: { page: 1, limit: 30, total: 0, total_pages: 0 } 
        })
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Ensure the app doesn't crash
    await expect(page.locator('#root')).toBeVisible();

    // Verify the "Browse All" header is present but no game cards are rendered in the grid
    await expect(page.locator('text=Browse All')).toBeVisible();
    
    // We expect 0 game cards to be present
    const gameCards = page.locator('a[href^="/game/"]');
    await expect(gameCards).toHaveCount(0);
  });
});
