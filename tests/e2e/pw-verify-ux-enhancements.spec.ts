/**
 * Playwright UX Enhancement Tests — resizable panel, table field type,
 * error boundary event, message event inputs, quick-add node
 * Run: npx playwright test pw-verify-ux-enhancements.spec.ts --headed
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

/* ── Helper: log in and create / open a project ──────── */
async function loginAndOpenEditor(page) {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');

  const dashboardVisible = await page.locator('text=My Projects').isVisible().catch(() => false);
  if (!dashboardVisible) {
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('UX Tester');
      const emailInput = page.locator('input[placeholder="john@example.com"]');
      await emailInput.fill('ux@test.com');
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Get Started")').click();
      await page.waitForTimeout(1500);
    }
  }

  const newBtn = page.locator('button:has-text("New Workflow")').first();
  if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await newBtn.click();
    await page.waitForTimeout(500);
    const projNameInput = page.locator('input[placeholder="e.g. Employee Onboarding"]');
    if (await projNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projNameInput.fill('UX Test Workflow');
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Create Workflow")').click({ force: true });
    }
    await page.waitForTimeout(1500);
  }

  const projectCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /UX|Test|Workflow/ }).first();
  if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await projectCard.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('.wf-canvas-root, [class*="canvas"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

/* ── Helper: drag node from palette to canvas ──────── */
async function dragNodeToCanvas(page, label: string, offsetX = 400, offsetY = 300) {
  const palette = page.locator('aside').first();
  const item = palette.locator(`text=${label}`).first();
  await expect(item).toBeVisible({ timeout: 5000 });

  // Expand category if needed
  const events = palette.locator('button', { hasText: 'Events' });
  if (await events.isVisible().catch(() => false)) {
    const visible = await item.isVisible().catch(() => false);
    if (!visible) { await events.click(); await page.waitForTimeout(300); }
  }

  const canvas = page.locator('.wf-canvas-root');
  const canvasBox = await canvas.boundingBox();
  await item.dragTo(canvas, {
    targetPosition: { x: offsetX, y: offsetY },
  });
  await page.waitForTimeout(500);
}

/* ═══════════════════════════════════════════════════════════════════════ */

test('1. palette contains error boundary event', async ({ page }) => {
  await loginAndOpenEditor(page);
  const palette = page.locator('aside').first();

  // Expand Events
  const eventsBtn = palette.locator('button', { hasText: 'Events' });
  if (await eventsBtn.isVisible().catch(() => false)) {
    const visible = await palette.locator('text=Error Boundary').isVisible().catch(() => false);
    if (!visible) { await eventsBtn.click(); await page.waitForTimeout(300); }
  }

  await expect(palette.locator('text=Error Boundary')).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-01-error-boundary-palette.png', fullPage: true });
});

test('2. drag error boundary event onto canvas', async ({ page }) => {
  await loginAndOpenEditor(page);
  await dragNodeToCanvas(page, 'Error Boundary', 350, 350);
  
  // Verify node appeared on canvas
  const errorNode = page.locator('[data-node-id*="errorBoundaryEvent"]');
  await expect(errorNode).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-02-error-boundary-on-canvas.png', fullPage: true });
});

test('3. resizable properties panel — drag to expand', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Click start event to open panel (default start node id is 'start-1')
  const startNode = page.locator('[data-node-id="start-1"]');
  await startNode.click();
  await page.waitForTimeout(500);

  // The panel should be visible
  const panel = page.locator('aside').last();
  await expect(panel).toBeVisible();
  const initialBox = await panel.boundingBox();
  expect(initialBox).toBeTruthy();

  await page.screenshot({ path: 'pw-screenshots/ux-03a-panel-before-resize.png', fullPage: true });

  // Drag the resize handle (left edge of the panel)
  const resizeHandle = panel.locator('div[title="Drag to resize"]');
  if (await resizeHandle.isVisible().catch(() => false)) {
    const handleBox = await resizeHandle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 100, handleBox.y + handleBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
  }

  const expandedBox = await panel.boundingBox();
  expect(expandedBox).toBeTruthy();
  if (initialBox && expandedBox) {
    expect(expandedBox.width).toBeGreaterThan(initialBox.width);
  }
  await page.screenshot({ path: 'pw-screenshots/ux-03b-panel-after-resize.png', fullPage: true });
});

