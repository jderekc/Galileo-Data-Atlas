import os
D=os.path.dirname(os.path.abspath(__file__));S=open(D+'/../moons_template.r5.html').read()
def rep(s,a,b,n=1):
    assert s.count(a)==n,('rep count',a[:80],s.count(a));return s.replace(a,b)
# ---------- A. efficiency ----------
# render on demand
S=rep(S,"""  const t0=performance.now();
  setLimits();updateWorld(S.T);ctl.update();R_.render(scene,cam);drawLabels();
  const ft=performance.now()-t0;ema=ema*.9+ft*.1;acc+=ft;nfr++;""",
"""  /* render on demand: a frame is drawn only when time, camera, view size, a toggle, the scene or a texture changed (NEED), or while playing; idle frames cost one controls update */
  const moved=ctl.update(),key=S.T+'|'+S.follow+'|'+S.glow+S.stars+S.atm+'|'+cv.width+'x'+cv.height;if(key!==LASTKEY){LASTKEY=key;NEED=Math.max(NEED,2)}
  if(S.play||moved||NEED>0||BENCH){if(NEED>0)NEED--;const t0=performance.now();
    setLimits();updateWorld(S.T);ctl.update();R_.render(scene,cam);drawLabels();
    const ft=performance.now()-t0;ema=ema*.9+ft*.1;acc+=ft;nfr++;DRAWN++}""")
S=rep(S,"let last=performance.now(),ema=16,acc=0,nfr=0,lastHud=0,emaI=16;","let last=performance.now(),ema=16,acc=0,nfr=0,lastHud=0,emaI=16,NEED=3,LASTKEY='',BENCH=false,DRAWN=0,slow=0;")
S=rep(S,"function applyTier(){","let DPRS=1;   /* render-scale factor used by the adaptive governor (HIGH, auto) */\nfunction applyTier(){")
S=rep(S,"$('#texq').textContent=TIER==='HIGH'&&HIQ.jobs.length?' · building '+HI_W+'-px textures: '+HIQ.jobs.length+' left':''}",
"""$('#stat').textContent=(TIER==='HIGH'&&HIQ.jobs.length?'building '+HI_W+'-px textures: '+HIQ.jobs.length+' left':'')+(DPRS<1?(HIQ.jobs.length?' · ':'')+'render scale '+DPRS:'');
    /* adaptive resolution (HIGH, auto only): after 3 s of drawn frames slower than 45 ms the pixel ratio is scaled to 0.75, then 0.5, then the tier drops to LOW */
    if(TIER==='HIGH'&&TIER_PREF==='auto'&&(S.play||NEED>0)){slow=emaI>45?slow+1:0;if(slow>=12){slow=0;if(DPRS>.5){DPRS-=.25;applyTier();resize();NEED=3}else{DPRS=1;TIER='LOW';applyTier();rebuildSky();loadScene(S.scene)}}}else slow=0}""")
S=rep(S,"  R_.setPixelRatio(TIER==='HIGH'?Math.min(devicePixelRatio||1,2):1);","  R_.setPixelRatio(TIER==='HIGH'?Math.min(devicePixelRatio||1,2)*DPRS:1);")
S=rep(S,"function resize(){const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;R_.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}","function resize(){const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;R_.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();NEED=3}")
# NEED on scene load, toggles, tier
S=rep(S,"function loadScene(id){clearScene();","function loadScene(id){NEED=4;clearScene();")
S=rep(S,"function forceTier(t){TIER_PREF=t;","function forceTier(t){NEED=4;DPRS=1;TIER_PREF=t;")
# hi textures: built lazily (only when the body is large on screen), canvases released after the GPU upload, no CPU-side cache
S=rep(S,"TEXCACHE[j.key]=tx;HIQ.done++;","HIQ.done++;")
S=rep(S,"function hiRequest(spec,apply){const tx=TEXCACHE[spec.key];if(tx){apply(tx);return}hiInit();","function hiRequest(spec,apply){hiInit();")
S=rep(S,"function hiSwap(mat,tx){const om=mat.map,on=mat.normalMap;mat.map=mkTexHi(tx.canvas,true);mat.normalMap=mkTexHi(tx.ncanvas,false);if(om)om.dispose();if(on)on.dispose();mat.needsUpdate=true}",
"function hiSwap(mat,tx){const om=mat.map,on=mat.normalMap;mat.map=mkTexHi(tx.canvas,true);mat.normalMap=mkTexHi(tx.ncanvas,false);for(const t of [mat.map,mat.normalMap])t.onUpdate=()=>{t.image.width=t.image.height=0;t.onUpdate=null};   /* free the canvas once the texture is on the GPU */\n  if(om)om.dispose();if(on)on.dispose();mat.needsUpdate=true;NEED=3}")
S=rep(S,"  if(TIER==='HIGH')hiRequest({key:kind+'@'+HI_W+jk,jf:JF,type:'body',kind,W:HI_W,H:HI_W/2,hi:1,ns:(NSTR[kind]||2.2)*HI_W/512*.5},t=>{if(!B.dead&&TIER==='HIGH')hiSwap(m.material,t)});\n  return B}",
"""  if(TIER==='HIGH'){B.hiAsk=()=>{B.hiAsk=null;hiRequest({key:kind+'@'+HI_W+jk,jf:JF,type:'body',kind,W:HI_W,H:HI_W/2,hi:1,ns:(NSTR[kind]||2.2)*HI_W/512*.5},t=>{if(!B.dead&&TIER==='HIGH')hiSwap(m.material,t)})};   /* asked for in updateWorld once the body spans more than 120 px */
    if(kind!=='JUPITER'){B.geoHi=g;B.geoLo=new THREE.SphereGeometry(radiusKm,32,16);if(kind==='AMALTHEA')amaShape(B.geoLo)}}   /* level of detail: 960 triangles while the moon spans less than 60 px */
  return B}""")
