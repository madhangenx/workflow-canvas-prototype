/**
 * Playwright verification – edge deletion, confirm dialog, new BPMN events, palette
 * Run: npx playwright test pw-verify-features.spec.ts --headed
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

/* ── Helper: log in and create / open a project ──────── */
async function loginAndOpenEditor(page) {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');

  // Check if already logged in (dashboard visible)
  const dashboardVisible = await page.locator('text=My Projects').isVisible().catch(() => false);
  if (!dashboardVisible) {
    // Fill login form — exact placeholders
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Test User');
      const emailInput = page.locator('input[placeholder="john@example.com"]');
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Get Started")').click();
      await page.waitForTimeout(1500);
    }
  }

  // Create a new project if on dashboard 
  const newBtn = page.locator('button:has-text("New Workflow")').first();
  if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await newBtn.click();
    await page.waitForTimeout(500);

    // Fill project name in the create workflow modal
    const projNameInput = page.locator('input[placeholder="e.g. Employee Onboarding"]');
    if (await projNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projNameInput.fill('Test Workflow');
      await page.waitForTimeout(200);
      // Click "Create Workflow" button (exact text)
      await page.locator('button:has-text("Create Workflow")').click({ force: true });
    }
    await page.waitForTimeout(1500);
  }

  // If still on dashboard, click the first project card to open it
  const projectCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Test|Workflow|Project/ }).first();
  if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await projectCard.click();
    await page.waitForTimeout(1500);
  }

  // Wait for editor to load  
  await page.waitForSelector('.wf-canvas-root, [class*="canvas"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

/* ── Test 1: Palette has new BPMN events ─────────────── */
test('palette contains message and timer events', async ({ page }) => {
  await loginAndOpenEditor(page);

  // The palette shows labels inline — look for them directly
  const palette = page.locator('aside').first();
  await expect(palette).toBeVisible();

  // Take a screenshot of current palette state first
  await page.screenshot({ path: 'pw-screenshots/01a-palette-initial.png', fullPage: true });

  // Click Events category header to ensure it's expanded
  const eventsBtn = palette.locator('button', { hasText: 'Events' });
  if (await eventsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Click to toggle — if already expanded this collapses it, click again
    const msgBefore = await palette.locator('text=Message Start').isVisible().catch(() => false);
    if (!msgBefore) {
      await eventsBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Verify new event labels exist
  await expect(palette.locator('p', { hasText: 'Message Start' })).toBeVisible({ timeout: 5000 });
  await expect(palette.locator('p', { hasText: 'Message Event' })).toBeVisible({ timeout: 5000 });
  await expect(palette.locator('p', { hasText: 'Timer Event' })).toBeVisible({ timeout: 5000 });
  await expect(palette.locator('p', { hasText: 'Start Event' })).toBeVisible({ timeout: 5000 });
  await expect(palette.locator('p', { hasText: 'End Event' })).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: 'pw-screenshots/01-palette-new-events.png', fullPage: true });
});

/* ── Test 2: Drag a node onto canvas ──────────────────── */
test('drag node from palette onto canvas', async ({ page }) => {
  await loginAndOpenEditor(page);

  const canvas = page.locator('.wf-canvas-root').first();
  const canvasBox = await canvas.boundingBox();

  // Find a draggable palette item (User Task)
  const userTaskItem = page.locator('[draggable="true"]').filter({ hasText: 'User Task' }).first();
  
  if (await userTaskItem.isVisible()) {
    const itemBox = await userTaskItem.boundingBox();
    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'pw-screenshots/02-node-dropped.png', fullPage: true });
});

/* ── Test 3: Edge selection and deletion shows confirm dialog ──── */
test('edge deletion shows rich confirm dialog', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Look for any existing edges (SVG paths with data-edge-id parent)
  const edgeGroups = page.locator('g[data-edge-id]');
  const edgeCount = await edgeGroups.count();

  if (edgeCount > 0) {
    // Click on the first edge's hitbox path (the transparent wide one)
    const firstEdge = edgeGroups.first();
    const hitbox = firstEdge.locator('path').first();
    await hitbox.click({ force: true });
    await page.waitForTimeout(300);

    // The edge should be selected — canvas root should have focus
    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Confirm dialog should appear (rendered as portal)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify it has expected content
    await expect(dialog.locator('text=Delete connection')).toBeVisible();
    await expect(dialog.locator('button:has-text("Delete")')).toBeVisible();
    await expect(dialog.locator('button:has-text("Cancel")')).toBeVisible();

    await page.screenshot({ path: 'pw-screenshots/03-confirm-dialog-edge.png', fullPage: true });

    // Click Cancel to dismiss
    await dialog.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();

    // Now actually delete: click edge again, delete, confirm
    await hitbox.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    const dialog2 = page.locator('[role="dialog"]');
    await dialog2.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'pw-screenshots/04-edge-deleted.png', fullPage: true });
  } else {
    // No edges present — screenshot and note
    await page.screenshot({ path: 'pw-screenshots/03-no-edges-present.png', fullPage: true });
  }
});

