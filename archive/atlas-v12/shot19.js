const { chromium } = require('playwright');
const base='/tmp/claude-0/-home-claude/59c9c79e-97f6-546e-8abd-eade5ba1a35d/scratchpad/viewer/';
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle']});
  const errs=[];
  for(const [W,H] of [[1024,700],[1100,800],[1280,720],[390,844]]){
  const pg=await (await b.newContext({viewport:{width:W,height:H}})).newPage();
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('**/*',route=>{const u=route.request().url();
    if(u.includes('three.min.js')) return route.fulfill({path:base+'npm/node_modules/three/build/three.min.js',contentType:'application/javascript'});
    if(u.includes('OrbitControls.js')) return route.fulfill({path:base+'npm/node_modules/three/examples/js/controls/OrbitControls.js',contentType:'application/javascript'});
    if(u.startsWith('file://')||u.startsWith('data:')) return route.continue(); return route.abort();});
  await pg.goto('file://'+base+'viewer_wrapped.html'); await pg.waitForTimeout(15000);
  const r=await pg.evaluate(()=>{const sizes={};document.querySelectorAll('body *').forEach(e=>{if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;const cs=getComputedStyle(e);if(cs.display==='none'||e.closest('[hidden]'))return;const f=parseFloat(cs.fontSize);const k=f.toFixed(1);sizes[k]=(sizes[k]||0)+1});
    const mn=Math.min(...Object.keys(sizes).map(Number));
    const lg=document.querySelector('#legend'),dk=document.querySelector('#dock').getBoundingClientRect();
    const t=document.querySelector('#sideTog');
    return {minFont:mn,sizes:Object.entries(sizes).filter(([k])=>+k<11).map(([k,v])=>k+'px×'+v).join(' '),dockBottom:Math.round(dk.bottom),vh:innerHeight,sideTogVisible:!!t.offsetParent,keyH:lg.querySelector('.lgb')?lg.querySelector('.lgb').offsetHeight:0,cmp:lg.classList.contains('cmp'),
      runLabel:getComputedStyle(document.querySelector('#runGrp .gl')).display,layLabel:getComputedStyle(document.querySelector('.gl.lay')).display}});
  let tabs=-1;await pg.focus('#gl').catch(()=>{});for(let i=1;i<=40;i++){await pg.keyboard.press('Tab');const id=await pg.evaluate(()=>document.activeElement.id);if(id==='sideTog'){tabs=i;break}}
  // from document start
  await pg.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0)});let fromTop=-1;for(let i=1;i<=40;i++){await pg.keyboard.press('Tab');const id=await pg.evaluate(()=>document.activeElement.id);if(id==='sideTog'){fromTop=i;break}}
  console.log(W,JSON.stringify(r),'tabs from canvas',tabs,'from top',fromTop);
  await pg.screenshot({path:base+'n19_'+W+'.png'});await pg.close();}
  console.log('errs',errs.length,errs.slice(0,2));await b.close();
})();
