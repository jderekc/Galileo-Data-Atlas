const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const errs=[];
  for(const [W,H] of [[1400,900],[1024,700],[390,844]]){
  const pg = await (await b.newContext({viewport:{width:W,height:H},hasTouch:W<500})).newPage();
  pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push(m.text())});
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  const overl=async(tag)=>{await pg.waitForTimeout(7000);const r=await pg.evaluate(()=>{const L=__viewer.LBL;let n=0,pairs=[];
    const R=L.map(l=>({t:l.o.col,x0:l.x0,x1:l.x1,y0:l.sy+l.dyS-l.hp/2,y1:l.sy+l.dyS+l.hp/2,d:Math.round(l.dyS)}));
    for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=R[i],c=R[j];if(a.x0<c.x1&&a.x1>c.x0&&a.y0<c.y1-.5&&a.y1>c.y0+.5){n++;pairs.push([i,j])}}
    const hd=document.querySelector('#hud'),HW=document.querySelector('#stage').clientWidth;const hr={x0:hd.offsetLeft,x1:hd.offsetLeft+hd.offsetWidth,y0:hd.offsetTop,y1:hd.offsetTop+hd.offsetHeight};const vis=R.filter((r,i)=>L[i].o.s.material.opacity>0);const underHud=vis.filter(r=>r.x0<hr.x1&&r.x1>hr.x0&&r.y0<hr.y1&&r.y1>hr.y0).length;const clipped=vis.filter(r=>r.x0<0||r.x1>HW).length;const hidden=L.length-vis.length;return {labels:L.length,hidden,underHud,clipped,overlaps:n,displaced:R.filter(r=>Math.abs(r.d)>4).length,maxShift:Math.max(0,...R.map(r=>Math.abs(r.d)))}});console.log(W,tag,JSON.stringify(r))};
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB08');V.S.TA=2e6});await overl('ORB08');await pg.screenshot({path:base+'n15_'+W+'_a.png'});
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB09')});await overl('ORB09');
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB33')});await overl('ORB33');await pg.screenshot({path:base+'n15_'+W+'_b.png'});
  const sp=await pg.evaluate(async()=>{const V=__viewer;V.S.speed.A=864000;document.querySelector('#speed').value=864000;await V.openSeg('ORB10');return {speed:V.S.speed.A,sel:document.querySelector('#speed').value,hash:location.hash}});console.log(W,'speed after openSeg',JSON.stringify(sp));
  await pg.evaluate(()=>{__viewer.S.TA=123456});await pg.waitForTimeout(1500);console.log(W,'hash',await pg.evaluate(()=>location.hash));
  await pg.close();}
  console.log('errs',errs.length,errs.slice(0,3));await b.close();
})();
