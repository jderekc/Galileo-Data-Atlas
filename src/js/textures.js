/* Procedural texture data (pure functions, no DOM): shared by the main thread and src/workers/texture-worker.js.
   Generated from the single-file template by tools/split_single_file.py. */
import {TAU,RAD,clamp} from './util.js';
/* ---------------- procedural textures (illustrative) ---------------- */
function hash(x,y,s){let h=(x*374761393+y*668265263+s*1442695041)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,oct){let v=0,amp=.5,fr=1;for(let i=0;i<oct;i++){v+=amp*vnoise(x*fr,y*fr,s+i*17);amp*=.5;fr*=2}return v}
/* spherical wrap: sample noise on the unit sphere so the texture has no seam */
function sfbm(lon,lat,s,oct,sc){const cl=Math.cos(lat);const x=cl*Math.cos(lon),y=cl*Math.sin(lon),z=Math.sin(lat);let v=0,amp=.5,fr=sc;for(let i=0;i<oct;i++){v+=amp*(vnoise(x*fr+7,y*fr+3,s+i*31)*.5+vnoise(y*fr+1,z*fr+5,s+i*31+7)*.5);amp*=.5;fr*=2}return v}
const q=(v,n)=>Math.round(v*n)/n;   /* colour quantisation for the voxel look */
/* height -> normal map (tangent space), nearest filtered */
function normalData(hgt,w,h,strength){const d=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=hgt[y*w+(x+w-1)%w],r=hgt[y*w+(x+1)%w],u=hgt[Math.max(0,y-1)*w+x],dn=hgt[Math.min(h-1,y+1)*w+x];
    let nx=-(r-l)*strength,ny=(dn-u)*strength,nz=1;const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const o=4*(y*w+x);d[o]=128+127*nx;d[o+1]=128+127*ny;d[o+2]=128+127*nz;d[o+3]=255}
  return d}
const CRC={};
function craters(seed,n,rmin,rmax){const k=seed+'/'+n;if(CRC[k])return CRC[k];const c=new Float32Array(n*4);for(let i=0;i<n;i++){const a=hash(i,1,seed)*TAU,b=Math.asin(2*hash(i,2,seed)-1),r=rmin+(rmax-rmin)*hash(i,3,seed)**2,cb=Math.cos(b);c[4*i]=cb*Math.cos(a);c[4*i+1]=cb*Math.sin(a);c[4*i+2]=Math.sin(b);c[4*i+3]=r}return CRC[k]=c}
function craterField(lon,lat,seed,n,rmin,rmax){ /* returns [depth(-1..1 rim/bowl), coverage] from n pseudo-random craters on the sphere */
  let dep=0,hit=0;const cl=Math.cos(lat),px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=Math.sin(lat),C=craters(seed,n,rmin,rmax);
  for(let i=0;i<n;i++){const r=C[4*i+3];if(Math.abs(pz-C[4*i+2])>r)continue;const d=Math.acos(clamp(px*C[4*i]+py*C[4*i+1]+pz*C[4*i+2],-1,1));if(d<r){const t=d/r;dep+= t<.75?-(1-t/.75)*.8:(1-(t-.75)/.25)*.6;hit=1}}
  return [dep,hit]}
/* JUPITER colour. Band edges at published zenographic (planetographic) latitudes; colours chosen here to match published colour words (see Sources panel); features painted procedurally at
   documented or extrapolated positions; no imagery. extra = additional fine octaves for the local caps. JF = per-scene feature set (jupFeatures). */
/* [south edge (deg, planetographic), R, G, B (sRGB 0-255), name] ascending; edges: JBAA 113(1) Table 3 (1999/2000) unless marked in the Sources panel */
const JB=[[-90,122,123,130,'S. polar hood'],[-66.8,150,146,142,'SPR'],[-53.2,196,188,176,'S3TZ'],[-48.0,152,140,130,'S3TB'],[-42.6,204,196,182,'SSTZ'],[-38.5,150,136,124,'SSTB'],[-35.5,216,207,190,'STZ'],
  [-32.3,160,148,136,'STB'],[-29.3,128,116,106,'STB(N)'],[-27.4,240,234,220,'STropZ'],[-21.4,128,88,64,'SEB(S)'],[-16.9,196,166,128,'SEBZ'],[-10.0,152,112,84,'SEB(N)'],[-8.0,238,232,216,'EZ(S)'],
  [-4.1,206,204,200,'EB'],[1.0,232,218,188,'EZ(N)'],[8.8,150,88,58,'NEB'],[16.9,238,232,218,'NTropZ'],[25.0,124,102,90,'NTB'],[28.1,222,214,198,'NTZ'],[36.9,160,148,138,'NNTB'],[40.0,204,198,188,'NNTZ'],
  [45.0,166,156,148,'N3TB'],[47.0,188,183,178,'N3TZ'],[54.1,150,146,144,'N4TB'],[56.1,152,148,146,'NPR'],[63.0,172,168,164,'Bland Zone'],[68.4,122,124,132,'N. polar hood']];
