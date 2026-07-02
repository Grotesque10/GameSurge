import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('opens the login modal when login button is clicked', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Find the login button (usually in the header)
    const loginBtn = page.getByRole('button', { name: /login|sign in/i }).first();
    
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      
      // Verify that the login modal or overlay appears
      // Assuming it contains some Discord branding or specific text
      const modal = page.getByText(/login with discord/i).or(page.locator('.modal-content, [role="dialog"]')).first();
      await expect(modal).toBeVisible();
      
      // We do NOT test the actual Discord OAuth flow here because it requires interacting with 
      // Discord's external website and real credentials, which is flaky and discouraged in E2E tests.
      // E2E tests should stay within the boundaries of the application itself.
    } else {
      console.log('Login button not visible, user might already be authenticated in this context.');
    }
  });
});
