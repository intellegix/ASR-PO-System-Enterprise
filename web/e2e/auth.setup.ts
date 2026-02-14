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
  await page.getByTestId('login-identifier').locator('input').fill('intellegix');
  await page.getByTestId('login-password').locator('input').fill('Devops$@2026');
  await page.getByTestId('login-submit').click();

  // Wait for navigation away from login — app may redirect to / or /dashboard
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  // Verify we see the dashboard content (sidebar nav)
  await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});

// Regular user credentials
setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-identifier').locator('input').fill('cole.kinsley');
  await page.getByTestId('login-password').locator('input').fill('demo123');
  await page.getByTestId('login-submit').click();

  // Wait for navigation away from login — app may redirect to / or /dashboard
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  // Verify we see the dashboard content (sidebar nav)
  await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: USER_STATE });
});
