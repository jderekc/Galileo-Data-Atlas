const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const tier of ['LOW', 'HIGH']) { const pg = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=' + tier); await pg.waitForTimeout(2000);
    console.log(tier, JSON.stringify(await pg.evaluate(() => { const M = window.__moons, o = {}; for (const k in M.crafts) for (const p in M.crafts[k].sub) { const g = M.crafts[k].sub[p].geometry; g.computeBoundingBox(); const bb = g.boundingBox, a = g.attributes.position; let rmax = 0; for (let i = 0; i < a.count; i++) rmax = Math.max(rmax, Math.hypot(a.getX(i), a.getY(i))); o[k + '.' + p] = { z: [+bb.min.z.toFixed(4), +bb.max.z.toFixed(4)], y: [+bb.min.y.toFixed(3), +bb.max.y.toFixed(3)], x: [+bb.min.x.toFixed(3), +bb.max.x.toFixed(3)], rmaxXY: +rmax.toFixed(4) } } return o })));
    await pg.evaluate(() => window.__moons.loadScene('FLY:A34')); await pg.waitForTimeout(1000);
    console.log(tier, 'Amalthea', JSON.stringify(await pg.evaluate(() => { const g = window.__moons.bodies.AMALTHEA.mesh.geometry; g.computeBoundingBox(); const b = g.boundingBox; return [b.min.toArray().map(v => +v.toFixed(1)), b.max.toArray().map(v => +v.toFixed(1))] })));
    await pg.close() }
  await b.close();
})();