old_am=S[S.index("  if(kind==='AMALTHEA'){const p=g.attributes.position;"):S.index("  const m=new THREE.Mesh(g,bodyMaterial(kind,tx));m.rotation.x=Math.PI/2;")]
S=S.replace(old_am,"  if(kind==='AMALTHEA')amaShape(g);\n")
S=rep(S,"function mkBody(key,radiusKm,kind,segs,polarKm){","""/* Amalthea: triaxial figure 125 x 73 x 64 km (NSSDCA) with illustrative lumps of up to 9 %; shortest axis on the pole axis, long axis on body X: orientation illustrative */
function amaShape(g){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y,z),lon=Math.atan2(z,x),lat=Math.asin(y/r);const d=1+.09*(sfbm(lon,lat,67,4,2)-.5)*2;p.setXYZ(i,x/r*AMA_AXES[0]*d,y/r*AMA_AXES[2]*d,z/r*AMA_AXES[1]*d)}g.computeVertexNormals()}
function mkBody(key,radiusKm,kind,segs,polarKm){""")
S=rep(S,"for(const k in bodies){bodies[k].dead=true;scene.remove(bodies[k].grp);disposeObj(bodies[k].grp)}bodies={};","for(const k in bodies){const b=bodies[k];b.dead=true;scene.remove(b.grp);disposeObj(b.grp);if(b.geoHi)b.geoHi.dispose();if(b.geoLo)b.geoLo.dispose()}bodies={};")
S=rep(S,"    if(w.craft){const hide=(k==='PROBE'&&SCN.kind==='PROBE'&&T<0);w.grp.visible=!hide&&d<6;w.marker.visible=!hide&&d>=.3}else{w.marker.visible=px<3}",
"    if(w.craft){const hide=(k==='PROBE'&&SCN.kind==='PROBE'&&T<0);w.grp.visible=!hide&&d<6;w.marker.visible=!hide&&d>=.3}else{w.marker.visible=px<3;const b=bodies[k];if(b){if(b.geoLo){const gg=px>60?b.geoHi:b.geoLo;if(b.mesh.geometry!==gg)b.mesh.geometry=gg}if(b.hiAsk&&px>120)b.hiAsk()}}")
# caps: the two local caps ask for their 2048 textures directly (the probe scene starts next to them); coarser grids
S=rep(S,"mkCap(pt.s3_lat[0],pt.s3_wlon[0],10,10,TIER==='HIGH'?256:96)","mkCap(pt.s3_lat[0],pt.s3_wlon[0],10,10,TIER==='HIGH'?160:96)")
S=rep(S,"mkCap(cl,cw,1.5,1.5,TIER==='HIGH'?160:64,.012)","mkCap(cl,cw,1.5,1.5,TIER==='HIGH'?128:64,.012)")
# ---------- B. textures ----------
S=rep(S,"n3=sfbm(lon,lat,sd+9,6,11),pol=Math.pow(Math.abs(lat)/(Math.PI/2),2.2);\n    const t=clamp((n-.35)*3,0,1);r=.95-.08*t;g=.86-.26*t;b=.42-.2*t;let k=ss(.55,.61,n3);",
"n3=.6*sfbm(lon+.5*(n-.5),lat+.5*(n2-.5),sd+9,6,11)+.4*sfbm(lon+.4*(n2-.5),lat-.4*(n-.5),sd+13,5,17)+.02,pol=Math.pow(Math.abs(lat)/(Math.PI/2),2.2);   /* two warped noise fields mixed, so the patches do not follow the noise lattice */\n    const t=clamp((n-.35)*3,0,1);r=.95-.08*t;g=.86-.26*t;b=.42-.2*t;let k=ss(.55,.61,n3);")
i=S.index("gr=.5+.5*Math.sin(u*gf+g2*5),gr2=.5+.5*Math.sin(u*gf*3.7+g2*11);");
S=rep(S,"gr=.5+.5*Math.sin(u*gf+g2*5),gr2=.5+.5*Math.sin(u*gf*3.7+g2*11);","gw=sfbm(lon,lat,sd+33,4,26)-.5,ga2=.35+1.3*sfbm(lon,lat,sd+35,3,7),gr=.5+.5*ga2*Math.sin(u*gf+g2*5+7*gw),gr2=.5+.5*ga2*Math.sin(u*gf*3.7+g2*11+11*gw);   /* groove phase and depth vary with noise, so the sets are not a uniform sine pattern */")
S=rep(S,"      if(Math.abs(lat-.2)<.06&&lon>2.3&&lon<2.9){r=.60;gg=.52;b=.44}}","      {const ex=(lon-2.6)/.3,ey=(lat-.2)/.1;if(ex*ex+ey*ey<1){r=.60;gg=.52;b=.44}}}")
S=rep(S,"const QL=kind==='JUPITER'?32:14;","const QL=kind==='JUPITER'?32:kind==='CALLISTO'?24:14;")
# ---------- C. flybys without a Jupiter-relative moon position (C30, A34): PHIO basis inferred from the spacecraft's own Jupiter-centred position ----------
S=rep(S,"const FLYS=P.flybys.filter(x=>x.moon_jse||x.moon==='AMALTHEA');","""const FLYS=P.flybys.filter(x=>x.moon_jse||x.sc_jse_jupcrds_Rj);
/* For passes whose moon position relative to Jupiter is not in the pack (C30, A34) the PHIO axes are inferred: Z = Jovian pole, Y = toward Jupiter from the spacecraft's JUPCRDS position at closest approach, X = Y x Z.
   Against the 34 passes that have a data-derived basis this construction is within 0.36 deg for every pass closer than 3.3 radii (G12 0.90, G9 4.33 at 6.5 and 31 radii). */
FLYS.forEach(fl=>{if(fl.moon_jse)return;const sc=fl.sc_jse_jupcrds_Rj,L=Math.hypot(sc[0],sc[1]),y=[-sc[0]/L,-sc[1]/L,0],x=[y[1],-y[0],0];fl.basis_inf={x,y,z:[0,0,1]};if(!fl.sun_jse){const b=fl.beta.beta_deg*RAD;fl.sun_jse=[Math.cos(b),0,Math.sin(b)]}
  const tr=fl.traj;let i=0;for(let k=1;k<tr.t.length;k++)if(Math.abs(tr.t[k])<Math.abs(tr.t[i]))i=k;const rk=fl.rk_km,p=[tr.x[i]*rk,tr.y[i]*rk,tr.z[i]*rk];
  fl.moon_inf=[sc[0]*RJ-(p[0]*x[0]+p[1]*y[0]),sc[1]*RJ-(p[0]*x[1]+p[1]*y[1]),sc[2]*RJ-p[2]];if(!fl.note)fl.note='no Jupiter-relative position for '+MOONS[fl.moon].name+' on this pass is in the data pack (the pack builder found no MOONS_TRAJ rows for it; the cause has not been established)'});""")
