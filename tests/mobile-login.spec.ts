import { test, expect } from '@playwright/test';

// Test the mobile WeChat login flow - uses mobile-chrome project from playwright.config.ts
test.describe('Mobile WeChat Login', () => {

  test('should show login dialog when clicking login from mobile menu', async ({ page }) => {
    // Set base URL - use environment variable or default to localhost
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    // Go to the landing page
    await page.goto(baseURL);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Find and click the mobile menu button (hamburger icon)
    // It's a button with class "md:hidden" (hidden on desktop, visible on mobile)
    const menuButton = page.locator('header button.md\\:hidden');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    
    // Wait for menu to open
    await page.waitForTimeout(300);
    
    // Find the login button in the mobile menu (注册/登录)
    const loginButton = page.locator('button:has-text("注册/登录")');
    await expect(loginButton).toBeVisible();
    
    // Click the login button
    await loginButton.click();
    
    // Wait for the dialog to appear and menu to close
    await page.waitForTimeout(500);
    
    // Verify that the login dialog is visible - this proves the fix works
    const loginDialog = page.locator('[role="dialog"]');
    await expect(loginDialog).toBeVisible({ timeout: 5000 });
    
    // Verify the dialog title contains login text
    const dialogTitle = loginDialog.locator('h2');
    await expect(dialogTitle).toContainText('微信扫码登录');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'tests/screenshots/mobile-login-after.png', fullPage: true });
  });

  test('dialog should have higher z-index than header', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Open mobile menu and click login
    const menuButton = page.locator('header button.md\\:hidden');
    await menuButton.click();
    await page.waitForTimeout(300);
    
    const loginButton = page.locator('button:has-text("注册/登录")');
    await loginButton.click();
    await page.waitForTimeout(500);
    
    // Get the z-index of the header and dialog content
    const header = page.locator('header').first();
    const dialogContent = page.locator('[role="dialog"]');
    
    const headerZIndex = await header.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    
    const dialogZIndex = await dialogContent.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    
    console.log(`Header z-index: ${headerZIndex}, Dialog z-index: ${dialogZIndex}`);
    
    // Dialog z-index should be at least 1100 (header is 1000)
    expect(parseInt(dialogZIndex)).toBeGreaterThanOrEqual(1100);
  });

  test('mobile menu should close when opening login dialog', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Open login dialog
    const menuButton = page.locator('header button.md\\:hidden');
    await menuButton.click();
    await page.waitForTimeout(300);
    
    // Verify menu is visible
    const mobileMenu = page.locator('text=注册/登录');
    await expect(mobileMenu).toBeVisible();
    
    const loginButton = page.locator('button:has-text("注册/登录")');
    await loginButton.click();
    await page.waitForTimeout(500);
    
    // Verify dialog is visible
    const loginDialog = page.locator('[role="dialog"]');
    await expect(loginDialog).toBeVisible({ timeout: 5000 });
    
    // Mobile menu should be gone (proves we're properly closing it)
    // The menu items are rendered conditionally, so they won't be in DOM when closed
    const menuAfterLogin = page.locator('text=简历制作').first();
    await expect(menuAfterLogin).not.toBeVisible();
  });
});
