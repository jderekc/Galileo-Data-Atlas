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
/* per-scene Jupiter feature set. Longitudes: System II values from the BAA reports converted with L3 = L2 + 81.245 + 0.266 (t - 1965-01-01 0h UT, days) (Morales-Juberias, Simon & Cosentino, App. B eq. B2) */
const D65=Date.UTC(1965,0,1),D30=30*864e5;
const l2to3=(L2,ms)=>((L2+81.245+.266*(ms-D65)/864e5)%360+360)%360;
const GRS_A=[[Date.UTC(1999,9,23),71],[Date.UTC(2000,6,13),75.2],[Date.UTC(2000,10,28),75],[Date.UTC(2001,3,15),75]];   /* JBAA 114(4): "1999 value" 71 (taken at the 1999 opposition), 75 at opposition 2000 Nov 28, DL2 0.0 Jun-Apr; IJW report 2000-08-03: 75.2 on July 13 */
function grsL2(ms){const A=GRS_A,n=A.length;if(ms<A[0][0])return {v:A[0][1]-.42*(A[0][0]-ms)/D30,how:'extrapolated back from 71° (1999) at +0.42°/30 d, the rate from “0.28 deg/day W for the GRS” (System III, HST 1996; A. Simon, IJW Newsletter 1997-05-20) minus 0.266°/d',unc:Math.min(15,2+.25*(A[0][0]-ms)/D30)};
  if(ms>A[n-1][0])return {v:A[n-1][1]+.5*(ms-A[n-1][0])/D30,how:'extrapolated forward from 75° (2001 April) at +0.5°/30 d; this rate is an assumption between the 0.0 and +1°/30 d reported for 2000/01 and 1999/2000',unc:Math.min(15,2+.5*(ms-A[n-1][0])/D30)};
  for(let i=0;i<n-1;i++)if(ms<=A[i+1][0])return {v:A[i][1]+(A[i+1][1]-A[i][1])*(ms-A[i][0])/(A[i+1][0]-A[i][0]),how:'interpolated between BAA values (71° in 1999; 75.2° on 2000 July 13; 75° on 2000 Nov 28; DL2 0.0 to 2001 April)',unc:2}}
