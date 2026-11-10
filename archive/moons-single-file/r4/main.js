
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const P=JSON.parse($('#pack').textContent);
const RJ=P.meta.RJ_km, RAD=Math.PI/180, TAU=Math.PI*2;
const MOONS={}; P.moons.forEach(m=>MOONS[m.key]=m);
const MK4=['IO','EUROPA','GANYMEDE','CALLISTO'];
const JUP_REQ=P.probe.orbtrtrj.jup_req_km, JUP_RPOL=P.probe.orbtrtrj.jup_rpol_km;     /* ORBTRTRJ.TAB bodies table */
const SUN_REQ=P.probe.orbtrtrj.sun_req_km, SUN_DIST=P.probe.orbtrtrj.sun_dist_km[0];   /* ORBTRTRJ.TAB bodies table / first row */
const AU=149597870.7;                                                                /* IAU 2012 Resolution B2 (definition) */
const SUN_ANG=2*Math.asin(SUN_REQ/SUN_DIST), SUN_REL=(AU/SUN_DIST)**2;
const EXPOSURE_GAIN=1/SUN_REL;                 /* tone-mapping gain so that an albedo-1 surface renders near 1.0; stated in the sources panel */
const fmtUTC=ms=>new Date(ms).toISOString().replace('T',' ').slice(0,19);
const f=(x,d=1)=>Number(x).toFixed(d);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function bis(a,t){let lo=0,hi=a.length-1;if(t<=a[0])return 0;if(t>=a[hi])return Math.max(0,hi-1);while(hi-lo>1){const m=(lo+hi)>>1;if(a[m]<=t)lo=m;else hi=m}return lo}
function lerp(ts,v,t){if(ts.length<2)return v[0];const i=bis(ts,t),fr=clamp((t-ts[i])/(ts[i+1]-ts[i]||1),0,1);return v[i]+(v[i+1]-v[i])*fr}
function lerpA(ts,v,t){if(ts.length<2)return v[0];const i=bis(ts,t),fr=clamp((t-ts[i])/(ts[i+1]-ts[i]||1),0,1);let d=v[i+1]-v[i];d-=360*Math.round(d/360);return v[i]+d*fr}
function lerp3(ts,v,t,out){if(ts.length<2){out.set(v[0][0],v[0][1],v[0][2]);return out}const i=bis(ts,t),fr=clamp((t-ts[i])/(ts[i+1]-ts[i]||1),0,1),a=v[i],b=v[i+1];return out.set(a[0]+(b[0]-a[0])*fr,a[1]+(b[1]-a[1])*fr,a[2]+(b[2]-a[2])*fr)}
const sph=(R,lat,az,out)=>{const la=lat*RAD,a=az*RAD;return out.set(R*Math.cos(la)*Math.cos(a),R*Math.cos(la)*Math.sin(a),R*Math.sin(la))};

/* ---------------- renderer + tier ---------------- */
const cv=$('#gl'); let R_;
let GLINFO='unknown';
try{const g=cv.getContext('webgl2')||cv.getContext('webgl');const ext=g&&g.getExtension('WEBGL_debug_renderer_info');if(ext)GLINFO=g.getParameter(ext.UNMASKED_RENDERER_WEBGL)||'unknown';}catch(e){}
const SOFT=/swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(GLINFO);
let TIER_PREF='auto', TIER=SOFT?'LOW':'HIGH';
try{R_=new THREE.WebGLRenderer({canvas:cv,antialias:!SOFT,alpha:false,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}catch(e){$('#gate').style.display='flex';}
if(!R_)return;
$('#rend').textContent=GLINFO.slice(0,38);
R_.setClearColor(0x06080e,1);R_.outputEncoding=THREE.sRGBEncoding;
function applyTier(){
  R_.setPixelRatio(TIER==='HIGH'?Math.min(devicePixelRatio||1,2):1);
  R_.toneMapping=TIER==='HIGH'?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
  R_.toneMappingExposure=TIER==='HIGH'?1.0:1.0;
  $('#tierName').textContent=TIER+(TIER_PREF==='auto'?' (auto)':'');
  $('#tierAuto').setAttribute('aria-pressed',TIER_PREF==='auto');$('#tierLow').setAttribute('aria-pressed',TIER_PREF==='LOW');$('#tierHigh').setAttribute('aria-pressed',TIER_PREF==='HIGH');
}
/* frame-time probe: 10 frames of a 16k-triangle sphere; if slow, drop to LOW */
function probeFrameTime(){const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,1,.1,100);cam.position.z=3;const m=new THREE.Mesh(new THREE.SphereGeometry(1,128,64),new THREE.MeshStandardMaterial({color:0x888888}));sc.add(m);sc.add(new THREE.DirectionalLight(0xffffff,1));
  R_.setSize(256,256,false);const t0=performance.now();for(let i=0;i<10;i++){m.rotation.y+=.1;R_.render(sc,cam)}R_.getContext().finish&&R_.getContext().finish();const dt=(performance.now()-t0)/10;m.geometry.dispose();m.material.dispose();return dt}
const PROBE_MS=probeFrameTime();
if(TIER_PREF==='auto')TIER=(SOFT||PROBE_MS>40)?'LOW':'HIGH';
applyTier();

/* ---------------- procedural textures (illustrative) ---------------- */
function hash(x,y,s){let h=(x*374761393+y*668265263+s*1442695041)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,oct){let v=0,amp=.5,fr=1;for(let i=0;i<oct;i++){v+=amp*vnoise(x*fr,y*fr,s+i*17);amp*=.5;fr*=2}return v}
/* spherical wrap: sample noise on the unit sphere so the texture has no seam */
function sfbm(lon,lat,s,oct,sc){const cl=Math.cos(lat);const x=cl*Math.cos(lon),y=cl*Math.sin(lon),z=Math.sin(lat);let v=0,amp=.5,fr=sc;for(let i=0;i<oct;i++){v+=amp*(vnoise(x*fr+7,y*fr+3,s+i*31)*.5+vnoise(y*fr+1,z*fr+5,s+i*31+7)*.5);amp*=.5;fr*=2}return v}
const q=(v,n)=>Math.round(v*n)/n;   /* colour quantisation for the voxel look */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
/* height -> normal map (tangent space), nearest filtered */
function normalData(hgt,w,h,strength){const d=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=hgt[y*w+(x+w-1)%w],r=hgt[y*w+(x+1)%w],u=hgt[Math.max(0,y-1)*w+x],dn=hgt[Math.min(h-1,y+1)*w+x];
    let nx=-(r-l)*strength,ny=(dn-u)*strength,nz=1;const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const o=4*(y*w+x);d[o]=128+127*nx;d[o+1]=128+127*ny;d[o+2]=128+127*nz;d[o+3]=255}
  return d}
function normalFromHeight(hgt,w,h,strength){const c=mkCanvas(w,h);c.getContext('2d').putImageData(new ImageData(normalData(hgt,w,h,strength),w,h),0,0);return c}
const CRC={};
function craters(seed,n,rmin,rmax){const k=seed+'/'+n;if(CRC[k])return CRC[k];const c=new Float32Array(n*4);for(let i=0;i<n;i++){const a=hash(i,1,seed)*TAU,b=Math.asin(2*hash(i,2,seed)-1),r=rmin+(rmax-rmin)*hash(i,3,seed)**2,cb=Math.cos(b);c[4*i]=cb*Math.cos(a);c[4*i+1]=cb*Math.sin(a);c[4*i+2]=Math.sin(b);c[4*i+3]=r}return CRC[k]=c}
function craterField(lon,lat,seed,n,rmin,rmax){ /* returns [depth(-1..1 rim/bowl), coverage] from n pseudo-random craters on the sphere */
  let dep=0,hit=0;const cl=Math.cos(lat),px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=Math.sin(lat),C=craters(seed,n,rmin,rmax);
  for(let i=0;i<n;i++){const r=C[4*i+3];if(Math.abs(pz-C[4*i+2])>r)continue;const d=Math.acos(clamp(px*C[4*i]+py*C[4*i+1]+pz*C[4*i+2],-1,1));if(d<r){const t=d/r;dep+= t<.75?-(1-t/.75)*.8:(1-(t-.75)/.25)*.6;hit=1}}
  return [dep,hit]}
/* JUPITER colour: banded zones and belts with turbulence; illustrative, no real feature positions. extra = additional fine octaves for the local cap */
function jupColor(lon,lat,sd,extra,hi){const warp=sfbm(lon,lat,sd,3,3)-.5;const L=lat+warp*.08;const band=Math.sin(L*11+1.3)+.6*Math.sin(L*23+.4);const tur=sfbm(lon*2,lat,sd+4,3,8);
  let fine=sfbm(lon*3,lat*3,sd+8,3,40)-.5;if(hi)fine+=.8*(sfbm(lon*4,lat*14,sd+60,4,50)-.5);if(extra){ /* cap only: zonal streaks (noise stretched 12:1 along longitude), a few eddies and small cloud grain, at 30–600 km scales; illustrative */
    const w2=fbm(lon*40,lat*40,sd+12,3)-.5;const streak=fbm(lon*18+w2*2,lat*220+w2*6,sd+16,4)-.5;const grain=fbm(lon*600,lat*600,sd+20,3)-.5;
    let eddy=0;for(let i=0;i<9;i++){const ex=(hash(i,1,sd+30)-.5)*.35+(-wlonE*RAD),ey=(hash(i,2,sd+30)-.5)*.35+latE*RAD,rx=.006+.02*hash(i,3,sd+30),ry=rx*(.45+.3*hash(i,4,sd+30));const dx=((lon-Math.PI-ex+Math.PI)%TAU+TAU)%TAU-Math.PI,dy=lat-ey;const dd=Math.hypot(dx/rx,dy/ry);if(dd<1)eddy+=(.6-.5*dd)*(i%3?1:-.7)}
    fine=fine*1.2+4.2*streak+1.3*grain+2.5*eddy}
  const zone=band>0;const r=zone?.88+.08*tur+.07*fine:.66+.08*tur+.07*fine,gg=zone?.80+.07*tur+.06*fine:.47+.07*tur+.06*fine,b=zone?.68+.05*tur+.045*fine:.35+.05*tur+.035*fine;const pol=Math.abs(lat)>1.2?.85:1;return [r*pol,gg*pol,b*(pol<1?.9:1),.5+.3*fine]}
/* local cap texture: a lat/lon window of the same Jupiter colour function with finer octaves (illustrative) */
let latE=0,wlonE=0;
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
    if(kind==='EUROPA'){const n=85,L=new Float32Array(n*8);for(let i=0;i<n;i++){const a=hash(i,4,sd)*TAU,bb=Math.asin(2*hash(i,5,sd)-1),cb=Math.cos(bb);const nx=cb*Math.cos(a),ny=cb*Math.sin(a),nz=Math.sin(bb);
        let ux=ny*.3-nz*.8,uy=nz*.5-nx*.3,uz=nx*.8-ny*.5;const rot=hash(i,11,sd)*TAU;const vx=ny*uz-nz*uy,vy=nz*ux-nx*uz,vz=nx*uy-ny*ux;ux=ux*Math.cos(rot)+vx*Math.sin(rot);uy=uy*Math.cos(rot)+vy*Math.sin(rot);uz=uz*Math.cos(rot)+vz*Math.sin(rot);const ul=Math.hypot(ux,uy,uz)||1;
        L[8*i]=nx;L[8*i+1]=ny;L[8*i+2]=nz;L[8*i+3]=i<15?.008+.03*hash(i,6,sd):.0012+.005*hash(i,6,sd);L[8*i+4]=ux/ul;L[8*i+5]=uy/ul;L[8*i+6]=uz/ul;L[8*i+7]=i<15?-2:Math.cos((.25+.9*hash(i,12,sd)))}R.L=L;R.nl=n}   /* first 15 lineae on the LOW-tier great circles; the rest are arcs */
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
  else if(kind==='EUROPA'){const n=sfbm(lon,lat,sd,7,4),m=sfbm(lon,lat,sd+3,7,5);r=.84+.1*n;g=.86+.09*n;b=.90+.06*n;
    let k=ss(.55,.70,m)*.9;r+=(.66-r)*k;g+=(.52-g)*k;b+=(.42-b)*k;
    const wob=1+.3*(vnoise(lon*3,lat*3,sd)-.5),wob2=sfbm(lon,lat,sd+50,3,9)-.5,L=R.L;let line=0,core=0;
    for(let i=0;i<R.nl;i++){const j=8*i,w=L[j+3];let dist=px*L[j]+py*L[j+1]+pz*L[j+2];if(i>=15)dist+=wob2*w*3*((i&1)?1:-1);dist=Math.abs(dist)*wob;if(dist>=w)continue;let v=1-dist/w;
      if(i>=15){v*=.85*ss(L[j+7]-.12,L[j+7]+.02,px*L[j+4]+py*L[j+5]+pz*L[j+6])}else if(w>.025){const cv=1-ss(.18,.32,dist/w);if(cv>core)core=cv}
      if(v>line)line=v}
    k=ss(.12,.5,line);r+=(.58-.12*line-r)*k;g+=(.44-.1*line-g)*k;b+=(.34-.06*line-b)*k;if(core>0){r+=(.78-r)*core;g+=(.70-g)*core;b+=(.62-b)*core}
    const mm=1+.07*fine;r*=mm;g*=mm;b*=mm;h=.5+.2*n-.4*line*k+.2*fine;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd+100,.35,o);h+=o[0]*.25;k=Math.min(1,o[1]);r+=(.97-r)*k;g+=(.97-g)*k;b+=(.97-b)*k;k=.3*o[2];r+=(.6-r)*k;g+=(.48-g)*k;b+=(.4-b)*k}
  else if(kind==='GANYMEDE'){const n=sfbm(lon,lat,sd,7,2.2),g2=sfbm(lon,lat,sd+9,5,12),g3=sfbm(lon,lat,sd+21,2,4),kb=ss(.475,.505,n);
    const th=g3*6,u=lon*7*Math.cos(th)+lat*9*Math.sin(th),gr=.5+.5*Math.sin((u+g2*6)*1.5),gr2=.5+.5*Math.sin((u*8+g2*20)*1.5);
    const gv=.62*gr+.38*gr2;r=(.40+.07*g2)*(1-kb)+(.60+.08*gv)*kb;g=(.35+.06*g2)*(1-kb)+(.58+.07*gv)*kb;b=(.30+.05*g2)*(1-kb)+(.54+.07*gv)*kb;h=.4*(1-kb)+(.6+.09*gv)*kb+.15*fine;
    const mm=1+.10*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.14,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.07,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.2*fl;r*=k;g*=k;b*=k;k=Math.min(1,br);r+=(.90-r)*k;g+=(.90-g)*k;b+=(.88-b)*k;h+=dh*.3;
    const pol=Math.max(0,Math.abs(lat)-52*RAD)/(38*RAD)*(.6+.4*g2);r+=.32*pol;g+=.32*pol;b+=.36*pol}
  else if(kind==='CALLISTO'){const n=sfbm(lon,lat,sd,7,3);r=.33+.09*n;g=.29+.08*n;b=.24+.07*n;h=.5+.1*n+.15*fine;const mm=1+.12*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.3,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.18,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.18*fl;r*=k;g*=k;b*=k;k=Math.min(1,br*.9);r+=(.80-r)*k;g+=(.77-g)*k;b+=(.72-b)*k;h+=dh*.3;
    const dd=Math.acos(clamp(cl*Math.cos(lon-1.2)*Math.cos(.3)+Math.sin(lat)*Math.sin(.3),-1,1));if(dd<.5){const ring=.5+.5*Math.cos(dd*40),fade=1-dd/.5;k=1-ss(.05,.1,dd);r+=(.58-r)*k;g+=(.53-g)*k;b+=(.47-b)*k;const m2=1+.38*ss(.6,.95,ring)*fade*(1-k);r*=m2;g*=m2;b*=m2*.98;h+=.12*ring*fade}}
  else if(kind==='AMALTHEA'){const n=sfbm(lon,lat,sd,6,3);r=.50+.14*n;g=.29+.09*n;b=.19+.07*n;h=.5+.5*n+.2*fine;const mm=1+.14*fine;r*=mm;g*=mm;b*=mm;
    craterHi(R.A,R.ca,R.na,px,py,pz,sd,.12,o);let dh=o[0],br=o[1],fl=o[2];craterHi(R.B,R.cb,R.nb,px,py,pz,sd+100,.08,o);dh+=o[0]*.6;br+=o[1];if(o[2]>fl)fl=o[2];
    let k=1-.22*fl;r*=k;g*=k;b*=k;k=Math.min(1,br*.8);r+=(.74-r)*k;g+=(.66-g)*k;b+=(.56-b)*k;h+=dh*.4;
    k=(1-ss(.015,.035,Math.abs(lat-.2)))*ss(1.95,2.05,lon)*(1-ss(3.15,3.25,lon));r+=(.70-r)*k;g+=(.62-g)*k;b+=(.54-b)*k}
  else{const c=jupColor(lon,lat,sd,0,1);r=c[0];g=c[1];b=c[2];h=c[3]}
  out[0]=r;out[1]=g;out[2]=b;out[3]=h}
