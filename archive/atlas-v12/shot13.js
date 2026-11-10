const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const pg = await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
  const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push(m.text())});
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  const L=(k,v)=>console.log(k,JSON.stringify(v));
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  const r=await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB35');const s=V.SG;V.S.TA=s.span-300;V.S.run='one';V.S.speed.A=60;V.S.play=true;
    const log=[];for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,600));log.push([Math.round(V.S.TA),V.probe.visible,V.probeG.visible,V.probeG.position.toArray().map(v=>+v.toFixed(3))])}
    return {span:s.span,dspan:s.dspan,log,hud:document.querySelector('#hudc').innerText.split('\n').slice(0,4)}});
  console.log(JSON.stringify(r));
  console.log('errs',errs.length,errs.slice(0,3));
  await b.close();
})();
