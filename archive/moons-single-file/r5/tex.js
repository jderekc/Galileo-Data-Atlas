/* ---- pure texture data (no DOM): runs on the main thread (LOW, HIGH interim) and inside Web Workers (HIGH 2048-px set) ---- */
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
function cratersPL(seed,n,rmin,rmax){const k='PL'+seed+'/'+n;if(CRC[k])return CRC[k];const c=new Float32Array(n*4),lr=Math.log(rmax/rmin);for(let i=0;i<n;i++){const a=hash(i,1,seed)*TAU,b=Math.asin(2*hash(i,2,seed)-1),r=rmin*Math.exp(lr*Math.pow(hash(i,3,seed),3.5)),cb=Math.cos(b);c[4*i]=cb*Math.cos(a);c[4*i+1]=cb*Math.sin(a);c[4*i+2]=Math.sin(b);c[4*i+3]=r}return CRC[k]=c}
function rowCand(C,pz,k,buf){let m=0;const n=C.length>>2;for(let i=0;i<n;i++)if(Math.abs(pz-C[4*i+2])<=C[4*i+3]*k)buf[m++]=i;return m}
/* HIGH craters: bowl, raised rim, and for a hash-chosen fraction bright ejecta with rays (all illustrative). o[0]=height change, o[1]=brightening, o[2]=floor depth 0..1 */
function craterHi(C,cand,nc,px,py,pz,seed,young,o){let dh=0,br=0,fl=0;for(let ii=0;ii<nc;ii++){const i=cand[ii],r=C[4*i+3],cx=C[4*i],cy=C[4*i+1],cz=C[4*i+2];const d2=2-2*(px*cx+py*cy+pz*cz),lim=r*2.6;if(d2>lim*lim)continue;const t=Math.sqrt(d2>0?d2:0)/r;
    if(t<1){dh-=(1-t*t)*.55;if(1-t>fl)fl=1-t}
    const e=(t-1)/.16;if(e>-3&&e<3)dh+=.5*Math.exp(-e*e);
    if(hash(i,5,seed)<young){if(t<1)br+=.55;else{const ray=.35+.65*vnoise(Math.atan2(py-cy,px-cx)*5+i*3.1,i,seed+3),k=1-(t-1)/1.6;br+=.6*k*k*ray}}
    else if(t>.8&&t<1.25)br+=.12*(1-Math.abs(t-1.02)/.23)}
  o[0]=dh;o[1]=br;o[2]=fl}
function hiRow(kind,sd,lat,R){R.pz=Math.sin(lat);R.cl=Math.cos(lat);
  if(!R.init){R.init=1;R.o=[0,0,0];
    if(kind==='GANYMEDE'){R.A=craters(sd,180,.015,.08);R.B=cratersPL(sd+100,2600,.0025,.03)}
    else if(kind==='CALLISTO'){R.A=craters(sd,420,.015,.07);R.B=cratersPL(sd+100,6000,.0025,.035)}
    else if(kind==='EUROPA'){R.A=cratersPL(sd+100,40,.004,.03)}
    else if(kind==='AMALTHEA'){R.A=craters(sd,40,.08,.3);R.B=cratersPL(sd+100,300,.01,.08)}
    else if(kind==='IO'){const n=120,S=new Float32Array(n*4);for(let i=0;i<n;i++){const a=hash(i,7,sd)*TAU,bb=Math.asin(2*hash(i,8,sd)-1)*.85,cb=Math.cos(bb);S[4*i]=cb*Math.cos(a);S[4*i+1]=cb*Math.sin(a);S[4*i+2]=Math.sin(bb);S[4*i+3]=i<16?.03+.07*hash(i,9,sd):.006+.02*Math.pow(hash(i,9,sd),2)}R.S=S;R.ns=n}   /* first 16 spots at the LOW-tier positions */
    if(kind==='EUROPA'){const n=110,L=new Float32Array(n*8);for(let i=0;i<n;i++){const a=hash(i,4,sd)*TAU,bb=Math.asin(2*hash(i,5,sd)-1),cb=Math.cos(bb);const nx=cb*Math.cos(a),ny=cb*Math.sin(a),nz=Math.sin(bb);
        let ux=ny*.3-nz*.8,uy=nz*.5-nx*.3,uz=nx*.8-ny*.5;const rot=hash(i,11,sd)*TAU;const vx=ny*uz-nz*uy,vy=nz*ux-nx*uz,vz=nx*uy-ny*ux;ux=ux*Math.cos(rot)+vx*Math.sin(rot);uy=uy*Math.cos(rot)+vy*Math.sin(rot);uz=uz*Math.cos(rot)+vz*Math.sin(rot);const ul=Math.hypot(ux,uy,uz)||1;
        L[8*i]=nx;L[8*i+1]=ny;L[8*i+2]=nz;L[8*i+3]=i<15?(.008+.03*hash(i,6,sd))*.38:.001+.0035*hash(i,6,sd);L[8*i+4]=ux/ul;L[8*i+5]=uy/ul;L[8*i+6]=uz/ul;L[8*i+7]=Math.cos(i<15?1.1+1.4*hash(i,12,sd):.2+.8*hash(i,12,sd))}R.L=L;R.nl=n}   /* first 15 lineae lie on the LOW-tier great circles (narrower, and cut to arcs); the rest are short thin arcs */
    if(R.A)R.ca=new Int32Array(R.A.length>>2);if(R.B)R.cb=new Int32Array(R.B.length>>2)}
  if(R.A)R.na=rowCand(R.A,R.pz,2.6,R.ca);if(R.B)R.nb=rowCand(R.B,R.pz,2.6,R.cb)}