function texData(sp){const W=sp.W,H=sp.H,hi=!!sp.hi,d=new Uint8ClampedArray(W*H*4),hgt=new Float32Array(W*H);
  if(sp.type!=='body'){latE=sp.lat;wlonE=sp.wlon;const half=sp.half,near=sp.type==='near',QQ=hi?(v=>v):(v=>q(v,26));
    for(let y=0;y<H;y++){const lat=(sp.lat+half-2*half*(y+.5)/H)*RAD;for(let x=0;x<W;x++){const lon=((-sp.wlon-half+2*half*(x+.5)/W)*RAD+Math.PI);const cc=jupColor(lon,lat,83,3);let m=1,gr=0;
      if(near){gr=(fbm(lon*2500,lat*2500,91,4)-.5)*1.6+(fbm(lon*9000,lat*9000,93,3)-.5)*.8+(fbm(lon*300+lat*40,lat*4000,95,3)-.5)*1.2;m=1+.22*gr}
      const o=4*(y*W+x);d[o]=255*clamp(QQ(cc[0]*m),0,1);d[o+1]=255*clamp(QQ(cc[1]*m),0,1);d[o+2]=255*clamp(QQ(cc[2]*m),0,1);d[o+3]=255;hgt[y*W+x]=cc[3]+(near?.3*gr:0)}}
    return {rgba:d,hgt,W,H}}
  const kind=sp.kind,sd={IO:11,EUROPA:23,GANYMEDE:37,CALLISTO:51,AMALTHEA:67,JUPITER:83}[kind]||1,R={},out=[0,0,0,0];
  for(let y=0;y<H;y++){const lat=(0.5-(y+.5)/H)*Math.PI;if(hi)hiRow(kind,sd,lat,R);for(let x=0;x<W;x++){const lon=((x+.5)/W)*TAU;let r,gg,b,h=0;const o=4*(y*W+x);
    if(hi){bodyHi(kind,sd,lon,lat,R,out);d[o]=255*clamp(out[0],0,1);d[o+1]=255*clamp(out[1],0,1);d[o+2]=255*clamp(out[2],0,1);d[o+3]=255;hgt[y*W+x]=out[3];continue}

    if(kind==='IO'){ /* yellow-orange sulfurous ground, white/grey SO2 frost, black spots, red rings (PIA01667 caption wording) */
      const n=sfbm(lon,lat,sd,4,2.2),n2=sfbm(lon,lat,sd+5,4,5),n3=sfbm(lon,lat,sd+9,3,11),pol=Math.pow(Math.abs(lat)/(Math.PI/2),2.2);
      /* three sulfurous ground tones mixed by a broad noise, then frost, then polar reddening */
      const t=clamp((n-.35)*3,0,1);r=.95-.08*t;gg=.86-.26*t;b=.42-.2*t;if(n3>.58){r=.82;gg=.82;b=.38}         /* greenish-yellow patches */
      if(n2>.60){const k=clamp((n2-.60)*12,0,1);r=r+(.95-r)*k;gg=gg+(.95-gg)*k;b=b+(.90-b)*k}                  /* frost: white */
      else if(n2>.55){r=.84;gg=.80;b=.70}                                                                 /* frost margin: grey */
      r=r*(1-.45*pol)+.55*pol*.9;gg=gg*(1-.5*pol)+.5*pol*.42;b=b*(1-.5*pol)+.5*pol*.22;                      /* polar reddish-brown */
      const cl=Math.cos(lat),px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=Math.sin(lat);
      for(let i=0;i<16;i++){const a=hash(i,7,sd)*TAU,bb=Math.asin(2*hash(i,8,sd)-1)*.85,rr=.03+.07*hash(i,9,sd);const cb=Math.cos(bb);const cx=cb*Math.cos(a),cy=cb*Math.sin(a),cz=Math.sin(bb);if(Math.abs(pz-cz)>rr*3)continue;
        const dd=Math.acos(clamp(px*cx+py*cy+pz*cz,-1,1)),irr=1+.7*(vnoise(Math.atan2(py-cy,px-cx)*1.5+i*7,i,sd)-.5);
        if(dd<rr*.45*irr){const k=dd/(rr*.45*irr);const dk=.14+.18*k*k;r=dk*1.1;gg=dk*.75;b=dk*.55}   /* dark spot (illustrative, after the caption's "black" spots), irregular outline, lighter toward the rim */
        else if(dd<rr*.6*irr){r=r*.75+.1;gg=gg*.65+.05;b=b*.6}                                            /* darkened margin */
        else if(i<5&&dd<rr*2.6){const k=clamp(1-(dd-rr*.5)/(rr*2.1),0,1)*(.5+.5*vnoise(dd*40,i*3,sd));if(k>.25){r=r*(1-k)+.82*k;gg=gg*(1-k)+.22*k;b=b*(1-k)+.10*k}}} /* diffuse red ring */
      h=n*.6+n2*.4}
    else if(kind==='EUROPA'){ /* bright icy plains, long dark/brown fractures, brown mottled areas (PIA00502 caption wording) */
      const n=sfbm(lon,lat,sd,4,4),m=sfbm(lon,lat,sd+3,4,5);r=.84+.1*n;gg=.86+.09*n;b=.90+.06*n;
      if(m>.58){const k=clamp((m-.58)*10,0,1);r=r*(1-k)+.66*k;gg=gg*(1-k)+.52*k;b=b*(1-k)+.42*k}            /* brown mottled / chaos */
      const cl=Math.cos(lat),px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=Math.sin(lat);let line=0,core=0;
      for(let i=0;i<15;i++){const a=hash(i,4,sd)*TAU,bb=Math.asin(2*hash(i,5,sd)-1),cb=Math.cos(bb);const nx=cb*Math.cos(a),ny=cb*Math.sin(a),nz=Math.sin(bb);const dist=Math.abs(px*nx+py*ny+pz*nz)*(1+.3*(vnoise(lon*3,lat*3,sd+i)-.5));const w=.008+.03*hash(i,6,sd);
        if(dist<w){line=Math.max(line,1-dist/w);if(w>.025&&dist<w*.25)core=1}}
      if(line>.3){r=.58-.12*line;gg=.44-.1*line;b=.34-.06*line;if(core){r=.78;gg=.70;b=.62}}
      h=.5+.2*n-.5*line}
    else if(kind==='GANYMEDE'){ /* dark terrain with brighter, grooved terrain and bright craters (PIA01299 wording: tectonic resurfacing brightens terrain) */
      const n=sfbm(lon,lat,sd,4,2.2),g2=sfbm(lon,lat,sd+9,2,12),g3=sfbm(lon,lat,sd+21,2,4);const bright=n>.49;
      if(bright){const gr=.5+.5*Math.sin((lon*7*Math.cos(g3*6)+lat*9*Math.sin(g3*6)+g2*6)*1.5);r=.60+.08*gr;gg=.58+.07*gr;b=.54+.07*gr;h=.6+.07*gr}else{r=.40+.07*g2;gg=.35+.06*g2;b=.30+.05*g2;h=.4}
      const [dep,hit]=craterField(lon,lat,sd,180,.015,.08);if(hit){const k=dep<0?.8:1.5;r*=k;gg*=k;b*=k;h+=dep*.3}
      const pol=Math.max(0,Math.abs(lat)-52*RAD)/(38*RAD)*(.6+.4*g2);r+=.32*pol;gg+=.32*pol;b+=.36*pol}
    else if(kind==='CALLISTO'){ /* dark, heavily cratered (PIA01299 wording) */
      const n=sfbm(lon,lat,sd,4,3);r=.34+.09*n;gg=.30+.08*n;b=.25+.07*n;h=.5+.1*n;
      const [dep,hit]=craterField(lon,lat,sd,420,.015,.07);if(hit){const k=dep<0?.8:1.8;r*=k;gg*=k;b*=k;h+=dep*.3}
      /* one large multi-ring structure, illustrative placement */
      const cl=Math.cos(lat),dd=Math.acos(clamp(cl*Math.cos(lon-1.2)*Math.cos(.3)+Math.sin(lat)*Math.sin(.3),-1,1));if(dd<.5){const ring=.5+.5*Math.cos(dd*40);if(dd<.08){r=.55;gg=.5;b=.45}else if(ring>.8){r*=1.4;gg*=1.4;b*=1.35}}}
    else if(kind==='AMALTHEA'){ /* small irregular moon with patches of relatively bright material (PIA02532 wording); red after the Voyager 1 caption P-21223C "Tiny, red Amalthea" */
      const n=sfbm(lon,lat,sd,4,3);r=.50+.12*n;gg=.29+.09*n;b=.20+.07*n;h=.5+.5*n;const [dep,hit]=craterField(lon,lat,sd,40,.08,.3);if(hit){const k=dep<0?.8:1.3;r*=k;gg*=k;b*=k;h+=dep*.4}
      if(Math.abs(lat-.2)<.03&&lon>2&&lon<3.2){r=.70;gg=.62;b=.54}}
    else { const c=jupColor(lon,lat,sd,0);r=c[0];gg=c[1];b=c[2];h=c[3]}
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

/* ---------------- voxel geometry builder (LOW craft; illustrative) ---------------- */
function Vox(){this.p=[];this.n=[];this.c=[]}
Vox.prototype.box=function(cx,cy,cz,sx,sy,sz,col){const hx=sx/2,hy=sy/2,hz=sz/2,p=this.p,n=this.n,c=this.c;
  const F=[[1,0,0,[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[-1,0,0,[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[0,1,0,[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],[0,-1,0,[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],[0,0,1,[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[0,0,-1,[[-1,1,-1],[1,1,-1],[1,-1,-1],[-1,-1,-1]]]];
  for(const [nx,ny,nz,v] of F){const idx=[0,1,2,0,2,3];for(const i of idx){const q=v[i];p.push(cx+q[0]*hx,cy+q[1]*hy,cz+q[2]*hz);n.push(nx,ny,nz);const sh=1-(nx<0?.08:0)-(ny<0?.06:0)-(nz<0?.05:0)+(ny>0?.03:0);c.push(col[0]*sh,col[1]*sh,col[2]*sh)}}};
Vox.prototype.cyl=function(cx,cy,cz,r,h,axis,col,step){ /* voxel approximation of a cylinder along axis ('x','y','z') by stacked boxes */
  step=step||r/3;for(let a=-r;a<r;a+=step){const w=2*Math.sqrt(Math.max(0,r*r-(a+step/2)**2));if(axis==='z')this.box(cx+a+step/2,cy,cz,step,w,h,col);else if(axis==='y')this.box(cx+a+step/2,cy,cz,step,h,w,col);else this.box(cx,cy+a+step/2,cz,h,step,w,col)}};
Vox.prototype.build=function(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));return g};
/* ---------------- smooth mesh builder (HIGH craft; illustrative): surfaces of revolution with averaged normals and preserved creases, tubes, boxes, double-sided sheets ---------------- */
function SM(){this.p=[];this.n=[];this.c=[];this.L=[];this.id()}
SM.prototype.id=function(){this.o=[0,0,0];this.ex=[1,0,0];this.ey=[0,1,0];this.ez=[0,0,1];return this};
SM.prototype.frame=function(o,ez,exh){const zl=Math.hypot(ez[0],ez[1],ez[2])||1,z=[ez[0]/zl,ez[1]/zl,ez[2]/zl];let x=exh||(Math.abs(z[2])<.9?[0,0,1]:[1,0,0]);const dt=x[0]*z[0]+x[1]*z[1]+x[2]*z[2];x=[x[0]-dt*z[0],x[1]-dt*z[1],x[2]-dt*z[2]];const xl=Math.hypot(x[0],x[1],x[2])||1;x=[x[0]/xl,x[1]/xl,x[2]/xl];
  this.o=o;this.ex=x;this.ez=z;this.ey=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return this};
SM.prototype.v=function(x,y,z,nx,ny,nz,col){const o=this.o,a=this.ex,b=this.ey,c=this.ez;this.p.push(o[0]+a[0]*x+b[0]*y+c[0]*z,o[1]+a[1]*x+b[1]*y+c[1]*z,o[2]+a[2]*x+b[2]*y+c[2]*z);this.n.push(a[0]*nx+b[0]*ny+c[0]*nz,a[1]*nx+b[1]*ny+c[1]*nz,a[2]*nx+b[2]*ny+c[2]*nz);this.c.push(col[0],col[1],col[2])};
/* prof: [[r,z],...] traversed so that the outside is on the right (axis-bottom -> out -> up -> axis-top); col: [r,g,b] or (profileSegment, azimuthSegment) -> [r,g,b];
   opt.crease: cosine below which adjacent profile segments keep separate normals (sharp edge, default 0.8); opt.flat: faceted around the axis; opt.dbl: also emit the inside */
SM.prototype.lathe=function(prof,segs,col,opt){opt=opt||{};const n=prof.length,sn=[],cr=opt.crease===undefined?.8:opt.crease;
  for(let k=0;k<n-1;k++){const dr=prof[k+1][0]-prof[k][0],dz=prof[k+1][1]-prof[k][1],L=Math.hypot(dr,dz)||1;sn.push([dz/L,-dr/L])}
  const vn=(k,j)=>{if(j<0||j>=n-1)return sn[k];const A=sn[k],B=sn[j];if(A[0]*B[0]+A[1]*B[1]<cr)return A;const x=A[0]+B[0],y=A[1]+B[1],L=Math.hypot(x,y)||1;return [x/L,y/L]};
  for(let k=0;k<n-1;k++){const A=prof[k],B=prof[k+1];if(A[0]===0&&B[0]===0)continue;const nA=vn(k,k-1),nB=vn(k,k+1);
    for(let j=0;j<segs;j++){const t0=TAU*j/segs,t1=TAU*(j+1)/segs,tm=(t0+t1)/2;const c0=Math.cos(t0),s0=Math.sin(t0),c1=Math.cos(t1),s1=Math.sin(t1),f0c=opt.flat?Math.cos(tm):c0,f0s=opt.flat?Math.sin(tm):s0,f1c=opt.flat?Math.cos(tm):c1,f1s=opt.flat?Math.sin(tm):s1;const cc=typeof col==='function'?col(k,j):col;
      const V=[[A[0]*c0,A[0]*s0,A[1],nA[0]*f0c,nA[0]*f0s,nA[1]],[A[0]*c1,A[0]*s1,A[1],nA[0]*f1c,nA[0]*f1s,nA[1]],[B[0]*c1,B[0]*s1,B[1],nB[0]*f1c,nB[0]*f1s,nB[1]],[B[0]*c0,B[0]*s0,B[1],nB[0]*f0c,nB[0]*f0s,nB[1]]];
      const T=[];if(A[0]!==0)T.push(0,1,2);if(B[0]!==0)T.push(0,2,3);
      for(const i of T){const q=V[i];this.v(q[0],q[1],q[2],q[3],q[4],q[5],cc)}
      if(opt.dbl)for(let i=T.length-1;i>=0;i--){const q=V[T[i]];this.v(q[0],q[1],q[2],-q[3],-q[4],-q[5],cc)}}}
  return this};
SM.prototype.tube=function(a,b,r,segs,col){const s=[this.o,this.ex,this.ey,this.ez];const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(d[0],d[1],d[2]);this.frame(a,d).lathe([[0,0],[r,0],[r,L],[0,L]],segs,col);this.o=s[0];this.ex=s[1];this.ey=s[2];this.ez=s[3];return this};
SM.prototype.ball=function(c,r,col,segs){const s=[this.o,this.ex,this.ey,this.ez];segs=segs||20;const pr=[];for(let i=0;i<=segs/2;i++){const t=Math.PI*i/(segs/2);pr.push([i===0||i===segs/2?0:r*Math.sin(t),-r*Math.cos(t)])}this.frame(c,[0,0,1]).lathe(pr,segs,col,{crease:-1});this.o=s[0];this.ex=s[1];this.ey=s[2];this.ez=s[3];return this};
SM.prototype.box=function(cx,cy,cz,sx,sy,sz,col){const hx=sx/2,hy=sy/2,hz=sz/2;
  const F=[[1,0,0,[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[-1,0,0,[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[0,1,0,[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],[0,-1,0,[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],[0,0,1,[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[0,0,-1,[[-1,1,-1],[1,1,-1],[1,-1,-1],[-1,-1,-1]]]];
  for(const [nx,ny,nz,v] of F)for(const i of [0,1,2,0,2,3]){const q=v[i];this.v(cx+q[0]*hx,cy+q[1]*hy,cz+q[2]*hz,nx,ny,nz,col)}return this};
SM.prototype.sheet=function(P0,P1,P2,P3,col){const ux=P1[0]-P0[0],uy=P1[1]-P0[1],uz=P1[2]-P0[2],vx=P3[0]-P0[0],vy=P3[1]-P0[1],vz=P3[2]-P0[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const L=Math.hypot(nx,ny,nz)||1;nx/=L;ny/=L;nz/=L;
  for(const q of [P0,P1,P2,P0,P2,P3])this.v(q[0],q[1],q[2],nx,ny,nz,col);for(const q of [P0,P2,P1,P0,P3,P2])this.v(q[0],q[1],q[2],-nx,-ny,-nz,col);return this};
SM.prototype.line=function(a,b){this.L.push(a[0],a[1],a[2],b[0],b[1],b[2]);return this};
SM.prototype.build=function(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));return g};
SM.prototype.buildLines=function(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.L,3));g.userData.lines=true;return g};
const M2KM=0.001;
function craftMat(){return TIER==='HIGH'?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.2}):new THREE.MeshLambertMaterial({vertexColors:true})}
/* Dimensions used by both tiers (metres).
   Orbiter: height 6.15 (GO_SPACECRAFT_DESC_INST.TXT), HGA 4.8, science boom to 3, MAG boom to 11 from the centreline, MAG sensors at the boom midpoint and outboard end.
   Probe: base diameter 1.2192 = 8 x 6 in, from NASA RP-1130 "two one-eighth-scale models (6-in. diameter) of the Galileo Entry Probe aeroshell" (computed here); forebody "45° half-angle cone" and "short cylinder" (RP-1130);
   height 0.9 (JPL Mission and Spacecraft Library: "Probe height 0.9 m"); parachute projected diameter 2.5 (GPHOST.CAT). Everything else is illustrative. */
const ORB_ZTOP=-3.6, ORB_ZBOT=2.55, PROBE_D=8*6*.0254, PROBE_H=.9, CHUTE_D=2.5, CHUTE_TRAIL=8*PROBE_D, CHUTE_GORES=20, CHUTE_RIBBONS=16;
const HGA_HUB_Z=-1.72, HGA_HUB_R=.28, HGA_RIB=2.4, HGA_STUCK=[4,5,6];
function hgaRib(i,s){const a=i/18*TAU,ang=(HGA_STUCK.includes(i)?12:38)*RAD,rr=HGA_HUB_R+s*Math.sin(ang);return [rr*Math.cos(a),rr*Math.sin(a),HGA_HUB_Z-s*Math.cos(ang)]}   /* rib angles illustrative ("ribs only partly deployed") */
/* Galileo orbiter, +Z = rotor spin axis (+Zr), HGA at the -Z end ("+Zr directed opposite to the HGA boresight direction"), science/MAG boom along +Y; despun section at the +Z end (Meltzer Fig. 5.8 caption: "despun section (at the bottom of the spacecraft drawing)") */
function buildOrbiter(){if(TIER==='HIGH')return buildOrbiterHi();
  const v=new Vox();const gold=[.80,.62,.25],white=[.86,.86,.84],dark=[.22,.22,.24],grey=[.55,.56,.58],black=[.1,.1,.11],blk=[.3,.3,.33];
  v.cyl(0,0,-1.0,1.0,.85,'z',black,.25);                                 /* spun bus (illustrative diameter) */
  v.cyl(0,0,.15,.6,1.45,'z',dark,.3);                                    /* propulsion module */
  for(let i=0;i<8;i++){const a=i/8*TAU+.39;v.box(.72*Math.cos(a),.72*Math.sin(a),.15,.4,.4,.7,gold)}
  v.cyl(0,0,1.2,.75,.65,'z',white,.2);v.box(1.1,-1.0,1.15,.9,.6,.6,grey);v.box(1.7,-1.4,1.15,.5,.5,.5,dark);   /* despun section and scan platform (illustrative size and placement) */
  v.cyl(-1.2,.7,1.75,.5,.08,'z',white,.12);v.box(-1.2,.7,1.55,.08,.08,.4,grey);                                /* probe relay antenna, illustrative */
  v.cyl(0,0,1.8,.3,.5,'z',grey,.15);v.cyl(0,0,2.3,.42,.5,'z',dark,.14);  /* 400 N engine (one, document); nozzle exit at +2.55 */
  /* HGA: 4.8 m antenna at -Z, drawn partly deployed; tower tip (LGA) at -3.6 so that the height is 6.15 m */
  v.box(0,0,-2.5,.14,.14,2.0,grey);v.cyl(0,0,-1.55,.5,.25,'z',dark,.12);
  for(let i=0;i<18;i++){const n=6;for(let k=0;k<n;k++){const p=hgaRib(i,(k+.5)/n*HGA_RIB);v.box(p[0],p[1],p[2],.07,.07,HGA_RIB/n*1.05,k%2?white:grey)}}
  v.cyl(0,0,-3.5,.25,.2,'z',white,.12);                                  /* LGA at the tip, illustrative */
  /* science boom to 3 m (+Y), MAG boom to 11 m from the centreline (document) */
  v.box(0,2.0,0,.25,2.2,.25,blk);for(let i=0;i<5;i++)v.box((i%2?.12:-.12),1.3+i*.4,0,.06,.06,.5,grey);
  v.box(.25,2.9,.15,.45,.5,.4,white);v.box(-.3,2.6,-.2,.4,.4,.35,grey);v.box(0,3.1,-.3,.35,.35,.3,dark);  /* EPD/DDS/HIC/PLS boxes, illustrative placement */
  for(let y=3.2;y<11;y+=.4){v.box(0,y+.2,0,.05,.4,.05,grey);v.box(.08,y+.2,.08,.03,.4,.03,white);v.box(-.08,y+.2,-.08,.03,.4,.03,white);if(Math.round(y*10)%8===0)v.box(0,y+.2,0,.18,.05,.18,grey)}
  v.box(0,7.0,0,.22,.3,.22,[.9,.3,.2]);v.box(0,11.0,0,.22,.3,.22,[.9,.3,.2]);   /* MAG sensors: midpoint and outboard end (document) */
  v.box(0,11.0,0,2.4,.05,.05,white);                                     /* PWS antenna, illustrative */
  /* RTG booms (two), length illustrative */
  for(const s of [1,-1]){const a=s>0?-35*RAD:215*RAD;for(let k=0;k<9;k++){const r=.9+k*.42;v.box(r*Math.cos(a),r*Math.sin(a),.2,.12,.12,.12,grey)}const r=4.9;v.cyl(r*Math.cos(a),r*Math.sin(a),.2,.22,1.1,'x',black,.11);for(let k=0;k<6;k++)v.box(r*Math.cos(a)+(k-2.5)*.18,r*Math.sin(a),.2,.06,.7,.7,dark)}
  /* two 10-N thruster clusters on cantilevered booms (six each, document) */
  for(const s of [1,-1]){v.box(s*1.7,0,-.15,1.9,.1,.1,grey);for(let k=0;k<6;k++)v.box(s*2.7+(k%3-1)*.15,(k<3?.12:-.12),-.15+(k<3?.1:-.1),.08,.08,.14,white)}
  return v.build()}
function buildOrbiterHi(){const s=new SM();const blk=[.07,.07,.08],gold=[.80,.60,.22],white=[.88,.88,.86],grey=[.55,.56,.58],dark=[.2,.2,.22],sil=[.75,.77,.8],red=[.85,.28,.18],mesh=[.66,.63,.52];
  /* HGA tower, tip sunshade and LGA; tower tip at -3.6 */
  s.lathe([[0,-3.6],[.1,-3.6],[.1,-3.46],[.36,-3.44],[.36,-3.4],[.06,-3.38],[.06,HGA_HUB_Z-.03],[HGA_HUB_R,HGA_HUB_Z],[HGA_HUB_R,-1.46],[0,-1.46]],28,k=>k<2?white:k<5?blk:k<6?grey:dark);
  /* 18 ribs (press kit) and the mesh between them, drawn partly deployed; three adjacent ribs held near the tower (which ribs, and all angles: illustrative) */
  const NS=10;for(let i=0;i<18;i++){const j=(i+1)%18;for(let k=0;k<NS;k++){const s0=k/NS*HGA_RIB,s1=(k+1)/NS*HGA_RIB;s.tube(hgaRib(i,s0),hgaRib(i,s1),.014,6,grey);s.sheet(hgaRib(i,s0),hgaRib(j,s0),hgaRib(j,s1),hgaRib(i,s1),(k&1)?mesh:[mesh[0]*.92,mesh[1]*.92,mesh[2]*.92])}}
  /* bus sun shield and eight-bay spun bus (shape and size illustrative) */
  s.lathe([[0,-1.46],[1.45,-1.46],[1.45,-1.43],[0,-1.43]],56,blk);
  s.lathe([[0,-1.43],[.98,-1.43],[.98,-.6],[0,-.6]],8,(k,j)=>k===1&&j%4===1?gold:blk,{flat:true});
  /* propulsion module: central cylinder, four propellant tanks, two pressurant tanks (illustrative) */
  s.lathe([[0,-.6],[.5,-.6],[.5,.85],[0,.85]],28,dark);
  for(let i=0;i<4;i++){const a=(45+90*i)*RAD;s.ball([.7*Math.cos(a),.7*Math.sin(a),.1],.44,gold,24)}
  for(let i=0;i<2;i++){const a=(135+180*i)*RAD;s.ball([.62*Math.cos(a),.62*Math.sin(a),.62],.2,sil,16)}
  /* despun section (stator), scan platform with instruments, probe relay antenna (sizes and placement illustrative) */
  s.lathe([[0,.85],[.74,.85],[.74,1.4],[.5,1.55],[0,1.55]],36,k=>k<2?white:dark);
  s.tube([.45,-.45,1.15],[1.25,-1.25,1.15],.06,10,grey);s.frame([1.5,-1.5,1.15],[0,0,1],[.7071,-.7071,0]);s.box(0,0,0,.6,.6,.55,white);s.box(.1,0,.4,.3,.3,.25,dark);s.id();
  { const d=[.7071,-.7071,0];s.tube([1.72,-1.72,1.25],[2.55,-2.55,1.25],.13,20,blk);s.frame([1.7,-1.7,.95],d).lathe([[0,0],[.09,0],[.22,.4],[.2,.4],[.07,.03],[0,.03]],20,sil);s.id();s.tube([1.6,-1.95,1.2],[2.0,-2.35,1.2],.07,12,dark) }
  s.tube([-.45,.3,1.3],[-1.2,.7,1.72],.05,10,grey);s.frame([-1.2,.7,1.72],[-.15,.1,1]).lathe([[0,.02],[.2,.05],[.4,.12],[.55,.22]],32,white,{dbl:true,crease:-1});s.id();s.tube([-1.2,.7,1.74],[-1.245,.73,2.04],.025,8,grey);
  /* one 400-N engine (document); nozzle exit at +2.55 */
  s.lathe([[0,1.55],[.09,1.55],[.13,1.9],[.34,2.55],[.31,2.55],[.1,1.9],[0,1.9]],28,k=>k<3?grey:dark);
  /* science boom to 3 m with instrument boxes (placement illustrative) */
  s.tube([0,.5,0],[0,3.0,0],.08,12,dark);s.box(.28,2.85,.16,.42,.45,.38,white);s.box(-.3,2.6,-.2,.38,.38,.34,grey);s.box(0,3.05,-.3,.34,.3,.3,blk);s.box(.05,2.2,.25,.25,.3,.25,gold);
  /* MAG boom: triangular truss from 3 m to 11 m from the centreline; sensors at the midpoint and the outboard end (document); truss form illustrative */
  { const R=.1,A=[90,210,330].map(d=>[R*Math.cos(d*RAD),R*Math.sin(d*RAD)]),pt=(i,y)=>[A[i][0],y,A[i][1]];for(let i=0;i<3;i++)s.tube(pt(i,3.0),pt(i,11.0),.009,5,sil);
    for(let b=0;b<=16;b++){const y=3.0+b*.5;for(let i=0;i<3;i++){s.tube(pt(i,y),pt((i+1)%3,y),.006,4,grey);if(b<16)s.tube(pt(i,y),pt((i+(b&1?1:2))%3,y+.5),.004,4,grey)}} }
  s.tube([0,6.9,0],[0,7.1,0],.11,14,red);s.tube([0,10.9,0],[0,11.1,0],.11,14,red);
  s.tube([-1.2,11.0,0],[1.2,11.0,0],.012,6,white);   /* PWS antenna, illustrative */
  /* two RTGs on booms (number: document; boom form, lengths and RTG size illustrative) */
  for(const a of [-35*RAD,215*RAD]){const u=[Math.cos(a),Math.sin(a),0],w=[-u[1],u[0],0],at=(r,o,z)=>[u[0]*r+w[0]*o,u[1]*r+w[1]*o,z];
    s.tube(at(.6,.35,.2),at(4.3,0,.2),.03,8,grey);s.tube(at(.6,-.35,.2),at(4.3,0,.2),.03,8,grey);s.tube(at(.5,0,-.4),at(4.3,0,.2),.02,6,grey);
    s.frame(at(4.3,0,.2),u).lathe([[0,0],[.11,0],[.13,.04],[.13,1.1],[.11,1.14],[0,1.14]],20,blk);
    for(let f=0;f<8;f++){const t=f/8*TAU;s.frame(at(4.3,0,.2),u,[w[0]*Math.cos(t),w[1]*Math.cos(t),Math.sin(t)]).box(.17,0,.57,.1,.012,1.0,dark)}s.id()}
  /* two cantilevered thruster booms with six 10-N thrusters each (document); form illustrative */
  for(const sg of [1,-1]){s.tube([sg*.5,0,-.15],[sg*2.6,0,-.15],.04,10,grey);s.box(sg*2.7,0,-.15,.24,.24,.24,sil);
    for(const d of [[0,0,1],[0,0,-1],[0,1,0],[0,-1,0],[sg,0,0],[0,.7071,.7071]]){s.frame([sg*2.7+d[0]*.12,d[1]*.12,-.15+d[2]*.12],d).lathe([[0,0],[.02,0],[.055,.13],[.045,.13],[0,.02]],12,white)}s.id()}
  return s.build()}
/* probe profiles (r,z), nose at -Z; forebody: sphere-cone with 45° half-angle (RP-1130) and illustrative nose radius; short cylinder (RP-1130) of illustrative length; aft cover dome illustrative; total height 0.9 m */
function probeProf(){const RB=PROBE_D/2,rn=.22,c45=Math.SQRT1_2,zc=-(RB-rn*c45)+rn*c45,zt=zc-rn,cyl=.06,ha=PROBE_H-(-zt)-cyl;const fore=[[0,zt]];for(let i=1;i<=8;i++){const t=i/8*Math.PI/4;fore.push([rn*Math.sin(t),zc-rn*Math.cos(t)])}fore.push([RB,0]);
  const aft=[];for(let i=0;i<=12;i++){const t=i/12*1.3;aft.push([RB*Math.cos(t),cyl+ha*Math.sin(t)/Math.sin(1.3)])}return {RB,zt,cyl,fore,aft,top:cyl+ha}}
const C_CARBON=[.17,.14,.12],C_AFT=[.74,.64,.48],C_RING=[.5,.5,.52],C_DM=[.78,.62,.3];
function buildProbeEntry(){const q=probeProf();
  if(TIER==='HIGH'){const s=new SM(),nf=q.fore.length-1;return s.lathe(q.fore.concat([[q.RB,q.cyl]],q.aft.slice(1),[[0,q.top]]),72,k=>k<nf?C_CARBON:k===nf?C_RING:C_AFT).build()}
  const v=new Vox(),RB=q.RB;for(let k=0;k<10;k++){const z=q.zt+(k+.5)*(-q.zt)/10,r=.07+(RB-.07)*(k+.5)/10;v.cyl(0,0,z,r,-q.zt/10,'z',k%2?[.30,.26,.22]:[.40,.35,.30],r/5)}
  v.cyl(0,0,q.cyl/2,RB,q.cyl,'z',C_RING,RB/6);const ha=q.top-q.cyl;for(let k=0;k<7;k++){const z=q.cyl+(k+.5)*ha/7,r=RB*.97*Math.cos((k+.5)/7*1.3);v.cyl(0,0,z,r,ha/7,'z',k%2?[.76,.66,.5]:[.62,.52,.4],r/5)}
  return v.build()}
function buildProbeDescent(){
  if(TIER==='HIGH'){const s=new SM();s.lathe([[0,-.2],[.24,-.2],[.3,-.175],[.33,-.12],[.33,.14],[.3,.2],[.2,.24],[0,.24]],48,C_DM);s.lathe([[0,.24],[.15,.24],[.15,.275],[0,.275]],28,C_RING);
    s.box(.2,.2,.3,.1,.1,.12,[.2,.2,.22]);s.tube([-.2,-.1,.24],[-.2,-.1,.42],.03,10,[.2,.2,.22]);for(let i=0;i<4;i++){const a=i/4*TAU+.4;s.tube([.34*Math.cos(a),.34*Math.sin(a),-.16],[.34*Math.cos(a),.34*Math.sin(a),.1],.025,8,[.25,.25,.27])}
    s.tube([0,0,.275],[0,0,.5],.015,8,C_RING);return s.build()}   /* descent module: rounded body 0.66 m across, illustrative */
  const v=new Vox(),gold=[.75,.6,.3],grey=[.5,.5,.52],dark=[.2,.2,.22];
  v.cyl(0,0,0,.33,.42,'z',gold,.1);v.cyl(0,0,.26,.25,.1,'z',grey,.1);v.box(.2,.2,.33,.1,.1,.12,dark);v.box(-.2,-.1,.33,.08,.08,.18,dark);
  for(let i=0;i<4;i++){const a=i/4*TAU+.4;v.box(.34*Math.cos(a),.34*Math.sin(a),-.1,.06,.06,.3,dark)}
  v.box(0,0,.45,.04,.04,.2,grey);
  return v.build()}
/* main parachute: projected diameter 2.5 m (GPHOST.CAT); "conventional conical ribbon design" (Rodier, Thuss, Terhune 1982 abstract, NTRS 19820026891) drawn as rings of ribbon with slots between them;
   canopy depth, number of ribbons and gores, colours, line lengths and the trailing distance (8 probe diameters, inside the 5.5-11 range tested, Meltzer ch. 3) are illustrative */
function chuteProf(u){const RC=CHUTE_D/2;return [RC*Math.cos(u*1.45),CHUTE_TRAIL+.8*Math.sin(u*1.45)/Math.sin(1.45)]}
const CHUTE_CONF=CHUTE_TRAIL-3.0;
function buildChute(){const RC=CHUTE_D/2,or=[.95,.45,.15],wh=[.92,.9,.86];
  if(TIER==='HIGH'){const s=new SM(),NA=CHUTE_GORES*4;for(let i=0;i<CHUTE_RIBBONS;i++){const pr=[];for(let k=0;k<=3;k++)pr.push(chuteProf((i+.74*k/3)/CHUTE_RIBBONS));s.lathe(pr,NA,(k,j)=>{const g=Math.floor(j/4),c=g%2?or:wh;return j%4===0?[c[0]*.82,c[1]*.82,c[2]*.82]:c},{dbl:true,crease:-1})}
    return s.build()}
  const v=new Vox();for(let k=0;k<10;k++){const t=(k+.5)/10,z=CHUTE_TRAIL+Math.sin(t*1.5)*.85,r=RC*Math.cos(t*1.5);const n=Math.max(8,Math.ceil(TAU*r/.09));for(let i=0;i<n;i++){const a=i/n*TAU;v.box(r*Math.cos(a),r*Math.sin(a),z,.11,.11,.13,(Math.floor(i/(n/8))%2)?or:wh)}}
  for(let i=0;i<8;i++){const a=i/8*TAU;for(let k=0;k<6;k++){const t=(k+.5)/6;v.box(RC*.97*Math.cos(a)*(1-t),RC*.97*Math.sin(a)*(1-t),CHUTE_TRAIL-.05-3.0*t,.035,.035,.52,[.85,.85,.8])}}
  for(let k=0;k<7;k++){const L=(CHUTE_CONF-.5)/7;v.box(0,0,.5+(k+.5)*L,.035,.035,L,[.85,.85,.8])}
  return v.build()}
/* HIGH: suspension lines, radial tapes, riser and bridle as line segments */
function buildChuteLines(){const s=new SM(),RC=CHUTE_D/2;for(let g=0;g<CHUTE_GORES;g++){const a=g/CHUTE_GORES*TAU,ca=Math.cos(a),sa=Math.sin(a);s.line([RC*ca,RC*sa,CHUTE_TRAIL],[0,0,CHUTE_CONF]);for(let k=0;k<24;k++){const A=chuteProf(k/24),B=chuteProf((k+1)/24);s.line([A[0]*ca,A[0]*sa,A[1]],[B[0]*ca,B[0]*sa,B[1]])}}
  s.line([0,0,CHUTE_CONF],[0,0,.8]);for(let i=0;i<3;i++){const a=i/3*TAU;s.line([0,0,.8],[.26*Math.cos(a),.26*Math.sin(a),.24])}return s.buildLines()}
function buildAftCover(){const q=probeProf();if(TIER==='HIGH')return new SM().lathe(q.aft.concat([[0,q.top]]),72,C_AFT,{dbl:true}).build();
  const v=new Vox(),ha=q.top-q.cyl;for(let k=0;k<7;k++){const z=q.cyl+(k+.5)*ha/7,r=q.RB*.97*Math.cos((k+.5)/7*1.3);v.cyl(0,0,z,r,ha/7,'z',k%2?[.76,.66,.5]:[.62,.52,.4],r/5)}return v.build()}
function buildAeroshell(){const q=probeProf();if(TIER==='HIGH'){const nf=q.fore.length-1;return new SM().lathe(q.fore.concat([[q.RB,q.cyl]]),72,k=>k<nf?C_CARBON:C_RING,{dbl:true}).build()}
  const v=new Vox(),RB=q.RB;for(let k=0;k<10;k++){const z=q.zt+(k+.5)*(-q.zt)/10,r=.07+(RB-.07)*(k+.5)/10;v.cyl(0,0,z,r,-q.zt/10,'z',k%2?[.30,.26,.22]:[.40,.35,.30],r/5)}return v.build()}

/* ---------------- scene graph ---------------- */
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(45,1,1e-5,1e9);cam.position.set(0,-3,1.2);
let ctl;function mkControls(){if(ctl)ctl.dispose();ctl=new THREE.OrbitControls(cam,cv);ctl.enablePan=false;ctl.enableDamping=true;ctl.dampingFactor=.12;ctl.zoomSpeed=1.6;ctl.rotateSpeed=.7;ctl.target.set(0,0,0);ctl.update()}
/* OrbitControls caches the camera up vector at construction (r147), so the controls are rebuilt when the up vector changes (probe scene: local vertical from PROBETRJ; otherwise JSE north) */
function setCamUp(v){if(cam.up.distanceTo(v)<1e-6)return;cam.up.copy(v);mkControls()}
mkControls();
const sunLight=new THREE.DirectionalLight(0xfff4e0,1);scene.add(sunLight);scene.add(sunLight.target);
const fill=new THREE.AmbientLight(0x1a2030,TIER==='HIGH'?.25:.4);scene.add(fill);   /* illustrative fill light so the night side is not pure black */
const WORLD={};   /* name -> {obj, pos:Vector3 (JSE km, absolute), radius km, label, kind} */
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_q=new THREE.Quaternion(),_z=new THREE.Vector3(0,0,1);
let bodies={}, TEX={}, crafts={}, lines=[], SCN=null, S={scene:null, T:0, play:false, speed:1, follow:null, glow:false, stars:true, atm:true};
function disposeObj(o){o.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];ms.forEach(m=>{for(const k of ['map','normalMap','emissiveMap'])if(m[k])m[k].dispose();m.dispose()})}})}
function bodyMaterial(kind,tx){if(TIER==='HIGH'){const nm=mkTex(normalFromHeight(tx.hgt,tx.W,tx.H,kind==='JUPITER'?.5:kind==='EUROPA'?1.2:2.2),false);return new THREE.MeshStandardMaterial({map:mkTex(tx.canvas,true),normalMap:nm,normalScale:new THREE.Vector2(.5,.5),roughness:1,metalness:0})}
  return new THREE.MeshLambertMaterial({map:mkTex(tx.canvas,true)})}
const TEXCACHE={};
const NSTR={JUPITER:.5,EUROPA:1.2};   /* normal-map strength at 512 px; scaled with resolution for the 2048-px set */
const AMA_AXES=[125,73,64];   /* km semi-axes, NSSDCA Jovian Satellite Fact Sheet "Radius (km)" entry for Amalthea: 125 x 73 x 64 */
function mkBody(key,radiusKm,kind,segs,polarKm){const W=TIER==='HIGH'?512:256,H=W/2;const tx=TEXCACHE[kind+W]||(TEXCACHE[kind+W]=texture(kind,W,H));const g=new THREE.SphereGeometry(radiusKm,segs,segs/2);
  if(kind==='AMALTHEA'){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y,z),lon=Math.atan2(z,x),lat=Math.asin(y/r);const d=1+.09*(sfbm(lon,lat,67,4,2)-.5)*2;p.setXYZ(i,x/r*AMA_AXES[0]*d,y/r*AMA_AXES[2]*d,z/r*AMA_AXES[1]*d)}g.computeVertexNormals()}  /* triaxial figure 125 x 73 x 64 km (NSSDCA) with illustrative lumps of up to 9 %; shortest axis on the pole axis, long axis on body X: orientation illustrative */
  const m=new THREE.Mesh(g,bodyMaterial(kind,tx));m.rotation.x=Math.PI/2;  /* three.js sphere poles on Y; our Z is north */
  if(polarKm)m.scale.set(1,polarKm/radiusKm,1);   /* oblate: Y is the pole axis before the x-rotation */
  const grp=new THREE.Group();grp.add(m);scene.add(grp);const B={grp,mesh:m,r:radiusKm,tex:tx};
  if(TIER==='HIGH')hiRequest({key:kind+'@'+HI_W,type:'body',kind,W:HI_W,H:HI_W/2,hi:1,ns:(NSTR[kind]||2.2)*HI_W/512*.5},t=>{if(!B.dead&&TIER==='HIGH')hiSwap(m.material,t)});
  return B}
/* fixed-pixel marker dots and the Sun disc */
function dotTex(col,ring){const c=mkCanvas(32,32),g=c.getContext('2d');g.fillStyle=col;g.beginPath();g.arc(16,16,ring?5:6,0,TAU);g.fill();if(ring){g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(16,16,10,0,TAU);g.stroke()}return new THREE.CanvasTexture(c)}
function mkMarker(col,ring){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(col,ring),sizeAttenuation:false,depthTest:false,transparent:true}));s.renderOrder=20;scene.add(s);return s}
function sunDiscTex(){const n=TIER==='HIGH'?512:64,c=mkCanvas(n,n),g=c.getContext('2d');g.fillStyle='#fff6d6';g.beginPath();g.arc(n/2,n/2,n*30/64,0,TAU);g.fill();return new THREE.CanvasTexture(c)}
const sunDisc=new THREE.Sprite(new THREE.SpriteMaterial({map:sunDiscTex(),sizeAttenuation:true,depthTest:true,depthWrite:false,transparent:true,toneMapped:false}));scene.add(sunDisc);
function glowTexMk(){const n=TIER==='HIGH'?512:128,k=n/128,c=mkCanvas(n,n),g=c.getContext('2d');const gr=g.createRadialGradient(64*k,64*k,4*k,64*k,64*k,62*k);gr.addColorStop(0,'rgba(255,240,200,.9)');gr.addColorStop(.3,'rgba(255,200,120,.35)');gr.addColorStop(1,'rgba(255,180,80,0)');g.fillStyle=gr;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)}
const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexMk(),sizeAttenuation:true,depthTest:false,transparent:true,toneMapped:false}));sunGlow.visible=false;scene.add(sunGlow);
const SUN_DRAW_DIST=2e7;   /* km: the disc is drawn at this distance with the true angular size (the real distance is ~7.9e8 km) */
/* star field: illustrative */
function mkStars(){const n=TIER==='HIGH'?9000:900,pos=new Float32Array(n*3),col=new Float32Array(n*3);for(let i=0;i<n;i++){const a=hash(i,1,5)*TAU,b=Math.asin(2*hash(i,2,5)-1),R=4e7;pos[3*i]=R*Math.cos(b)*Math.cos(a);pos[3*i+1]=R*Math.cos(b)*Math.sin(a);pos[3*i+2]=R*Math.sin(b);const w=.35+.65*hash(i,3,5)**3,t=hash(i,4,5);col[3*i]=w*(1-.1*t);col[3*i+1]=w*(1-.05*t);col[3*i+2]=w*(.9+.15*t)}   /* HIGH: 9000 points, LOW: 900 */
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));const p=new THREE.Points(g,new THREE.PointsMaterial({size:TIER==='HIGH'?2:1.5,sizeAttenuation:false,vertexColors:true,depthWrite:false,toneMapped:false}));scene.add(p);return p}
let stars=mkStars(),SKY_TIER=TIER;
/* star points, Sun disc and glow textures are rebuilt when the tier changes */
function rebuildSky(){if(SKY_TIER===TIER)return;SKY_TIER=TIER;scene.remove(stars);stars.geometry.dispose();stars.material.dispose();stars=mkStars();for(const [sp,mk] of [[sunDisc,sunDiscTex],[sunGlow,glowTexMk]]){sp.material.map.dispose();sp.material.map=mk();sp.material.needsUpdate=true}}
/* Sun-direction line and Jupiter pole line */
function mkLine(col,n,dashed){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));const m=dashed?new THREE.LineDashedMaterial({color:col,dashSize:1,gapSize:.6,transparent:true,opacity:.8}):new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.85});const l=new THREE.Line(g,m);l.frustumCulled=false;scene.add(l);return l}
const sunLine=mkLine(0xffe08a,2), poleLine=mkLine(0x9aa4bd,2);

