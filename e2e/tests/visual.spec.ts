import { test, expect } from '@playwright/test';

test.describe('Visual Screenshots', () => {
  test('take full page and element screenshots', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for the app to finish loading the initial shell
    await expect(page.locator('#root')).toBeVisible();

    // Take a full-page screenshot and save it directly to the test-results folder
    await page.screenshot({ 
      path: 'test-results/screenshots/storefront-full-page.png', 
      fullPage: true 
    });

    // We can also take screenshots of specific components!
    // Let's screenshot the Navigation Bar
    const navBar = page.locator('nav').first();
    await navBar.waitFor({ state: 'visible' });
    
    await navBar.screenshot({ 
      path: 'test-results/screenshots/navigation-bar.png' 
    });

    // And let's screenshot the Hero Banner if it exists
    const heroBanner = page.locator('section').filter({ hasText: 'Featured' }).first();
    if (await heroBanner.isVisible()) {
      await heroBanner.screenshot({ 
        path: 'test-results/screenshots/hero-banner.png' 
      });
    }

    // Attach a random note to verify the test finished
    expect(true).toBe(true);
  });
});
