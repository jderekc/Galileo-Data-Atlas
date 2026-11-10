const { chromium } = require('playwright'); const fs = require('fs'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)) });
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  await pg.goto('file://' + base + 'moons_viewer.html#FLY:I0&tier=LOW'); await pg.waitForTimeout(2000);
  for (const id of (process.argv[2] || 'FLY:I0,FLY:E4,FLY:E19,FLY:G29,FLY:A34').split(',')) {
    await pg.evaluate(id => window.__moons.loadScene(id), id); await pg.waitForTimeout(600);
    const r = await pg.evaluate(() => { const M = window.__moons; const W = 1024, H = 512; const t0 = performance.now(); const r = M.texData({ type: 'body', kind: 'JUPITER', W, H, hi: 1 }); const dt = performance.now() - t0; const c = document.createElement('canvas'); c.width = W; c.height = H * 2; const g = c.getContext('2d'); g.putImageData(new ImageData(r.rgba, W, H), 0, 0); const lo = M.texture('JUPITER', 256, 128).canvas; g.imageSmoothingEnabled = false; g.drawImage(lo, 0, H, W, H);
      // geometry check: azimuth (group frame) of the mesh point whose uv.x maps to texture longitude pi - L3(GRS)
      const F = M.JF, m = M.bodies.JUPITER.mesh, uv = m.geometry.attributes.uv, ps = m.geometry.attributes.position; const texLon = ((Math.PI - F.grs * Math.PI / 180) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), u = texLon / (2 * Math.PI); let best = 0, bd = 9; for (let i = 0; i < uv.count; i++) { const d = Math.abs(uv.getX(i) - u) + Math.abs(uv.getY(i) - .5); if (d < bd) { bd = d; best = i } } const T = window.THREE; const v = new T.Vector3(ps.getX(best), ps.getY(best), ps.getZ(best)).applyEuler(m.rotation); const az = Math.atan2(v.y, v.x) * 180 / Math.PI;
      return { url: c.toDataURL('image/png'), dt, F: { grsL2: F.grsL2, grs: F.grs, unc: F.grsUnc, fn: F.fn, fp: F.fp, ov: F.ov, notes: F.notes, key: F.key }, azOfGrsTexel: az, expectAz: -F.grs, date: new Date(M.SCN.tms).toISOString() } });
    fs.writeFileSync(base + 'shots/r5_tex_' + id.replace(':', '_') + '.png', Buffer.from(r.url.split(',')[1], 'base64')); delete r.url; console.log(id, JSON.stringify(r));
  }
  await b.close();
})();