/* ---------------- scenes ---------------- */
const FLYS=P.flybys.filter(x=>x.moon_jse||x.moon==='AMALTHEA');
const sceneSel=$('#scene');
const SCENES=[{id:'PROBE',name:'Probe entry and descent · 1995-12-07'}].concat(FLYS.map(x=>({id:'FLY:'+x.id,name:`${x.id} · ${MOONS[x.moon].name} flyby · ${x.tca_utc.slice(0,10)}${x.moon_jse?'':' (moon position vs Jupiter not in data)'}`})));
SCENES.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;sceneSel.appendChild(o)});
const SPEEDS=[[1,'1×'],[10,'10×'],[60,'60×'],[300,'300×']];SPEEDS.forEach(([v,n])=>{const o=document.createElement('option');o.value=v;o.textContent=n;$('#speed').appendChild(o)});$('#speed').value='10';S.speed=10;
function clearScene(){scene.fog=null;R_.setClearColor(0x06080e,1);hiCancel();for(const k in bodies){bodies[k].dead=true;scene.remove(bodies[k].grp);disposeObj(bodies[k].grp)}bodies={};for(const k in crafts){scene.remove(crafts[k].grp);disposeObj(crafts[k].grp)}crafts={};lines.forEach(l=>{scene.remove(l);disposeObj(l)});lines=[];for(const k in WORLD)if(WORLD[k].marker){scene.remove(WORLD[k].marker);WORLD[k].marker.material.map.dispose();WORLD[k].marker.material.dispose()}for(const k in WORLD)delete WORLD[k]}
const SEG=()=>TIER==='HIGH'?192:40;
/* local high-resolution cap of the 1-bar ellipsoid around the probe entry point (System III lat/W lon from PROBETRJ row 0), sharing the globe's material and texture mapping;
   the coarse globe sags up to R(1-cos(pi/segments)) below the true surface, the cap does not, so close views near the probe see the true 1-bar level */
