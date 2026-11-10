const { chromium } = require('playwright'); const base = __dirname + '/';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=LOW'); await pg.waitForTimeout(3000);
  await pg.evaluate(() => { const M = window.__moons; M.setFollow('PROBE'); M.setT(300); M.zoomTo('local') }); await pg.waitForTimeout(800);
  for (const d of [0.24, 5, 15, 30, 45, 70, 150, 1000, 30000]) {
    const r = await pg.evaluate(d => { const M = window.__moons; const p = M.cam.position; const l = p.length(); M.cam.position.multiplyScalar(d / l); M.ctl.update(); return 0 }, d); await pg.waitForTimeout(900);
    const f = await pg.evaluate(() => { const s = window.__moons.fogState; return [s.fogW.toFixed(3), s.camAlt.toFixed(1), s.appliedDensity.toFixed(4)].join(' ') });
    console.log('dist', d, 'fogW/camAlt/density', f); await pg.screenshot({ path: base + `shots/zf_${d}.png` });
  }
  console.log('errs', errs); await b.close();
})();
