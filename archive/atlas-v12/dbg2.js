const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const pg = await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  await pg.evaluate(async()=>{await __viewer.openSeg('ORB33')});await pg.waitForTimeout(2500);
  console.log(JSON.stringify(await pg.evaluate(()=>{const L=__viewer.LBL;const R=L.map((l,i)=>({i,pri:l.pri,x0:Math.round(l.x0),x1:Math.round(l.x1),sy:Math.round(l.sy),dyS:+l.dyS.toFixed(1),dy:l.dy,hp:+l.hp.toFixed(1),dim:__viewer.S.mode}));return R})));
  await b.close();})();
