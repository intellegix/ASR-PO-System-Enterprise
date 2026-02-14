/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Custom Playwright fixtures for dual-role authentication.
 * Provides `adminPage` and `userPage` — pages pre-authenticated
 * with the storageState created by auth.setup.ts.
 */
import { test as base, Page } from '@playwright/test';
import path from 'path';

const ADMIN_STATE = path.join(__dirname, '.auth', 'admin.json');
const USER_STATE = path.join(__dirname, '.auth', 'user.json');

type Fixtures = {
  adminPage: Page;
  userPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: USER_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
