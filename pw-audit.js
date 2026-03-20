const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const projectId = 'pw-test-001';

  await ctx.addInitScript((pid) => {
    localStorage.setItem('flowforge_user', JSON.stringify({ id: 'u1', email: 'demo@test.io', name: 'Demo User' }));
    localStorage.setItem('flowforge_projects', JSON.stringify([{ id: pid, name: 'PW Test Flow', description: 'Playwright test', createdAt: Date.now(), updatedAt: Date.now(), thumbnail: '🔄', nodeCount: 5, edgeCount: 4 }]));
    const workflow = {
      meta: { id: pid, name: 'PW Test Flow', version: '1.0.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      nodes: [
        { id: 'start-1', type: 'startEvent', position: { x: 100, y: 200 }, width: 44, height: 44, data: { nodeType: 'startEvent', label: 'Start', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'task-1', type: 'userTask', position: { x: 260, y: 182 }, width: 166, height: 44, data: { nodeType: 'userTask', label: 'Submit Form', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'task-2', type: 'serviceTask', position: { x: 500, y: 182 }, width: 166, height: 44, data: { nodeType: 'serviceTask', label: 'Send Email', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'gw-1', type: 'exclusiveGateway', position: { x: 740, y: 176 }, width: 48, height: 48, data: { nodeType: 'exclusiveGateway', label: 'Approved?', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
        { id: 'end-1', type: 'endEvent', position: { x: 900, y: 200 }, width: 44, height: 44, data: { nodeType: 'endEvent', label: 'End', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'task-1', type: 'sequenceEdge', data: { label: '' } },
        { id: 'e2', source: 'task-1', target: 'task-2', type: 'sequenceEdge', data: { label: '' } },
        { id: 'e3', source: 'task-2', target: 'gw-1', type: 'sequenceEdge', data: { label: '' } },
        { id: 'e4', source: 'gw-1', target: 'end-1', type: 'sequenceEdge', data: { label: 'Yes' } },
      ],
    };
    localStorage.setItem('flowforge_wf_' + pid, JSON.stringify(workflow));
  }, projectId);

  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Go directly to editor
  await page.goto(`http://localhost:3000/editor/${projectId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/A-editor-initial.png' });
  console.log('A: editor initial');

  // Check DOM state
  const dom = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-node-id]'));
    const handles = Array.from(document.querySelectorAll('[data-handle-type]'));
    const viewport = Array.from(document.querySelectorAll('*')).find(el => 
      el.style && el.style.transformOrigin === '0px 0px' && el.style.willChange === 'transform'
    );
    const canvasRoot = document.querySelector('[style*="radial-gradient"]');
    return {
      nodeCount: nodes.length,
      handleCount: handles.length,
      hasViewportEl: !!viewport,
      viewportTransform: viewport ? viewport.style.transform : 'N/A',
      hasCanvasRoot: !!canvasRoot,
      canvasRootBg: canvasRoot ? canvasRoot.style.backgroundImage : 'none',
      firstNodeInfo: nodes[0] ? {
        classes: nodes[0].className,
        style: nodes[0].getAttribute('style'),
        rect: nodes[0].getBoundingClientRect(),
        children: nodes[0].children.length,
      } : null,
      bodyContent: document.body.innerHTML.substring(0, 500),
    };
  });
  console.log('DOM:', JSON.stringify(dom, null, 2));

  // hover first node
  const nodeEl = await page.$('[data-node-id]');
  if (nodeEl) {
    await nodeEl.hover();
    await page.waitForTimeout(500);
    const h = await page.evaluate(() => {
      const handles = document.querySelectorAll('[data-handle-type]');
      return Array.from(handles).map(h => {
        const cs = getComputedStyle(h);
        return { opacity: cs.opacity, transform: cs.transform, visibility: cs.visibility, display: cs.display };
      });
    });
    console.log('Handles on hover:', JSON.stringify(h));
    await page.screenshot({ path: '/tmp/B-node-hover.png' });
    console.log('B: node hover');

    // click node
    await nodeEl.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/C-node-selected.png' });
    console.log('C: node selected');
  } else {
    console.log('NO NODE FOUND');
  }

  // screenshot the whole editor with panel
  await page.screenshot({ path: '/tmp/D-full-editor.png', fullPage: false });
  console.log('D: full editor');

  await browser.close();
}

run().catch(e => { console.error(e.message + '\n' + e.stack); process.exit(1); });
