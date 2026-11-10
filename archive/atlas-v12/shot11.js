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
  const r=await pg.evaluate(async()=>{const V=__viewer;const a=V.TJ.geo.attributes.position.array,m=a.length/6;let maxA=0,maxAatR=0,cont=0,nbad=0,big=0,maxHi=0,maxHiR=0;
    for(let i=1;i<m;i++){const o=6*i,pr=6*(i-1);
      const ex=a[pr+3]-a[o],ey=a[pr+4]-a[o+1],ez=a[pr+5]-a[o+2];
      if(Math.hypot(ex,ey,ez)>1e-4){continue}
      const d1=[a[pr+3]-a[pr],a[pr+4]-a[pr+1],a[pr+5]-a[pr+2]],d2=[a[o+3]-a[o],a[o+4]-a[o+1],a[o+5]-a[o+2]];
      const n1=Math.hypot(...d1),n2=Math.hypot(...d2);if(n1<1e-6||n2<1e-6)continue;
      const c=(d1[0]*d2[0]+d1[1]*d2[1]+d1[2]*d2[2])/(n1*n2);const ang=Math.acos(Math.min(1,Math.max(-1,c)))*180/Math.PI;const R=Math.hypot(a[o],a[o+1],a[o+2]);
      cont++;if(R<10&&ang>maxA){maxA=ang;maxAatR=R}if(R>=10&&ang>maxHi){maxHi=ang;maxHiR=R}if(ang>20)big++}
    return {segments:m,joined:cont,maxCornerDegBelow10Rj:+maxA.toFixed(2),atR:+maxAatR.toFixed(2),maxCornerDegAbove10Rj:+maxHi.toFixed(1),atR2:+maxHiR.toFixed(1),over20deg:big,n:V.TJ.n}});
  console.log('trace',JSON.stringify(r));
  console.log('errs',errs.length,errs.slice(0,3));
  await b.close();
})();