/* HIGH-tier surface colour per body: the LOW-tier pattern (same seeds, same large features) with soft edges, more octaves and small-scale detail; illustrative, not imagery */
function bodyHi(kind,sd,lon,lat,R,out){const cl=R.cl,px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=R.pz,o=R.o;let r,g,b,h=.5;const fine=sfbm(lon,lat,sd+40,4,70)-.5;
  if(kind==='IO'){const n=sfbm(lon,lat,sd,7,2.2),n2=sfbm(lon,lat,sd+5,7,5),n3=sfbm(lon,lat,sd+9,6,11),pol=Math.pow(Math.abs(lat)/(Math.PI/2),2.2);
    const t=clamp((n-.35)*3,0,1);r=.95-.08*t;g=.86-.26*t;b=.42-.2*t;let k=ss(.55,.61,n3);r+=(.82-r)*k;g+=(.82-g)*k;b+=(.38-b)*k;
    k=ss(.545,.68,n2);r+=(.95-r)*k;g+=(.95-g)*k;b+=(.90-b)*k;
    r=r*(1-.45*pol)+.55*pol*.9;g=g*(1-.5*pol)+.5*pol*.42;b=b*(1-.5*pol)+.5*pol*.22;
    const m=1+.16*fine;r*=m;g*=m;b*=m;h=n*.5+n2*.3+fine*.25;const S=R.S;
    for(let i=0;i<R.ns;i++){const rr=S[4*i+3],cz=S[4*i+2];if(Math.abs(pz-cz)>rr*3)continue;const cx=S[4*i],cy=S[4*i+1];const d2=2-2*(px*cx+py*cy+pz*cz);if(d2>9*rr*rr)continue;const dd=Math.sqrt(d2>0?d2:0),irr=1+.7*(vnoise(Math.atan2(py-cy,px-cx)*1.5+i*7,i,sd)-.5),rc=rr*.45*irr;
      if(i<5&&dd>rc){let kk=clamp(1-(dd-rr*.5)/(rr*2.1),0,1)*(.5+.5*vnoise(dd*40,i*3,sd));kk=ss(.2,.55,kk)*.85;r+=(.82-r)*kk;g+=(.22-g)*kk;b+=(.10-b)*kk}
      else if(i>=5&&i<40&&dd>rc&&dd<rc*2.4){const kk=.35*(1-(dd-rc)/(rc*1.4));r+=(.93-r)*kk;g+=(.90-g)*kk;b+=(.80-b)*kk}
      const kd=1-ss(rc*.75,rc*1.3,dd);if(kd>0){const q2=dd/rc,dk=.12+.1*q2*q2;r+=(dk*1.1-r)*kd;g+=(dk*.75-g)*kd;b+=(dk*.55-b)*kd;h-=.25*kd}}}
  else if(kind==='EUROPA'){const n=sfbm(lon,lat,sd,7,4),m=sfbm(lon,lat,sd+3,7,5);r=.88+.08*n;g=.87+.08*n;b=.86+.07*n;
    let k=ss(.55,.70,m)*.8;r+=(.68-r)*k;g+=(.54-g)*k;b+=(.44-b)*k;
    const wob=1+.3*(vnoise(lon*3,lat*3,sd)-.5),wob2=sfbm(lon,lat,sd+50,3,9)-.5,L=R.L;let line=0,core=0;
    for(let i=0;i<R.nl;i++){const j=8*i,w=L[j+3];let dist=px*L[j]+py*L[j+1]+pz*L[j+2];if(i>=15)dist+=wob2*w*3*((i&1)?1:-1);dist=Math.abs(dist)*wob;if(dist>=w)continue;let v=1-dist/w;
      const win=ss(L[j+7]-.12,L[j+7]+.02,px*L[j+4]+py*L[j+5]+pz*L[j+6]);v*=(i>=15?.7:.95)*win;if(i<15&&w>.0095){const cv=(1-ss(.18,.32,dist/w))*win;if(cv>core)core=cv}
      if(v>line)line=v}
    k=ss(.1,.55,line)*.9;r+=(.60-.1*line-r)*k;g+=(.44-.08*line-g)*k;b+=(.34-.05*line-b)*k;if(core>0){r+=(.78-r)*core;g+=(.70-g)*core;b+=(.62-b)*core}
    const mm=1+.07*fine;r*=mm;g*=mm;b*=mm;h=.5+.2*n-.4*line*k+.2*fine;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd+100,.35,o);h+=o[0]*.25;k=Math.min(1,o[1]);r+=(.97-r)*k;g+=(.97-g)*k;b+=(.97-b)*k;k=.3*o[2];r+=(.6-r)*k;g+=(.48-g)*k;b+=(.4-b)*k}
  else if(kind==='GANYMEDE'){const n=sfbm(lon,lat,sd,7,2.2),g2=sfbm(lon,lat,sd+9,5,12),g3=sfbm(lon,lat,sd+21,2,4),kb=ss(.475,.505,n);
    const cid=Math.floor(g3*16),ga=hash(cid,1,sd)*TAU,gz=hash(cid,2,sd)*1.6-.8,gc=Math.sqrt(1-gz*gz),u=px*gc*Math.cos(ga)+py*gc*Math.sin(ga)+pz*gz,gf=110+90*hash(cid,3,sd),gr=.5+.5*Math.sin(u*gf+g2*5),gr2=.5+.5*Math.sin(u*gf*3.7+g2*11);   /* sets of parallel grooves, one direction per noise cell */
    const gv=.62*gr+.38*gr2;r=(.40+.07*g2)*(1-kb)+(.60+.08*gv)*kb;g=(.35+.06*g2)*(1-kb)+(.58+.07*gv)*kb;b=(.30+.05*g2)*(1-kb)+(.54+.07*gv)*kb;h=.4*(1-kb)+(.6+.09*gv)*kb+.15*fine;
    const mm=1+.10*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.14,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.07,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.2*fl;r*=k;g*=k;b*=k;k=Math.min(1,br);r+=(.90-r)*k;g+=(.90-g)*k;b+=(.88-b)*k;h+=dh*.3;
    const pol=Math.max(0,Math.abs(lat)-52*RAD)/(38*RAD)*(.6+.4*g2);r+=.22*pol;g+=.22*pol;b+=.25*pol}
  else if(kind==='CALLISTO'){const n=sfbm(lon,lat,sd,7,3);r=.35+.09*n;g=.29+.08*n;b=.24+.07*n;h=.5+.1*n+.15*fine;const mm=1+.12*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.08,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.3,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.18*fl;r*=k;g*=k;b*=k;k=Math.min(1,br*.9);r+=(.80-r)*k;g+=(.77-g)*k;b+=(.72-b)*k;h+=dh*.3;
    const dd=Math.acos(clamp(cl*Math.cos(lon-1.2)*Math.cos(.3)+Math.sin(lat)*Math.sin(.3),-1,1));if(dd<.5){const ring=.5+.5*Math.cos(dd*40),fade=1-dd/.5;k=1-ss(.05,.1,dd);r+=(.58-r)*k;g+=(.53-g)*k;b+=(.47-b)*k;const m2=1+.38*ss(.6,.95,ring)*fade*(1-k);r*=m2;g*=m2;b*=m2*.98;h+=.12*ring*fade}}
  else if(kind==='AMALTHEA'){const n=sfbm(lon,lat,sd,6,3);r=.36+.12*n;g=.20+.07*n;b=.13+.05*n;h=.5+.5*n+.2*fine;const mm=1+.14*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.12,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.08,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.22*fl;r*=k;g*=k;b*=k;k=Math.min(1,br*.8);r+=(.62-r)*k;g+=(.54-g)*k;b+=(.45-b)*k;h+=dh*.4;
    {const dx=(lon-2.6)/.28,dy=(lat-.2)/.11;k=(1-ss(.5,1.1,dx*dx+dy*dy+.5*fine))*.7}r+=(.60-r)*k;g+=(.52-g)*k;b+=(.44-b)*k}
  else{const c=jupColor(lon,lat,sd,0,1);r=c[0];g=c[1];b=c[2];h=c[3]}
  out[0]=r;out[1]=g;out[2]=b;out[3]=h}