function mkCap(latDeg,wlonDeg,halfLat,halfLon,n,offKm){const g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];const k=1+(offKm||0)/JUP_REQ;
  for(let i=0;i<=n;i++){const la=(latDeg-halfLat+2*halfLat*i/n)*RAD;for(let j=0;j<=n;j++){const al=(-wlonDeg-halfLon+2*halfLon*j/n)*RAD;   /* group-frame azimuth = east longitude */
    pos.push(k*JUP_REQ*Math.cos(la)*Math.cos(al),k*JUP_REQ*Math.cos(la)*Math.sin(al),k*JUP_RPOL*Math.sin(la));uv.push(j/n,i/n)}}
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+1,c=a+n+1,d=c+1;idx.push(a,b,c,b,d,c)}   /* counter-clockwise seen from outside */
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  { const nn=g.attributes.normal,pp=g.attributes.position;const k=((n+1)*(n+1))>>1;if(nn.getX(k)*pp.getX(k)+nn.getY(k)*pp.getY(k)+nn.getZ(k)*pp.getZ(k)<0)console.warn('cap normals point inward')}
  return g}
function addJupiter(close){const b=mkBody('JUPITER',JUP_REQ,'JUPITER',TIER==='HIGH'?256:56,JUP_RPOL);
  if(close){const pt=P.probe.probetrj;const W=TIER==='HIGH'?1024:512;const tx=TEXCACHE['CAP'+W]||(TEXCACHE['CAP'+W]=capTexture(pt.s3_lat[0],pt.s3_wlon[0],10,W,W));
    const cap=new THREE.Mesh(mkCap(pt.s3_lat[0],pt.s3_wlon[0],10,10,TIER==='HIGH'?256:96),bodyMaterial('JUPITER',tx));b.grp.add(cap);b.cap=cap;
    const ib=pt.t.indexOf(167.106),cl=pt.s3_lat[ib],cw=pt.s3_wlon[ib];   /* near cap centred on the probe's System III position at the table-break row (the reconstruction holds longitude fixed after it) */
    const tn=TEXCACHE['NEAR'+W]||(TEXCACHE['NEAR'+W]=nearTexture(cl,cw,1.5,W,W));const near=new THREE.Mesh(mkCap(cl,cw,1.5,1.5,TIER==='HIGH'?160:64,.012),bodyMaterial('JUPITER',tn));b.grp.add(near);b.near=near;
    if(TIER==='HIGH'){hiRequest({key:'NEAR@'+HI_W,type:'near',lat:cl,wlon:cw,half:1.5,W:HI_W,H:HI_W,hi:1,ns:.5*HI_W/1024},t=>{if(!b.dead&&TIER==='HIGH')hiSwap(near.material,t)});hiRequest({key:'CAP@'+HI_W,type:'cap',lat:pt.s3_lat[0],wlon:pt.s3_wlon[0],half:10,W:HI_W,H:HI_W,hi:1,ns:.5*HI_W/1024},t=>{if(!b.dead&&TIER==='HIGH')hiSwap(cap.material,t)})}}  /* near cap ±1.5°, 12 m above the wide cap to avoid z-fighting */bodies.JUPITER=b;WORLD.JUPITER={pos:new THREE.Vector3(),r:JUP_REQ,label:'Jupiter',col:'#e8c9a0',grp:b.grp,marker:mkMarker('#e8c9a0')}}
function addMoon(key,rk){const b=mkBody(key,rk,key,SEG());bodies[key]=b;WORLD[key]={pos:new THREE.Vector3(),r:rk,label:MOONS[key].name,col:{IO:'#ffd24a',EUROPA:'#9fe3ff',GANYMEDE:'#b9a3ff',CALLISTO:'#ff9b6b',AMALTHEA:'#7ee0a5'}[key],grp:b.grp,marker:mkMarker({IO:'#ffd24a',EUROPA:'#9fe3ff',GANYMEDE:'#b9a3ff',CALLISTO:'#ff9b6b',AMALTHEA:'#7ee0a5'}[key])};if(key==='AMALTHEA')WORLD[key].r=AMA_AXES[0]}   /* view limits use the long semi-axis */
function addCraft(key,label,parts){const grp=new THREE.Group();const mat=craftMat();const sub={};for(const p in parts){const m=parts[p].userData.lines?new THREE.LineSegments(parts[p],new THREE.LineBasicMaterial({color:0xd8d6cc,transparent:true,opacity:.8})):new THREE.Mesh(parts[p],mat);m.scale.setScalar(M2KM);grp.add(m);sub[p]=m}scene.add(grp);crafts[key]={grp,sub,mat};WORLD[key]={pos:new THREE.Vector3(),r:.012,label,col:'#ff7a59',grp,marker:mkMarker('#ff7a59',true),craft:true}}
function trackLine(pts,col){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.7}));l.frustumCulled=false;scene.add(l);lines.push(l);return l}

function loadScene(id){clearScene();S.scene=id;S.play=false;$('#play').textContent='▶';if(sceneSel.value!==id)sceneSel.value=id;
  if(id==='PROBE'){const pr=P.probe;SCN={kind:'PROBE',pr,t0:-3600,t1:3700,tms:Date.parse(pr.entry_ut+'Z'),sun:[Math.cos(pr.beta.beta_deg*RAD),0,Math.sin(pr.beta.beta_deg*RAD)],psi:pr.psi};
    addJupiter(true);for(const k of MK4)if(pr.moons[k])addMoon(k,MOONS[k].rk_pds_km);
    addCraft('ORBITER','Galileo orbiter',{body:buildOrbiter(false)});
    {const pp={entry:buildProbeEntry(),module:buildProbeDescent(),chute:buildChute(),aft:buildAftCover(),shell:buildAeroshell()};if(TIER==='HIGH')pp.lines=buildChuteLines();addCraft('PROBE','Descent probe',pp)}
    /* tracks: PROBETRJ (all 5399 rows) and ORBTRTRJ, Jupiter-centred JSE km; drawn relative to Jupiter */
    const pt=[];pr.probetrj.jse_km.forEach(p=>pt.push(p[0],p[1],p[2]));SCN.probeTrack=trackLine(pt,0xff7a59);
    const ot=[];pr.orbtrtrj.jse_km.forEach(p=>ot.push(p[0],p[1],p[2]));SCN.orbTrack=trackLine(ot,0x5cc8ff);
    { const n=21,ext=50,a=[];for(let i=0;i<n;i++){const x=-ext+2*ext*i/(n-1);a.push(x,-ext,0,x,ext,0,-ext,x,0,ext,x,0)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xe8c9a0,transparent:true,opacity:.35}));l.frustumCulled=false;scene.add(l);lines.push(l);SCN.grid=l }  /* local grid on the 1-bar reference level (PROBETRJ altitude zero), 5-km spacing, ±50 km; planar approximation */
    SCN.rings=pr.layers.map(L=>{const n=48,a=new Float32Array(n*3);for(let i=0;i<n;i++){const t=i/n*TAU;a[3*i]=Math.cos(t)*3;a[3*i+1]=Math.sin(t)*3;a[3*i+2]=0}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const l=new THREE.LineLoop(g,new THREE.LineBasicMaterial({color:0x9fe3ff,transparent:true,opacity:.55}));l.frustumCulled=false;scene.add(l);lines.push(l);return {l,alt:L.descent.alt_km}});  /* data-defined pressure-level rings (radius 3 km, illustrative size) */
    /* atmosphere: fog (both tiers), bright ceiling disc (illustrative), HIGH: 20 haze billboards; Meltzer p. 213 interval rings */
    SCN.fog=new THREE.FogExp2(0x9a7a55,0);scene.fog=SCN.fog;
    { const tex=(()=>{const n=TIER==='HIGH'?1024:256,k=n/256,c=mkCanvas(n,n),g=c.getContext('2d');const gr=g.createRadialGradient(128*k,128*k,10*k,128*k,128*k,126*k);gr.addColorStop(0,'rgba(255,248,230,.9)');gr.addColorStop(.5,'rgba(255,240,215,.45)');gr.addColorStop(1,'rgba(255,235,205,0)');g.fillStyle=gr;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)})();
      const ceil=new THREE.Mesh(new THREE.CircleGeometry(40,TIER==='HIGH'?96:24),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false}));ceil.frustumCulled=false;scene.add(ceil);lines.push(ceil);SCN.ceil=ceil;SCN.ceilTex=tex;
      /* top of the NEP XSEC22 table (0.3981 bar) placed at the DESCENT.TAB altitude for that pressure */
      const D=pr.descent,U=pr.upperatm;const pu=U.p_mbar[U.p_mbar.length-1]/1000,au=U.alt_km[U.alt_km.length-1];   /* 0.3981 bar lies between the last UPPERATM row (349.5 mbar, 23.445 km) and the first DESCENT row (0.46809 bar, 17.291 km): linear bridge, inferred */
      SCN.ceilAlt=au+(D.alt_km[0]-au)*((XS.p[0]-pu)/(D.p_bar[0]-pu));
      if(TIER==='HIGH'){const ntex=(()=>{const N=512,c=mkCanvas(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=x/(N/2)-1,dy=y/(N/2)-1,r=Math.hypot(dx,dy);const n=fbm(x/(N/8),y/(N/8),77,6);const a=Math.max(0,1-r)*(0.35+0.65*n);const o=4*(y*N+x);d[o]=255;d[o+1]=248;d[o+2]=235;d[o+3]=255*a*.9}g.putImageData(im,0,0);return new THREE.CanvasTexture(c)})();
        SCN.haze=[];for(let i=0;i<20;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ntex,transparent:true,depthWrite:false,opacity:.3,fog:true,toneMapped:false}));sp.userData.seed=i;scene.add(sp);lines.push(sp);SCN.haze.push(sp)}SCN.hazeTex=ntex}
      /* Meltzer p. 213 NEP/NFR pressure intervals as dashed rings (radius 2 km) at DESCENT.TAB altitudes */
      SCN.qrings=[];for(const [pb,lab] of [[0.46,'NEP tenuous layer 0.46–0.55 bar (Meltzer p. 213)'],[0.55,''],[0.76,'NEP denser particle concentrations 0.76–1.34 bar (Meltzer p. 213)'],[1.34,''],[1.6,'NEP tenuous cloud structure, base 1.6 bar (Meltzer p. 213)'],[1.35,'NFR similar structure at 1.35 bar (Meltzer p. 213)']]){
        let j=0;for(let i=1;i<D.p_bar.length;i++)if(D.p_bar[i]>=pb){j=i;break}const alt=D.alt_km[j-1]+(D.alt_km[j]-D.alt_km[j-1])*((pb-D.p_bar[j-1])/(D.p_bar[j]-D.p_bar[j-1]));
        const n=64,a=new Float32Array(n*3);for(let i=0;i<n;i++){const t=i/n*TAU;a[3*i]=Math.cos(t)*2;a[3*i+1]=Math.sin(t)*2;a[3*i+2]=0}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const l=new THREE.LineLoop(g,new THREE.LineDashedMaterial({color:0xffb347,dashSize:.25,gapSize:.15,transparent:true,opacity:.7}));l.computeLineDistances();l.frustumCulled=false;scene.add(l);lines.push(l);SCN.qrings.push({l,alt,lab,pb})} }
    S.T=-600;followOpts(['PROBE','ORBITER','JUPITER'].concat(MK4.filter(k=>pr.moons[k])));S.follow='PROBE';
  } else {const fid=id.slice(4),fl=FLYS.find(x=>x.id===fid);const tr=fl.traj;SCN={kind:'FLY',fl,t0:tr.t[0],t1:tr.t[tr.t.length-1],tms:fl.tca_ms,sun:fl.sun_jse,psi:fl.psi};
    addJupiter();
    const rk=fl.rk_km;addMoon(fl.moon,rk);
    if(fl.moon_jse){for(const k of MK4)if(k!==fl.moon&&fl.moons_at_tca&&fl.moons_at_tca[k])addMoon(k,MOONS[k].rk_pds_km)}
    else if(fl.moons_at_tca){for(const k of MK4)if(fl.moons_at_tca[k])addMoon(k,MOONS[k].rk_pds_km)}
    addCraft('ORBITER','Galileo orbiter',{body:buildOrbiter(false)});
    /* moon-centred track in PHIO basis (fixed at CA), scaled to km */
    if(fl.basis_jse){const B=fl.basis_jse,pts=[];for(let i=0;i<tr.t.length;i++){const x=tr.x[i]*rk,y=tr.y[i]*rk,z=tr.z[i]*rk;pts.push(x*B.x[0]+y*B.y[0]+z*B.z[0],x*B.x[1]+y*B.y[1]+z*B.z[1],x*B.x[2]+y*B.y[2]+z*B.z[2])}SCN.track=trackLine(pts,0xff7a59)}
    else {const pts=[];for(let i=0;i<tr.t.length;i++)pts.push(tr.x[i]*rk,tr.y[i]*rk,tr.z[i]*rk);SCN.track=trackLine(pts,0xff7a59)}
    S.T=Math.max(SCN.t0,-900);followOpts(['ORBITER',fl.moon,'JUPITER'].concat(Object.keys(bodies).filter(k=>k!=='JUPITER'&&k!==fl.moon)));S.follow='ORBITER';
  }
  $('#follow').value=S.follow;applyUp();zoomTo('local');sourcesPanel();setHash()}
function applyUp(){if(SCN.kind==='PROBE'&&S.follow==='PROBE'){const pt=SCN.pr.probetrj;setCamUp(lerp3(pt.t,pt.up_jse,clamp(S.T,0,pt.t[pt.t.length-1]),new THREE.Vector3()).normalize())}else setCamUp(new THREE.Vector3(0,0,1))}
function followOpts(keys){const sel=$('#follow');sel.innerHTML='';keys.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=WORLD[k]?WORLD[k].label:k;sel.appendChild(o)})}
function zoomTo(z){const w=WORLD[S.follow];if(!w)return;let d;const cs=S.follow==='PROBE'?(SCN.kind==='PROBE'&&S.T>=167.106?.0115:.004):.014;if(z==='craft')d=w.craft?cs*2.6:w.r*2.6;else if(z==='local')d=w.craft?cs*60:w.r*3.2;else d=60*RJ;
  const dir=cam.position.clone().sub(ctl.target).normalize();if(dir.lengthSq()<.5)dir.set(-.4,-.8,.4).normalize();
  if(SCN.kind==='PROBE'&&S.follow==='PROBE'&&z!=='system'){const pt=SCN.pr.probetrj,tt=clamp(S.T,0,pt.t[pt.t.length-1]),up=lerp3(pt.t,pt.up_jse,tt,new THREE.Vector3()).normalize(),vd=lerp3(pt.t,pt.vdir_jse,tt,new THREE.Vector3()).normalize();
    const h=new THREE.Vector3().crossVectors(up,vd).normalize();if(h.lengthSq()<.5)h.set(1,0,0);const fwd=new THREE.Vector3().crossVectors(h,up).normalize();   /* horizontal, along the velocity */
    dir.copy(h).multiplyScalar(.72).addScaledVector(fwd,.62).addScaledVector(up,.3).normalize()}   /* three-quarter front view: nose and flank in frame, horizon level */
  cam.position.copy(dir.multiplyScalar(d));setLimits();ctl.update()}
function setLimits(){const w=WORLD[S.follow];if(!w)return;ctl.minDistance=w.craft?.004:w.r*1.08;ctl.maxDistance=400*RJ}

/* ---------------- probe readouts: every value carries {v, src, inf} — inf=true means computed here, not read from a file ---------------- */
const MF0=P.probe.mf0_after_entry_s;
function finiteDiffAlt(T){const pt=P.probe.probetrj,i=bis(pt.t,T);const a=Math.max(0,i-1),b=Math.min(pt.t.length-1,i+2);return (pt.alt_km[b]-pt.alt_km[a])/(pt.t[b]-pt.t[a])*1000}   /* m/s, central difference over PROBETRJ rows (±1 row) */
function descentRate(T){const X=P.probe.extra,tm=T-MF0;const out={pt:{v:finiteDiffAlt(T),src:'inferred: finite difference of PROBETRJ.TAB ALTITUDE over ±1 row (1-s rows); negative = downward',inf:true}};
  /* ASI2REF radial velocity (file), interpolated between rows */
  const A=X.asi2ref;if(tm>=A.t[0]&&tm<=A.t[A.t.length-1]){const i=bis(A.t,tm);const exact=Math.abs(A.t[i]-tm)<1e-6;out.asi2ref={v:lerp(A.t,A.rv,tm),src:exact?`ASI2REF.TAB row ${i+1}, RADIAL VELOCITY (M/SEC; file sign: positive while altitude decreases)`:`inferred: linear interpolation of ASI2REF.TAB RADIAL VELOCITY between rows ${i+1} (${A.t[i]} s) and ${i+2} (${A.t[i+1]} s) after MF0`,inf:!exact}}
  /* DESCENT dz/dt (file; derived profile per label), nearest row */
  const D=X.descent;if(tm>=D.t[0]&&tm<=D.t[D.t.length-1]){let i=bis(D.t,tm);if(tm-D.t[i]>D.t[i+1]-tm)i++;if(D.dzdt[i]!=null)out.descent={v:D.dzdt[i],src:`DESCENT.TAB row ${i+1} (${D.t[i]} s after MF0, ${f(Math.abs(D.t[i]-tm),1)} s away), dz/dt (M/S, "Descent velocity"); label: profile derived using the dry adiabat which fits the data, not measured points`,inf:false};else out.descent={v:null,src:`DESCENT.TAB row ${i+1}: dz/dt is -999.99 fill`,inf:false}}
  /* UPPERATM V_REL and FPA (file), vertical component inferred */
  const U=X.upper;if(tm>=U.t[0]&&tm<=U.t[U.t.length-1]){const i=bis(U.t,tm);const vr=lerp(U.t,U.vrel,tm),fpa=lerp(U.t,U.fpa,tm);out.upper={vrel:vr,fpa:fpa,src:`UPPERATM.TAB rows ${i+1}–${i+2}, V_REL (KM/S) and FPA (DEGREES), interpolated`,vert:{v:vr*1000*Math.sin(fpa*RAD),src:'inferred: UPPERATM V_REL × sin(FPA)',inf:true}}}
  return out}