const wrapd=d=>{d=(d+180)%360;if(d<0)d+=360;return d-180};
function jupBand(pg,w,o){let i=0;const n=JB.length;while(i<n-1&&JB[i+1][0]<=pg)i++;const B=JB[i];let r=B[1],g=B[2],b=B[3];
  if(w>0){if(i>0){const d=pg-B[0];if(d<w){const A=JB[i-1],k=.5-.5*d/w;r+=(A[1]-r)*k;g+=(A[2]-g)*k;b+=(A[3]-b)*k}}if(i<n-1){const d=JB[i+1][0]-pg;if(d<w){const A=JB[i+1],k=.5-.5*d/w;r+=(A[1]-r)*k;g+=(A[2]-g)*k;b+=(A[3]-b)*k}}}
  o[0]=r/255;o[1]=g/255;o[2]=b/255}
const JO=[0,0,0];
function jupColor(lon,lat,sd,extra,hi){const F=JF,det=hi||extra;
  const pg0=Math.atan(F.ratio*Math.tan(lat))/RAD;                         /* mesh row angle (parametric latitude of the oblate sphere) -> planetographic latitude */
  const L3=((Math.PI-lon)/RAD%360+360)%360;                               /* System III west longitude of this texel (texture longitude = pi - W longitude, as in mkCap) */
  const tur=sfbm(lon*2,lat,sd+4,3,8);
  /* zonally stretched noise, phase-shifted with latitude so that shapes slant across the bands (illustrative stand-in for shear between jets) */
  const sh=lon+.5*Math.sin(pg0*.31)+.25*Math.sin(pg0*.83+1),st=sfbm(sh,lat*7,sd+60,det?5:3,6)-.5,st2=det?sfbm(sh*1,lat*23,sd+64,4,20)-.5:0;
  let fine=sfbm(lon*3,lat*3,sd+8,3,40)-.5;if(hi)fine+=.5*(sfbm(lon*4,lat*14,sd+66,4,50)-.5);
  if(extra){ /* caps only: zonal streaks (noise stretched 12:1 along longitude), a few eddies and small cloud grain, at 30-600 km scales; illustrative */
    const w2=fbm(lon*40,lat*40,sd+12,3)-.5;const streak=fbm(lon*18+w2*2,lat*220+w2*6,sd+16,4)-.5;const grain=fbm(lon*600,lat*600,sd+20,3)-.5;
    let eddy=0;for(let i=0;i<9;i++){const ex=(hash(i,1,sd+30)-.5)*.35+(-wlonE*RAD),ey=(hash(i,2,sd+30)-.5)*.35+latE*RAD,rx=.006+.02*hash(i,3,sd+30),ry=rx*(.45+.3*hash(i,4,sd+30));const dx=((lon-Math.PI-ex+Math.PI)%TAU+TAU)%TAU-Math.PI,dy=lat-ey;const dd=Math.hypot(dx/rx,dy/ry);if(dd<1)eddy+=(.6-.5*dd)*(i%3?1:-.7)}
    fine=fine*1.2+2.6*streak+1.0*grain+1.6*eddy}
  /* band edges displaced by the stretched noise (up to about +-1 deg), less toward the poles */
  const pol=1-ss(45,66,Math.abs(pg0));const mw=sfbm(lon*2,lat*2,sd+72,3,5)-.5;let pg=pg0+(det?(5.5*st+2.6*st2+2.2*mw):(4.0*st+1.6*mw))*pol;
  /* Red Spot Hollow: the SEB south edge is carried north around the spot */
  const gl=wrapd(L3-F.grs),gy=pg0-F.grsLat,eh=(gl/(F.grsA+3.6))*(gl/(F.grsA+3.6))+(gy/(F.grsB+2.2))*(gy/(F.grsB+2.2));
  jupBand(pg,det?.45:0,JO);let r=JO[0],g=JO[1],b=JO[2],h=.5;
  if(eh<1&&pg0<-13){const k=1-ss(.72,1,eh+(det?.25*st2:0));r+=(.94-r)*k;g+=(.918-g)*k;b+=(.863-b)*k}
  let m=1+.22*(tur-.5)+(det?.55*st2+.35*st:.3*st)+(1-pol)*.5*(sfbm(lon*3,lat*3,sd+76,3,14)-.5);
  /* rifts: light streaks inside the NEB and SEB (illustrative) */
  if((pg0>9.5&&pg0<16.5)||(pg0<-10.5&&pg0>-20.5)){const wn2=sfbm(sh+2,lat*13,sd+75,det?4:3,13),kr=ss(.58,.7,wn2)*.55;r+=(.86-r)*kr;g+=(.80-g)*kr;b+=(.69-b)*kr}
  /* turbulent SEBZ following (west of) the GRS: white spots and darker bridges */
  if(gl>F.grsA&&gl<F.grsA+55&&pg0>-20.5&&pg0<-9.5){const fd=(1-(gl-F.grsA)/55)*ss(F.grsA,F.grsA+5,gl)*ss(-20.5,-18.5,pg0)*(1-ss(-11.5,-9.5,pg0)),wn=sfbm(sh,lat*11,sd+70,det?5:3,22);const kw=ss(.52,.64,wn)*fd;r+=(.93-r)*kw;g+=(.90-g)*kw;b+=(.83-b)*kw;const kd=ss(.52,.64,1-wn)*fd*.6;r+=(.47-r)*kd;g+=(.33-g)*kd;b+=(.25-b)*kd}
  /* NEBs dark bluish projections ("hot spots"), each followed (west) by a white plume and a festoon curving toward the equator: count from the BAA reports, positions illustrative except on the probe day */
  if(pg0>-1&&pg0<11){const sp=360/F.fn;let x=wrapd(L3-F.fp);x=((x%sp)+sp*1.5)%sp-sp/2;const k0=Math.floor((wrapd(L3-F.fp)+sp/2)/sp),j=1+.5*(hash(k0,3,sd+90)-.5);
    let e=(x/(3.6*j))*(x/(3.6*j))+((pg0-8.6)/1.25)*((pg0-8.6)/1.25),k=(1-ss(.55,1.15,e+.5*st2))*.9;if(k>0){r+=(.385-r)*k;g+=(.43-g)*k;b+=(.51-b)*k;h-=.2*k}
    e=((x-7.5)/4.5)*((x-7.5)/4.5)+((pg0-4.9)/1.7)*((pg0-4.9)/1.7);k=(1-ss(.5,1.1,e+.6*st2))*.85;if(k>0){r+=(.96-r)*k;g+=(.95-g)*k;b+=(.92-b)*k;h+=.2*k}
    if(x>1&&x<sp*.48){const t=(x-1)/(sp*.48-1),pc=7.2-6.4*Math.pow(t,.7),kk=(1-ss(.45,1.15,Math.abs(pg0-pc)+.5*st2))*(1-.8*t)*.8*ss(1,4.5,x);if(kk>0){r+=(.50-r)*kk;g+=(.54-g)*kk;b+=(.61-b)*kk}}}
  r*=m;g*=m;b*=m;if(det){r+=.05*fine;g+=.045*fine;b+=.035*fine}
  /* Great Red Spot: orange oval with a darker central condensation and a grey-brown rim inside the white Hollow */
  {const e=(gl/F.grsA)*(gl/F.grsA)+(gy/F.grsB)*(gy/F.grsB);if(e<1.25){const sw=det?.5+.5*Math.sin(Math.atan2(gy/F.grsB,gl/F.grsA)*2+Math.sqrt(e)*9+3*st2):.5;let k=1-ss(.82,1.06,e);
      const c=1-ss(.02,.45,e),R=.80+(.69-.80)*c,G=.49+(.35-.49)*c,B=.345+(.235-.345)*c,mm=.93+.14*sw;r+=(R*mm-r)*k;g+=(G*mm-g)*k;b+=(B*mm-b)*k;
      k=(1-Math.abs(e-.9)/.16);if(k>0){k*=.45;r+=(.56-r)*k;g+=(.45-g)*k;b+=(.38-b)*k}h+=.12*(1-ss(.6,1.1,e))}}
  /* white ovals of the S. Temperate domain (BC, DE, FA / BE, FA / BA by date) and, for the 2000/01 apparition, NEB barges and white spot Z */
  for(let i=0;i<F.ov.length;i++){const O=F.ov[i],dy=pg0-O[1];if(dy>O[3]*1.5||dy<-O[3]*1.5)continue;const dl=wrapd(L3-O[0]);if(dl>O[2]*1.6||dl<-O[2]*1.6)continue;const e=(dl/O[2])*(dl/O[2])+(dy/O[3])*(dy/O[3]);if(e>2)continue;
    if(O[4]>=2){const k=(1-ss(.35,1.0,e))*.6,t=O[4]===2?1.18:.8;r*=1+(t-1)*k;g*=1+(t-1)*k;b*=1+(t-1)*k;continue}
    if(O[4]===1){const k=1-ss(.6,1.05,e);r+=(.35-r)*k;g+=(.225-g)*k;b+=(.165-b)*k}
    else{let k=1-ss(.7,1.0,e);r+=(.945-r)*k;g+=(.93-g)*k;b+=(.89-b)*k;k=1-Math.abs(e-1.2)/.3;if(k>0&&det){k*=.3;r*=1-k*.5;g*=1-k*.5;b*=1-k*.5}h+=.1*(1-ss(.6,1,e))}}
  return [r,g,b,h+.3*fine]}