S=rep(S,"${x.moon_jse?'':' (moon position vs Jupiter not in data)'}","${x.moon_jse?'':' (moon position inferred †)'}")
S=rep(S,"    else {const pts=[];for(let i=0;i<tr.t.length;i++)pts.push(tr.x[i]*rk,tr.y[i]*rk,tr.z[i]*rk);SCN.track=trackLine(pts,0xff7a59)}",
"    else {const B=fl.basis_inf,pts=[];for(let i=0;i<tr.t.length;i++){const x=tr.x[i]*rk,y=tr.y[i]*rk,z=tr.z[i]*rk;pts.push(x*B.x[0]+y*B.y[0]+z*B.z[0],x*B.x[1]+y*B.y[1]+z*B.z[1],x*B.x[2]+y*B.y[2]+z*B.z[2])}SCN.track=trackLine(pts,0xff7a59)}")
a=S.index("      const sc=fl.sc_jse_jupcrds_Rj;WORLD[fl.moon].pos.set(sc[0]*RJ,sc[1]*RJ,sc[2]*RJ);");b=S.index("SCN.track.position.copy(WORLD[fl.moon].pos)}",a)+len("SCN.track.position.copy(WORLD[fl.moon].pos)}")
S=S[:a]+"""      const mi=fl.moon_inf,B=fl.basis_inf;WORLD[fl.moon].pos.set(mi[0],mi[1],mi[2]);  /* inferred: spacecraft JUPCRDS position at closest approach minus its moon-centred offset in the inferred PHIO axes; held fixed during the window */
      for(const k of MK4)if(k!==fl.moon&&WORLD[k]&&fl.moons_at_tca&&fl.moons_at_tca[k]){const m=fl.moons_at_tca[k];sph(m.R_Rj*RJ,m.lat_deg,m.az_deg,WORLD[k].pos)}
      const x=lerp(tr.t,tr.x,T)*rk,y=lerp(tr.t,tr.y,T)*rk,z=lerp(tr.t,tr.z,T)*rk;WORLD.ORBITER.pos.set(mi[0]+x*B.x[0]+y*B.y[0]+z*B.z[0],mi[1]+x*B.x[1]+y*B.y[1]+z*B.z[1],mi[2]+x*B.x[2]+y*B.y[2]+z*B.z[2]);SCN.track.position.copy(WORLD[fl.moon].pos)}"""+S[b:]