function windAt(T){const W=P.probe.extra.wind;if(T<W.t[0]||T>W.t[W.t.length-1])return null;const i=bis(W.t,T);return {v:lerp(W.t,W.wind,T),src:`WIND.TAB (every 4th row packed) rows ≈${4*i+1}–${4*i+5}, WIND (m/s), interpolated; frame not stated in the label or DWEDS.CAT (the pre-flight DWE paper in SSRDWE.ASC describes a "profile of the zonal wind speed")`,inf:true}}
function pressureAt(T){const X=P.probe.extra,tm=T-MF0,W=X.wind;
  if(T>=W.t[0]&&T<=W.t[W.t.length-1]){const i=bis(W.t,T);return {v:lerp(W.t,W.p,T),src:`WIND.TAB PRESSURE (bar), interpolated near row ${4*i+1}`,inf:true}}
  const D=P.probe.descent;if(tm>=D.t[0]&&tm<=D.t[D.t.length-1])return {v:lerp(D.t,D.p_bar,tm),src:'DESCENT.TAB PRESSURE (bar), interpolated (derived profile per label)',inf:true};
  const U=X.upper;if(tm<=U.t[U.t.length-1]&&tm>=U.t[0])return {v:lerp(U.t,U.p_mbar,tm)/1000,src:'UPPERATM.TAB PRESSURE (mbar → bar), interpolated',inf:true};
  if(tm>U.t[U.t.length-1]&&tm<D.t[0]){const a=U.p_mbar[U.p_mbar.length-1]/1000,b=D.p_bar[0],fr=(tm-U.t[U.t.length-1])/(D.t[0]-U.t[U.t.length-1]);return {v:a+(b-a)*fr,src:'inferred: linear bridge between the last UPPERATM row and the first DESCENT row (no file covers this interval)',inf:true}}
  return null}
/* NEP haze density: XSEC22 5.8° cross section (m^-1 sr^-1), clipped at 0, normalised to the file maximum, interpolated in log pressure; no extrapolation; rows above 13 bar not used (NEPDS.CAT confidence note: valid data only to ~10–13 bars) */
const XS=P.probe.extra.xsec22;const XS_MAX=Math.max(...XS.c5.filter((v,i)=>v!=null&&XS.p[i]<=13));const XS_LOGP=XS.p.map(Math.log);   /* maximum over the rows at or below 13 bar */
function hazeAt(pbar){if(pbar==null||pbar<XS.p[0]||pbar>XS.p[XS.p.length-1])return {d:null,src:'outside NEP XSEC22 pressure range ('+XS.p[0]+'–'+XS.p[XS.p.length-1]+' bar): no data-driven haze'};
  if(pbar>13)return {d:null,src:'NEP rows above 13 bar not used (NEPDS.CAT: valid data may have been obtained only for the first 35 to 40 min, ~10 to 13 bars)'};
  const lp=Math.log(pbar),i=bis(XS_LOGP,lp);const a=XS.c5[i],b=XS.c5[i+1];if(a==null||b==null)return {d:null,src:'XSEC22 fill value at this pressure: no data-driven haze'};
  const fr=(lp-XS_LOGP[i])/(XS_LOGP[i+1]-XS_LOGP[i]);const c=a+(b-a)*fr;return {d:Math.max(0,c)/XS_MAX,c,src:`XSEC22.TAB rows ${i+1}–${i+2} (p ${XS.p[i]}–${XS.p[i+1]} bar), M5.8 CROSS SECTION ${c.toExponential(3)} m⁻¹sr⁻¹ → ${(Math.max(0,c)/XS_MAX).toFixed(3)} of the file maximum ${XS_MAX.toExponential(3)}`}}
/* NFR light level: |channel B net flux| (solar, 0.3–3.5 µm per NFRINST.CAT) relative to the first row, valid to 2500 s after MF0 (NFRDS.CAT) */
const NF=P.probe.extra.tcnf;const NF_B0=Math.abs(NF.B[0]);
function lightAt(T){const tm=T-MF0;if(tm<NF.t[0])return {L:1,src:'before the first NFR row ('+NF.t[0]+' s after MF0): light level held at 1'};if(tm>2500)return {L:null,src:'NFR rows after 2500 s after MF0 are invalid (NFRDS.CAT: "considered to be invalid, due to reduced detector responsivity at high temperature"): light level held at the last valid value'};
  const i=bis(NF.t,tm);const b=lerp(NF.t,NF.B,tm);return {L:Math.min(1,Math.abs(b)/NF_B0),b,src:`TCNF.TAB rows ${i+1}–${i+2}, B_TCNF ${b.toFixed(3)} W/m² (channel B net flux, "complete integration of all solar wavelengths from 0.3-3.5 microns", NFRINST.CAT) ÷ |first row| ${NF_B0.toFixed(3)} → ${Math.min(1,Math.abs(b)/NF_B0).toFixed(3)}; relative scaling only, not radiometry`}}
let LASTL=1,LASTHZ=0;
/* ---------------- per-frame state (all positions in absolute JSE km, then re-based on the followed object) ---------------- */
const tmp={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),u:new THREE.Vector3(),m:new THREE.Matrix4(),col:new THREE.Color(),col2:new THREE.Color()};
const ATM_FADE_KM=25;   /* illustrative: distance above the haze top over which the haze rendering fades out for the camera */
const psiAt=(psi,T)=>psi.psi0_deg+psi.rate_deg_per_day*((SCN.tms/1000+T)-Date.parse(psi.t_ref_utc+'Z')/1000)/86400;
let HUDTXT='';
function updateWorld(T){const sun=tmp.u.set(SCN.sun[0],SCN.sun[1],SCN.sun[2]);
  WORLD.JUPITER.pos.set(0,0,0);bodies.JUPITER.grp.rotation.z=psiAt(SCN.psi,T)*RAD;   /* prime meridian azimuth from the JUPCRDS fit; texture illustrative */
  let hud='';
  if(SCN.kind==='PROBE'){const pr=SCN.pr,pt=pr.probetrj,ot=pr.orbtrtrj;
    for(const k of MK4)if(pr.moons[k]){const m=pr.moons[k];sph(lerp(m.t,m.R,T)*RJ,lerp(m.t,m.lat,T),lerpA(m.t,m.az,T),WORLD[k].pos)}
    lerp3(ot.t_from_entry,ot.jse_km,T,WORLD.ORBITER.pos);
    const inData=T>=0&&T<=pt.t[pt.t.length-1];
    if(T>=0){lerp3(pt.t,pt.jse_km,Math.min(T,pt.t[pt.t.length-1]),WORLD.PROBE.pos)}else{WORLD.PROBE.pos.copy(WORLD.ORBITER.pos)}  /* before entry there is no probe position in the volumes: parked at the orbiter position, hidden */
    const alt=T>=0?lerp(pt.t,pt.alt_km,T):NaN,spd=T>=0?lerp(pt.t,pt.speed_kms,T):NaN;const RR=T>=0?descentRate(T):null,WD=T>=0?windAt(T):null,PRS=T>=0?pressureAt(T):null,HZ=PRS&&PRS.v!=null?hazeAt(PRS.v):{d:null,src:'no pressure'},LT=T>=0?lightAt(T):{L:1,src:''};if(LT.L!=null)LASTL=LT.L;if(HZ.d!=null)LASTHZ=HZ.d;
    const lost=T>pr.loss_of_lock_after_entry_s, brk=T>=167.106, dwe=T>pr.dwe_last_row_t_from_entry_s;
    /* probe configuration: entry module until the PROBETRJ table break (166 - 167.106 s), descent module + parachute after */
    const c=crafts.PROBE;c.grp.visible=T>=0;c.sub.entry.visible=!brk;c.sub.module.visible=brk;c.sub.chute.visible=brk;if(c.sub.lines)c.sub.lines.visible=brk;c.sub.aft.visible=brk&&T<167.106+90;c.sub.shell.visible=brk&&T<167.106+90;
    if(T>=0){const vd=lerp3(pt.t,pt.vdir_jse,T,tmp.a).normalize(),up=lerp3(pt.t,pt.up_jse,T,tmp.b).normalize();
      if(!brk){_q.setFromUnitVectors(_z.set(0,0,-1),vd);c.grp.quaternion.copy(_q)}else{_q.setFromUnitVectors(_z.set(0,0,1),up);c.grp.quaternion.copy(_q)}
      const dtb=T-167.106;const fall=brk?Math.min(90,dtb):0;c.sub.aft.position.set(0,0,fall*1.6*M2KM);c.sub.shell.position.set(0,0,-fall*2.2*M2KM);  /* separation motion illustrative (1.6 and 2.2 m/s drawing rates) */
      const altNow=lerp(pt.t,pt.alt_km,Math.min(T,pt.t[pt.t.length-1]));SCN.altNow=altNow;
      for(const L of SCN.rings){L.l.quaternion.copy(_q.setFromUnitVectors(_z.set(0,0,1),up));L.l.position.copy(WORLD.PROBE.pos).addScaledVector(up,L.alt-altNow)}
      SCN.grid.quaternion.copy(_q.setFromUnitVectors(_z.set(0,0,1),up));SCN.grid.position.copy(WORLD.PROBE.pos).addScaledVector(up,-altNow);SCN.grid.visible=true;
      for(const Q of SCN.qrings){Q.l.quaternion.copy(_q);Q.l.position.copy(WORLD.PROBE.pos).addScaledVector(up,Q.alt-altNow)}
      /* atmosphere: fog density from NEP haze + illustrative base, colour from NFR light; ceiling at the NEP table top; haze sprites around the probe */
      const below=altNow<SCN.ceilAlt, on=S.atm&&below;const Lv=(LT.L!=null?LT.L:LASTL);const dens=on?(0.04+1.2*(HZ.d!=null?HZ.d:LASTHZ)):0;   /* per km; starts at the NEP table top; the 0.04 base is illustrative; where NEP has no valid row the last valid haze value is held (no data-driven change) */
      SCN.fog.density=dens;tmp.col.setRGB(.93*Lv+.08,.83*Lv+.05,.64*Lv+.03);SCN.fog.color.copy(tmp.col);SCN.fogOn=on;SCN.dens=dens;SCN.Lv=Lv;
      SCN.ceil.visible=on;SCN.ceil.quaternion.copy(_q);SCN.ceil.position.copy(WORLD.PROBE.pos).addScaledVector(up,SCN.ceilAlt-altNow);SCN.ceil.material.opacity=.55*Lv;
      if(SCN.haze){const dd=HZ.d!=null?HZ.d:LASTHZ;for(const sp of SCN.haze){const k=sp.userData.seed,ph=T*.02+k;const r=.035+.09*hash(k,1,9);sp.position.copy(WORLD.PROBE.pos).addScaledVector(up,(hash(k,2,9)-.5)*.16+.01*Math.sin(ph));tmp.a.set(Math.cos(k*1.3+ph*.3),Math.sin(k*1.3+ph*.3),0).normalize();sp.position.addScaledVector(tmp.a,r);sp.scale.set(.08+.06*hash(k,3,9),.05+.04*hash(k,3,9),1);sp.material.opacity=on?.22*(0.3+dd):0;sp.visible=on}}}
    else {for(const L of SCN.rings)L.l.position.copy(WORLD.ORBITER.pos);SCN.grid.visible=false;SCN.grid.position.copy(WORLD.ORBITER.pos);SCN.fog.density=0;SCN.fogOn=false;SCN.ceil.visible=false;for(const Q of SCN.qrings)Q.l.position.copy(WORLD.ORBITER.pos);if(SCN.haze)for(const sp of SCN.haze)sp.visible=false}
    const o=crafts.ORBITER;o.grp.quaternion.identity();   /* no ROTATT coverage for 1995-12-07: unoriented */
    const rng=WORLD.PROBE.pos.distanceTo(WORLD.ORBITER.pos);
    const desc=pr.descent,up=pr.upperatm;let atm='';const tm=T-pr.mf0_after_entry_s;   /* ASI tables are timed from MF0 */
    if(tm>=desc.t[0]&&tm<=desc.t[desc.t.length-1]){const i=bis(desc.t,tm);atm=`<span class="k">ASI DESCENT.TAB row ${i*3+1}</span> <b>${f(desc.p_bar[i],3)} bar</b> <b>${f(desc.T_K[i],1)} K</b> <b>${f(desc.alt_km[i],1)} km</b>`}
    else if(tm>=up.t[0]&&tm<=up.t[up.t.length-1]){const i=bis(up.t,tm);atm=`<span class="k">ASI UPPERATM.TAB row ${i*4+1}</span> <b>${up.p_mbar[i]<1?up.p_mbar[i].toExponential(2):f(up.p_mbar[i],2)} mbar</b> <b>${f(up.T_K[i],1)} K</b> <b>${f(up.alt_km[i],1)} km</b>`}
    else atm='<span class="k">no ASI row at this time</span>';
    const st=T<0?'<span class="warn">before entry: no probe position in the volumes (probe not drawn)</span>':lost?`<span class="warn">after loss of lock 23:06:09 UT (DWEDS.CAT): end of received data; PROBETRJ continues as a trajectory reconstruction</span>`:dwe?'<span class="warn">after the last DWE row (3588.667 s); link lock continued to 3685.25 s</span>':T<pr.lock_after_entry_s?'<span class="k">before link lock (226.941 s, TIMES.TXT)</span>':'<span class="ok">● within the relay (lock to loss of lock)</span>';
    hud=`<div class="t">${fmtUTC(SCN.tms+T*1000)} UTC · entry ${T>=0?'+':''}${f(T,1)} s</div><div class="row">${st}</div>
<div class="row"><span class="k">PROBETRJ altitude</span><b title="PROBETRJ.TAB ALTITUDE, interpolated between 1-s rows">${T>=0?f(alt,2)+' km':'–'}</b><span class="k">probe–orbiter</span><b title="distance between the PROBETRJ.TAB and ORBTRTRJ.TAB positions (both EME50 → JSE)">${T>=0?f(rng,0)+' km':'–'}</b></div>
${RR?`<div class="row"><span class="k">descent rate</span>${RR.descent&&RR.descent.v!=null?`<b title="${RR.descent.src}">${f(RR.descent.v,1)} m/s DESCENT dz/dt</b>`:''}${RR.asi2ref?`<b class="${RR.asi2ref.inf?'inf':''}" title="${RR.asi2ref.src}">${f(RR.asi2ref.v,1)} m/s ASI2REF</b>`:''}${RR.upper?`<b title="${RR.upper.src}">V_REL ${f(RR.upper.vrel,3)} km/s, FPA ${f(RR.upper.fpa,2)}°</b><b class="inf" title="${RR.upper.vert.src}">${f(RR.upper.vert.v,0)} m/s vertical</b>`:''}<b class="inf" title="${RR.pt.src}">${f(RR.pt.v,1)} m/s PROBETRJ Δalt/Δt</b></div>
<div class="row"><span class="k">wind</span>${WD?`<b class="inf" title="${WD.src}">${f(WD.v,1)} m/s WIND.TAB</b>`:'<span class="k">no WIND.TAB row at this time</span>'}<span class="k">inertial speed</span><b title="PROBETRJ.TAB |V| in Jupiter-centred EME50: includes the planet’s rotation; not a descent speed">${f(spd,3)} km/s EME50</b></div>
<div class="row"><span class="k">pressure</span>${PRS?`<b class="${PRS.inf?'inf':''}" title="${PRS.src}">${PRS.v<0.01?PRS.v.toExponential(2):f(PRS.v,3)} bar</b>`:'<span class="k">no pressure row</span>'}<span class="k">NEP haze</span>${HZ.d!=null?`<b class="inf" title="${HZ.src}">${f(HZ.d,3)} of max</b>`:`<span class="k" title="${HZ.src}">no valid NEP row: held ${f(LASTHZ,3)}</span>`}<span class="k">NFR light</span>${LT.L!=null?`<b class="inf" title="${LT.src}">${f(LT.L,3)}</b>`:`<span class="k" title="${LT.src}">held ${f(LASTL,3)}</span>`}</div>
<div class="legend"><i>teal †</i> = inferred here (interpolated, differenced or scaled), not read from a file; hover a value for its file and column. ${S.atm?'atmosphere rendering: illustrative; density and light level follow NEP and NFR data where stated':'atmosphere rendering off'}</div>`:''}
<div class="row">${atm}</div>${SCN.inside?'<div class="row k">camera below the 1-bar reference level (PROBETRJ altitude zero): the level is drawn as a translucent surface</div>':''}<div class="row"><span class="k">configuration</span><b>${T<0?'–':brk?'descent module + parachute (after the 166–167.106 s table break)':'entry module (aeroshell + aft cover)'}</b></div>`;
    if(lost&&T<pr.loss_of_lock_after_entry_s+400){c.mat.opacity=1;}
    c.mat.transparent=lost;c.mat.opacity=lost?.35:1;
    if(lost)hud+='<div class="row k">after the end of data nothing is measured; the book’s fate statement is a documented hypothesis (see sources: “mission scientists hypothesized that its parachute melted…”, Meltzer p. 208). The greyed model is only the last configuration.</div>';
    if(T>pt.t[pt.t.length-1])hud+='<div class="row warn">beyond the last PROBETRJ row (5400 s)</div>';
  } else {const fl=SCN.fl,tr=fl.traj,rk=fl.rk_km;
    if(fl.moon_jse){const mt=fl.moon_track;sph(lerp(mt.t,mt.R,T)*RJ,lerp(mt.t,mt.lat,T),lerpA(mt.t,mt.az,T),WORLD[fl.moon].pos);
      for(const k of MK4)if(k!==fl.moon&&WORLD[k]){const m=fl.moons_at_tca[k];sph(m.R_Rj*RJ,m.lat_deg,m.az_deg,WORLD[k].pos)}
      const x=lerp(tr.t,tr.x,T)*rk,y=lerp(tr.t,tr.y,T)*rk,z=lerp(tr.t,tr.z,T)*rk,B=fl.basis_jse;
      WORLD.ORBITER.pos.set(WORLD[fl.moon].pos.x+x*B.x[0]+y*B.y[0]+z*B.z[0],WORLD[fl.moon].pos.y+x*B.x[1]+y*B.y[1]+z*B.z[1],WORLD[fl.moon].pos.z+x*B.x[2]+y*B.y[2]+z*B.z[2]);
      SCN.track.position.copy(WORLD[fl.moon].pos);
    } else {  /* Amalthea: moon position vs Jupiter not in the data; the moon is placed at the spacecraft's JUPCRDS position minus the PHIO offset is NOT possible without the basis azimuth; show the moon-centred geometry at Jupiter-relative origin of the spacecraft's JUPCRDS position at CA */
      const sc=fl.sc_jse_jupcrds_Rj;WORLD[fl.moon].pos.set(sc[0]*RJ,sc[1]*RJ,sc[2]*RJ);  /* placeholder anchor: the spacecraft's own CA position (labelled in the HUD) */
      for(const k of MK4)if(WORLD[k]&&fl.moons_at_tca&&fl.moons_at_tca[k]){const m=fl.moons_at_tca[k];sph(m.R_Rj*RJ,m.lat_deg,m.az_deg,WORLD[k].pos)}
      const x=lerp(tr.t,tr.x,T)*rk,y=lerp(tr.t,tr.y,T)*rk,z=lerp(tr.t,tr.z,T)*rk;WORLD.ORBITER.pos.set(WORLD[fl.moon].pos.x+x,WORLD[fl.moon].pos.y+y,WORLD[fl.moon].pos.z+z);SCN.track.position.copy(WORLD[fl.moon].pos)}
    const o=crafts.ORBITER,att=fl.att&&Math.abs(fl.att.dt_from_ca_s)<=10&&fl.att.axis_jse;
    if(att){tmp.a.set(fl.att.axis_jse[0],fl.att.axis_jse[1],fl.att.axis_jse[2]).normalize();_q.setFromUnitVectors(_z.set(0,0,1),tmp.a);o.grp.quaternion.copy(_q);o.grp.rotateZ((fl.att.twist_rate_rpm||0)*TAU/60*(T-fl.att.dt_from_ca_s))}else o.grp.quaternion.identity();
    const rr=Math.hypot(lerp(tr.t,tr.x,T),lerp(tr.t,tr.y,T),lerp(tr.t,tr.z,T));
    const mj=fl.moon_jse;
    hud=`<div class="t">${fmtUTC(SCN.tms+T*1000)} UTC · CA ${T>=0?'+':''}${f(T/60,1)} min</div>
<div class="row"><span class="k">range to ${MOONS[fl.moon].name}</span><b>${f(rr,3)} radii</b><b>${f(rr*rk,0)} km</b><span class="k">altitude</span><b>${f((rr-1)*rk,0)} km</b></div>
<div class="row">${mj?`<span class="k">${MOONS[fl.moon].name} from Jupiter</span><b>${f(lerp(fl.moon_track.t,fl.moon_track.R,T),3)} Rj</b><span class="k">JSE az</span><b>${f(lerpA(fl.moon_track.t,fl.moon_track.az,T)%360,2)}°</b>`:'<span class="warn">Amalthea position relative to Jupiter is not in the volumes read; moon-centred geometry only</span>'}</div>
<div class="row"><span class="k">orbiter attitude</span>${att?`<b class="ok">ROTATT row ${fl.att.utc.slice(11,23)} (${f(fl.att.dt_from_ca_s,1)} s from CA)</b><span class="k">spin</span><b>${f(fl.att.twist_rate_rpm,2)} rpm</b><span class="k">axis–Sun</span><b>${f(fl.att.angle_axis_to_sun_deg,1)}°</b>`:`<b class="warn">unoriented${fl.att_note?' ('+fl.att_note+')':fl.att?' (nearest ROTATT row '+f(fl.att.dt_from_ca_s,0)+' s from CA)':''}</b>`}</div>
<div class="row"><span class="k">Sun</span><b>β = ${f(SCN.kind==='PROBE'?0:fl.beta.beta_deg,3)}° (JSM fit, ±5 d)</b></div>`;
  }
  HUDTXT=hud;
  /* re-base everything on the followed object (floating origin) */
  const base=WORLD[S.follow].pos;
  for(const k in WORLD){const w=WORLD[k];if(!w.grp)continue;w.grp.position.copy(w.pos).sub(base)}
  for(const l of lines){ if(l===SCN.probeTrack||l===SCN.orbTrack) l.position.copy(WORLD.JUPITER.pos).sub(base); else if(SCN.track&&l===SCN.track) l.position.copy(WORLD[SCN.fl.moon].pos).sub(base) }
  if(SCN.kind==='FLY'){SCN.rings=[];SCN.grid=null}
  stars.position.set(0,0,0);stars.visible=S.stars;
  { const jm=bodies.JUPITER.mesh,jp=WORLD.JUPITER.grp.position;const cx=cam.position.x-jp.x,cy=cam.position.y-jp.y,cz=cam.position.z-jp.z;const inside=(cx*cx+cy*cy)/(JUP_REQ*JUP_REQ)+cz*cz/(JUP_RPOL*JUP_RPOL)<1;
    if(SCN.kind==='PROBE'){if(inside!==!!SCN.inside){for(const m of [jm.material,bodies.JUPITER.cap.material,bodies.JUPITER.near.material]){m.side=inside?THREE.DoubleSide:THREE.FrontSide;m.transparent=inside;m.opacity=inside?.32:1;m.needsUpdate=true}jm.visible=!inside}SCN.inside=inside}else SCN.inside=false }
  /* atmosphere weight by CAMERA position: 1 while the camera is below the haze top (altitude of the top NEP XSEC22 row, SCN.ceilAlt), fading to 0 over ATM_FADE_KM above it.
     Camera altitude = (camera–Jupiter-centre distance) − (probe–Jupiter-centre distance) + probe altitude (spherical shell about the Jupiter centre, same altitude reference as the probe table).
     The fade length is illustrative; it only decides where the haze rendering stops, not any data value. */
  SCN.fogW=0;SCN.camAlt=null;
  if(SCN.kind==='PROBE'&&SCN.fogOn&&SCN.altNow!=null){const jp=WORLD.JUPITER.grp.position,pr=WORLD.PROBE.grp.position;
    const camAlt=Math.hypot(cam.position.x-jp.x,cam.position.y-jp.y,cam.position.z-jp.z)-Math.hypot(pr.x-jp.x,pr.y-jp.y,pr.z-jp.z)+SCN.altNow;SCN.camAlt=camAlt;
    const x=Math.min(1,Math.max(0,(camAlt-SCN.ceilAlt)/ATM_FADE_KM));SCN.fogW=1-x*x*(3-2*x)}
  if(SCN.fog)SCN.fog.density=(SCN.dens||0)*SCN.fogW;
  /* Sun: light from the Sun direction, disc at the true angular size */
  sunLight.position.copy(sun).multiplyScalar(1e6);sunLight.target.position.set(0,0,0);sunLight.intensity=(TIER==='HIGH'?SUN_REL*EXPOSURE_GAIN*1.0:1.0)*(SCN.kind==='PROBE'&&SCN.fogOn?(1-SCN.fogW*(1-(.25+.75*SCN.Lv))):1);
  sunDisc.position.copy(sun).multiplyScalar(SUN_DRAW_DIST);const sr=SUN_DRAW_DIST*Math.tan(SUN_ANG/2)*2;sunDisc.scale.set(sr,sr,1);
  sunGlow.visible=S.glow;sunGlow.position.copy(sunDisc.position);sunGlow.scale.set(sr*40,sr*40,1);
  const dist=cam.position.length();
  const sp=sunLine.geometry.attributes.position;sp.setXYZ(0,0,0,0);sp.setXYZ(1,sun.x*dist*.9,sun.y*dist*.9,sun.z*dist*.9);sp.needsUpdate=true;
  const pp=poleLine.geometry.attributes.position;const jp=WORLD.JUPITER.grp.position;pp.setXYZ(0,jp.x,jp.y,jp.z-JUP_RPOL*1.6);pp.setXYZ(1,jp.x,jp.y,jp.z+JUP_RPOL*1.6);pp.needsUpdate=true;
  /* LOD: craft meshes only when close; markers when far; moons as markers when sub-pixel */
  const H=cv.clientHeight||600,fovScale=H/(2*Math.tan(cam.fov*RAD/2));
  for(const k in WORLD){const w=WORLD[k];const d=w.grp.position.distanceTo(cam.position);const px=w.r/d*fovScale;
    if(w.craft){const hide=(k==='PROBE'&&SCN.kind==='PROBE'&&T<0);w.grp.visible=!hide&&d<6;w.marker.visible=!hide&&d>=.3}else{w.marker.visible=px<3}
    w.marker.position.copy(w.grp.position);w.marker.scale.set(.028,.028,1)}
  for(const L of (SCN.rings||[])){L.l.position.sub(base);L.l.visible=SCN.kind==='PROBE'&&T>=0&&cam.position.length()<60}
  if(SCN.grid){SCN.grid.position.sub(base);SCN.grid.visible=SCN.grid.visible&&cam.position.length()<400}
  if(SCN.kind==='PROBE'){for(const Q of SCN.qrings){Q.l.position.sub(base);Q.l.visible=T>=0&&cam.position.length()<60}SCN.ceil.position.sub(base);if(SCN.haze)for(const sp of SCN.haze)sp.position.sub(base);
    const on=!!SCN.fogOn,w=SCN.fogW;tmp.col2.set(0x06080e);R_.setClearColor(on?tmp.col2.lerp(SCN.fog.color,w):tmp.col2,1);stars.visible=S.stars&&w<.5;sunDisc.visible=w<.5;fill.intensity=(TIER==='HIGH'?.25:.4)*(on?(1+w*(.6+2.2*SCN.Lv-1)):1);
    if(SCN.ceil&&SCN.ceil.visible&&w<.02)SCN.ceil.visible=false;if(SCN.haze&&w<.02)for(const sp of SCN.haze)sp.visible=false}
  else {R_.setClearColor(0x06080e,1);sunDisc.visible=true;fill.intensity=TIER==='HIGH'?.25:.4}
}

