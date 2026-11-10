const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const res = {};
  for (const [name, file] of [['old', 'r4/old_viewer.html'], ['new', 'moons_viewer.html']]) {
    const pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = [];
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    await pg.goto('file://' + base + file + '#PROBE&tier=LOW'); await pg.waitForTimeout(2500);
    const hashes = await pg.evaluate(() => { const M = window.__moons; const H = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) }; const o = {}; for (const k of ['IO', 'EUROPA', 'GANYMEDE', 'CALLISTO', 'AMALTHEA', 'JUPITER']) { o[k + '256'] = H(M.texture(k, 256, 128).canvas); o[k + '512'] = H(M.texture(k, 512, 256).canvas) } o.cap = H(M.capTexture(6.5, 4.4, 10, 256, 256).canvas); o.near = H(M.nearTexture(6.5, 4.4, 1.5, 256, 256).canvas); return o });
    const tm = {};
    for (const [t, z] of [[170, 'local'], [700, 'local'], [100, 'craft']]) { await pg.evaluate(([t, z]) => { const M = window.__moons; M.setFollow('PROBE'); M.setT(t); M.zoomTo(z) }, [t, z]); await pg.waitForTimeout(6000); tm[t + z] = await pg.evaluate(() => ({ frame: +window.__moons.frameMs.toFixed(1), js: +window.__moons.ema.toFixed(1), tris: window.__moons.renderer.info.render.triangles, calls: window.__moons.renderer.info.render.calls })) }
    await pg.evaluate(() => window.__moons.loadScene('FLY:E4')); await pg.waitForTimeout(5000); tm.E4 = await pg.evaluate(() => ({ frame: +window.__moons.frameMs.toFixed(1), js: +window.__moons.ema.toFixed(1), tris: window.__moons.renderer.info.render.triangles }));
    res[name] = { hashes, tm, errs }; await pg.close();
  }
  for (const k in res.old.hashes) console.log(k, res.old.hashes[k], res.new.hashes[k], res.old.hashes[k] === res.new.hashes[k] ? 'same' : 'DIFF');
  console.log(JSON.stringify({ old: res.old.tm, new: res.new.tm }, null, 1)); console.log('errs', res.old.errs, res.new.errs);
  await b.close();
})();
