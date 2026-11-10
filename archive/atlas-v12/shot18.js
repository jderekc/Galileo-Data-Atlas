const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const errs=[];
  const pg=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  const ids=await pg.evaluate(()=>__viewer.SEGS.map(s=>s.id));
  const bad=[];
  for(const id of ids){
    const r=await pg.evaluate(async(id)=>{const V=__viewer;await V.openSeg(id);await new Promise(r=>setTimeout(r,700));
      const p=V.probe.position.clone?V.probe.position.clone():null;const cam=V.camA||null;return {id,TA:Math.round(V.S.TA),R:Math.hypot(V.probe.position.x,V.probe.position.y,V.probe.position.z)}},id);
    // visibility via screenshot-free projection: use page helper
    const vis=await pg.evaluate(()=>{const V=__viewer;const c=V.camA;if(!c)return null;const p=V.probe.position.clone().project(c);return {x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2)}});
    r.vis=vis;if(vis&&(Math.abs(vis.x)>1||Math.abs(vis.y)>1||vis.z>1||vis.z<-1))bad.push(r);
  }
  console.log('segments',ids.length,'probe outside view at T=0:',bad.length,JSON.stringify(bad.slice(0,10)));
  console.log('errs',errs.length,errs.slice(0,2));await b.close();
})();
