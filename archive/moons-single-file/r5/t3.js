const { chromium } = require('playwright'); const fs = require('fs'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
  await pg.goto('file://' + base + 'moons_viewer.html#FLY:E4&tier=LOW'); await pg.waitForTimeout(2000);
  for (const k of (process.argv[2] || 'IO,EUROPA,GANYMEDE,CALLISTO,AMALTHEA,JUPITER').split(',')) {
    const r = await pg.evaluate(k => { const M = window.__moons; const t0 = performance.now(); const W = 1024, H = 512; const r = M.texData({ type: 'body', kind: k, W, H, hi: 1 }); const dt = performance.now() - t0; const c = document.createElement('canvas'); c.width = W; c.height = H * 2; const g = c.getContext('2d'); g.putImageData(new ImageData(r.rgba, W, H), 0, 0); const lo = M.texture(k, 256, 128).canvas; g.imageSmoothingEnabled = false; g.drawImage(lo, 0, H, W, H); return { url: c.toDataURL('image/png'), dt } }, k);
    fs.writeFileSync(base + 'shots/r4_tex_' + k + '.png', Buffer.from(r.url.split(',')[1], 'base64')); console.log(k, 'hi 1024x512 ms', r.dt.toFixed(0));
  }
  await b.close();
})();