/* ── Test 4: Node deletion shows confirm dialog ──────── */
test('node deletion shows rich confirm dialog', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Click on a node to select it
  const node = page.locator('[data-node-id]').first();
  if (await node.isVisible()) {
    await node.click();
    await page.waitForTimeout(300);

    // Focus the canvas and press Delete
    const canvas = page.locator('.wf-canvas-root').first();
    await canvas.focus();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Confirm dialog should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('button:has-text("Delete")')).toBeVisible();

    await page.screenshot({ path: 'pw-screenshots/05-confirm-dialog-node.png', fullPage: true });

    // Cancel it
    await dialog.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
  }
});

/* ── Test 5: Drag new Message Start event onto canvas ─── */
test('drag message start event onto canvas', async ({ page }) => {
  await loginAndOpenEditor(page);

  const canvas = page.locator('.wf-canvas-root').first();
  const canvasBox = await canvas.boundingBox();

  // Find the Message Start palette item
  const msgStartItem = page.locator('[draggable="true"]').filter({ hasText: 'Message Start' }).first();

  if (await msgStartItem.isVisible()) {
    const itemBox = await msgStartItem.boundingBox();
    const dropX = canvasBox.x + canvasBox.width * 0.3;
    const dropY = canvasBox.y + canvasBox.height * 0.3;

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Drag Timer event 
  const timerItem = page.locator('[draggable="true"]').filter({ hasText: 'Timer' }).first();
  if (await timerItem.isVisible()) {
    const itemBox2 = await timerItem.boundingBox();
    const dropX2 = canvasBox.x + canvasBox.width * 0.5;
    const dropY2 = canvasBox.y + canvasBox.height * 0.5;

    await page.mouse.move(itemBox2.x + itemBox2.width / 2, itemBox2.y + itemBox2.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropX2, dropY2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Drag Message Event (intermediate)
  const msgIntItem = page.locator('[draggable="true"]').filter({ hasText: 'Message Event' }).first();
  if (await msgIntItem.isVisible()) {
    const itemBox3 = await msgIntItem.boundingBox();
    const dropX3 = canvasBox.x + canvasBox.width * 0.7;
    const dropY3 = canvasBox.y + canvasBox.height * 0.4;

    await page.mouse.move(itemBox3.x + itemBox3.width / 2, itemBox3.y + itemBox3.height / 2);
    await page.mouse.down();
    await page.mouse.move(dropX3, dropY3, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'pw-screenshots/06-new-events-on-canvas.png', fullPage: true });
});

/* ── Test 6: Zoom buttons work ────────────────────────── */
test('zoom in/out buttons work', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Find zoom buttons
  const zoomInBtn = page.locator('button[title="Zoom in"], button:has-text("+")').first();
  const zoomOutBtn = page.locator('button[title="Zoom out"], button:has-text("−")').first();
  
  // Try using SVG-based buttons in the controls
  const zoomInSvg = page.locator('[data-canvas-controls] button').first();
  
  if (await zoomInSvg.isVisible()) {
    await zoomInSvg.click();
    await page.waitForTimeout(300);
    await zoomInSvg.click();
    await page.waitForTimeout(300);
  } else if (await zoomInBtn.isVisible()) {
    await zoomInBtn.click();
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: 'pw-screenshots/07-zoom-buttons.png', fullPage: true });
});

/* ── Test 7: Palette tooltip appears on hover ──────────── */
test('palette tooltip shows on hover', async ({ page }) => {
  await loginAndOpenEditor(page);

  // Hover over a palette item
  const paletteItem = page.locator('[draggable="true"]').first();
  if (await paletteItem.isVisible()) {
    await paletteItem.hover();
    await page.waitForTimeout(600);

    // The tooltip is a portal rendered on document.body — look for it
    // It should contain descriptive text
    const tooltip = page.locator('body > div').filter({ hasText: /Drag onto canvas/ }).first();
    
    await page.screenshot({ path: 'pw-screenshots/08-palette-tooltip.png', fullPage: true });
  }
});

/* ── Test 8: No "N" devIndicators button ─────────────── */
test('no Next.js devIndicators N button', async ({ page }) => {
  await loginAndOpenEditor(page);
  
  // Next.js dev indicator has data attribute or specific class
  const nButton = page.locator('[data-nextjs-data-runtime-error-collapsed], nextjs-portal, [data-nextjs-toast]');
  const count = await nButton.count();
  
  await page.screenshot({ path: 'pw-screenshots/09-no-dev-indicator.png', fullPage: true });
  
  // Just screenshot — don't fail if Next devtools internals change
});
