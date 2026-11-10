import re,os,sys
D=os.path.dirname(os.path.abspath(__file__));S=open(D+'/../moons_template.r3.html').read()
def cut(s,a,b,new,inc_b=False):
    i=s.index(a);assert s.count(a)==1,('count',a[:40],s.count(a));j=s.index(b,i);
    return s[:i]+new+s[j+(len(b) if inc_b else 0):]
def rep(s,a,b,n=1):
    assert s.count(a)==n,('rep count',a[:60],s.count(a));return s.replace(a,b)
tex=open(D+'/tex.js').read();norm=open(D+'/norm.js').read();craft=open(D+'/craft.js').read()
# --- old inner texture code (kept verbatim for LOW and the HIGH interim) ---
i0=S.index("function texture(kind,W,H)");a=S.index("let r,gg,b,h=0;",i0)+len("let r,gg,b,h=0;");b=S.index("const o=4*(y*W+x);d[o]=255*clamp(q(r,14),0,1)",a)
inner=S[a:b].rstrip()
old_am="const n=sfbm(lon,lat,sd,4,3);r=.33+.1*n;gg=.30+.09*n;b=.28+.08*n;h=.5+.5*n;"
assert inner.count(old_am)==1
inner=inner.replace(old_am,"const n=sfbm(lon,lat,sd,4,3);r=.38+.10*n;gg=.21+.07*n;b=.15+.05*n;h=.5+.5*n;")
inner=inner.replace("/* small irregular moon with patches of relatively bright material (PIA02532 wording); colour not from a cited description */","/* small irregular moon with patches of relatively bright material (PIA02532 wording); red after the Voyager 1 caption P-21223C \"Tiny, red Amalthea\" */")
inner=inner.replace("if(Math.abs(lat-.2)<.03&&lon>2&&lon<3.2){r=.6;gg=.56;b=.52}","if(Math.abs(lat-.2)<.06&&lon>2.3&&lon<2.9){r=.60;gg=.52;b=.44}")
for a,b in [("const n=sfbm(lon,lat,sd,4,4),m=sfbm(lon,lat,sd+3,4,5);r=.84+.1*n;gg=.86+.09*n;b=.90+.06*n;","const n=sfbm(lon,lat,sd,4,4),m=sfbm(lon,lat,sd+3,4,5);r=.89+.08*n;gg=r;b=r;"),("const n=sfbm(lon,lat,sd,4,3);r=.34+.09*n;gg=.30+.08*n;b=.25+.07*n;h=.5+.1*n;","const n=sfbm(lon,lat,sd,4,3);r=.37+.09*n;gg=.29+.08*n;b=.24+.07*n;h=.5+.1*n;")]:
    assert inner.count(a)==1,a; inner=inner.replace(a,b)
tex=tex.replace('__OLD_INNER__',inner)
# 1 normal map
S=cut(S,"function normalFromHeight","const CRC={};",norm)
# 2 jupColor hi octave
S=rep(S,"function jupColor(lon,lat,sd,extra){","function jupColor(lon,lat,sd,extra,hi){")
S=rep(S,"let fine=sfbm(lon*3,lat*3,sd+8,3,40)-.5;if(extra){","let fine=sfbm(lon*3,lat*3,sd+8,3,40)-.5;if(hi)fine+=.9*(sfbm(lon,lat*9,sd+60,5,24)-.5)+.5*(sfbm(lon*4,lat*14,sd+64,4,50)-.5);if(extra){")
S=rep(S,"const zone=band>0;const r=zone?.88+.08*tur+.07*fine:.66+.08*tur+.07*fine,gg=zone?.80+.07*tur+.06*fine:.47+.07*tur+.06*fine,b=zone?.68+.05*tur+.045*fine:.35+.05*tur+.035*fine;const pol=Math.abs(lat)>1.2?.85:1;return [r*pol,gg*pol,b*(pol<1?.9:1),.5+.3*fine]}",
"""if(hi){ /* HIGH: the LOW band positions with soft, turbulent edges, a slow change of tint from band to band and gradual darkening toward the poles; illustrative */
    const z=ss(-.22,.22,band+.5*(tur-.5)+.25*fine),v=.5+.5*Math.sin(L*5.3+2.1),pz2=ss(.87,1.3,Math.abs(lat));
    let r=(.60+.14*v)*(1-z)+(.90+.04*v)*z,gg=(.40+.15*v)*(1-z)+(.85+.06*v)*z,b=(.29+.11*v)*(1-z)+(.74+.11*v)*z;const mm=1+.10*(tur-.5)+.11*fine;r*=mm;gg*=mm;b*=mm;
    r+=(.50-r)*pz2*.8;gg+=(.45-gg)*pz2*.8;b+=(.42-b)*pz2*.8;return [r,gg,b,.5+.3*fine]}
  const zone=band>0;const r=zone?.88+.08*tur+.07*fine:.66+.08*tur+.07*fine,gg=zone?.80+.07*tur+.06*fine:.47+.07*tur+.06*fine,b=zone?.68+.05*tur+.045*fine:.35+.05*tur+.035*fine;const pol=Math.abs(lat)>1.2?.85:1;return [r*pol,gg*pol,b*(pol<1?.9:1),.5+.3*fine]}""")
