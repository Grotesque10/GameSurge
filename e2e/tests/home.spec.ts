import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Assuming your React app sets a title, or just checking for the main GameSurge title
  // Adjust this based on your actual title tag
  await expect(page).toHaveTitle(/GameSurge/i);
});

test('loads the main page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Wait for the app to render. This assumes you have a main div or heading.
  // You might want to adjust this selector based on your actual UI.
  // For example, if you have a header or a specific game list container.
  const appContainer = page.locator('#root');
  await expect(appContainer).toBeVisible();
});