S=rep(S,"    else if(fl.moons_at_tca){for(const k of MK4)if(fl.moons_at_tca[k])addMoon(k,MOONS[k].rk_pds_km)}","    else if(fl.moons_at_tca){for(const k of MK4)if(k!==fl.moon&&fl.moons_at_tca[k])addMoon(k,MOONS[k].rk_pds_km)}")
S=rep(S,"""'<span class="warn">Amalthea position relative to Jupiter is not in the volumes read; moon-centred geometry only</span>'}</div>""",
"""`<span class="k">${MOONS[fl.moon].name} from Jupiter</span><b class="inf" title="spacecraft JUPCRDS position at closest approach minus its moon-centred offset, PHIO axes inferred; the moon is held at this point for the whole window">${f(Math.hypot(fl.moon_inf[0],fl.moon_inf[1],fl.moon_inf[2])/RJ,3)} Rj†</b><span class="warn">${MOONS[fl.moon].name}’s position relative to Jupiter is not in the data for this pass; inferred, held fixed</span>`}</div>${SCN.ecl?`<div class="row"><span class="k">geometric shadow of Jupiter</span><b class="inf" title="cylinder test from the Jupiter-centred positions and the Sun direction (β); penumbra and refraction not modelled">${SCN.ecl}†</b></div>`:''}""")
S=rep(S,"  if(fl&&!fl.moon_jse)rows+=li('Amalthea position',fl.note,'not in data','drawn moon-centred at the spacecraft CA position from '+fl.file.replace('SATELLITES/AMALTHEA/','…')+' as an anchor');",
"  if(fl&&!fl.moon_jse)rows+=li(MOONS[fl.moon].name+' position',fl.note+'. Inferred †: the moon is placed at the spacecraft’s Jupiter-centred position at closest approach (JUPCRDS row within '+f(fl.jupcrds_dt_to_nearest_row_s||0,0)+' s) minus the spacecraft’s moon-centred offset ('+fl.file.split('/').pop()+'), using PHIO axes built from that same Jupiter-centred position (Z = Jovian pole, Y toward Jupiter, X = Y × Z). The same construction applied to the 34 passes that have a data-derived basis differs from it by at most 0.36° for passes closer than 3.3 radii. Result: '+f(Math.hypot(fl.moon_inf[0],fl.moon_inf[1],fl.moon_inf[2])/RJ,4)+' Rj from Jupiter','not in data','inferred position, held fixed for the whole window; the moon’s own motion during the window is not drawn');")
# eclipse test (flyby scenes): Jupiter's geometric shadow
S=rep(S,"    const o=crafts.ORBITER,att=fl.att&&Math.abs(fl.att.dt_from_ca_s)<=10&&fl.att.axis_jse;",
"""    { const s=SCN.sun,inSh=p=>{const dd=p.x*s[0]+p.y*s[1]+p.z*s[2];if(dd>=0)return false;const qx=p.x-dd*s[0],qy=p.y-dd*s[1],qz=p.z-dd*s[2];return (qx*qx+qy*qy)/(JUP_REQ*JUP_REQ)+qz*qz/(JUP_RPOL*JUP_RPOL)<1};const names=[];
      for(const k in bodies){if(k==='JUPITER')continue;const sh=inSh(WORLD[k].pos);bodies[k].mesh.material.color.setScalar(sh?.03:1);if(sh)names.push(MOONS[k].name)}
      const so=inSh(WORLD.ORBITER.pos);crafts.ORBITER.mat.color.setScalar(so?.03:1);if(so)names.push('orbiter');SCN.ecl=names.length?names.join(', ')+' inside':'' }   /* Sun light on a body is switched to 3 % while it is inside the cylinder behind Jupiter's 1-bar ellipsoid (illustrative level; geometry from data) */
    const o=crafts.ORBITER,att=fl.att&&Math.abs(fl.att.dt_from_ca_s)<=10&&fl.att.axis_jse;""")
