// Shared test helpers. BASE is the URL of a static server rooted at the repository (default http://localhost:8080/).
// Software rendering flags keep results comparable between machines; remove ARGS to test on the real GPU.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/';
const ARGS = process.env.REAL_GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'];
async function open(browser, hash, vp) { const pg = await (await browser.newContext({ viewport: vp || { width: 1200, height: 800 } })).newPage(); pg.errs = []; pg.reqs = [];
  pg.on('pageerror', e => pg.errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') pg.errs.push('console: ' + m.text().slice(0, 200)) });
  pg.on('requestfinished', async r => { try { const s = await r.sizes(); pg.reqs.push({ url: r.url().replace(BASE, ''), body: s.responseBodySize }) } catch (e) { } });
  await pg.goto(BASE + (hash || '')); await pg.waitForFunction(() => window.__moons && window.__moons.SCN, null, { timeout: 60000 }); return pg }
module.exports = { chromium, BASE, ARGS, open };
