const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const pg = await (await b.newContext({viewport:{width:1024,height:700}})).newPage();
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB09');V.S.TA=3e6});await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(()=>{const h=document.querySelector('#hud');const cs=getComputedStyle(h);return {maxH:cs.maxHeight,legendH:h.style.getPropertyValue('--legendH'),clientH:h.clientHeight,scrollH:h.scrollHeight,kids:[...document.querySelectorAll('#hudc > *')].map(e=>[e.className,Math.round(e.getBoundingClientRect().height)]),pad:cs.padding}})));
  await pg.screenshot({path:base+'dbg1024.png'});await b.close();})();
