const { chromium } = require('playwright'); const base = __dirname + '/';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)) });
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  for (const tier of ['LOW', 'HIGH']) {
    await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=' + tier); await pg.waitForTimeout(2500);
    const ids = await pg.evaluate(() => [...document.querySelectorAll('select')[0].options].map(o => o.value));
    console.log(tier, 'scenes', ids.length);
    for (const id of ids) {
      await pg.evaluate(id => { const s = document.querySelector('select'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })) }, id); await pg.waitForTimeout(900);
      const k = await pg.evaluate(() => ({ kind: window.__moons.SCN && window.__moons.SCN.kind, T: window.__moons.S.T })); 
      await pg.evaluate(() => { const M = window.__moons; M.setT(M.S.T + 5) }); await pg.waitForTimeout(300);
      console.log(' ', tier, id, k.kind, 'errs so far', errs.length);
    }
  }
  console.log('ERRORS', JSON.stringify(errs.slice(0, 5))); await b.close();
})();