const BA_A=[[Date.UTC(2000,2,29),17],[Date.UTC(2000,5,21),-23.9],[Date.UTC(2000,6,28),-38],[Date.UTC(2000,10,28),-90]];   /* L2 17 (Mar 29), 336.1 (Jun 21), 322.0 (Jul 28), 270 (Nov 28), unwrapped */
const T_BCDE=Date.UTC(1998,2,1),T_BA=Date.UTC(2000,2,21);   /* "in early 1998, ovals BC and DE merged" (date taken as 1998-03-01); "collided and merged during just one week, 2000 March 18-24" */
function jupFeatures(ms,probeWlon){const G=grsL2(ms),F={ratio:JUP_REQ/JUP_RPOL,grsL2:G.v,grsHow:G.how,grsUnc:G.unc,grs:l2to3(G.v,ms),grsLat:-22.7,grsA:9,grsB:5.5,ov:[],notes:[]};
  if(ms>=T_BA){let L2,how;const A=BA_A,n=A.length;if(ms>A[n-1][0]){L2=A[n-1][1]-12.3*(ms-A[n-1][0])/D30;how='extrapolated from 270° (2000 Nov 28) at −12.3°/30 d (BAA long-term report, 2000 Jul–2001 Feb); reported later drifts range from −10.4 to −18.9, so the longitude is illustrative'}
      else if(ms<A[0][0]){L2=A[0][1];how='17° on 2000 March 29 (JBAA 113(1))'}else{for(let i=0;i<n-1;i++)if(ms<=A[i+1][0]){L2=A[i][1]+(A[i+1][1]-A[i][1])*(ms-A[i][0])/(A[i+1][0]-A[i][0]);break}how='interpolated between BAA positions (L2 17 on 2000 Mar 29, 336.1 Jun 21, 322.0 Jul 28, 270 Nov 28)'}
    L2=(L2%360+360)%360;F.ov.push([l2to3(L2,ms),-32.6,5,3.3,0]);F.notes.push('Oval BA: L2 '+L2.toFixed(1)+'°, '+how+'; latitude −32.6° (BE, JBAA 113(1)); drawn 10° × 6.6° (reported lengths 12.0° and 8.3°, IJW report 2000-08-03; width illustrative)')}
  else{const L2=((17+11.7*(T_BA-ms)/D30)%360+360)%360,how='back-propagated from L2 17° at the 2000 March merger at −11.7°/30 d (rate reported for BC, 1996–1997); longitudes illustrative';
    if(ms>=T_BCDE){F.ov.push([l2to3(L2,ms),-32.6,4,3,0],[l2to3(L2+15,ms),-33.3,4,3,0]);F.notes.push('Ovals BE and FA (BC and DE had merged in early 1998): L2 '+L2.toFixed(0)+'° and '+((L2+15)%360).toFixed(0)+'° (15° apart, JBAA 113(1)), '+how+'; sizes illustrative')}
    else{const sep=15+(110-15)*clamp((Date.UTC(1999,6,1)-ms)/(Date.UTC(1999,6,1)-Date.UTC(1990,0,1)),0,1);F.ov.push([l2to3(L2-16,ms),-32.6,3.6,2.8,0],[l2to3(L2,ms),-32.6,3.6,2.8,0],[l2to3(L2+sep,ms),-33.3,3.6,2.8,0]);
      F.notes.push('Ovals BC, DE, FA: L2 '+((L2-16+360)%360).toFixed(0)+'°, '+L2.toFixed(0)+'°, '+((L2+sep)%360).toFixed(0)+'° (BC–DE 16° apart; FA following by '+sep.toFixed(0)+'°, interpolated between “~110º f. them” by 1990 and 15° in 1999), '+how+'; sizes illustrative')}}
  /* NEB barges B1-B3 and white spot Z: positions given for the 2000 Nov 28 opposition only (JBAA 114(4)); drawn for scenes within the 2000 June - 2001 June window */
  if(ms>=Date.UTC(2000,5,1)&&ms<=Date.UTC(2001,5,30)){const dm=(ms-Date.UTC(2000,10,28))/D30;for(const [L,d] of [[37,-4.2],[148,-4],[195,-5]])F.ov.push([l2to3(L+d*dm,ms),16.2,3,1,1]);F.ov.push([l2to3(205-6*dm,ms),19.1,2.2,1.6,0]);
    F.notes.push('NEB barges B1–B3 at 16.2–16.4°N (L2 37, 148, 195 at 2000 Nov 28, DL2 −4.2, −4, −4→−6) and white spot Z at 19.1°N (L2 205, DL2 −6): JBAA 114(4); sizes illustrative')}
  /* dark NEBs projections: 12 (JBAA 113(1), 1999/2000), 7 from 2000 October (JBAA 114(4)); longitudes not sourced, except that on 1995-12-07 one is placed at the probe longitude */
  F.fn=ms>=Date.UTC(2000,9,1)?7:12;const day=Math.floor(ms/864e5);F.probeDay=day===Math.floor(Date.UTC(1995,11,7)/864e5);F.fp=F.probeDay?probeWlon:360*hash(day,7,91);
  /* small light and dark ovals at middle and high latitudes: random, illustrative; same set for every date */
  for(let i=0;i<70;i++){const s=hash(i,1,93)<.5?-1:1,la=s*(30+36*hash(i,2,93)),a=.8+1.8*hash(i,3,93);F.ov.push([360*hash(i,4,93),la,a,a*.62,hash(i,5,93)<.6?2:3])}
  F.key=[F.grs.toFixed(1),F.fn,F.fp.toFixed(1),F.ov.filter(o=>o[4]<2).map(o=>o[0].toFixed(0)).join('.')].join('_');return F}
let JF=null;