# ---------- UI ----------
S=rep(S,"""<span id="texq"></span></div>""","""</div>\n    <div id="stat" role="status" aria-live="polite"></div>""")
S=rep(S,"#tag{position:absolute;","#stat{position:absolute;right:10px;bottom:10px;font-size:11px;color:var(--txt);background:rgba(6,8,14,.72);padding:3px 7px;border-radius:6px;pointer-events:none}#stat:empty{display:none}\nbutton:focus-visible,select:focus-visible,input:focus-visible,canvas:focus-visible{outline:2px solid #ffd24a;outline-offset:2px}\n#tag{position:absolute;")
S=rep(S,"""<canvas id="gl"></canvas>""","""<canvas id="gl" tabindex="0" aria-label="3D view. Drag to rotate, scroll or pinch to zoom. Space starts and stops time; left and right arrows step time."></canvas>""")
S=rep(S,"if(e.code==='Space'){e.preventDefault();$('#play').click()}","if(e.code==='Space'){e.preventDefault();$('#play').click()}else if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();const st=(e.shiftKey?60:10)*(e.code==='ArrowLeft'?-1:1);S.T=clamp(S.T+st,SCN.t0,SCN.t1)}")
S=rep(S,"""<button class="sm" id="tierAuto" aria-pressed="true">auto</button>""","""<button class="sm" id="tierAuto" aria-pressed="true" title="auto: HIGH on a hardware renderer, LOW on a software renderer or a slow frame probe; in auto the HIGH tier lowers its render scale, then drops to LOW, if drawn frames stay slower than 45 ms">auto</button>""")
S=rep(S,"""<button class="sm" id="tierLow" aria-pressed="false">LOW</button>""","""<button class="sm" id="tierLow" aria-pressed="false" title="256×128 nearest textures, voxel craft, no tone mapping">LOW</button>""")
S=rep(S,"""<button class="sm" id="tierHigh" aria-pressed="false">HIGH</button>""","""<button class="sm" id="tierHigh" aria-pressed="false" title="2048×1024 textures built in the background when a body is large on screen, mesh craft, normal maps">HIGH</button>""")
S=rep(S,"window.__moons={","window.__moons={set bench(v){BENCH=!!v},get drawn(){return DRAWN},get need(){return NEED},get dprs(){return DPRS},")
# sources: tier text
S=rep(S,"with 512×256 / 1024² shown until each is ready;","with 512×256 / 1024² shown until each is ready; a body’s ${HI_W}-px texture is built only once it spans more than 120 px on screen, and the build canvases are freed after the GPU upload (a revisit rebuilds); moons under 60 px use a 960-triangle sphere; frames are drawn only when something changes;")
S=rep(S,"  footer{grid-column:1}","  footer{grid-column:1;flex-wrap:wrap}#tlwrap{order:3;flex-basis:100%}#clock{flex:1;min-width:0}\n  #hud{max-height:32%!important}")
S=rep(S,'<button id="play" class="sm">▶</button>','<button id="play" class="sm" aria-label="Play or pause time" title="Play or pause (Space)">▶</button>')
S=rep(S,'<select id="speed"></select>','<select id="speed" aria-label="Playback speed"></select>')
S=rep(S,'aria-label="time"></div>','aria-label="Time within the scene window"></div>')
open(D+'/../moons_template.html','w').write(S);print(len(S))