# 3 texture functions
S=cut(S,"/* near cap texture (±1.5°)","/* ---------------- voxel geometry builder",tex+"\n")
S=rep(S,"/* ---------------- voxel geometry builder (illustrative craft) ---------------- */","/* ---------------- voxel geometry builder (LOW craft; illustrative) ---------------- */")
# 4 craft
S=cut(S,"const M2KM=0.001;","/* ---------------- scene graph",craft+"\n")
# 5 bodies
S=rep(S,"""function mkBody(key,radiusKm,kind,segs,polarKm){const W=TIER==='HIGH'?512:256,H=W/2;const tx=TEXCACHE[kind+W]||(TEXCACHE[kind+W]=texture(kind,W,H));const g=new THREE.SphereGeometry(radiusKm,segs,segs/2);""",
"""const NSTR={JUPITER:.5,EUROPA:1.2};   /* normal-map strength at 512 px; scaled with resolution for the 2048-px set */
const AMA_AXES=[125,73,64];   /* km semi-axes, NSSDCA Jovian Satellite Fact Sheet "Radius (km)" entry for Amalthea: 125 x 73 x 64 */
function mkBody(key,radiusKm,kind,segs,polarKm){const W=TIER==='HIGH'?512:256,H=W/2;const tx=TEXCACHE[kind+W]||(TEXCACHE[kind+W]=texture(kind,W,H));const g=new THREE.SphereGeometry(radiusKm,segs,segs/2);""")
old_am_geo=S[S.index("  if(kind==='AMALTHEA'){const p=g.attributes.position;"):S.index("  const m=new THREE.Mesh(g,bodyMaterial(kind,tx));m.rotation.x=Math.PI/2;")]
S=S.replace(old_am_geo,"""  if(kind==='AMALTHEA'){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y,z),lon=Math.atan2(z,x),lat=Math.asin(y/r);const d=1+.09*(sfbm(lon,lat,67,4,2)-.5)*2;p.setXYZ(i,x/r*AMA_AXES[0]*d,y/r*AMA_AXES[2]*d,z/r*AMA_AXES[1]*d)}g.computeVertexNormals()}  /* triaxial figure 125 x 73 x 64 km (NSSDCA) with illustrative lumps of up to 9 %; shortest axis on the pole axis, long axis on body X: orientation illustrative */
""")
S=rep(S,"""  const grp=new THREE.Group();grp.add(m);scene.add(grp);return {grp,mesh:m,r:radiusKm,tex:tx}}""",
"""  const grp=new THREE.Group();grp.add(m);scene.add(grp);const B={grp,mesh:m,r:radiusKm,tex:tx};
  if(TIER==='HIGH')hiRequest({key:kind+'@'+HI_W,type:'body',kind,W:HI_W,H:HI_W/2,hi:1,ns:(NSTR[kind]||2.2)*HI_W/512*.5},t=>{if(!B.dead&&TIER==='HIGH')hiSwap(m.material,t)});
  return B}""")