function texData(sp){const W=sp.W,H=sp.H,hi=!!sp.hi,d=new Uint8ClampedArray(W*H*4),hgt=new Float32Array(W*H);
  if(sp.type!=='body'){latE=sp.lat;wlonE=sp.wlon;const half=sp.half,near=sp.type==='near',QQ=hi?(v=>v):(v=>q(v,26));
    for(let y=0;y<H;y++){const lat=(sp.lat+half-2*half*(y+.5)/H)*RAD;for(let x=0;x<W;x++){const lon=((-sp.wlon-half+2*half*(x+.5)/W)*RAD+Math.PI);const cc=jupColor(lon,lat,83,3,hi);let m=1,gr=0;
      if(near){gr=(fbm(lon*2500,lat*2500,91,4)-.5)*1.6+(fbm(lon*9000,lat*9000,93,3)-.5)*.8+(fbm(lon*300+lat*40,lat*4000,95,3)-.5)*1.2;m=1+.22*gr}
      const o=4*(y*W+x);d[o]=255*clamp(QQ(cc[0]*m),0,1);d[o+1]=255*clamp(QQ(cc[1]*m),0,1);d[o+2]=255*clamp(QQ(cc[2]*m),0,1);d[o+3]=255;hgt[y*W+x]=cc[3]+(near?.3*gr:0)}}
    return {rgba:d,hgt,W,H}}
  const kind=sp.kind,sd={IO:11,EUROPA:23,GANYMEDE:37,CALLISTO:51,AMALTHEA:67,JUPITER:83}[kind]||1,R={},out=[0,0,0,0];
  for(let y=0;y<H;y++){const lat=(0.5-(y+.5)/H)*Math.PI;if(hi)hiRow(kind,sd,lat,R);for(let x=0;x<W;x++){const lon=((x+.5)/W)*TAU;let r,gg,b,h=0;const o=4*(y*W+x);
    if(hi){bodyHi(kind,sd,lon,lat,R,out);d[o]=255*clamp(out[0],0,1);d[o+1]=255*clamp(out[1],0,1);d[o+2]=255*clamp(out[2],0,1);d[o+3]=255;hgt[y*W+x]=out[3];continue}
__OLD_INNER__
    d[o]=255*clamp(q(r,14),0,1);d[o+1]=255*clamp(q(gg,14),0,1);d[o+2]=255*clamp(q(b,14),0,1);d[o+3]=255;hgt[y*W+x]=h}}
  return {rgba:d,hgt,W,H}}
