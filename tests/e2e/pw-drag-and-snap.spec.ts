/**
 * Playwright tests — drag-without-panel-open UX fix + boundary event snapping
 * Run: npx playwright test pw-drag-and-snap.spec.ts --headed
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

/* ── Helper: log in and open editor ──────────────────── */
async function loginAndOpenEditor(page: Page) {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');

  const dashboardVisible = await page.locator('text=My Projects').isVisible().catch(() => false);
  if (!dashboardVisible) {
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Snap Tester');
      const emailInput = page.locator('input[placeholder="john@example.com"]');
      await emailInput.fill('snap@test.com');
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
      await projNameInput.fill('Snap Test Workflow');
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Create Workflow")').click({ force: true });
    }
    await page.waitForTimeout(1500);
  }

  const projectCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Snap|Test|Workflow/ }).first();
  if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await projectCard.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('.wf-canvas-root, [class*="canvas"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

/* ── Helper: drag node from palette to canvas ──────── */
async function dragNodeToCanvas(page: Page, label: string, offsetX = 400, offsetY = 300) {
  const palette = page.locator('aside').first();

  // Expand Events or Tasks category if item isn't visible
  for (const category of ['Events', 'Tasks', 'Gateways']) {
    const catBtn = palette.locator('button', { hasText: category });
    if (await catBtn.isVisible().catch(() => false)) {
      const visible = await palette.locator(`text=${label}`).first().isVisible().catch(() => false);
      if (!visible) {
        await catBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }

  const item = palette.locator(`text=${label}`).first();
  await expect(item).toBeVisible({ timeout: 5000 });

  const canvas = page.locator('.wf-canvas-root');
  await item.dragTo(canvas, { targetPosition: { x: offsetX, y: offsetY } });
  await page.waitForTimeout(500);
}

/* ═══════════════════════════════════════════════════════════════════════
   TEST 1: Dragging a node does NOT open the properties panel
   ═══════════════════════════════════════════════════════════════════════ */
test('dragging a node on canvas does not open properties panel', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Ensure panel is initially closed by clicking canvas background
  const canvas = page.locator('.wf-canvas-root');
  await canvas.click({ position: { x: 600, y: 600 } });
  await page.waitForTimeout(300);

  const startNode = page.locator('[data-node-id="start-1"]');
  await expect(startNode).toBeVisible({ timeout: 5000 });
  const startBox = await startNode.boundingBox();
  expect(startBox).toBeTruthy();

  // Perform a drag (not a click) — move the start node 80px to the right
  await page.mouse.move(startBox!.x + startBox!.width / 2, startBox!.y + startBox!.height / 2);
  await page.mouse.down();
  // Move in steps to ensure the drag threshold is exceeded
  await page.mouse.move(
    startBox!.x + startBox!.width / 2 + 80,
    startBox!.y + startBox!.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.waitForTimeout(500);

  // The properties panel should NOT have opened
  // Panel has a "Close panel" button title — check it's not visible
  const closeBtn = page.locator('button[title="Close panel"]');
  const panelVisible = await closeBtn.isVisible().catch(() => false);
  expect(panelVisible).toBe(false);

  await page.screenshot({ path: 'pw-screenshots/snap-01-drag-no-panel.png', fullPage: true });
});

/* ═══════════════════════════════════════════════════════════════════════
   TEST 2: Click on a node DOES open the properties panel
   ═══════════════════════════════════════════════════════════════════════ */
test('clicking a node opens the properties panel', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Close any open panel
  await page.locator('.wf-canvas-root').click({ position: { x: 600, y: 600 } });
  await page.waitForTimeout(300);

  // Click the start node
  const startNode = page.locator('[data-node-id="start-1"]');
  await startNode.click();
  await page.waitForTimeout(500);

  // Panel should be visible with the close button
  const closeBtn = page.locator('button[title="Close panel"]');
  await expect(closeBtn).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: 'pw-screenshots/snap-02-click-opens-panel.png', fullPage: true });
});

/* ═══════════════════════════════════════════════════════════════════════
   TEST 3: Timer event snaps to a User Task when dragged near it
   ═══════════════════════════════════════════════════════════════════════ */
