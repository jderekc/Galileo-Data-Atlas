const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const errs=[];
  const mk=async(W,H,hash)=>{const pg=await (await b.newContext({viewport:{width:W,height:H}})).newPage();
    pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push(m.text())});
    await pg.route('**/*',route=>{const u=route.request().url();
      if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
      if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
      if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
    await pg.goto('file://'+base+'viewer_wrapped.html'+hash); await pg.waitForTimeout(15000);return pg};
  let pg=await mk(1400,900,'#orb=ORB10&t=123456');
  console.log('A restore',JSON.stringify(await pg.evaluate(()=>({orb:__viewer.SG.id,TA:Math.round(__viewer.S.TA),mode:__viewer.S.mode,hash:location.hash}))));
  await pg.close();
  pg=await mk(1400,900,'#fly=G8&t=-600');
  console.log('B restore',JSON.stringify(await pg.evaluate(()=>({mode:__viewer.S.mode,TB:Math.round(__viewer.S.TB),hash:location.hash}))));
  await pg.close();
  pg=await mk(1400,900,'#orb=ORB10&t=99999999999');
  console.log('A clamp',JSON.stringify(await pg.evaluate(()=>({TA:Math.round(__viewer.S.TA),span:__viewer.SG.span}))));
  await pg.close();
  pg=await mk(1400,900,'#orb=ORB10&t=abc');
  console.log('A junk t',JSON.stringify(await pg.evaluate(()=>({TA:Math.round(__viewer.S.TA),tmin:Math.round(__viewer.SG.tmin)}))));
  await pg.close();
  for(const [W,H] of [[1400,900],[1024,700]]){
    pg=await mk(W,H,'#orb=ORB08');
    const r=await pg.evaluate(()=>{const l=document.querySelector('#legend');return {cmp:l.classList.contains('cmp'),h:l.offsetHeight,u:getComputedStyle(document.documentElement).getPropertyValue('--u')}});console.log(W,'legend',JSON.stringify(r));
    if(W<1100){await pg.click('#legend .lgb');await pg.waitForTimeout(500);console.log(W,'legend open',JSON.stringify(await pg.evaluate(()=>({open:document.querySelector('#legend').classList.contains('open'),h:document.querySelector('#legend').offsetHeight}))));await pg.screenshot({path:base+'n16_'+W+'_key.png'});await pg.click('#legend .lgb')}
    await pg.click('#sideTog');await pg.waitForTimeout(1500);
    console.log(W,'side hidden',JSON.stringify(await pg.evaluate(()=>({side:document.querySelector('#side').hidden,stageW:document.querySelector('#stage').clientWidth,sideW:getComputedStyle(document.querySelector('#app')).getPropertyValue('--sideW')}))));
    await pg.screenshot({path:base+'n16_'+W+'_noside.png'});
    await pg.reload();await pg.waitForTimeout(15000);
    console.log(W,'persisted',JSON.stringify(await pg.evaluate(()=>({side:document.querySelector('#side').hidden}))));
    await pg.close();}
  console.log('errs',errs.length,errs.slice(0,3));await b.close();
})();
