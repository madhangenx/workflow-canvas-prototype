const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const projectId = 'pw-test-001';

  await ctx.addInitScript((pid) => {
    localStorage.setItem('flowforge_user', JSON.stringify({ id: 'u1', email: 'demo@test.io', name: 'Demo User' }));
    localStorage.setItem('flowforge_projects', JSON.stringify([{ id: pid, name: 'PW Test Flow', description: '', createdAt: Date.now(), updatedAt: Date.now(), thumbnail: '🔄', nodeCount: 1, edgeCount: 0 }]));
    localStorage.setItem('flowforge_wf_' + pid, JSON.stringify({
      meta: { id: pid, name: 'PW Test Flow', version: '1.0.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      nodes: [{ id: 'start-1', type: 'startEvent', position: { x: 100, y: 200 }, width: 44, height: 44, data: { nodeType: 'startEvent', label: 'Start', inputFields: [], outputFields: [], businessRules: [], apis: [], actionButtons: [] } }],
      edges: []
    }));
  }, projectId);

  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', msg => consoleLines.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', err => consoleLines.push('ERROR: ' + err.message));
  page.on('response', resp => {
    if (!resp.ok() && resp.url().includes('localhost')) {
      consoleLines.push('HTTP ' + resp.status() + ': ' + resp.url());
    }
  });

  await page.goto('http://localhost:3000/editor/' + projectId, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    return {
      url: location.href,
      title: document.title,
      nodesFound: document.querySelectorAll('[data-node-id]').length,
      wfNodeFound: !!document.querySelector('.wf-canvas-node'),
      canvasWrapperFound: !!document.querySelector('[data-canvas-root]'),
      bodyHTML: document.body.innerHTML.substring(0, 3000),
    };
  });

  console.log('=== PAGE INFO ===');
  console.log('URL:', info.url);
  console.log('Title:', info.title);
  console.log('Nodes found:', info.nodesFound);
  console.log('wf-canvas-node found:', info.wfNodeFound);
  console.log('canvas root found:', info.canvasWrapperFound);
  console.log('\n=== CONSOLE LOGS ===');
  consoleLines.forEach(l => console.log(l));
  console.log('\n=== BODY HTML ===');
  console.log(info.bodyHTML);

  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
