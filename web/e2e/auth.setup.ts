/**
 * Auth Setup — runs before all E2E tests.
 * Creates storageState files for admin and user roles so tests
 * can skip the login flow and start authenticated.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const ADMIN_STATE = path.join(__dirname, 'fixtures', '.auth', 'admin.json');
const USER_STATE = path.join(__dirname, 'fixtures', '.auth', 'user.json');

// Admin credentials (intellegix shorthand)
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill('intellegix');
  await page.getByTestId('login-password').fill('Intellegix2024!');
  await page.getByTestId('login-submit').click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});

// Regular user credentials (demo account)
setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill('owner1@allsurfaceroofing.com');
  await page.getByTestId('login-password').fill('demo123');
  await page.getByTestId('login-submit').click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.context().storageState({ path: USER_STATE });
});