function toTex(r){const c=mkCanvas(r.W,r.H);c.getContext('2d').putImageData(new ImageData(r.rgba,r.W,r.H),0,0);return {canvas:c,hgt:r.hgt,W:r.W,H:r.H}}
function nearTexture(latDeg,wlonDeg,half,W,H){return toTex(texData({type:'near',lat:latDeg,wlon:wlonDeg,half,W,H}))}
function capTexture(latDeg,wlonDeg,half,W,H){return toTex(texData({type:'cap',lat:latDeg,wlon:wlonDeg,half,W,H}))}
function texture(kind,W,H){return toTex(texData({type:'body',kind,W,H}))}
function mkTex(canvas,srgb){const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.NearestFilter;t.minFilter=TIER==='HIGH'?THREE.LinearMipmapLinearFilter:THREE.NearestFilter;t.generateMipmaps=TIER==='HIGH';t.anisotropy=1;if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return t}
/* HIGH 2048-px set: linear magnification, mipmaps, anisotropy up to 8 */
function mkTexHi(canvas,srgb){const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,R_.capabilities.getMaxAnisotropy());if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return t}
/* HIGH texture jobs: built off the main thread in Web Workers (function sources passed as a blob); the 512-px / 1024-px interim textures stay on screen until each job lands.
   If Workers are unavailable the jobs run one at a time on the main thread (the page stalls for the length of each job). */
