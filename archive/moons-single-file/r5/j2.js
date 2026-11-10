// Jupiter renders: LOW and HIGH, flyby scenes (GRS toward the camera, sunlit) and the probe-scene cap; pixel samples of the rendered colours
const { chromium } = require('playwright'); const fs = require('fs'); const base = __dirname + '/../';
const three = '/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/npm/node_modules/three/';
const tiers = process.argv[2] ? [process.argv[2]] : ['LOW', 'HIGH'];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
  for (const tier of tiers) {
    const pg = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage(); const errs = [];
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) });
    await pg.route('**/*', route => { const u = route.request().url(); if (u.includes('three.min.js')) return route.fulfill({ path: three + 'build/three.min.js', contentType: 'application/javascript' }); if (u.includes('OrbitControls.js')) return route.fulfill({ path: three + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }); if (u.startsWith('file://') || u.startsWith('data:')) return route.continue(); return route.abort(); });
    const waitHi = async () => { if (tier !== 'HIGH') return; for (let i = 0; i < 300; i++) { if (!(await pg.evaluate(() => window.__moons.hiq.left))) return; await pg.waitForTimeout(1000) } };
    await pg.goto('file://' + base + 'moons_viewer.html#FLY:I0&tier=' + tier); await pg.waitForTimeout(2500);
    await pg.addStyleTag({ content: '#hud,#tag,#zoomp,#lead{display:none!important}' }); await pg.evaluate(() => { document.getElementById('sideTog').click(); document.getElementById('starTog').click() });
    for (const id of ['FLY:I0', 'FLY:G1', 'FLY:G2', 'FLY:C3', 'FLY:G29', 'FLY:A34']) {
      await pg.evaluate(id => window.__moons.loadScene(id), id); await pg.waitForTimeout(800);
      // pick the time in the scene window when the GRS is nearest the sub-solar meridian; camera on the Sun side, slightly south
      const info = await pg.evaluate(() => { const M = window.__moons, S = M.SCN, T = window.THREE; M.setFollow('JUPITER'); let best = 0, bd = 9; for (let t = S.t0; t <= S.t1; t += 60) { M.setT(t); } return { t0: S.t0, t1: S.t1 } });
      let bestT = info.t0, bd = 1e9; for (let t = info.t0; t <= info.t1; t += 300) { const d = await pg.evaluate(t => { const M = window.__moons; M.setT(t); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { const g = M.bodies.JUPITER.grp, az = g.rotation.z - M.JF.grs * Math.PI / 180, s = M.SCN.sun, sa = Math.atan2(s[1], s[0]); let d = ((az - sa) * 180 / Math.PI) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; r(Math.abs(d)) }))) }, t); if (d < bd) { bd = d; bestT = t } }
      await pg.evaluate(t => { const M = window.__moons; M.setT(t); M.zoomTo('local') }, bestT); await pg.waitForTimeout(300);
      await pg.evaluate(() => { const M = window.__moons, g = M.bodies.JUPITER.grp, az = g.rotation.z - M.JF.grs * Math.PI / 180, d = 71492 * 3.3; M.cam.position.set(Math.cos(az) * d * .97, Math.sin(az) * d * .97, -.24 * d) }); await waitHi(); await pg.waitForTimeout(tier === 'HIGH' ? 5000 : 1500);
      await pg.screenshot({ path: base + `shots/r5_${tier}_${id.replace(':', '_')}.png`, clip: { x: 0, y: 90, width: 900, height: 560 } }); console.log(tier, id, 'T', bestT, 'GRS-Sun azimuth diff', bd.toFixed(1));
    }
    await pg.evaluate(() => window.__moons.loadScene('PROBE')); await pg.waitForTimeout(1000); await waitHi();
    for (const [t, d, nm, atm] of [[-300, 9000, 'cap_wide', 1], [60, 1500, 'cap_mid', 1], [200, 120, 'cap_near_atm', 1], [200, 120, 'cap_near_noatm', 0]]) { if (!atm) await pg.evaluate(() => document.getElementById('atmTog').click()); await pg.evaluate(([t, d]) => { const M = window.__moons; M.setFollow('PROBE'); M.setT(t); M.zoomTo('local'); const p = M.cam.position.clone().normalize(), up = M.cam.up.clone(); M.cam.position.copy(up.multiplyScalar(.75).add(p.multiplyScalar(.66)).normalize().multiplyScalar(d)) }, [t, d]); await pg.waitForTimeout(tier === 'HIGH' ? 5000 : 2000); await pg.screenshot({ path: base + `shots/r5_${tier}_${nm}.png`, clip: { x: 0, y: 90, width: 900, height: 560 } }) }
    console.log(tier, 'ERRS', JSON.stringify(errs)); await pg.close();
  }
  await b.close();
})();