/* ---------------- labels (2D overlay) ---------------- */
const LEAD=$('#lead');
function drawLabels(){const st=$('#stage'),W=st.clientWidth,H=st.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!W||!H)return;if(LEAD.width!==Math.round(W*dpr)||LEAD.height!==Math.round(H*dpr)){LEAD.width=Math.round(W*dpr);LEAD.height=Math.round(H*dpr)}
  const g=LEAD.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.font='500 11.5px '+getComputedStyle(document.body).fontFamily;g.textBaseline='middle';
  const placed=[];
  const put=(pos,text,col,pri)=>{_v.copy(pos).project(cam);if(_v.z>1||_v.z<-1)return;const x=(_v.x*.5+.5)*W,y=(-_v.y*.5+.5)*H;if(x<-50||x>W+50||y<-20||y>H+20)return;const w=g.measureText(text).width+10;let yy=y-14;for(let k=0;k<12;k++){const c=placed.find(p=>Math.abs(p.y-yy)<15&&x+6<p.x+p.w&&x+6+w>p.x);if(!c)break;yy=c.y-16}
    if(Math.abs(yy-(y-14))>1){g.strokeStyle='rgba(228,232,242,.35)';g.beginPath();g.moveTo(x,y);g.lineTo(x+6,yy);g.stroke()}
    g.fillStyle='rgba(6,8,14,.6)';g.fillRect(x+6,yy-8,w,16);g.fillStyle=col;g.fillText(text,x+11,yy);placed.push({x:x+6,y:yy,w})};
  for(const k in WORLD){const w=WORLD[k];if(w.grp.visible===false&&!w.marker.visible)continue;if(k==='PROBE'&&S.scene==='PROBE'&&S.T<0)continue;put(w.grp.position,w.label+(w.craft?(TIER==='HIGH'?' (mesh model, illustrative)':' (voxel model, illustrative)'):''),w.col,1)}
  _w.set(SCN.sun[0],SCN.sun[1],SCN.sun[2]).multiplyScalar(cam.position.length()*.9);put(_w,'to Sun (JSM X; β fit)','#ffe08a',2);
  put(sunDisc.position,`Sun disc · ${(SUN_ANG/RAD).toFixed(3)}° (true angular size at ${(SUN_DIST/1e6).toFixed(2)}·10⁶ km, ORBTRTRJ.TAB)`,'#fff6d6',2);
  if(SCN.kind==='PROBE'&&S.T>=0){ /* data-defined pressure levels near the probe, from DESCENT.TAB rows */
    const pr=SCN.pr,pt=pr.probetrj;const up=lerp3(pt.t,pt.up_jse,Math.min(S.T,pt.t[pt.t.length-1]),tmp.c).normalize();const alt=lerp(pt.t,pt.alt_km,Math.min(S.T,pt.t[pt.t.length-1]));
    if(cam.position.length()<60)for(const L of pr.layers){const d=L.descent;_w.copy(WORLD.PROBE.grp.position).addScaledVector(up,d.alt_km-alt);put(_w,`${d.p_bar.toFixed(2)} bar · ${d.alt_km.toFixed(1)} km · ${d.T_K.toFixed(0)} K (DESCENT.TAB row ${d.row})`,'#9fe3ff',3)}
    for(const Q of SCN.qrings)if(Q.l.visible&&Q.lab)put(Q.l.position,Q.lab+' · '+Q.pb+' bar at DESCENT.TAB altitude '+Q.alt.toFixed(1)+' km','#ffb347',3);
    if(SCN.ceil.visible&&cam.position.length()<60)put(SCN.ceil.position,'bright ceiling: illustrative; placed at the top NEP XSEC22 row (0.3981 bar) = '+SCN.ceilAlt.toFixed(1)+' km (inferred: bridge between UPPERATM last row and DESCENT first row)','#ffe9c9',3);
    if(SCN.grid&&SCN.grid.visible){_w.copy(SCN.grid.position).addScaledVector(up,0).add(tmp.a.set(0,0,0));_w.copy(SCN.grid.position);put(_w,'1-bar reference level (PROBETRJ altitude 0), local 5-km grid','#e8c9a0',3)}
    if(S.T>pr.loss_of_lock_after_entry_s){put(WORLD.PROBE.grp.position,'END OF RECEIVED DATA · loss of lock 23:06:09 UT · 3685.25 s after entry (DWEDS.CAT)','#ff8c69',0);
      _v.copy(WORLD.PROBE.grp.position).project(cam);if(_v.z<1&&_v.z>-1){const x=(_v.x*.5+.5)*W+14,y0=(-_v.y*.5+.5)*H+12;g.font='500 11px '+getComputedStyle(document.body).fontFamily;const rows=[['end altitude by source','time','altitude','pressure']].concat(ENDTABLE);const cw=[230,150,140,70];const wsum=cw.reduce((a,b)=>a+b,0);
        g.fillStyle='rgba(6,8,14,.78)';g.fillRect(x,y0,wsum+12,16*rows.length+8);rows.forEach((r,i)=>{let xx=x+6;g.fillStyle=i?'#e4e8f2':'#ff8c69';r.forEach((c,j)=>{g.fillText(c,xx,y0+12+16*i);xx+=cw[j]})});g.font='500 11.5px '+getComputedStyle(document.body).fontFamily}}
  }
}

/* ---------------- round-2 documents: Meltzer, Mission to Jupiter (NASA SP-2007-4231), printed pages 202-209; JPL/NASA Galileo Jupiter Arrival Press Kit, December 1995 ---------------- */
const BOOK='Meltzer, Mission to Jupiter, NASA SP-2007-4231';const KIT='Galileo Jupiter Arrival Press Kit, JPL/NASA, December 1995';
const Q2=[
 ['Times below are all Earth-received times, allowing for the time it takes the transmissions from the spacecraft to reach Earth (approximately 52 mins.)',KIT+', Galileo Quick Look Facts, p. 5'],
 ['Probe release  July 12, 1995  11:07 p.m. PDT',KIT+', Quick Look Facts, p. 5 (Earth-received time; the July 1995 light time is not given in either document, so no spacecraft-event time is derived)'],
 ['Io flyby (about 1,000 km/6,200 mi)  December 7, 1995  10:38 a.m. PST',KIT+', Quick Look Facts, p. 5 (Earth-received)'],
 ['Probe atmospheric entry and relay  December 7, 1995  2:56 p.m. PST',KIT+', Quick Look Facts, p. 5 (Earth-received)'],
 ['Jupiter Orbit Insertion (JOI):  December 7, 1995  5:19 p.m. PST',KIT+', Quick Look Facts, p. 5 (Earth-received)'],
 ['ONE WAY LIGHT TIME = 52 min',BOOK+', Figure 8.4, printed p. 203'],
 ['EVENT TIMES (STC @ S/C): EUROPA C/A 13:09 · IO C/A 17:46 · JUPITER C/A 21:54 · PROBE ENTRY 22:04 · RELAY STRAT 22:07 · RLY CHECK #1* 22:12 · RLY CHECK #2* 22:24 · RELAY END 22:22 · JOI START (12/8) 00:27 · JOI END (12/8) 01:16 · * CHECKS IF RVCR IN LOCK',BOOK+', Figure 8.4 box, printed p. 203, transcribed as printed. As printed, RLY CHECK #2 (22:24) is later than RELAY END (22:22), and both precede the loss of lock in the DWE data (23:06:09 UT). Not corrected here.'],
 ['Minutes after 2:00 p.m. PST, the Probe sped by Jupiter’s cloud tops on its way down into the planet’s atmosphere.',BOOK+', printed p. 203'],
 ['At 3:13 p.m. PST, when a voice finally announced, “We have confirmation of telemetry lock,”',BOOK+', printed p. 203 (Earth-received)'],
 ['The one-bit signal had actually arrived at 3:04 p.m. PST, right on schedule,',BOOK+', printed p. 203 (Earth-received)'],
 ['The listed times are relative to the moment when the Probe crossed the 450-kilometer altitude level (“atmospheric entry time”), which occurred at 22:04:44 universal time (UT). Note the shallow angle (only 8.4 degrees below horizontal) at which the Probe entered the Jovian atmosphere. The radio signal from the Probe ended 61.4 minutes into the entry, when the high atmospheric temperatures caused the radio transmitter to fail.',BOOK+', printed p. 205. The causal clause about the transmitter is the book’s statement, not a measurement in the PDS volumes.'],
 ['These events all occurred within a period of 1.26 seconds. The forward heatshield was dropped 9 seconds later from the rapidly slowing descent module. When the forward shield had fallen to a distance of 30 meters below the descent module, the module’s science experiments were begun. The main parachute eventually decreased descent module velocity to 430 kilometers per hour (265 mph).',BOOK+', printed pp. 204-205 (footnote 61: Ames Research Center, “Probe Mission Events”)'],
 ['Soon after the Probe stopped transmitting, mission scientists hypothesized that its parachute melted, then its aluminum fittings. A couple of hours later, the aluminum vaporized. Four hours after that, even the ultratough titanium shell of the Probe had melted, and, after an additional 2 hours, the titanium evaporated as the temperature climbed to 1,700 oC (3,100 oF) and the pressure rose to 5,000 times that of Earth’s surface.',BOOK+', printed p. 208, footnote 63: “Arrival at Jupiter,” p. 51; “The Probe Story: Secrets and Surprises from Jupiter,” Galileo Messenger (April 1996). DOCUMENTED HYPOTHESIS, NOT DATA: the book gives a temperature and a pressure, no altitude; nothing is drawn from it.'],
 ['The 4.8-meter (16-foot) wide, umbrella-like high-gain antenna is mounted at the top of the spacecraft. When unfurled, the antenna\'s hosiery-like wire mesh stretches over 18 umbrella ribs to form a large parabolic dish.',KIT+', The High-Gain Antenna, p. 22'],
 ['Galileo’s atmospheric probe weighs 339 kilograms (746 pounds), and includes a deceleration module to slow and protect the descent module, which carries out the scientific mission.',KIT+', p. 32'],
 ['The deceleration module consists of an aeroshell and an aft cover, designed to block the heat generated by friction during the sharp deceleration of atmospheric entry. Inside the shells are the descent module and its 2.5-meter (8-foot) parachute.',KIT+', p. 32'],
 ['The Galileo orbiter, about 214,000 kilometers (133,000 miles) above, will acquire the probe signal within 50 seconds.',KIT+', p. 11 (pre-encounter plan)'],
 ['The Probe’s nephelometer (NEP) detected a tenuous layer between 0.46 and 0.55 bar—nearly the same altitude range as above—that could have been the predicted ammonia cloud. NEP data, however, had an uncertainty associated with them.',BOOK+', printed p. 213'],
 ['The NEP recorded denser particle concentrations at pressures ranging from 0.76 to 1.34 bars, or altitudes from roughly 9 to -10 kilometers (i.e., from 9 kilometers above to 10 kilometers below the 1-bar level in the atmosphere). Though far more tenuous than predicted, these particle populations were possibly the expected ammonium hydrosulfide clouds. The NFR detected a similar structure at 1.35 bars. The NEP also found one well-defined tenuous cloud structure with a base at the 1.6-bar pressure level.',BOOK+', printed p. 213'],
 ['The NEP, however, detected only a weak structure in that region which might have been a thin water cloud, although the data were inconclusive. The NFR did not detect this structure at all. In summary, the Probe’s search for Jovian clouds did not identify any thick, dense cloud layers, nor did it conclusively identify any water clouds.',BOOK+', printed p. 213'],
 ['recorded variations in sky brightness in the 0.4- to 0.6-bar level of the atmosphere. This phenomenon corresponded to altitudes from 23 down to 14 kilometers (14 to 9 miles) above the level at which pressure equaled 1.0 bar',BOOK+', printed p. 213 (the net flux radiometer)'],
 ['Because the instrument deteriorated in the hot internal probe environment near the end of descent, valid data may have been obtained only for the first 35 to 40 min of descent, corresponding to an ambient pressure of ~10 to 13 bars.','GP_0001/CATALOG/NEPDS.CAT, Confidence Level Overview'],
 ['The Nephelometer measured light scattering at 900 nm wavelength at five angles in order to determine properties of aerosol particles and clouds encountered during descent.','GP_0001/CATALOG/NEPDS.CAT'],
 ['Flux data acquired below the 14-bar level (Data Cycle 21, 2500 seconds after Minor Frame Zero), are considered to be invalid, due to reduced detector responsivity at high temperature.','GP_0001/CATALOG/NFRDS.CAT, Data Coverage and Quality'],
 ['The Galileo Probe Net Flux Radiometer (NFR) measured net and upward radiation fluxes in Jupiter\'s atmosphere between about 0.44 bars and 14 bars, using five spectral channels to separate solar and thermal components.','GP_0001/CATALOG/NFRDS.CAT'],
 ['Two solar channels provided complete integration of all solar wavelengths from 0.3-3.5 microns (B) and a red-weighted subset from 0.6-3.5 microns (E) in which methane absorption is most significant. A broadband thermal channel (A) from 3-200 microns measured sources and sinks of Jupiter\'s thermal radiation as a whole.','GP_0001/CATALOG/NFRINST.CAT, Spectral Response'],
 ['These profiles are not a list of measured points, but is derived using the dry adiabat which fits the data, as shown and described in SEIFFETAL1998.','GP_0001/DATA/ASI/DESCENT.LBL'],
];
/* Meltzer Table 8.1 (printed pp. 206-208), cells transcribed from the page images; footnote 62 cites Magalhães (ARC) pages. Units as printed: km (mi), km/h (mph), bar, deg C (deg F). */
const T81=[
 ['E - 147 days','12 July 1995 (PDT)','Probe separation: Orbiter/Probe spacecraft spins at up to 10 rpm for stability. Spin axis is lined up with Probe trajectory. Explosive nuts accomplish separation of Probe from Orbiter. Three springs push Probe away. Orbiter rocket engine fires to alter craft trajectory so that it will not impact Jupiter but will orbit the planet in position to pick up the Probe’s signals.','distance from Jupiter 81,520,000 (50,660,000) km (mi); speed relative to Jupiter 20,448 (12,706) km/h (mph)'],
 ['E - 6 hours','','Probe timer initiates craft’s operation. Batteries are activated, and EPI is biased for operation.','600,000 (373,000) km (mi); 76,700 (47,600) km/h (mph)'],
 ['E - 3 hours','','Measurement of Jupiter’s inner radiation belts begins.','360,000 (224,000) km (mi); 97,200 (60,400) km/h (mph)'],
 ['E + 0','','Probe atmospheric entry. Rapid deceleration and intense heating of atmospheric gases near the Probe begin. Atmospheric structure instrument begins recording; atmospheric pressure, density, and temperature inferred from data.','altitude 450 (280); speed 171,000 (106,000); pressure 0.0000001; temperature 352 (666)'],
 ['E + 35 seconds','','Period of maximum heat generation and ablation begins. Heatshield burnoff sensors begin measurements of heatshield mass loss.','altitude 220 (1400 [as printed]); pressure 0.0001; temperature Near Probe: 14,000 (25,000); away from Probe: -100 (-150)'],
 ['E + 55 seconds','','Peak aerodynamic stresses and maximum forces of up to 250 g’s experienced.','pressure 0.006; temperature Away from Probe: - 120 (-184)'],
 ['E + 80 seconds','','Main heat pulse and heatshield ablation end.',''],
 ['E + 172 seconds','','Pilot parachute deployed','altitude 23 (14); pressure 0.4; temperature -145 (-229)'],
 ['E + 173 seconds','','Aft heatshield separates and pulls out main parachute','altitude 23 (14); pressure 0.4; temperature -145 (-229)'],
 ['E + 3.0 minutes','','Main parachute slows descent module. Three explosive separation bolts fire, and forward heatshield falls away.','altitude 21 (13); speed 650 (400); pressure 0.45; temperature -145 (-229)'],
 ['E + 3.8 minutes','','Orbiter locks on Probe radio signal.','altitude 16 (10); pressure 0.56; temperature -135 (-211)'],
 ['E + 6.4 minutes','','Zero altitude attained (defined as the point where pressure = 1 bar, or Earth surface pressure).','altitude 0 (0); pressure 1; temperature -107 (-161)'],
 ['','','','altitude -20 (-12); pressure 2; temperature -66 (-87)'],
 ['','','','altitude -96 (-60); pressure 12; temperature 84 (183)'],
 ['E + 61.4 minutes','','Probe signal no longer detected. Pressure is approximately equal to that at an Earth ocean depth of 700 feet.','altitude -146 (-91); pressure 22; temperature 153 (307)'],
];
/* Press kit pre-encounter plan figure (pp. 9-10): PLAN values, not results */
const KITPLAN=[['PROBE ENTRY','450 km, 5 X 10-8 bar, -8°C, 0 min'],['DROGUE PARACHUTE','50 km, 0.08 bar, -160°C, 1.88 min'],['MAIN PARACHUTE DEPLOYEMENT [as printed]','48 km, 0.09 bar, -161°C, 1.92 min'],['HEAT SHIELD DROPS OFF','45 km, 0.10 bar, -162°C, 2.05 min'],['TELEMETRY TO ORBITER','42 km, 0.13 bar, -163°C, 2.25 min'],['EARTH SURFACE PRESSURE','0 km, 1.0 bar, -107°C, 8.33 min'],['PRIMARY DATA REQUIREMENT','-92 km, 10 bars, 63°C, 38 min'],['PROBE MISSION TERMINATES','-134 km, 20 bars, 140°C, 60 min TO -163 km, 30 bars, 192°C, 78 min']];
/* Cross-checks of the book/kit against the PDS tables (computed from GP_0001 WIND.TAB, RESID.TAB, DESCENT.TAB, UPPERATM.TAB and PROBETRJ.TAB; DESCENT/UPPERATM times are MF0-based and shifted by 167.213 s) */
const XCHK=[
 ['Entry epoch','book 22:04:44 UT (p. 205)','TIMES.TXT 22:04:43.752 UT; PROBETRJ.LBL 22:05:44.9531 ET (= 22:04:43.769 UT with ET-UT 61.184 s)','0.25 s'],
 ['Entry altitude / angle','book 450 km, “8.4 degrees below horizontal”; kit plan 450 km','PROBETRJ row 0: 450.308 km; UPPERATM row nearest entry (t = -167.12 s from MF0): 456.8 km, FPA -8.44°, V_REL 47.402 km/s','PROBETRJ 0.3 km; UPPERATM 6.5 km; angle 0.04°'],
 ['Entry speed','book 171,000 km/h (= 47.5 km/s)','UPPERATM V_REL 47.402 km/s (170,647 km/h); PROBETRJ |V| row 0 = 59.846 km/s in EME50 (inertial, not relative to the atmosphere)','0.1 km/s vs V_REL'],
 ['Pilot chute / aft cover','book E+172 s / E+173 s at 23 km, 0.4 bar; kit plan drogue 1.88 min (112.8 s), main 1.92 min','PROBETRJ table break 166–167.106 s (“OD126 WITH 53 SEC LATE PARACHUTE”; 112.8 + 53 = 165.8 s); UPPERATM last row t = -0.242 s from MF0 (= 166.97 s): 23.445 km, 349.5 mbar','5–6 s; 0.4 km; 0.05 bar'],
 ['Link lock','book E+3.8 min, 16 km, 0.56 bar','TIMES.TXT 226.941 s = 3.782 min; PROBETRJ 17.265 km; RESID first row (227.333 s) 13.399 km, 0.5648 bar; DESCENT 13.52 km, 0.562 bar; kit plan: orbiter 214,000 km above, acquire within 50 s; data: probe–orbiter 215,448 km at lock','altitude: book 16 vs 17.3 (PROBETRJ) vs 13.4–13.5 (DWE/ASI) km'],
 ['1 bar','book E+6.4 min (384 s), 0 km, -107 °C (166 K); kit plan 8.33 min','WIND.TAB rows 239–240: 0.998 → 1.000 bar at 386.667 s (6.444 min); RESID altitude there -0.00 km; DESCENT 1 bar at 385.56 s, 0.0 km; PROBETRJ altitude 0 at 413.0 s (2.167 km at 386.667 s)','WIND 2.7 s; PROBETRJ 26 s / 2.2 km'],
 ['2 bar','book -20 km, -66 °C','WIND 2.000 bar at 686.05 s (rows 689–690); RESID -19.91 km; PROBETRJ -20.03 km; DESCENT -19.91 km at 681.25 s','0.1 km'],
 ['12 bar','book -96 km, 84 °C','WIND 12.00 bar at 2510.38 s (rows 3425–3426); RESID -96.08 km; DESCENT -96.08 km at 2457.42 s; PROBETRJ -103.2 km at 2510.38 s','RESID/DESCENT 0.1 km; PROBETRJ 7.2 km'],
 ['20 bar','kit plan -134 km at 60 min','WIND 20.00 bar at 3554.20 s (59.24 min); RESID -126.26 km; DESCENT -126.26 km at 3473.73 s; PROBETRJ -136.02 km','RESID vs plan 7.7 km'],
 ['End of signal','book E+61.4 min, -146 km, 22 bar, 153 °C; kit plan 60–78 min','DWEDS.CAT loss of lock 3,685.25 s = 61.421 min; PROBETRJ -139.756 km at 3685.25 s; last DWE row 3588.667 s: RESID -127.16 km, WIND 20.285 bar, 417.5 K; DESCENT last row (3523.7 s from MF0 = 3690.91 s): -132.54 km, 22.05 bar, 428.0 K; LOWERATM last row (3560.6 s, time base not stated in its label): -130.74 km, 22.05 bar, 428.0 K','time 0.02 min; altitude: five values from -127.16 to -146 km'],
];
const ENDTABLE=[['Meltzer Table 8.1 (p. 208)','E + 61.4 min','-146 km','22 bar'],['DWEDS.CAT loss of lock','3685.25 s','PROBETRJ -139.76 km','–'],['ASI DESCENT.TAB last row 300','3690.91 s from entry','-132.54 km','22.05 bar'],['ASI LOWERATM.TAB last row 307','3560.6 s (base not stated)','-130.74 km','22.05 bar'],['DWE RESID.TAB / WIND.TAB last row 5043','3588.667 s','-127.16 km','20.285 bar']];
/* timeline ticks: data events (orange) and book Table 8.1 events (blue), seconds from entry */
const TICKS_DATA=[[0,'entry'],[166,'PROBETRJ break'],[167.213,'MF0'],[226.941,'lock'],[386.667,'1 bar (WIND)'],[413,'alt 0 (PROBETRJ)'],[3588.667,'last DWE row'],[3685.25,'loss of lock']];
const TICKS_BOOK=[[172,'E+172 pilot chute'],[173,'E+173 aft cover'],[180,'E+3.0 min main chute'],[228,'E+3.8 min lock'],[384,'E+6.4 min 0 km'],[3684,'E+61.4 min signal end']];

