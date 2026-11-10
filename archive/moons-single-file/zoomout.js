const { chromium } = require('playwright'); const fs = require('fs');
const base = __dirname + '/';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
const tag = process.argv[2] || 'before', file = process.argv[3] || 'moons_viewer.html';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  await pg.goto('file://' + base + file + '#PROBE&tier=LOW'); await pg.waitForTimeout(3000);
  for (const t of [300, 700, 1500]) for (const z of ['craft', 'local', 'system']) {
    await pg.evaluate(([t, z]) => { const M = window.__moons; M.setFollow('PROBE'); M.setT(t); M.zoomTo(z) }, [t, z]); await pg.waitForTimeout(1200);
    const info = await pg.evaluate(() => { const M = window.__moons; return { camDist: M.cam.position.length(), fog: M.fogState } });
    console.log(tag, t, z, JSON.stringify(info)); await pg.screenshot({ path: base + `shots/zo_${tag}_${t}_${z}.png` });
  }
  console.log('errs', errs); await b.close();
})();
