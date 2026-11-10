// model inspection shots: HUD and side panel hidden, camera on the sunward side
const { chromium } = require('playwright'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
const tiers = process.argv[2] ? [process.argv[2]] : ['LOW', 'HIGH'];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const tier of tiers) {
    const pg = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage(); const errs = [];
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    await pg.goto('file://' + base + 'moons_viewer.html#PROBE&tier=' + tier); await pg.waitForTimeout(2500);
    await pg.addStyleTag({ content: '#hud,#tag,#zoomp,#lead{display:none!important}' }); await pg.evaluate(() => { document.getElementById('sideTog').click(); document.getElementById('atmTog').click(); document.getElementById('starTog').click() });
    const cam = async (d, a, e) => pg.evaluate(([d, a, e]) => { const M = window.__moons, s = M.SCN.sun; const T = window.THREE; const sv = new T.Vector3(s[0], s[1], s[2]).normalize(), up = M.cam.up.clone(), side = new T.Vector3().crossVectors(up, sv).normalize(); const dir = sv.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).addScaledVector(up, e).normalize(); M.cam.position.copy(dir.multiplyScalar(d)) }, [d, a, e]);
    const shot = async (nm, wait) => { await pg.waitForTimeout(wait || (tier === 'HIGH' ? 4500 : 2000)); await pg.screenshot({ path: base + `shots/r4m_${tier}_${nm}.png`, clip: { x: 0, y: 90, width: 900, height: 560 } }) };
    await pg.evaluate(() => { const M = window.__moons; M.setFollow('PROBE'); M.setT(100); M.zoomTo('craft') }); await cam(.0035, .7, .1); await shot('entry');
    await pg.evaluate(() => { const M = window.__moons; M.setT(200); M.zoomTo('craft') }); await cam(.028, .6, .15); await shot('chute_far');
    await cam(.0035, .6, .5); await shot('module');
    await pg.evaluate(() => { const M = window.__moons; M.setT(169) }); await cam(.008, .9, .1); await shot('separation');
    await pg.evaluate(() => { const M = window.__moons; M.loadScene('FLY:E4'); M.setFollow('ORBITER'); M.setT(0); M.zoomTo('craft') }); await pg.waitForTimeout(800);
    await cam(.019, .6, .5); await shot('orbiter_a'); await cam(.019, 2.6, -.4); await shot('orbiter_b'); await cam(.008, 1.2, .2); await shot('orbiter_close');
    console.log(tier, 'ERRS', JSON.stringify(errs)); await pg.close();
  }
  await b.close();
})();