test('boundary event snaps to activity when dragged near it', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Step 1: Add a User Task to the canvas
  await dragNodeToCanvas(page, 'User Task', 400, 250);
  await page.waitForTimeout(300);

  // Find the user task node
  const userTaskNode = page.locator('[data-node-id]').filter({ has: page.locator('.wf-task') }).first();
  await expect(userTaskNode).toBeVisible({ timeout: 5000 });
  const taskBox = await userTaskNode.boundingBox();
  expect(taskBox).toBeTruthy();

  // Step 2: Add a Timer Event to the canvas — far from the task initially
  await dragNodeToCanvas(page, 'Timer', 200, 450);
  await page.waitForTimeout(300);

  // Find the timer event node (look for timer node type)
  const timerNodes = page.locator('[data-node-id]').filter({ hasNot: page.locator('.wf-task') });
  // Get all node-ids and find the timer
  const allNodes = page.locator('[data-node-id]');
  const nodeCount = await allNodes.count();
  let timerNodeId = '';
  for (let i = 0; i < nodeCount; i++) {
    const nid = await allNodes.nth(i).getAttribute('data-node-id');
    if (nid && nid.includes('timer')) {
      timerNodeId = nid;
      break;
    }
  }

  // If we found a timer node, drag it near the user task to trigger snap
  if (timerNodeId) {
    const timerNode = page.locator(`[data-node-id="${timerNodeId}"]`);
    await expect(timerNode).toBeVisible();
    const timerBox = await timerNode.boundingBox();
    expect(timerBox).toBeTruthy();

    // Drag the timer event to overlap with the bottom of the user task
    await page.mouse.move(timerBox!.x + timerBox!.width / 2, timerBox!.y + timerBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      taskBox!.x + taskBox!.width * 0.3,
      taskBox!.y + taskBox!.height,
      { steps: 15 },
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Click the timer event to check its properties
    const timerAfterSnap = page.locator(`[data-node-id="${timerNodeId}"]`);
    await timerAfterSnap.click();
    await page.waitForTimeout(500);

    // Verify the "Attached To" section appears in the panel
    const attachedLabel = page.locator('text=Attached To');
    await expect(attachedLabel).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'pw-screenshots/snap-03-boundary-snapped.png', fullPage: true });
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   TEST 4: Activity panel shows attached boundary events
   ═══════════════════════════════════════════════════════════════════════ */
test('activity panel shows attached boundary events indicator', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Add User Task
  await dragNodeToCanvas(page, 'User Task', 400, 250);
  await page.waitForTimeout(300);

  // Find user task
  const userTaskNode = page.locator('[data-node-id]').filter({ has: page.locator('.wf-task') }).first();
  await expect(userTaskNode).toBeVisible({ timeout: 5000 });
  const taskBox = await userTaskNode.boundingBox();
  const taskNodeId = await userTaskNode.getAttribute('data-node-id');

  // Add Error Boundary event
  await dragNodeToCanvas(page, 'Error Boundary', 200, 450);
  await page.waitForTimeout(300);

  // Find error boundary node
  const allNodes = page.locator('[data-node-id]');
  const nodeCount = await allNodes.count();
  let errorNodeId = '';
  for (let i = 0; i < nodeCount; i++) {
    const nid = await allNodes.nth(i).getAttribute('data-node-id');
    if (nid && nid.includes('errorBoundary')) {
      errorNodeId = nid;
      break;
    }
  }

  if (errorNodeId && taskBox) {
    const errorNode = page.locator(`[data-node-id="${errorNodeId}"]`);
    const errorBox = await errorNode.boundingBox();

    // Drag error event near the user task
    await page.mouse.move(errorBox!.x + errorBox!.width / 2, errorBox!.y + errorBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      taskBox.x + taskBox.width * 0.3,
      taskBox.y + taskBox.height,
      { steps: 15 },
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Now click the user task to see if it shows "Boundary Events" in its panel
    const taskEl = page.locator(`[data-node-id="${taskNodeId}"]`);
    await taskEl.click();
    await page.waitForTimeout(500);

    const boundaryLabel = page.locator('text=Boundary Events');
    await expect(boundaryLabel).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'pw-screenshots/snap-04-activity-shows-attached.png', fullPage: true });
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   TEST 5: Detach button removes the attachment
   ═══════════════════════════════════════════════════════════════════════ */
test('detach button removes the boundary event attachment', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Add User Task
  await dragNodeToCanvas(page, 'User Task', 400, 250);
  await page.waitForTimeout(300);

  const userTaskNode = page.locator('[data-node-id]').filter({ has: page.locator('.wf-task') }).first();
  const taskBox = await userTaskNode.boundingBox();

  // Add Timer event
  await dragNodeToCanvas(page, 'Timer', 200, 450);
  await page.waitForTimeout(300);

  // Find timer
  const allNodes = page.locator('[data-node-id]');
  const nodeCount = await allNodes.count();
  let timerNodeId = '';
  for (let i = 0; i < nodeCount; i++) {
    const nid = await allNodes.nth(i).getAttribute('data-node-id');
    if (nid && nid.includes('timer')) {
      timerNodeId = nid;
      break;
    }
  }

  if (timerNodeId && taskBox) {
    const timerNode = page.locator(`[data-node-id="${timerNodeId}"]`);
    const timerBox = await timerNode.boundingBox();

    // Snap to task
    await page.mouse.move(timerBox!.x + timerBox!.width / 2, timerBox!.y + timerBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      taskBox.x + taskBox.width * 0.3,
      taskBox.y + taskBox.height,
      { steps: 15 },
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Click timer to open its panel
    const timerAfterSnap = page.locator(`[data-node-id="${timerNodeId}"]`);
    await timerAfterSnap.click();
    await page.waitForTimeout(500);

    // Verify attached
    const attachedLabel = page.locator('text=Attached To');
    await expect(attachedLabel).toBeVisible({ timeout: 3000 });

    // Click detach
    const detachBtn = page.locator('button', { hasText: 'Detach' });
    await expect(detachBtn).toBeVisible({ timeout: 3000 });
    await detachBtn.click();
    await page.waitForTimeout(500);

    // "Attached To" section should now show the empty state
    const emptyState = page.locator('text=Drag this event near an activity');
    await expect(emptyState).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'pw-screenshots/snap-05-detached.png', fullPage: true });
  }
});
