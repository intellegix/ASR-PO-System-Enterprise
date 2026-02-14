/**
 * MUI v7 Interaction Helpers for Playwright
 *
 * MUI components (Select, Autocomplete, DatePicker) use portal-based popups
 * that don't respond to page.fill(). Instead, they need click-then-option patterns.
 *
 * These helpers abstract those patterns to keep tests readable.
 */
import { Page, Locator } from '@playwright/test';

/**
 * Select an option from an MUI Select component.
 * Clicks the select to open the dropdown, then clicks the matching option.
 */
export async function selectMuiOption(page: Page, selectTestId: string, optionText: string) {
  // Click the Select trigger to open the dropdown
  await page.getByTestId(selectTestId).click();

  // MUI renders options in a portal (role=listbox > role=option)
  const option = page.getByRole('option', { name: optionText });
  await option.click();
}

/**
 * Select an option from an MUI Autocomplete component.
 * Types into the input to filter, then clicks the matching option.
 */
export async function selectMuiAutocomplete(
  page: Page,
  inputTestId: string,
  searchText: string,
  optionText?: string
) {
  const input = page.getByTestId(inputTestId).locator('input');
  await input.click();
  await input.fill(searchText);

  // Wait for autocomplete options to appear
  await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

  // Click the option (optionText defaults to searchText)
  const option = page.getByRole('option', { name: optionText || searchText });
  await option.click();
}

/**
 * Fill an MUI TextField by test ID.
 * Handles the case where MUI wraps the input inside a container.
 */
export async function fillMuiTextField(page: Page, testId: string, value: string) {
  const container = page.getByTestId(testId);
  const input = container.locator('input, textarea').first();
  await input.click();
  await input.fill(value);
}

/**
 * Click an MUI Button by test ID and wait for navigation or network idle.
 */
export async function clickMuiButton(page: Page, testId: string) {
  await page.getByTestId(testId).click();
}

/**
 * Wait for MUI Snackbar/Alert to appear with specific text.
 */
export async function waitForSnackbar(page: Page, text: string, timeout = 5000) {
  return page.getByText(text).waitFor({ state: 'visible', timeout });
}

/**
 * Get all rows from an MUI DataGrid or Table by test ID.
 */
export async function getTableRows(page: Page, tableTestId: string): Promise<Locator[]> {
  const table = page.getByTestId(tableTestId);
  return table.locator('tbody tr, [role="row"]').all();
}