let JF=null;
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
    if(kind==='EUROPA'){const n=110,L=new Float32Array(n*8);for(let i=0;i<n;i++){const a=hash(i,4,sd)*TAU,bb=Math.asin(2*hash(i,5,sd)-1),cb=Math.cos(bb);const nx=cb*Math.cos(a),ny=cb*Math.sin(a),nz=Math.sin(bb);
        let ux=ny*.3-nz*.8,uy=nz*.5-nx*.3,uz=nx*.8-ny*.5;const rot=hash(i,11,sd)*TAU;const vx=ny*uz-nz*uy,vy=nz*ux-nx*uz,vz=nx*uy-ny*ux;ux=ux*Math.cos(rot)+vx*Math.sin(rot);uy=uy*Math.cos(rot)+vy*Math.sin(rot);uz=uz*Math.cos(rot)+vz*Math.sin(rot);const ul=Math.hypot(ux,uy,uz)||1;
        L[8*i]=nx;L[8*i+1]=ny;L[8*i+2]=nz;L[8*i+3]=i<15?(.008+.03*hash(i,6,sd))*.38:.001+.0035*hash(i,6,sd);L[8*i+4]=ux/ul;L[8*i+5]=uy/ul;L[8*i+6]=uz/ul;L[8*i+7]=Math.cos(i<15?1.1+1.4*hash(i,12,sd):.2+.8*hash(i,12,sd))}R.L=L;R.nl=n}   /* first 15 lineae lie on the LOW-tier great circles (narrower, and cut to arcs); the rest are short thin arcs */
    if(R.A)R.ca=new Int32Array(R.A.length>>2);if(R.B)R.cb=new Int32Array(R.B.length>>2)}
  if(R.A)R.na=rowCand(R.A,R.pz,2.6,R.ca);if(R.B)R.nb=rowCand(R.B,R.pz,2.6,R.cb)}
