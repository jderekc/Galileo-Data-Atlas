// before/after measurements: r5 vs r6, LOW and HIGH
const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const file of ['moons_viewer.r5.html', 'moons_viewer.html']) for (const tier of ['LOW', 'HIGH']) {
    const pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    const t0 = Date.now(); await pg.goto('file://' + base + file + '#PROBE&tier=' + tier); await pg.waitForTimeout(3000); await pg.evaluate(() => { try { window.__moons.bench = true } catch (e) { } });
    let build = 0, jobs = 0; if (tier === 'HIGH') { for (let i = 0; i < 400; i++) { const q = await pg.evaluate(() => window.__moons.hiq); jobs = q.done; if (!q.left) break; await pg.waitForTimeout(500) } build = Date.now() - t0 }
    const out = { file, tier, buildMs: build, hiTexturesBuilt: jobs };
    const meas = async (nm, fn, arg) => { await pg.evaluate(fn, arg); await pg.waitForTimeout(tier === 'HIGH' ? 9000 : 6000); out[nm] = await pg.evaluate(() => { const M = window.__moons, i = M.renderer.info; return { frame: +M.frameMs.toFixed(1), tris: i.render.triangles, calls: i.render.calls, tex: i.memory.textures, geo: i.memory.geometries } }) };
    await meas('p170', () => { const M = window.__moons; M.setFollow('PROBE'); M.setT(170); M.zoomTo('local') });
    await meas('p700', () => { const M = window.__moons; M.setT(700); M.zoomTo('local') });
    await meas('e4', () => { const M = window.__moons; M.loadScene('FLY:E4'); M.setFollow('EUROPA'); M.setT(0); M.zoomTo('local') });
    await meas('jup', () => { const M = window.__moons; M.setFollow('JUPITER'); M.zoomTo('local') });
    // idle: frames drawn in 3 s with nothing changing
    await pg.evaluate(() => { try { window.__moons.bench = false } catch (e) { } }); await pg.waitForTimeout(1500); const f0 = await pg.evaluate(() => window.__moons.renderer.info.render.frame); await pg.waitForTimeout(3000); out.idleFramesIn3s = (await pg.evaluate(() => window.__moons.renderer.info.render.frame)) - f0;
    out.heapMB = await pg.evaluate(() => performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null); out.errs = errs;
    console.log(JSON.stringify(out)); await pg.close();
  }
  await b.close();
})();