test('4. message event has input/output tabs', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Drag a message start event
  await dragNodeToCanvas(page, 'Message Start', 300, 250);
  await page.waitForTimeout(400);

  // Click it to open the panel
  const msgNode = page.locator('[data-node-id*="startMessageEvent"]').first();
  await msgNode.click();
  await page.waitForTimeout(500);

  // The panel should show Input and Output tabs
  const panel = page.locator('aside').last();
  await expect(panel.locator('text=Input')).toBeVisible({ timeout: 3000 });
  await expect(panel.locator('text=Output')).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-04-message-event-io-tabs.png', fullPage: true });
});

test('5. table (repeatable) field type available', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Drag a user task
  await dragNodeToCanvas(page, 'User Task', 350, 250);
  await page.waitForTimeout(400);

  // Click to select it
  const taskNode = page.locator('[data-node-id*="userTask"]').first();
  await taskNode.click();
  await page.waitForTimeout(500);

  // Switch to Input tab  
  const panel = page.locator('aside').last();
  const inputTab = panel.locator('button', { hasText: 'Input' });
  await inputTab.click();
  await page.waitForTimeout(300);

  // Add a field
  const addBtn = panel.locator('button:has-text("Add Field")');
  await addBtn.click();
  await page.waitForTimeout(300);

  // Open field type dropdown and check Table option exists
  const typeSelect = panel.locator('select').first();
  await expect(typeSelect).toBeVisible();

  // Verify Table (Repeatable) option exists
  const tableOption = typeSelect.locator('option[value="table"]');
  await expect(tableOption).toBeAttached();
  expect(await tableOption.textContent()).toBe('Table (Repeatable)');

  // Select it
  await typeSelect.selectOption('table');
  await page.waitForTimeout(300);

  // Expand the field to see Table Columns editor
  const expandBtn = panel.locator('button').filter({ has: page.locator('svg') }).nth(1);
  // Look for the chevron button — click it
  const chevrons = panel.locator('.rounded-lg button');
  for (let i = 0; i < await chevrons.count(); i++) {
    const btn = chevrons.nth(i);
    const text = await btn.textContent();
    if (!text?.includes('Add') && !text?.includes('Delete')) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(300);

  await page.screenshot({ path: 'pw-screenshots/ux-05-table-field-type.png', fullPage: true });
});

test('6. quick-add node button appears on hover', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Hover over the start event node (default start node id is 'start-1')
  const startNode = page.locator('[data-node-id="start-1"]');
  await startNode.hover();
  await page.waitForTimeout(300);

  // The "+" button should appear
  const addBtn = startNode.locator('button:has-text("+")');
  await expect(addBtn).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-06-quickadd-button-hover.png', fullPage: true });
});

test('7. quick-add picker opens and creates wired node', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Hover the start node (default start node id is 'start-1')
  const startNode = page.locator('[data-node-id="start-1"]');
  await startNode.hover();
  await page.waitForTimeout(500);

  // Click the "+" button
  const addBtn = startNode.locator('button:has-text("+")');
  await addBtn.click();
  await page.waitForTimeout(400);

  // The picker popup should appear with "Add next node"
  const picker = page.locator('text=Add next node');
  await expect(picker).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-07a-quickadd-picker.png', fullPage: true });

  // Click "User Task" to add it
  const userTaskBtn = page.locator('button:has-text("User Task")').last();
  await userTaskBtn.click();
  await page.waitForTimeout(600);

  // A new userTask node should now exist
  const taskNode = page.locator('[data-node-id*="userTask"]');
  await expect(taskNode).toBeVisible({ timeout: 3000 });

  // And an edge should connect them
  const edges = page.locator('[data-edge-id]');
  expect(await edges.count()).toBeGreaterThanOrEqual(1);
  
  await page.screenshot({ path: 'pw-screenshots/ux-07b-quickadd-node-wired.png', fullPage: true });
});

test('8. right-click context menu on node', async ({ page }) => {
  await loginAndOpenEditor(page);

  const startNode = page.locator('[data-node-id="start-1"]');
  await startNode.click({ button: 'right' });
  await page.waitForTimeout(400);

  // Context menu with Delete should appear
  const deleteOption = page.locator('button:has-text("Delete")').first();
  await expect(deleteOption).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'pw-screenshots/ux-08-context-menu.png', fullPage: true });
});