# sun disc / glow / stars -> tier-dependent and rebuildable
S=rep(S,"function sunDiscTex(){const c=mkCanvas(64,64),g=c.getContext('2d');g.fillStyle='#fff6d6';g.beginPath();g.arc(32,32,30,0,TAU);g.fill();return new THREE.CanvasTexture(c)}",
"function sunDiscTex(){const n=TIER==='HIGH'?512:64,c=mkCanvas(n,n),g=c.getContext('2d');g.fillStyle='#fff6d6';g.beginPath();g.arc(n/2,n/2,n*30/64,0,TAU);g.fill();return new THREE.CanvasTexture(c)}")
S=rep(S,"const glowTex=(()=>{const c=mkCanvas(128,128),g=c.getContext('2d');const gr=g.createRadialGradient(64,64,4,64,64,62);gr.addColorStop(0,'rgba(255,240,200,.9)');gr.addColorStop(.3,'rgba(255,200,120,.35)');gr.addColorStop(1,'rgba(255,180,80,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();\nconst sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,",
"function glowTexMk(){const n=TIER==='HIGH'?512:128,k=n/128,c=mkCanvas(n,n),g=c.getContext('2d');const gr=g.createRadialGradient(64*k,64*k,4*k,64*k,64*k,62*k);gr.addColorStop(0,'rgba(255,240,200,.9)');gr.addColorStop(.3,'rgba(255,200,120,.35)');gr.addColorStop(1,'rgba(255,180,80,0)');g.fillStyle=gr;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)}\nconst sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexMk(),")
S=rep(S,"const stars=(()=>{const n=TIER==='HIGH'?2600:900,","function mkStars(){const n=TIER==='HIGH'?9000:900,")
S=rep(S,"vertexColors:true,depthWrite:false,toneMapped:false}));scene.add(p);return p})();",
"vertexColors:true,depthWrite:false,toneMapped:false}));scene.add(p);return p}\nlet stars=mkStars(),SKY_TIER=TIER;\n/* star points, Sun disc and glow textures are rebuilt when the tier changes */\nfunction rebuildSky(){if(SKY_TIER===TIER)return;SKY_TIER=TIER;scene.remove(stars);stars.geometry.dispose();stars.material.dispose();stars=mkStars();for(const [sp,mk] of [[sunDisc,sunDiscTex],[sunGlow,glowTexMk]]){sp.material.map.dispose();sp.material.map=mk();sp.material.needsUpdate=true}}")
S=rep(S,"col[3*i]=w*(1-.1*t);col[3*i+1]=w*(1-.05*t);col[3*i+2]=w*(.9+.15*t)}","col[3*i]=w*(1-.1*t);col[3*i+1]=w*(1-.05*t);col[3*i+2]=w*(.9+.15*t)}   /* HIGH: 9000 points, LOW: 900 */")
# clearScene: mark bodies dead, cancel queued jobs
S=rep(S,"for(const k in bodies){scene.remove(bodies[k].grp);disposeObj(bodies[k].grp)}bodies={};","hiCancel();for(const k in bodies){bodies[k].dead=true;scene.remove(bodies[k].grp);disposeObj(bodies[k].grp)}bodies={};")
S=rep(S,"const SEG=()=>TIER==='HIGH'?96:40;","const SEG=()=>TIER==='HIGH'?192:40;")
S=rep(S,"function addJupiter(close){const b=mkBody('JUPITER',JUP_REQ,'JUPITER',TIER==='HIGH'?128:56,JUP_RPOL);","function addJupiter(close){const b=mkBody('JUPITER',JUP_REQ,'JUPITER',TIER==='HIGH'?256:56,JUP_RPOL);")
S=rep(S,"const cap=new THREE.Mesh(mkCap(pt.s3_lat[0],pt.s3_wlon[0],10,10,TIER==='HIGH'?200:96),bodyMaterial('JUPITER',tx));b.grp.add(cap);b.cap=cap;",
"const cap=new THREE.Mesh(mkCap(pt.s3_lat[0],pt.s3_wlon[0],10,10,TIER==='HIGH'?256:96),bodyMaterial('JUPITER',tx));b.grp.add(cap);b.cap=cap;")
S=rep(S,"const near=new THREE.Mesh(mkCap(cl,cw,1.5,1.5,TIER==='HIGH'?120:64,.012),bodyMaterial('JUPITER',tn));b.grp.add(near);b.near=near}",
"const near=new THREE.Mesh(mkCap(cl,cw,1.5,1.5,TIER==='HIGH'?160:64,.012),bodyMaterial('JUPITER',tn));b.grp.add(near);b.near=near;\n    if(TIER==='HIGH'){hiRequest({key:'NEAR@'+HI_W,type:'near',lat:cl,wlon:cw,half:1.5,W:HI_W,H:HI_W,hi:1,ns:.5*HI_W/1024},t=>{if(!b.dead&&TIER==='HIGH')hiSwap(near.material,t)});hiRequest({key:'CAP@'+HI_W,type:'cap',lat:pt.s3_lat[0],wlon:pt.s3_wlon[0],half:10,W:HI_W,H:HI_W,hi:1,ns:.5*HI_W/1024},t=>{if(!b.dead&&TIER==='HIGH')hiSwap(cap.material,t)})}}")
# addCraft with line parts
S=rep(S,"for(const p in parts){const m=new THREE.Mesh(parts[p],mat);m.scale.setScalar(M2KM);grp.add(m);sub[p]=m}",
"for(const p in parts){const m=parts[p].userData.lines?new THREE.LineSegments(parts[p],new THREE.LineBasicMaterial({color:0xd8d6cc,transparent:true,opacity:.8})):new THREE.Mesh(parts[p],mat);m.scale.setScalar(M2KM);grp.add(m);sub[p]=m}")
S=rep(S,"addCraft('PROBE','Descent probe',{entry:buildProbeEntry(),module:buildProbeDescent(),chute:buildChute(),aft:buildAftCover(),shell:buildAeroshell()});",
"{const pp={entry:buildProbeEntry(),module:buildProbeDescent(),chute:buildChute(),aft:buildAftCover(),shell:buildAeroshell()};if(TIER==='HIGH')pp.lines=buildChuteLines();addCraft('PROBE','Descent probe',pp)}")
S=rep(S,"c.sub.chute.visible=brk;","c.sub.chute.visible=brk;if(c.sub.lines)c.sub.lines.visible=brk;")
# ceiling + haze textures at HIGH
S=rep(S,"{ const tex=(()=>{const c=mkCanvas(256,256),g=c.getContext('2d');const gr=g.createRadialGradient(128,128,10,128,128,126);gr.addColorStop(0,'rgba(255,248,230,.9)');gr.addColorStop(.5,'rgba(255,240,215,.45)');gr.addColorStop(1,'rgba(255,235,205,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);return new THREE.CanvasTexture(c)})();",
"{ const tex=(()=>{const n=TIER==='HIGH'?1024:256,k=n/256,c=mkCanvas(n,n),g=c.getContext('2d');const gr=g.createRadialGradient(128*k,128*k,10*k,128*k,128*k,126*k);gr.addColorStop(0,'rgba(255,248,230,.9)');gr.addColorStop(.5,'rgba(255,240,215,.45)');gr.addColorStop(1,'rgba(255,235,205,0)');g.fillStyle=gr;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)})();")
S=rep(S,"new THREE.Mesh(new THREE.CircleGeometry(40,24),","new THREE.Mesh(new THREE.CircleGeometry(40,TIER==='HIGH'?96:24),")
S=rep(S,"const ntex=(()=>{const c=mkCanvas(128,128),g=c.getContext('2d'),im=g.createImageData(128,128),d=im.data;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const dx=x/64-1,dy=y/64-1,r=Math.hypot(dx,dy);const n=fbm(x/16,y/16,77,4);const a=Math.max(0,1-r)*(0.35+0.65*n);const o=4*(y*128+x);",
"const ntex=(()=>{const N=512,c=mkCanvas(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=x/(N/2)-1,dy=y/(N/2)-1,r=Math.hypot(dx,dy);const n=fbm(x/(N/8),y/(N/8),77,6);const a=Math.max(0,1-r)*(0.35+0.65*n);const o=4*(y*N+x);")
# zoom: after the table break the craft view must hold the parachute (illustrative trailing distance)
S=rep(S,"if(z==='craft')d=w.craft?cs*2.6:w.r*2.6;","if(z==='craft')d=w.craft?(S.follow==='PROBE'&&SCN.kind==='PROBE'&&S.T>=167.106?.0115:cs)*2.6:w.r*2.6;")
# labels and tag
S=rep(S,"w.label+(w.craft?' (voxel model, illustrative)':'')","w.label+(w.craft?(TIER==='HIGH'?' (mesh model, illustrative)':' (voxel model, illustrative)'):'')")
S=rep(S,"""<div id="tag">surface textures, voxel craft geometry and star field are illustrative; positions, radii, light direction and times are from the PDS files listed under “sources”</div>""",
"""<div id="tag">surface textures, craft geometry and star field are illustrative; positions, radii, light direction and times are from the PDS files listed under “sources”<span id="texq"></span></div>""")
S=rep(S,"$('#tris').textContent=R_.info.render.triangles.toLocaleString('en-US')}","$('#tris').textContent=R_.info.render.triangles.toLocaleString('en-US');$('#texq').textContent=TIER==='HIGH'&&HIQ.jobs.length?' · building '+HI_W+'-px textures: '+HIQ.jobs.length+' left':''}")
# tier switching
S=rep(S,"if(nt!==TIER){TIER=nt;applyTier();fill.intensity","if(nt!==TIER){TIER=nt;applyTier();rebuildSky();fill.intensity")
S=rep(S,"if(t==='LOW'||t==='HIGH'){TIER_PREF=t;TIER=t;applyTier()}}","if(t==='LOW'||t==='HIGH'){TIER_PREF=t;TIER=t;applyTier();rebuildSky()}}")
S=rep(S,"window.__moons={get S(){return S}","window.__moons={texData,get hiq(){return {left:HIQ.jobs.length,done:HIQ.done,ok:HIQ.ok,workers:HIQ.workers.length}},craftStats:()=>{const o={};for(const k in crafts)for(const p in crafts[k].sub){const g=crafts[k].sub[p].geometry;o[k+'.'+p]=g.userData.lines?g.attributes.position.count/2+' line segments':g.attributes.position.count/3}return o},bodyStats:()=>{const o={};for(const k in bodies){const m=bodies[k].mesh,im=m.material.map.image;o[k]={tris:m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3,map:im.width+'x'+im.height};for(const c of ['cap','near'])if(bodies[k][c]){const q=bodies[k][c];o[k+'.'+c]={tris:q.geometry.index.count/3,map:q.material.map.image.width+'x'+q.material.map.image.height}}}return o},get S(){return S}")
open(D+'/stage1.html','w').write(S);print('stage1',len(S))
