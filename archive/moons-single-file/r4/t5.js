const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const file of ['r4/old_viewer.html', 'moons_viewer.html']) {
    const pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    await pg.goto('file://' + base + file + '#PROBE&tier=LOW'); await pg.waitForTimeout(2000);
    await pg.evaluate(() => { const M = window.__moons; M.setFollow('PROBE'); M.setT(170); M.zoomTo('local') }); await pg.waitForTimeout(1500);
    const r = await pg.evaluate(() => { const M = window.__moons, T = window.THREE; const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(M.cam.projectionMatrix, M.cam.matrixWorldInverse)); const o = []; M.scene.traverseVisible(x => { if (x.isMesh || x.isLine || x.isPoints || x.isSprite) { let vis = true; if (x.frustumCulled && x.geometry) { if (!x.geometry.boundingSphere) x.geometry.computeBoundingSphere(); vis = x.isSprite ? true : fr.intersectsObject(x) } o.push(x.type + ':' + (x.geometry && x.geometry.attributes.position ? x.geometry.attributes.position.count : 0) + (vis ? '' : ':culled')) } }); return { calls: M.renderer.info.render.calls, o } });
    console.log(file, r.calls, r.o.join(' '));
    await pg.close();
  }
  await b.close();
})();