/* ---------------- HUD / sources panel ---------------- */
function drawTicks(){const c=$('#ticks'),w=c.clientWidth,dpr=Math.min(devicePixelRatio||1,2);if(!w)return;if(c.width!==Math.round(w*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(14*dpr)}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,14);if(SCN.kind!=='PROBE')return;
  const X=t=>8+(w-16)*(t-SCN.t0)/(SCN.t1-SCN.t0);g.font='9px '+getComputedStyle(document.body).fontFamily;
  for(const [t,n] of TICKS_BOOK){const x=X(t);g.fillStyle='#5cc8ff';g.fillRect(x-.5,0,1,6)}for(const [t,n] of TICKS_DATA){const x=X(t);g.fillStyle='#ffb347';g.fillRect(x-.5,7,1,7)}
  g.fillStyle='#8f99b3';g.fillText('ticks: blue = Meltzer Table 8.1 times (E+172 s, E+173 s, E+3.0/3.8/6.4/61.4 min); orange = PDS data times (entry, PROBETRJ break, MF0, lock, 1 bar WIND, altitude 0 PROBETRJ, last DWE row, loss of lock)',Math.max(4,X(400)),11)}
function hud(){$('#hud').innerHTML=HUDTXT;drawTicks();$('#clock').textContent=fmtUTC(SCN.tms+S.T*1000)+' UTC';$('#scrub').value=Math.round((S.T-SCN.t0)/(SCN.t1-SCN.t0)*10000)}
function li(name,src,flag,note){return `<tr><td>${name}<span class="flag ${flag==='data'?'d':flag==='illustrative'?'i':'n'}">${flag}</span></td><td><div class="src">${src}</div>${note?'<div>'+note+'</div>':''}</td></tr>`}
function sourcesPanel(){const pr=P.probe,ch=P.checks;const fl=SCN.kind==='FLY'?SCN.fl:null;let rows='';
  rows+=li('Frame','JSE: Z = Jovian pole (PROBETRJ.LBL), X toward the Sun in the equatorial plane; azimuth = ψ(t) − S3 west longitude, ψ fitted from JUPCRDS rows within ±5 d (residual max '+f(SCN.psi.resid_max_deg,4)+'°, n='+SCN.psi.n+')','data');
  rows+=li('Jupiter shape','R_eq 71492 km, R_pol 66854 km: GP_0001/DATA/DWE/ORBTRTRJ.TAB bodies table (REQ, RPOL)','data','rotation: prime meridian at JSE azimuth ψ(t)');
  rows+=li('Jupiter surface','procedural bands ('+(TIER==='HIGH'?HI_W+'×'+HI_W/2+' px, 512×256 until built':'256×128 px')+'); no real feature positions'+(SCN.kind==='PROBE'?'. A local ±10° cap around the entry point uses a finer procedural texture (HIGH: 2048², with 1024² shown until it is built; LOW: 512²) with zonal streaks, and a ±1.5° near cap adds cloud grain down to ~6 km; still not imagery':''),'illustrative');
  for(const k in bodies){if(k==='JUPITER')continue;const m=MOONS[k];rows+=li(m.name+' radius',`${m.rk_pds_km} km — ${m.rk_pds_label} “${m.rk_pds_quote}” (atlas table: ${m.rk_atlas_km} km; difference ${f(m.rk_pds_km-m.rk_atlas_km,1)} km †)`,'data',k==='AMALTHEA'?'the label value scales the flyby track; the body itself is drawn as the triaxial figure in the next row':'the sphere is drawn with the PDS label value because the flyby trajectory files are in units of that radius');}
  if(bodies.AMALTHEA)rows+=li('Amalthea shape',`semi-axes ${AMA_AXES.join(' × ')} km (NSSDCA Jovian Satellite Fact Sheet, “Radius (km)” entry for Amalthea); cube-root mean ${f(Math.cbrt(AMA_AXES[0]*AMA_AXES[1]*AMA_AXES[2]),1)} km †. Meltzer ch. 9: “irregularly shaped Amalthea, is only 270 kilometers long and 166 kilometers across”. Lumps of up to 9 % on the figure, and its orientation (shortest axis on the pole axis, long axis on body X), are illustrative; Voyager 1 caption P-21223C says it “probably keeps its long axis pointed toward Jupiter”, which is not drawn because the moon-to-Jupiter geometry for this flyby is not in the data`,'data','figure from a fact sheet; surface relief illustrative');
  if(fl&&fl.moon_jse)rows+=li(MOONS[fl.moon].name+' position',`${fl.moon_jse.src} (20-s rows; R, S3 lat, S3 W lon) · az from ψ; cross-check az from the table's solar-phase column: Δ ${f(fl.moon_jse.az_psi_minus_az_phase_deg,5)}°`,'data','other moons fixed at their CA positions during this window');
  if(fl&&!fl.moon_jse)rows+=li('Amalthea position',fl.note,'not in data','drawn moon-centred at the spacecraft CA position from '+fl.file.replace('SATELLITES/AMALTHEA/','…')+' as an anchor');
  if(SCN.kind==='PROBE'){for(const k of MK4)if(pr.moons[k])rows+=li(MOONS[k].name+' position',pr.moons[k].src+' (interpolated 5-min samples ±1 h)','data')}
  for(const k in bodies){if(k==='JUPITER')continue;const q={IO:'PIA01667 caption: “deposits of sulfur dioxide frost appear in white and grey hues”, “yellowish and brownish hues are probably due to other sulfurous materials”, “Bright red materials, such as the prominent ring surrounding Pele”, “\"black\" spots with low brightness mark areas of recent volcanic activity”',EUROPA:'PIA00502 caption: “Bright plains…”, “Dark brown areas represent rocky material derived from the interior”, “Long, dark lines are fractures in the crust”',GANYMEDE:'PIA01299 caption: “Tectonic resurfacing brightens terrain on the less active and partially differentiated moon Ganymede.”',CALLISTO:'PIA01299 caption: “Callisto, furthest from Jupiter, appears heavily cratered at low resolutions”',AMALTHEA:'PIA02532 caption: “small, irregularly shaped moon”, “patches of relatively bright material”; red after the Voyager 1 caption P-21223C (NASA/JPL, 6 March 1979): “Tiny, red Amalthea”; PIA01626 caption: “Amalthea is actually much darker than Io”'}[k];rows+=li(MOONS[k].name+' surface',(TIER==='HIGH'?'procedural texture, '+HI_W+'×'+HI_W/2+' px with a normal map, built in the background (512×256 shown until then); not imagery':'procedural voxel texture, 256×128 px, not imagery')+'; colour character after '+q+(k==='IO'?'. The dark irregular spots and the diffuse red rings are illustrative features placed at random, after the caption clauses; they are not real paterae or ring positions':'')+(TIER==='HIGH'?'. HIGH keeps the LOW pattern (same seeds) and adds small craters with rims and ray patterns, thin arcs, small dark spots and fine mottling, all placed at random':''),'illustrative')}
  if(fl)rows+=li('Orbiter position',`${fl.file} (PHIO, basis fixed at CA ${fl.ca_label||''}, in moon radii ${fl.rk_km} km) + moon position; check vs JUPCRDS: median ${f((fl.check_sc_jse_resid_km_pds||{}).med||0,0)} km, max ${f((fl.check_sc_jse_resid_km_pds||{}).max||0,0)} km (n=${(fl.check_sc_jse_resid_km_pds||{}).n||0})`,'data');
  if(fl)rows+=li('Orbiter attitude',fl.att&&Math.abs(fl.att.dt_from_ca_s)<=10?`${fl.att.file}: RA ${fl.att.ra_rad} rad, DEC ${fl.att.dec_rad} rad at ${fl.att.utc}; spin ${f(fl.att.twist_rate_rpm,3)} rpm from ${fl.att.twist_rate_rows} rows; +Zr opposite the HGA boresight (GO_SPACECRAFT_DESC_INST.TXT)`:'no ROTATT row within 10 s of CA'+(fl.att_note?' — '+fl.att_note:''),fl.att&&Math.abs(fl.att.dt_from_ca_s)<=10?'data':'not in data','rotor spin axis direction and spin rate only; spin phase origin not reproduced');
  if(SCN.kind==='PROBE'){rows+=li('Probe position',`GP_0001/DATA/DWE/PROBETRJ.TAB (EME50 → JSE; 5399 rows, 1 s). Trajectory reconstruction (“OD126 WITH 53 SEC LATE PARACHUTE”), not telemetry. Entry S3 lat/W lon from row 0: ${f(ch.probe_entry_s3_lat_wlon_from_PROBETRJ_row0[0],3)}°, ${f(ch.probe_entry_s3_lat_wlon_from_PROBETRJ_row0[1],3)}°; MISSION.CAT: 6.54 N, 4.46 W; UPPERATM row ${ch.upperatm_row_nearest_entry.row}: ${ch.upperatm_row_nearest_entry.latitude}, ${ch.upperatm_row_nearest_entry.longitude}`,'data');
    rows+=li('Orbiter position','GP_0001/DATA/DWE/ORBTRTRJ.TAB (spacecraft-centred EME50 state vectors; Jupiter vector negated); check vs ORB_00_GLL_JUPCRDS: median '+f(ch.orbtrtrj_orbiter_jse_vs_ORB00_JUPCRDS_km.med,0)+' km, max '+f(ch.orbtrtrj_orbiter_jse_vs_ORB00_JUPCRDS_km.max,0)+' km','data');
    rows+=li('Orbiter attitude','no ROTATT file covers 1995-12-07 (ROTATT00 starts '+ch.rotatt_coverage_orbits_0_1[0][0].slice(0,10)+')','not in data','drawn unoriented');
    rows+=li('Probe orientation','nose along the PROBETRJ velocity vector before the table break; parachute along the PROBETRJ local vertical after it','illustrative','a drawing convention using data vectors');
    rows+=li('Configuration change','PROBETRJ.LBL: “The second table of Probe Aerodynamic Characteristics was extracted from between state vectors at 166 and 167.106 seconds.” Drawn: entry module before 166 s, descent module + parachute after 167.106 s; separation motion of aeroshell and aft cover is illustrative','data','timing from the label; no measured deployment time in the volumes');
    rows+=li('Pressure levels','GP_0001/DATA/ASI/DESCENT.TAB rows nearest 0.5, 1, 2, 5, 10, 20 bar (label: profile “derived using the dry adiabat which fits the data”); drawn as rings of 3 km radius (size illustrative) at the row altitude along the PROBETRJ local vertical','data','no layer names');
    rows+=li('1-bar reference level','PROBETRJ altitude zero (“Probe altitude above the 1-bar pressure level”); local planar grid, 5-km spacing, ±50 km; the 1-bar ellipsoid is drawn translucent when the camera is below it','data','grid extent illustrative');
    rows+=li('End of data','DWEDS.CAT: “time of Loss of Lock (UT at the orbiter): 23:06:09”, “time between entry and loss of lock at the orbiter: 3,685.25 seconds”; last DWE row 3588.667 s (RESID.TAB: −127.16 km, 20.285 bar)','data','no source in the volumes gives a breakup or failure altitude');
    rows+=li('Descent rate readouts','DESCENT.TAB dz/dt (M/S, “Descent velocity”; label: “These profiles are not a list of measured points, but is derived using the dry adiabat which fits the data”; 293 of 300 rows filled); ASI2REF.TAB RADIAL VELOCITY (M/SEC, 74 rows, 30.16–3469.43 s after MF0; file sign positive while altitude decreases); UPPERATM.TAB V_REL (KM/S) and FPA (DEGREES) for the entry phase; PROBETRJ.TAB finite difference of ALTITUDE (inferred, ±1 row) everywhere. Book figures beside them: 171,000 km/h at entry (Table 8.1, E+0), 650 km/h at E+3.0 min (Table 8.1), 430 km/h “main parachute eventually decreased descent module velocity to” (p. 205); data at 180 s: PROBETRJ Δalt/Δt '+f(finiteDiffAlt(180),1)+' m/s = '+f(Math.abs(finiteDiffAlt(180))*3.6,0)+' km/h, ASI2REF not yet covering, DESCENT first filled row (50.47 s after MF0 = 217.7 s) −101.40 m/s. The 650 km/h vs ≈430 km/h difference at E+3.0 min is in the sources, not reconciled here','data','teal † marks values computed here');
    rows+=li('Horizontal wind','WIND.TAB column WIND (m/s), every 4th row packed; the label and DWEDS.CAT do not state the frame; SSRDWE.ASC (pre-flight paper) describes a “profile of the zonal wind speed”','data','interpolated between rows (†)');
    rows+=li('Inertial speed','PROBETRJ.TAB velocity magnitude in Jupiter-centred EME50; includes the planet’s rotation; shown only as “inertial speed”, never as a descent speed','data');
    rows+=li('Haze density','NEP XSEC22.TAB M5.8 CROSS SECTION (m⁻¹sr⁻¹; baseline zeroed at p = 0.510 bar, both calibration sets, per NEPDS.CAT) clipped at 0 and divided by the file maximum '+XS_MAX.toExponential(3)+'; interpolated in log pressure against the probe pressure (WIND/DESCENT/UPPERATM); no extrapolation; rows above 13 bar not used (NEPDS.CAT confidence note); fills → no data-driven change. Fog density per km = 0.04 + 1.2 × haze (the 0.04 base is illustrative; where NEP has no valid row the last valid value is held, i.e. no data-driven change)','data','mapping to fog is illustrative');
    rows+=li('Light level','NFR TCNF.TAB channel B net flux (W/m²; “complete integration of all solar wavelengths from 0.3-3.5 microns”, NFRINST.CAT), |B| ÷ |first row| ('+NF_B0.toFixed(3)+' W/m²), capped at 1; rows after 2500 s after MF0 not used (NFRDS.CAT: invalid); scales the fog/sky colour, the fill light and the Sun light inside the atmosphere. Relative scaling only; the colour ramp (bright tan → dark brown) is illustrative','data','net flux sign convention is not stated in the label');
    rows+=li('Fog / sky colour, haze billboards, bright ceiling','exponential fog (both tiers), 20 noise billboards within 125 m of the probe (HIGH only), and a 40-km bright disc at the altitude of the top NEP XSEC22 row (0.3981 bar → '+SCN.ceilAlt.toFixed(1)+' km, inferred by a linear bridge between the last UPPERATM row and the first DESCENT row); none of these shapes is in the data. The haze applies while the camera is below the haze top and fades out over the next '+ATM_FADE_KM+' km of camera altitude (illustrative length), so zoomed-out views show no haze','illustrative','toggle: “atmosphere” in the header');
    rows+=li('NEP/NFR interval rings','dashed rings at the pressures quoted from Meltzer p. 213 (0.46–0.55, 0.76–1.34, 1.6 bar NEP; 1.35 bar NFR) at DESCENT.TAB altitudes; no composition named','data','quoted intervals, not drawn from the NEP table itself');
    rows+=li('Probe release','MISSION.CAT: “The Probe separated from the Orbiter on July 13, 1995.”; press kit Quick Look Facts p. 5: “Probe release  July 12, 1995  11:07 p.m. PDT” (Earth-received time); Meltzer Table 8.1: “E - 147 days  12 July 1995 (PDT)”, 81,520,000 km from Jupiter. No trajectory for July 1995 in the volumes and no July light time in the documents','not in data','not drawn; Earth-received time shown as quoted, not converted');}
  rows+=li('Sun direction',`JSM X in JSE = (cos β, 0, sin β); β = ${f(SCN.kind==='PROBE'?pr.beta.beta_deg:fl.beta.beta_deg,3)}° fitted from JSM_X vs JSE_X, JSE_Z (ORB_${String(SCN.kind==='PROBE'?0:fl.orb).padStart(2,'0')}_GLL_JUPCRDS.TAB, ±5 d, residual max ${f((SCN.kind==='PROBE'?pr.beta:fl.beta).resid_max_Rj,4)} Rj)`+(SCN.kind==='PROBE'?`; ORBTRTRJ Sun vector through the same chain: ${f(ch.sun_dir_ORBTRTRJ_via_chain_vs_JSM_beta_deg.max,3)}° max from this`:''),'data');
  rows+=li('Sun disc',`angular diameter 2·asin(696000 / ${SUN_DIST.toFixed(0)}) = ${(SUN_ANG/RAD).toFixed(4)}° (ORBTRTRJ.TAB bodies table REQ and first-row Sun range, 1995-12-07); drawn at ${SUN_DRAW_DIST.toExponential(0)} km with this angular size`,'data',SCN.kind==='FLY'?'the Sun range on this flyby date is not in the volumes; the 1995-12-07 value is used (Jupiter perihelion–aphelion 740.595–816.363·10⁶ km, NSSDCA Jupiter Fact Sheet)':'');
  rows+=li('Illumination',`relative irradiance (1 au / d)² = ${SUN_REL.toFixed(5)} with 1 au = 149 597 870.7 km (IAU 2012 B2); HIGH tier applies an exposure gain of ${EXPOSURE_GAIN.toFixed(2)} so that an albedo-1 surface renders near 1.0; LOW tier uses unit light`,'data','ambient fill light is illustrative');
  const tri=k=>{let n=0;if(crafts[k])for(const p in crafts[k].sub){const g=crafts[k].sub[p].geometry;if(!g.userData.lines)n+=g.attributes.position.count/3}return n.toLocaleString('en-US')};
  rows+=li('Galileo orbiter model',(TIER==='HIGH'?'smooth mesh (surfaces of revolution with averaged normals and kept creases, tubes, sheets), ':'voxel art, ')+tri('ORBITER')+' triangles. Data-backed: height 6.15 m, drawn from the antenna-tower tip to the engine-nozzle exit (GOMW_5001/EXTRAS/CATALOG_FILES/GO_SPACECRAFT_DESC_INST.TXT, PDS PPI node); 4.8 m HGA with 18 ribs (press kit p. 22) drawn partly deployed; science boom to 3 m and MAG boom to 11 m from the centreline; MAG sensors at the boom midpoint and outboard end; one 400-N engine; 12 × 10-N thrusters on two booms; two RTGs (GO_1002 INSTHOST.CAT: “Spacecraft power is provided by two radioisotope thermoelectric generators.”); despun section at the engine end (Meltzer Fig. 5.8 caption: “despun section (at the bottom of the spacecraft drawing)”; INSTHOST.CAT: “The probe and the probe relay antenna are also attached to the stator.”). Another published height: “measured 5.3 meters (17 feet) from the top of the low-gain antenna to the bottom of the probe” (NASA press-kit text as reproduced by Spaceflight Now, 2003-09-20); the PDS value is the one drawn. Bus shape and diameter, sun shields, tanks, RTG size and boom lengths, scan platform, relay antenna, rib angles and which ribs are held, PWS antenna, truss form, all colours: illustrative. Proportions were not compared with a photograph or drawing','illustrative');
  rows+=li('Descent probe model',(TIER==='HIGH'?'smooth mesh, ':'voxel art, ')+tri('PROBE')+' triangles'+(TIER==='HIGH'?' plus '+(crafts.PROBE&&crafts.PROBE.sub.lines?crafts.PROBE.sub.lines.geometry.attributes.position.count/2:0)+' line segments for the parachute lines':'')+'. Data-backed: base diameter '+PROBE_D.toFixed(4)+' m † = 8 × 6 in, from NASA RP-1130 (Canning & Edwards 1988): “two one-eighth-scale models (6-in. diameter) of the Galileo Entry Probe aeroshell”; forebody cone half-angle 45° and a short cylinder ahead of the base (RP-1130: “the short cylinder between the 45° half-angle cone and the base”, degree sign restored from the scan); height '+PROBE_H+' m (JPL Mission and Spacecraft Library quick-look: “Probe height 0.9 m”); parachute projected diameter '+CHUTE_D+' m (GPHOST.CAT; press kit p. 32 “2.5-meter (8-foot) parachute”); pilot and main parachutes of conical ribbon design (Rodier, Thuss & Terhune 1982, NTRS 19820026891, abstract, paraphrased), drawn as rings of ribbon with slots; forward heatshield “made of carbon-phenolic” (Meltzer Fig. 5.5 caption), drawn dark; “cone-shaped” (press kit p. 9); mass 339 kg (press kit p. 32; not drawn). The PROBETRJ.LBL aerodynamic reference area of 1.000 m² equals a circle of '+(2*Math.sqrt(1/Math.PI)).toFixed(4)+' m †; the RP-1130 model scale is drawn instead because it describes the physical aeroshell (difference '+(PROBE_D-2*Math.sqrt(1/Math.PI)).toFixed(4)+' m †). Nose radius, cylinder length, aft-cover dome, descent-module shape and size, canopy depth, '+CHUTE_RIBBONS+' ribbons, '+CHUTE_GORES+' gores, colours, line lengths and the trailing distance ('+f(CHUTE_TRAIL,2)+' m = 8 probe diameters; Meltzer ch. 3: tests “investigated parachute distances ranging from 5.5 to 11 body diameters behind the Probe”): illustrative','illustrative');
  rows+=li('Star field','random points ('+(TIER==='HIGH'?9000:900)+')','illustrative');rows+=li('Sun glow','off by default; not to scale','illustrative');
  rows+=li('Frame-chain check','EME50→S3→JSE applied to ROTATT radial unit vectors vs JUPCRDS (33 orbits): latitude residual median ≤ 0.006°; west-longitude residual '+f(ch.chain_wlon_offset_linear_fit.offset_at_entry_deg,3)+'° at entry drifting '+f(ch.chain_wlon_offset_linear_fit.drift_deg_per_year,3)+'°/yr (period 9.92492104 h from PROBETRJ.LBL, fixed ET−UT 61.184 s)','data','the drift is a measured discrepancy between the label constants and the JUPCRDS longitudes; not corrected');
  const Q=[['The Probe separated from the Orbiter on July 13, 1995.','GP_0001/CATALOG/MISSION.CAT'],['The Probe mission and data relay lasted 58.6 minutes, after which JOI was performed','GP_0001/CATALOG/MISSION.CAT'],['time of Loss of Lock (UT at the orbiter): 23:06:09','GP_0001/CATALOG/DWEDS.CAT'],['The Galileo Probe Atmospheric Structure Instrument (ASI) measured state properties of Jupiter\'s atmosphere from nanobar pressure levels to a final pressure of ~24 bars.','GP_0001/CATALOG/ASIDS.CAT (from SEIFFETAL1996)'],['Velocities during descent decreased from ~400 m/s at parachute deployment to 156 m/s in the first 100 s, to ~48 m/s at the 3-bar level, and to ~30 m/s at loss of signal.','GP_0001/CATALOG/ASIDS.CAT'],['OD126 WITH 53 SEC LATE PARACHUTE','GP_0001/DATA/DWE/PROBETRJ.LBL, NOTE'],['After the parachute is deployed, the heat shield is jettisoned and temperature and pressure sensors are exposed to the ambient atmosphere.','GP_0001/DOCUMENT/SSRASI.ASC'],['At a pressure of approximately 0.07 bar the aeroshell is jettisoned','GP_0001/DOCUMENT/SSRNEP.ASC (1992 design description)'],['After the pilot chute is established, the separation nuts are fired to release the aft cover.','GP_0001/CATALOG/GPHOST.CAT'],['The parachute diameter (projected) is 2.5 m','GP_0001/CATALOG/GPHOST.CAT'],['The housings are designed for survival to 20 bars and were tested to 16 bars.','GP_0001/CATALOG/GPHOST.CAT'],['The rotor (or spun section) turned at approximately three revolutions per minute','GOMW_5001/EXTRAS/CATALOG_FILES/GO_SPACECRAFT_DESC_INST.TXT'],['A 4.8 meter umbrella-like high-gain antenna (HGA) and two low-gain antennas (LGAs) were mounted on the Rotor.','GO_SPACECRAFT_DESC_INST.TXT'],['On 1991-04-11 the HGA was commanded to unfurl; but telemetry showed that the motors had stalled with the ribs only partly deployed.','GO_SPACECRAFT_DESC_INST.TXT'],['The magnetometer boom extended outward eleven meters from the centerline and was attached to the science boom.','GO_SPACECRAFT_DESC_INST.TXT'],['+Zr directed opposite to the HGA boresight direction.','GO_SPACECRAFT_DESC_INST.TXT'],['twelve 10-N thrusters (six each mounted on separate cantilevered booms), one 400-N engine,','GO_SPACECRAFT_DESC_INST.TXT'],['Orbiter height was 6.15 m.','GO_SPACECRAFT_DESC_INST.TXT']];
  let r2='';
  if(SCN.kind==='PROBE'){r2+=`<h2>Book / press kit vs PDS tables (cross-checks)</h2><table><tr><td>item</td><td>document</td><td>PDS data</td><td>difference</td></tr>${XCHK.map(x=>`<tr><td>${x[0]}</td><td class="src">${x[1]}</td><td class="src">${x[2]}</td><td>${x[3]}</td></tr>`).join('')}</table><div class="src">Drawing uses PROBETRJ.TAB for the probe position because it is the only file with a position vector (EME50) and 1-s rows; the ASI/DWE altitudes are shown beside it, not merged.</div>
    <h2>Meltzer Table 8.1, printed pp. 206–208 (transcribed from the page images)</h2><table>${T81.map(x=>`<tr><td>${x[0]}${x[1]?'<br>'+x[1]:''}</td><td><div>${x[2]}</div><div class="src">${x[3]}</div></td></tr>`).join('')}</table><div class="src">“*Altitude is measured relative to a point in the atmosphere with pressure of 1 bar, the pressure on Earth’s surface.” Footnote 62 cites Magalhães (ARC) web pages.</div>
    <h2>Press kit pre-encounter plan (p. 10 figure) — PLAN values, not results</h2><table>${KITPLAN.map(x=>`<tr><td>${x[0]}</td><td class="src">${x[1]}</td></tr>`).join('')}</table>
    <h2>Documented hypothesis about the probe’s fate — not data</h2><blockquote>“${Q2[12][0]}”<cite>${Q2[12][1]}</cite></blockquote>`}
  r2+=`<h2>Document statements (verbatim)</h2>${Q2.filter((q,i)=>SCN.kind==='PROBE'||[0,2,5,6,13].includes(i)).map(q=>`<blockquote>“${q[0]}”<cite>${q[1]}</cite></blockquote>`).join('')}`;
  $('#side').innerHTML=`<h2>What is drawn, and from where</h2><table>${rows}</table>${r2}<h2>PDS document statements (verbatim)</h2>${Q.map(q=>`<blockquote>“${q[0]}”<cite>${q[1]}</cite></blockquote>`).join('')}<h2>Tier</h2><div class="src">renderer: ${GLINFO}<br>software-renderer match: ${SOFT}; probe ${PROBE_MS.toFixed(1)} ms/frame (10 frames, 16k-tri sphere) → ${TIER}${TIER_PREF==='auto'?' (auto)':' (forced)'}<br>LOW: Lambert materials, 256×128 nearest-filtered body textures (cap 512²), 40-segment moons, 56-segment Jupiter, voxel craft, 900 stars, dpr 1, no tone mapping.<br>HIGH: Standard materials with normal maps; ${HI_W}×${HI_W/2} body textures and ${HI_W}² caps built in ${HIQ.workers.length||'no'} Web Worker(s)${HIQ.ok?'':' (Workers unavailable: built on the main thread)'}, with 512×256 / 1024² shown until each is ready; linear filtering, mipmaps, anisotropy ≤ 8; 192-segment moons, 256-segment Jupiter, mesh craft, 9000 stars, ACES tone mapping, dpr ≤ 2. GPU memory per ${HI_W}×${HI_W/2} body, colour + normal with mipmaps: ${(HI_W*HI_W/2*4*4/3*2/1e6).toFixed(1)} MB †; per ${HI_W}² cap: ${(HI_W*HI_W*4*4/3*2/1e6).toFixed(1)} MB †.</div>`}

