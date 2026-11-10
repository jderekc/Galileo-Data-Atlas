// Every scene in every tier must load and step in time with no page or console error.
const { chromium, ARGS, open } = require('./_lib');
(async () => { const b = await chromium.launch({ args: ARGS }); let bad = 0;
  for (const tier of ['LOW', 'MEDIUM', 'HIGH']) { const pg = await open(b, '#PROBE&tier=' + tier); await pg.waitForTimeout(1500);
    const ids = await pg.evaluate(() => [...document.querySelectorAll('#scene option')].map(o => o.value));
    for (const id of ids) { await pg.evaluate(id => { const s = document.getElementById('scene'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })) }, id); await pg.waitForTimeout(700); await pg.evaluate(() => { const M = window.__moons; M.setT(M.S.T + 5) }); await pg.waitForTimeout(250) }
    console.log(tier, 'scenes', ids.length, 'errors', pg.errs.length, JSON.stringify(pg.errs.slice(0, 3))); bad += pg.errs.length; await pg.close() }
  await b.close(); process.exit(bad ? 1 : 0) })();
