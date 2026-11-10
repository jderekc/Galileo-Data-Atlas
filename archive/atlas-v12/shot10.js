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
  L('TJ.t0',await pg.evaluate(()=>({t0:__viewer.TJ.t0,n:__viewer.TJ.n,seg0:__viewer.SEGS[0].t0ms})));
  const res=await pg.evaluate(async()=>{const V=__viewer;const out=[];
    for(const s of V.SEGS){await V.openSeg(s.id);const ds=s.dspan;let worst=0,wT=0,cnt=0;
      for(let q=0;q<=12;q++){const T=ds*q/12*0.999;V.S.TA=T;await new Promise(r=>setTimeout(r,120));
        const p=V.probe.visible?V.probe.position:null;if(!p)continue;
        const t=V.trajAt(s.t0ms/1000+T);if(!t)continue;
        const d=Math.hypot(p.x-t[0],p.y-t[1],p.z-t[2]);cnt++;if(d>worst){worst=d;wT=T}}
      out.push([s.id,cnt,+worst.toFixed(3)])}return out});
  console.log(JSON.stringify(res));
  console.log('errs',errs.length,errs.slice(0,3));
  await b.close();
})();
