/**
 * Money Tests — Critical business workflow E2E tests.
 * These MUST pass before any production deployment.
 *
 * Tests 1-5: Auth, Role UI, PO Quick Create, Route Protection, Health Endpoint
 * Tests 6-12: PO Completion, Approvals, Admin CRUD (in separate file)
 */
import { test, expect } from './fixtures/test-fixtures';

// ================================================================
// Test 1: Login as ADMIN → dashboard + admin nav visible
// ================================================================
test('admin sees dashboard and admin nav @smoke', async ({ adminPage }) => {
  await adminPage.goto('/');

  // Should be on dashboard (or redirect to it)
  await expect(adminPage).toHaveURL(/\/(dashboard)?$/);

  // Sidebar should show admin section
  const adminNav = adminPage.getByTestId('admin-nav-section');
  await expect(adminNav).toBeVisible();

  // Should have all 4 admin links
  await expect(adminNav.getByText('Projects')).toBeVisible();
  await expect(adminNav.getByText('Users')).toBeVisible();
  await expect(adminNav.getByText('Divisions')).toBeVisible();
  await expect(adminNav.getByText('Settings')).toBeVisible();
});

// ================================================================
// Test 2: Login as USER → dashboard, NO admin nav
// ================================================================
test('user sees dashboard but NO admin nav @smoke', async ({ userPage }) => {
  await userPage.goto('/');

  // Should be on dashboard
  await expect(userPage).toHaveURL(/\/(dashboard)?$/);

  // Admin section should NOT exist
  const adminNav = userPage.getByTestId('admin-nav-section');
  await expect(adminNav).not.toBeVisible();

  // Main nav should still be there
  const mainNav = userPage.getByTestId('nav-main-list');
  await expect(mainNav).toBeVisible();
});

// ================================================================
// Test 3: PO Quick Create wizard (5-step flow)
// ================================================================
test('PO Quick Create wizard generates PO number', async ({ adminPage }) => {
  await adminPage.goto('/po/create');

  // Step 1: Division Picker — click the first division
  const divisionPicker = adminPage.getByTestId('division-picker');
  await expect(divisionPicker).toBeVisible({ timeout: 10_000 });

  // Click the first division button
  const firstDivision = divisionPicker.locator('button').first();
  await firstDivision.click();

  // Step 2: Client Picker — skip it
  const clientSkip = adminPage.getByTestId('client-skip-btn');
  await expect(clientSkip).toBeVisible({ timeout: 5_000 });
  await clientSkip.click();

  // Step 3: Project Picker — click first project
  const projectPicker = adminPage.getByTestId('project-picker');
  await expect(projectPicker).toBeVisible({ timeout: 10_000 });
  const firstProject = projectPicker.locator('button').first();
  await firstProject.click();

  // Step 4: Work Order Picker — click first WO or create new
  const woPicker = adminPage.getByTestId('wo-picker');
  await expect(woPicker).toBeVisible({ timeout: 10_000 });
  const firstWO = woPicker.locator('button').first();
  await firstWO.click();

  // Step 5: Confirmation — PO number should be displayed
  const confirmation = adminPage.getByTestId('po-confirmation');
  await expect(confirmation).toBeVisible({ timeout: 15_000 });

  const poDisplay = adminPage.getByTestId('po-number-display');
  await expect(poDisplay).toBeVisible();

  // PO number text should match the format: 2 chars + 2-3 chars + 4 digits + dash + number
  const poText = await poDisplay.textContent();
  expect(poText).toBeTruthy();
  // The PO number should contain at least a hyphen separator
  expect(poText).toContain('-');
});

// ================================================================
// Test 4: Route protection — USER navigates to /admin/* → redirected
// ================================================================
test('user is redirected from admin routes @smoke', async ({ userPage }) => {
  // Try to access admin users page
  await userPage.goto('/admin/users');

  // Middleware should redirect non-admin to /
  await expect(userPage).not.toHaveURL(/\/admin\//);
  // Should end up at dashboard or root
  await expect(userPage).toHaveURL(/^https?:\/\/[^/]+(\/)?(\?.*)?$/);
});

// ================================================================
// Test 5: Route protection (API) — USER gets 403 from admin endpoints
// ================================================================
test('user gets 403 from admin API endpoints @smoke', async ({ userPage }) => {
  // Call admin API endpoints directly via fetch within the browser context
  const responses = await userPage.evaluate(async () => {
    const endpoints = [
      '/api/admin/users',
      '/api/admin/settings',
      '/api/admin/divisions',
    ];

    const results: { url: string; status: number }[] = [];
    for (const url of endpoints) {
      const res = await fetch(url);
      results.push({ url, status: res.status });
    }
    return results;
  });

  // All admin endpoints should return 401 or 403
  for (const resp of responses) {
    expect(resp.status, `${resp.url} should block non-admin`).toBeGreaterThanOrEqual(401);
    expect(resp.status).toBeLessThanOrEqual(403);
  }
});

// ================================================================
// Test 6: Health endpoint — public minimal vs admin with metrics
// ================================================================
test('health endpoint returns minimal for public, metrics for admin', async ({ adminPage, userPage }) => {
  // Public/user response — minimal
  const publicResp = await userPage.evaluate(async () => {
    const res = await fetch('/api/health');
    return { status: res.status, body: await res.json() };
  });

  expect(publicResp.status).toBe(200);
  expect(publicResp.body.status).toBe('healthy');
  expect(publicResp.body.metrics).toBeUndefined();

  // Admin response — full metrics
  const adminResp = await adminPage.evaluate(async () => {
    const res = await fetch('/api/health');
    return { status: res.status, body: await res.json() };
  });

  expect(adminResp.status).toBe(200);
  expect(adminResp.body.status).toBe('healthy');
  expect(adminResp.body.database).toBeDefined();
  expect(adminResp.body.database.latencyMs).toBeGreaterThanOrEqual(0);
  expect(adminResp.body.metrics).toBeDefined();
  expect(adminResp.body.metrics.users).toBeGreaterThan(0);
});
