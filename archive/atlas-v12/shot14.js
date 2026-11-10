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
  const meas=async(tag)=>{await pg.waitForTimeout(1200);const r=await pg.evaluate(()=>{const h=document.querySelector('#hud'),l=document.querySelector('#legend'),st=document.querySelector('#stage');const hr=h.getBoundingClientRect(),lr=l.getBoundingClientRect();return {hudH:Math.round(hr.height),stageH:st.clientHeight,overflow:h.scrollHeight-h.clientHeight,gapToLegend:Math.round(lr.top-hr.bottom),lines:[...document.querySelectorAll('#hudc > *')].map(e=>e.className||e.tagName).join(','),tail:(document.querySelector('#hudc').lastElementChild||{}).textContent}});console.log(W,tag,JSON.stringify(r))};
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB09');V.S.TA=3e6;V.S.sel=['EPD_E1'].filter(id=>V.LAYERS.some(l=>l.id===id))});await meas('orb09 default');
  await pg.evaluate(async()=>{const V=__viewer;await V.openSeg('ORB08');V.S.TA=2e6;V.S.sel=V.LAYERS.slice(0,8).map(l=>l.id)});await meas('orb08 8 layers');
  if(W>500){await pg.click('button[data-lay="graph"]').catch(()=>{});await meas('graph focus');await pg.screenshot({path:base+'n14_'+W+'_gf.png'})}
  await pg.screenshot({path:base+'n14_'+W+'.png'});
  await pg.close();}
  console.log('errs',errs.length,errs.slice(0,3));await b.close();
})();
