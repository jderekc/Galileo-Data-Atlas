// tier switching, hash routing, sources panel text, Worker-less fallback
const { chromium } = require('playwright'); const fs = require('fs'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const mk = async (noWorker) => { const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } }); if (noWorker) await ctx.addInitScript(() => { delete window.Worker; window.Worker = undefined }); const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text().slice(0, 300)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); }); return pg };
  const st = pg => pg.evaluate(() => { const M = window.__moons; let stars = 0; M.scene.traverse(x => { if (x.isPoints) stars = x.geometry.attributes.position.count }); return { tier: M.tier, hash: location.hash, stars, hiq: M.hiq, bodies: M.bodyStats(), crafts: M.craftStats(), label: null } });
  let pg = await mk(false);
  await pg.goto('file://' + base + 'moons_viewer.html#FLY:G1&tier=LOW'); await pg.waitForTimeout(2000); console.log('A', JSON.stringify(await st(pg)));
  await pg.click('#tierHigh'); await pg.waitForTimeout(1500); console.log('B', JSON.stringify(await st(pg)));
  for (let i = 0; i < 120; i++) { if (!(await pg.evaluate(() => window.__moons.hiq.left))) break; await pg.waitForTimeout(1000) } console.log('B2', JSON.stringify(await st(pg)));
  fs.writeFileSync(base + 'shots/r4_sources_HIGH.txt', await pg.evaluate(() => document.getElementById('side').innerText));
  await pg.click('#tierLow'); await pg.waitForTimeout(1500); console.log('C', JSON.stringify(await st(pg)));
  fs.writeFileSync(base + 'shots/r4_sources_LOW.txt', await pg.evaluate(() => document.getElementById('side').innerText));
  await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=HIGH'); await pg.reload(); await pg.waitForTimeout(2500); console.log('D', JSON.stringify(await st(pg)));
  fs.writeFileSync(base + 'shots/r4_sources_PROBE_HIGH.txt', await pg.evaluate(() => document.getElementById('side').innerText));
  console.log('errs', JSON.stringify(pg.errs)); await pg.close();
  pg = await mk(true); await pg.goto('file://' + base + 'moons_viewer.html#FLY:A34&tier=HIGH'); const t0 = Date.now(); await pg.waitForTimeout(2000);
  for (let i = 0; i < 200; i++) { if (!(await pg.evaluate(() => window.__moons.hiq.left))) break; await pg.waitForTimeout(1000) } console.log('noWorker', Date.now() - t0, 'ms', JSON.stringify(await st(pg)), 'errs', JSON.stringify(pg.errs));
  await b.close();
})();