/* HIGH-tier surface colour per body: the LOW-tier pattern (same seeds, same large features) with soft edges, more octaves and small-scale detail; illustrative, not imagery */
function bodyHi(kind,sd,lon,lat,R,out){const cl=R.cl,px=cl*Math.cos(lon),py=cl*Math.sin(lon),pz=R.pz,o=R.o;let r,g,b,h=.5;const fine=sfbm(lon,lat,sd+40,4,70)-.5;
  if(kind==='IO'){const n=sfbm(lon,lat,sd,7,2.2),n2=sfbm(lon,lat,sd+5,7,5),n3=.6*sfbm(lon+.5*(n-.5),lat+.5*(n2-.5),sd+9,6,11)+.4*sfbm(lon+.4*(n2-.5),lat-.4*(n-.5),sd+13,5,17)+.02,pol=Math.pow(Math.abs(lat)/(Math.PI/2),2.2);   /* two warped noise fields mixed, so the patches do not follow the noise lattice */
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
    const cid=Math.floor(g3*16),ga=hash(cid,1,sd)*TAU,gz=hash(cid,2,sd)*1.6-.8,gc=Math.sqrt(1-gz*gz),u=px*gc*Math.cos(ga)+py*gc*Math.sin(ga)+pz*gz,gf=110+90*hash(cid,3,sd),gw=sfbm(lon,lat,sd+33,4,26)-.5,ga2=.35+1.3*sfbm(lon,lat,sd+35,3,7),gr=.5+.5*ga2*Math.sin(u*gf+g2*5+7*gw),gr2=.5+.5*ga2*Math.sin(u*gf*3.7+g2*11+11*gw);   /* groove phase and depth vary with noise, so the sets are not a uniform sine pattern */   /* sets of parallel grooves, one direction per noise cell */
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
function texData(sp){if(sp.jf)JF=sp.jf;const W=sp.W,H=sp.H,hi=!!sp.hi,d=new Uint8ClampedArray(W*H*4),hgt=new Float32Array(W*H);
  if(sp.type!=='body'){latE=sp.lat;wlonE=sp.wlon;const half=sp.half,near=sp.type==='near',QQ=hi?(v=>v):(v=>q(v,26));
    for(let y=0;y<H;y++){const lat=(sp.lat+half-2*half*(y+.5)/H)*RAD;for(let x=0;x<W;x++){const lon=((-sp.wlon-half+2*half*(x+.5)/W)*RAD+Math.PI);const cc=jupColor(lon,lat,83,3,hi);let m=1,gr=0;
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
      const n=sfbm(lon,lat,sd,4,4),m=sfbm(lon,lat,sd+3,4,5);r=.89+.08*n;gg=r;b=r;
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
      const n=sfbm(lon,lat,sd,4,3);r=.37+.09*n;gg=.29+.08*n;b=.24+.07*n;h=.5+.1*n;
      const [dep,hit]=craterField(lon,lat,sd,420,.015,.07);if(hit){const k=dep<0?.8:1.8;r*=k;gg*=k;b*=k;h+=dep*.3}
      /* one large multi-ring structure, illustrative placement */
      const cl=Math.cos(lat),dd=Math.acos(clamp(cl*Math.cos(lon-1.2)*Math.cos(.3)+Math.sin(lat)*Math.sin(.3),-1,1));if(dd<.5){const ring=.5+.5*Math.cos(dd*40);if(dd<.08){r=.55;gg=.5;b=.45}else if(ring>.8){r*=1.4;gg*=1.4;b*=1.35}}}
    else if(kind==='AMALTHEA'){ /* small irregular moon with patches of relatively bright material (PIA02532 wording); red after the Voyager 1 caption P-21223C "Tiny, red Amalthea" */
      const n=sfbm(lon,lat,sd,4,3);r=.38+.10*n;gg=.21+.07*n;b=.15+.05*n;h=.5+.5*n;const [dep,hit]=craterField(lon,lat,sd,40,.08,.3);if(hit){const k=dep<0?.8:1.3;r*=k;gg*=k;b*=k;h+=dep*.4}
      {const ex=(lon-2.6)/.3,ey=(lat-.2)/.1;if(ex*ex+ey*ey<1){r=.60;gg=.52;b=.44}}}
    else { const c=jupColor(lon,lat,sd,0);r=c[0];gg=c[1];b=c[2];h=c[3]}
    const QL=kind==='JUPITER'?32:kind==='CALLISTO'?24:14;d[o]=255*clamp(q(r,QL),0,1);d[o+1]=255*clamp(q(gg,QL),0,1);d[o+2]=255*clamp(q(b,QL),0,1);d[o+3]=255;hgt[y*W+x]=h}}
  return {rgba:d,hgt,W,H}}
export function setJF(v){JF=v}
export {JB,bodyHi,craterField,craterHi,craters,cratersPL,fbm,hash,hiRow,jupBand,jupColor,normalData,q,rowCand,sfbm,ss,texData,vnoise,wrapd};