/* ---------------- loop ---------------- */
function resize(){const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;R_.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe($('#stage'));
let last=performance.now(),ema=16,acc=0,nfr=0,lastHud=0,emaI=16;
function frame(now){const dt=Math.min(.1,(now-last)/1000);emaI=emaI*.9+Math.min(1000,now-last)*.1;last=now;
  if(S.play){S.T+=S.speed*dt;if(S.T>SCN.t1){S.T=SCN.t1;S.play=false;$('#play').textContent='▶'}}
  const t0=performance.now();
  setLimits();updateWorld(S.T);ctl.update();R_.render(scene,cam);drawLabels();
  const ft=performance.now()-t0;ema=ema*.9+ft*.1;acc+=ft;nfr++;
  if(now-lastHud>250){lastHud=now;hud();$('#ms').textContent=emaI.toFixed(1)+' ('+ema.toFixed(1)+' js)';$('#calls').textContent=R_.info.render.calls;$('#tris').textContent=R_.info.render.triangles.toLocaleString('en-US');$('#texq').textContent=TIER==='HIGH'&&HIQ.jobs.length?' · building '+HI_W+'-px textures: '+HIQ.jobs.length+' left':''}
  requestAnimationFrame(frame)}

/* ---------------- UI ---------------- */
sceneSel.addEventListener('change',e=>loadScene(e.target.value));
$('#follow').addEventListener('change',e=>{S.follow=e.target.value;applyUp();zoomTo('local')});
$$('#zoomp button').forEach(b=>b.addEventListener('click',()=>zoomTo(b.dataset.z)));
$('#play').addEventListener('click',()=>{S.play=!S.play;$('#play').textContent=S.play?'❚❚':'▶'});
$('#speed').addEventListener('change',e=>S.speed=+e.target.value);
$('#scrub').addEventListener('input',e=>{S.T=SCN.t0+(+e.target.value/10000)*(SCN.t1-SCN.t0)});
$('#glowTog').addEventListener('click',e=>{S.glow=!S.glow;e.target.setAttribute('aria-pressed',S.glow)});
$('#starTog').addEventListener('click',e=>{S.stars=!S.stars;e.target.setAttribute('aria-pressed',S.stars)});
$('#atmTog').addEventListener('click',e=>{S.atm=!S.atm;e.target.setAttribute('aria-pressed',S.atm)});
const mobileQ=matchMedia('(max-width:760px)');
$('#sideTog').addEventListener('click',e=>{const a=$('#side');if(mobileQ.matches){a.classList.toggle('open');e.target.setAttribute('aria-pressed',a.classList.contains('open'))}else{a.hidden=!a.hidden;e.target.setAttribute('aria-pressed',!a.hidden);document.getElementById('app').style.gridTemplateColumns=a.hidden?'1fr 0px':''}resize()});
if(mobileQ.matches)$('#sideTog').setAttribute('aria-pressed','false');
function forceTier(t){TIER_PREF=t;const nt=t==='auto'?((SOFT||PROBE_MS>40)?'LOW':'HIGH'):t;if(nt!==TIER){TIER=nt;applyTier();rebuildSky();fill.intensity=TIER==='HIGH'?.25:.4;loadScene(S.scene)}else applyTier();setHash()}
$('#tierAuto').addEventListener('click',()=>forceTier('auto'));$('#tierLow').addEventListener('click',()=>forceTier('LOW'));$('#tierHigh').addEventListener('click',()=>forceTier('HIGH'));
window.addEventListener('keydown',e=>{const tg=e.target.tagName;if(tg==='INPUT'||tg==='SELECT'||tg==='BUTTON')return;if(e.code==='Space'){e.preventDefault();$('#play').click()}});
function setHash(){try{history.replaceState(null,'','#'+encodeURIComponent(S.scene)+'&tier='+TIER_PREF)}catch(_){}}
(function init(){const h=decodeURIComponent(location.hash.slice(1)).split('&');let sc=h[0]&&SCENES.some(s=>s.id===h[0])?h[0]:'FLY:E4';const tp=h.find(x=>x.startsWith('tier='));if(tp){const t=tp.slice(5);if(t==='LOW'||t==='HIGH'){TIER_PREF=t;TIER=t;applyTier();rebuildSky()}}
  resize();sceneSel.value=sc;loadScene(sc);S.T=SCN.kind==='PROBE'?-600:-600;requestAnimationFrame(frame)})();
window.__moons={texData,get hiq(){return {left:HIQ.jobs.length,done:HIQ.done,ok:HIQ.ok,workers:HIQ.workers.length}},craftStats:()=>{const o={};for(const k in crafts)for(const p in crafts[k].sub){const g=crafts[k].sub[p].geometry;o[k+'.'+p]=g.userData.lines?g.attributes.position.count/2+' line segments':g.attributes.position.count/3}return o},bodyStats:()=>{const o={};for(const k in bodies){const m=bodies[k].mesh,im=m.material.map.image;o[k]={tris:m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3,map:im.width+'x'+im.height};for(const c of ['cap','near'])if(bodies[k][c]){const q=bodies[k][c];o[k+'.'+c]={tris:q.geometry.index.count/3,map:q.material.map.image.width+'x'+q.material.map.image.height}}}return o},get S(){return S},get SCN(){return SCN},WORLD,cam,ctl,loadScene,zoomTo,setT:t=>{S.T=t},setFollow:k=>{S.follow=k;$('#follow').value=k;applyUp()},forceTier,get tier(){return TIER},get ema(){return ema},get frameMs(){return emaI},get glinfo(){return GLINFO},renderer:R_,scene,bodies,crafts,get probeMs(){return PROBE_MS},descentRate,windAt,pressureAt,hazeAt,lightAt,finiteDiffAlt,get fogState(){return SCN&&SCN.kind==='PROBE'?{on:!!SCN.fogOn,density:SCN.dens,L:SCN.Lv,ceilAlt:SCN.ceilAlt,fogW:SCN.fogW,camAlt:SCN.camAlt,appliedDensity:SCN.fog.density}:null}};
})();