const HI_W=2048, HIQ={jobs:[],workers:[],ok:true,inited:false,done:0};
function hiInit(){if(HIQ.inited)return;HIQ.inited=true;
  try{const src='"use strict";const TAU=Math.PI*2,RAD=Math.PI/180,CRC={};let latE=0,wlonE=0;const clamp='+clamp.toString()+';const q='+q.toString()+';const ss='+ss.toString()+';'+[hash,vnoise,fbm,sfbm,craters,craterField,cratersPL,rowCand,craterHi,hiRow,bodyHi,jupColor,texData,normalData].map(f=>f.toString()).join('\n')+'\nonmessage=function(e){const sp=e.data,r=texData(sp),n=normalData(r.hgt,r.W,r.H,sp.ns);postMessage({key:sp.key,W:r.W,H:r.H,rgba:r.rgba,nrm:n},[r.rgba.buffer,n.buffer])}';
    const url=URL.createObjectURL(new Blob([src],{type:'application/javascript'}));const nw=clamp((navigator.hardwareConcurrency||2)-1,1,3);
    for(let i=0;i<nw;i++){const w=new Worker(url);w.busy=null;w.onmessage=e=>{const j=w.busy;w.busy=null;hiDone(j,e.data);hiPump()};w.onerror=e=>{e.preventDefault&&e.preventDefault();HIQ.ok=false;const j=w.busy;w.busy=null;if(j){j.started=false}hiPump()};HIQ.workers.push(w)}}
  catch(e){HIQ.ok=false}}
function hiDone(j,r){const mk=a=>{const c=mkCanvas(r.W,r.H);c.getContext('2d').putImageData(new ImageData(a,r.W,r.H),0,0);return c};const tx={canvas:mk(r.rgba),ncanvas:mk(r.nrm),W:r.W,H:r.H};TEXCACHE[j.key]=tx;HIQ.done++;const i=HIQ.jobs.indexOf(j);if(i>=0)HIQ.jobs.splice(i,1);j.subs.forEach(f=>f(tx))}
function hiPump(){if(!HIQ.ok){const j=HIQ.jobs.find(j=>!j.started);if(j&&!HIQ.sync){j.started=true;HIQ.sync=setTimeout(()=>{HIQ.sync=0;const r=texData(j.spec);hiDone(j,{W:r.W,H:r.H,rgba:r.rgba,nrm:normalData(r.hgt,r.W,r.H,j.spec.ns)});hiPump()},30)}return}
  for(const w of HIQ.workers){if(w.busy)continue;const j=HIQ.jobs.find(j=>!j.started);if(!j)return;j.started=true;w.busy=j;w.postMessage(j.spec)}}
function hiRequest(spec,apply){const tx=TEXCACHE[spec.key];if(tx){apply(tx);return}hiInit();let j=HIQ.jobs.find(j=>j.key===spec.key);if(!j){j={key:spec.key,spec,subs:[],started:false};HIQ.jobs.push(j)}j.subs.push(apply);hiPump()}
function hiCancel(){HIQ.jobs=HIQ.jobs.filter(j=>{j.subs=[];return j.started})}   /* scene change: drop queued jobs, let running ones finish into the cache */
function hiSwap(mat,tx){const om=mat.map,on=mat.normalMap;mat.map=mkTexHi(tx.canvas,true);mat.normalMap=mkTexHi(tx.ncanvas,false);if(om)om.dispose();if(on)on.dispose();mat.needsUpdate=true}
