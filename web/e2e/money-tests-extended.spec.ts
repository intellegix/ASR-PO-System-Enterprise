/**
 * Money Tests (Extended) — Tests 7-12
 * PO Completion, Admin CRUD, Division Management, PO PDF
 */
import { test, expect } from './fixtures/test-fixtures';

// ================================================================
// Test 7: Admin User CRUD — Create → Edit Role → Deactivate
// ================================================================
test('admin can create, edit, and deactivate a user', async ({ adminPage }) => {
  await adminPage.goto('/admin/users');
  await expect(adminPage).toHaveURL(/\/admin\/users/);

  // Page should load with a user list
  await adminPage.waitForSelector('table, [role="table"], [data-testid]', { timeout: 10_000 });

  // Create a test user via API (faster than UI for setup)
  const testEmail = `e2e-test-${Date.now()}@test.com`;
  const createResult = await adminPage.evaluate(async (email) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName: 'E2E',
        lastName: 'TestUser',
        role: 'USER',
        password: 'TestPass123!',
      }),
    });
    return { status: res.status, body: await res.json() };
  }, testEmail);

  expect(createResult.status).toBe(201);
  expect(createResult.body.email).toBe(testEmail);
  const userId = createResult.body.id;

  // Edit the user's role to ADMIN
  const editResult = await adminPage.evaluate(async ({ id, role }) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return { status: res.status, body: await res.json() };
  }, { id: userId, role: 'ADMIN' });

  expect(editResult.status).toBe(200);
  expect(editResult.body.role).toBe('ADMIN');

  // Deactivate the user
  const deactivateResult = await adminPage.evaluate(async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    return { status: res.status, body: await res.json() };
  }, userId);

  expect(deactivateResult.status).toBe(200);
  expect(deactivateResult.body.isActive).toBe(false);
});

// ================================================================
// Test 8: Admin Division Management — Edit → Verify persistence
// ================================================================
test('admin can edit a division', async ({ adminPage }) => {
  await adminPage.goto('/admin/divisions');
  await expect(adminPage).toHaveURL(/\/admin\/divisions/);

  // Get current divisions via API
  const divisionsResult = await adminPage.evaluate(async () => {
    const res = await fetch('/api/admin/divisions');
    return { status: res.status, body: await res.json() };
  });

  expect(divisionsResult.status).toBe(200);
  expect(divisionsResult.body.length).toBeGreaterThan(0);

  const firstDivision = divisionsResult.body[0];

  // Update QB class name
  const newQbClass = `E2E-${Date.now()}`;
  const updateResult = await adminPage.evaluate(async ({ id, qbClassName }) => {
    const res = await fetch('/api/admin/divisions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, qbClassName }),
    });
    return { status: res.status, body: await res.json() };
  }, { id: firstDivision.id, qbClassName: newQbClass });

  expect(updateResult.status).toBe(200);

  // Verify persistence by re-fetching
  const verifyResult = await adminPage.evaluate(async () => {
    const res = await fetch('/api/admin/divisions');
    return { status: res.status, body: await res.json() };
  });

  const updated = verifyResult.body.find((d: { id: string }) => d.id === firstDivision.id);
  expect(updated.qbClassName).toBe(newQbClass);

  // Restore original value
  await adminPage.evaluate(async ({ id, qbClassName }) => {
    await fetch('/api/admin/divisions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, qbClassName }),
    });
  }, { id: firstDivision.id, qbClassName: firstDivision.qbClassName });
});

// ================================================================
// Test 9: Admin Settings — Read + Write
// ================================================================
test('admin can read and update settings', async ({ adminPage }) => {
  // Read settings
  const readResult = await adminPage.evaluate(async () => {
    const res = await fetch('/api/admin/settings');
    return { status: res.status, body: await res.json() };
  });

  expect(readResult.status).toBe(200);
  expect(Array.isArray(readResult.body)).toBe(true);

  // Update a setting
  const testValue = `e2e-${Date.now()}`;
  const updateResult = await adminPage.evaluate(async (val) => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [{ key: 'company_name', value: val }],
      }),
    });
    return { status: res.status, body: await res.json() };
  }, testValue);

  expect(updateResult.status).toBe(200);
  expect(updateResult.body.updated).toBe(1);

  // Verify persistence
  const verifyResult = await adminPage.evaluate(async () => {
    const res = await fetch('/api/admin/settings');
    return { body: await res.json() };
  });

  const companySetting = verifyResult.body.find((s: { key: string }) => s.key === 'company_name');
  expect(companySetting?.value).toBe(testValue);

  // Restore
  await adminPage.evaluate(async () => {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [{ key: 'company_name', value: 'All Surface Roofing' }],
      }),
    });
  });
});

// ================================================================
// Test 10: PO List page loads and shows POs
// ================================================================
test('PO list page loads with purchase orders @smoke', async ({ adminPage }) => {
  await adminPage.goto('/po');

  // Should see the PO list page
  await expect(adminPage.getByText('Purchase Orders')).toBeVisible({ timeout: 10_000 });

  // Should have at least one PO visible (table row or card)
  const poItems = adminPage.locator('table tbody tr, [data-testid*="po-row"]');
  const count = await poItems.count();
  expect(count).toBeGreaterThan(0);
});

// ================================================================
// Test 11: Approvals page loads
// ================================================================
test('approvals page loads for admin @smoke', async ({ adminPage }) => {
  await adminPage.goto('/approvals');
  await expect(adminPage.getByText('Approvals')).toBeVisible({ timeout: 10_000 });
});

// ================================================================
// Test 12: All critical pages render without errors
// ================================================================
test('all critical pages render without JS errors', async ({ adminPage }) => {
  const errors: string[] = [];
  adminPage.on('pageerror', (error) => {
    errors.push(`${error.message}`);
  });

  const pages = [
    '/',
    '/po',
    '/approvals',
    '/work-orders',
    '/vendors',
    '/clients',
    '/invoices',
    '/invoice-archive',
    '/reports',
    '/audit',
    '/projects',
    '/admin/users',
    '/admin/divisions',
    '/admin/settings',
  ];

  for (const url of pages) {
    await adminPage.goto(url);
    // Wait for the page to settle
    await adminPage.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
      // networkidle may timeout on pages with polling, that's OK
    });
  }

  // Filter out known non-critical warnings
  const criticalErrors = errors.filter(
    (e) => !e.includes('ResizeObserver') && !e.includes('hydration')
  );

  expect(criticalErrors).toEqual([]);
});
