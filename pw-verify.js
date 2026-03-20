const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const projectId = 'pw-css-001';

  await ctx.addInitScript((pid) => {
    localStorage.setItem('flowforge_user', JSON.stringify({ id: 'u1', email: 'demo@test.io', name: 'Demo User' }));
    localStorage.setItem('flowforge_projects', JSON.stringify([{ id: pid, name: 'CSS Verify', description: '', createdAt: Date.now(), updatedAt: Date.now(), thumbnail: '🔄', nodeCount: 3, edgeCount: 2 }]));
    localStorage.setItem('flowforge_wf_' + pid, JSON.stringify({
      meta: { id: pid, name: 'CSS Verify', version: '1.0.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      nodes: [
        { id: 'start-1', type: 'startEvent', position: { x: 120, y: 200 }, width: 44, height: 44, data: { nodeType: 'startEvent', label: 'Start', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'task-1', type: 'userTask', position: { x: 260, y: 182 }, width: 166, height: 44, data: { nodeType: 'userTask', label: 'Review', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'end-1', type: 'endEvent', position: { x: 500, y: 200 }, width: 44, height: 44, data: { nodeType: 'endEvent', label: 'End', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'task-1', type: 'sequenceEdge', data: { label: '' } },
        { id: 'e2', source: 'task-1', target: 'end-1', type: 'sequenceEdge', data: { label: '' } },
      ],
    }));
  }, projectId);

  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://localhost:3000/editor/${projectId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    // Canvas root check
    const canvasEls = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = el.style;
      return s && s.backgroundImage && s.backgroundImage.includes('linear-gradient');
    });
    const canvasRoot = canvasEls[0];

    // Controls check
    const zoomPct = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent?.match(/^\d+%$/) && el.style.color === 'rgb(99, 102, 241)'
    );

    // Minimap check
    const overviewLabel = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent?.trim() === 'Overview'
    );

    // Handle check (10px)
    const handle = document.querySelector('[data-handle-type]');
    const handleComputed = handle ? getComputedStyle(handle) : null;

    // Node cursor
    const node = document.querySelector('.wf-canvas-node');
    const nodeCursor = node ? getComputedStyle(node).cursor : null;

    return {
      canvasBg: canvasRoot ? {
        image: canvasRoot.style.backgroundImage.substring(0, 80) + '...',
        color: canvasRoot.style.backgroundColor,
        found: true,
      } : { found: false },
      zoomPctFound: !!zoomPct,
      zoomPctText: zoomPct?.textContent,
      overviewLabelFound: !!overviewLabel,
      handleWidth: handleComputed?.width,
      handleBorder: handleComputed?.border,
      nodeCursor,
    };
  });

  console.log('=== CSS VERIFICATION ===');
  console.log(JSON.stringify(info, null, 2));

  // Take screenshot
  await page.screenshot({ path: '/tmp/VERIFY-editor.png' });
  
  // Click node and take selected screenshot
  const node = await page.$('[data-node-id="task-1"]');
  if (node) {
    await node.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/VERIFY-selected.png' });
    
    // Hover the start node to see handles
    const startNode = await page.$('[data-node-id="start-1"]');
    if (startNode) {
      await startNode.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: '/tmp/VERIFY-hover-handles.png' });
    }
  }

  console.log('Screenshots: /tmp/VERIFY-*.png');
  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
