const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=LOW'); await pg.waitForTimeout(2500);
  console.log(JSON.stringify(await pg.evaluate(() => { const M = window.__moons, F = M.JF, pt = M.SCN.pr.probetrj, ib = pt.t.indexOf(167.106); const cl = pt.s3_lat[ib], cw = pt.s3_wlon[ib]; const o = { fp: F.fp, cl, cw, lat0: pt.s3_lat[0], w0: pt.s3_wlon[0] };
    const samp = (type, lat, wlon, half, la, wl) => { const W = 64, r = M.texData({ type, lat, wlon, half, W, H: W }); const y = Math.round((lat + half - la) / (2 * half) * W - .5), x = Math.round((-wl + wlon + half) / (2 * half) * W - .5); const k = 4 * (y * W + x); return [r.rgba[k], r.rgba[k + 1], r.rgba[k + 2]] };
    o.rows = []; for (const la of [5.2, 6.0, 6.53, 7.0, 7.5, 7.9]) o.rows.push({ la, near: samp('near', cl, cw, 1.5, la, cw), cap: samp('cap', pt.s3_lat[0], pt.s3_wlon[0], 10, la, cw) }); return o })));
  await b.close();
})();
