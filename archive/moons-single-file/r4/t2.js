const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
const tiers = process.argv[2] ? [process.argv[2]] : ['LOW', 'HIGH'];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const tier of tiers) {
    const pg = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(); const errs = [];
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    const waitHi = async () => { if (tier !== 'HIGH') return 0; const t0 = Date.now(); for (;;) { const q = await pg.evaluate(() => window.__moons.hiq); if (!q.left) return Date.now() - t0; if (Date.now() - t0 > 400000) { console.log('TIMEOUT', q); return -1 } await pg.waitForTimeout(1000) } };
    await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=' + tier); await pg.waitForTimeout(2500);
    const ids = await pg.evaluate(() => [...document.querySelectorAll('select')[0].options].map(o => [o.value, o.textContent]));
    const pick = {}; for (const [v, n] of ids) for (const m of ['Io', 'Europa', 'Ganymede', 'Callisto', 'Amalthea']) if (n.includes(m + ' flyby') && !pick[m]) pick[m] = v;
    console.log(tier, 'picked', JSON.stringify(pick));
    let w = await waitHi(); console.log(tier, 'PROBE hi wait ms', w, JSON.stringify(await pg.evaluate(() => window.__moons.hiq)));
    console.log(tier, 'bodies', JSON.stringify(await pg.evaluate(() => window.__moons.bodyStats())), 'crafts', JSON.stringify(await pg.evaluate(() => window.__moons.craftStats())));
    await pg.evaluate(() => document.getElementById('atmTog').click());
    for (const [t, z, nm] of [[100, 'craft', 'entry'], [200, 'craft', 'chute'], [700, 'craft', 'descent']]) { await pg.evaluate(([t, z]) => { const M = window.__moons; M.setFollow('PROBE'); M.setT(t); M.zoomTo(z); if (t === 700) { M.cam.position.multiplyScalar(.2) } }, [t, z]); await pg.waitForTimeout(tier === 'HIGH' ? 5000 : 2500); await pg.screenshot({ path: base + `shots/r4_${tier}_probe_${nm}.png` }); console.log(tier, nm, JSON.stringify(await pg.evaluate(() => ({ frame: +window.__moons.frameMs.toFixed(1), tris: window.__moons.renderer.info.render.triangles, calls: window.__moons.renderer.info.render.calls })))) }
    await pg.evaluate(() => { const M = window.__moons; M.setFollow('JUPITER'); M.zoomTo('local') }); await pg.waitForTimeout(3000); await pg.screenshot({ path: base + `shots/r4_${tier}_jupiter.png` });
    for (const m in pick) { await pg.evaluate(id => window.__moons.loadScene(id), pick[m]); await pg.waitForTimeout(1500); await pg.evaluate(k => { const M = window.__moons; M.setFollow(k); M.setT(0); M.zoomTo('local'); const s = M.SCN.sun, d = M.WORLD[k].r * 3.0, L = Math.hypot(s[0] + .5 * s[1], s[1] - .5 * s[0], s[2] + .25); M.cam.position.set((s[0] + .5 * s[1]) / L * d, (s[1] - .5 * s[0]) / L * d, (s[2] + .25) / L * d) }, m.toUpperCase()); w = await waitHi(); await pg.waitForTimeout(tier === 'HIGH' ? 4000 : 1500); await pg.screenshot({ path: base + `shots/r4_${tier}_${m}.png` }); console.log(tier, m, 'hi wait', w, JSON.stringify(await pg.evaluate(() => ({ frame: +window.__moons.frameMs.toFixed(1), tris: window.__moons.renderer.info.render.triangles, b: window.__moons.bodyStats() }))));
      if (m === 'Europa') { await pg.evaluate(() => { const M = window.__moons; M.setFollow('ORBITER'); M.zoomTo('craft'); const s = M.SCN.sun, d = .017, L = Math.hypot(s[0] + .6 * s[1], s[1] - .6 * s[0], s[2] + .45); M.cam.position.set((s[0] + .6 * s[1]) / L * d, (s[1] - .6 * s[0]) / L * d, (s[2] + .45) / L * d) }); await pg.waitForTimeout(tier === 'HIGH' ? 4000 : 1500); await pg.screenshot({ path: base + `shots/r4_${tier}_orbiter.png` }); console.log(tier, 'orbiter', JSON.stringify(await pg.evaluate(() => window.__moons.craftStats()))) } }
    console.log(tier, 'ERRS', JSON.stringify(errs.slice(0, 8))); await pg.close();
  }
  await b.close();
})();
