import re
h = open("template13_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:110]!r}"
    h = h.replace(old, new)

# ---------- responsive type scale: every CSS font size multiplies --u ----------
a = h.index("<style>"); b = h.index("</style>")
css = h[a:b]
css2, nsub = re.subn(r'(font(?:-size)?:(?:[^;}]*? )?)(\d+(?:\.\d+)?)px', r'\1calc(\2px*var(--u))', css)
print("font sizes scaled:", nsub)
h = h[:a] + css2 + h[b:]
rep("  color-scheme:dark;\n}", "  color-scheme:dark;--u:1;\n}")

# ---------- CSS additions ----------
rep("[hidden]{display:none!important}", """[hidden]{display:none!important}
#lead{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#legend .lgi{display:flex;flex-wrap:wrap;gap:3px 12px;min-width:0}
#legend .lgb{display:none;pointer-events:auto;background:rgba(10,12,19,.78);border:1px solid var(--line);border-radius:5px;padding:1px 9px;font:inherit;color:var(--mute);cursor:pointer}
#legend.cmp{right:auto;flex-direction:column;align-items:flex-start;gap:4px}
#legend.cmp .lgb{display:inline-block}
#legend.cmp .lgi{display:none}
#legend.cmp.open .lgi{display:flex;background:rgba(10,12,19,.9);border:1px solid var(--line);border-radius:5px;padding:5px 8px;max-width:calc(100vw - 60px)}
#legend u.ds{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b4bccd;margin:0 5px 0 -1px;vertical-align:middle;text-decoration:none}
@media (min-width:881px) and (max-width:1180px){
  .grp2 .gl{display:none}
  .ctl{gap:6px 8px}
  #play{padding:5px 10px;min-width:60px}
  .grp2 .chip{padding:3px 6px}
  .tabs button{padding:5px 9px}
}""")

# ---------- side-panel toggle ----------
rep("""<button class="chip" data-lay="graph" aria-pressed="false">Graph focus</button></div></div>""",
    """<button class="chip" data-lay="graph" aria-pressed="false">Graph focus</button></div><button class="chip" id="sideTog" aria-pressed="true" title="Show or hide the side panel">Side panel</button></div>""")
rep("""function applyLayout(save){$('#app').style.setProperty('--sideW',S.sideW+'px');""",
    """function applyLayout(save){$('#app').style.setProperty('--sideW',(S.sideOn===false?0:S.sideW)+'px');$('#side').hidden=$('#vsplit').hidden=S.sideOn===false;const stg=$('#sideTog');if(stg)stg.setAttribute('aria-pressed',String(S.sideOn!==false));""")
rep("""JSON.stringify({lay:S.lay,graphH:S.graphH,sideW:S.sideW})""", """JSON.stringify({lay:S.lay,graphH:S.graphH,sideW:S.sideW,sideOn:S.sideOn!==false})""")
rep("""  let sv=null;try{sv=JSON.parse(localStorage.getItem('galileoAtlasLayout')||'null')}catch(e){}""",
    """  let sv=null;try{sv=JSON.parse(localStorage.getItem('galileoAtlasLayout')||'null')}catch(e){}
  if(sv&&sv.sideOn===false&&!mobileQ.matches)S.sideOn=false;""")
rep("""function maxGraphH(){""", """document.addEventListener('click',e=>{if(e.target.id!=='sideTog')return;S.sideOn=S.sideOn===false;applyLayout(true)});
function maxGraphH(){""")
# narrower default side panel at smaller widths
rep("const P={ '3d':{g:.2,m:150,side:328,stage:70},split:{g:.4,m:240,side:328,stage:52},graph:{g:.68,m:360,side:260,stage:30}}[name];",
    "const SB=Math.round(clamp(innerWidth/1300,.78,1)*328),P={ '3d':{g:.2,m:150,side:SB,stage:70},split:{g:.4,m:240,side:SB,stage:52},graph:{g:.68,m:360,side:Math.min(260,SB),stage:30}}[name];")

# ---------- scale factor ----------
rep("function resize(){const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;",
    "function resize(){const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;\n  document.documentElement.style.setProperty('--u',(mobileQ.matches?1:clamp(innerWidth/1280,.85,1)).toFixed(3));")
rep("sprites.forEach(sizeSprite);hudFit();drawTimeline();drawMission()}", "sprites.forEach(sizeSprite);legendFit();drawTimeline();drawMission()}")

# ---------- legend ----------
rep("function legend(){legend0();hudFit()}", """let LGOPEN=false;
function legendFit(){const lg=$('#legend'),st=$('#stage');if(!lg)return;lg.classList.remove('cmp');
  if(!mobileQ.matches&&(lg.offsetHeight>24||st.clientWidth<420))lg.classList.add('cmp');lg.classList.toggle('open',LGOPEN&&lg.classList.contains('cmp'));hudFit()}
function legend(){legend0();legendFit()}
$('#legend').addEventListener('click',e=>{if(!e.target.classList.contains('lgb'))return;LGOPEN=!LGOPEN;legendFit()});""")
_a = h.index("function legend0(){$('#legend').innerHTML=S.mode==='A'")
_b = h.index("pass</span>')}", _a) + len("pass</span>')}")
old = h[_a:_b]
new = old.replace("function legend0(){$('#legend').innerHTML=S.mode==='A'", "function legend0(){const li=S.mode==='A'")
new = new.replace("""<span><i style="border-color:#b4bccd"></i>grey (path and dot): position from the trajectory file, nothing measured</span>""", """<span><i style="border-color:#b4bccd"></i><u class="ds"></u>trajectory position</span>""")
new = new.replace("""earlier orbits: same colours, dimmer with age""", """earlier orbital paths""")
assert new.endswith("pass</span>')}"), new[-80:]
# the expression ends with the closing brace of the function; make it set innerHTML
new = new[:-1] + ";\n  $('#legend').innerHTML='<button class=\"lgb\" type=\"button\" aria-label=\"Show or hide the colour key\">Key</button><div class=\"lgi\">'+li+'</div>'}"
h = h.replace(old, new)

# ---------- a segment opened without an explicit time starts at its beginning ----------
rep("else{S.TA=keepT!=null?clamp(keepT,0,s.span):s.tmin;", "else{S.TA=keepT!=null?clamp(keepT,0,s.span):0;")
# ---------- speed reset (manual segment change) and time in the hash ----------
rep("S.speed.A=s.span>30*86400?86400*2:(s.span>5*86400?86400:3600);", "S.speed.A=s.span>5*86400?86400:3600;")
rep("""function setHash(){try{history.replaceState(null,'','#'+(S.mode==='B'&&FM?'fly='+FM.id:'orb='+(SG?SG.id:''))+""",
    """function setHash(){try{const tt=S.mode==='B'?S.TB:S.TA;history.replaceState(null,'','#'+(S.mode==='B'&&FM?'fly='+FM.id:'orb='+(SG?SG.id:''))+(Number.isFinite(tt)?'&t='+Math.round(tt):'')+""")
rep("""  if(h.get('fly')&&FLYBY[h.get('fly')]){await loadFly(h.get('fly'));if(FM.seg)await loadSeg(FM.seg,FM.tca_off);else await loadSeg('ORB08');setMode('B')}
  else{await loadSeg(SEGBY[h.get('orb')]?h.get('orb'):'ORB08');setMode('A')}""",
"""  const ht=h.get('t')!=null&&h.get('t')!==''&&Number.isFinite(+h.get('t'))?+h.get('t'):null;
  if(h.get('fly')&&FLYBY[h.get('fly')]){await loadFly(h.get('fly'));if(FM.seg)await loadSeg(FM.seg,FM.tca_off);else await loadSeg('ORB08');setMode('B');if(ht!=null){S.TB=clamp(ht,FD.tp[0],FD.tp[FD.tp.length-1])}}
  else{await loadSeg(SEGBY[h.get('orb')]?h.get('orb'):'ORB08',ht!=null?ht:undefined);setMode('A')}""")
rep("let last=performance.now();\nfunction frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;", "let last=performance.now(),lastHash=0;\nfunction frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(now-lastHash>1000){lastHash=now;setHash()}")

# ---------- label collision layout ----------
rep("function mkLabel(text,color,px,cam,anchor){", "function mkLabel(text,color,px,cam,anchor,pri){")
rep("const o={s,px:px*1.5,cam,asp:w/c.height};sprites.push(o);s.renderOrder=11;", "const o={s,px:px*1.5,cam,asp:w/c.height,lab:true,col:color,pri:pri||3,dyS:0};sprites.push(o);s.renderOrder=11;")
rep("const l=mkLabel(r+(r===use[use.length-1]?' Rj':''),'#9aa4bd',10.5,camA);", "const l=mkLabel(r+(r===use[use.length-1]?' Rj':''),'#9aa4bd',10.5,camA,undefined,4);")
rep("l=mkLabel(m.name,hex(c),10.5,camA);moonG.add(d,l)", "l=mkLabel(m.name,hex(c),10.5,camA,undefined,2);moonG.add(d,l)")
rep("l=mkLabel(txt,c||'#e4e8f2',10.5,camA);", "l=mkLabel(txt,c||'#e4e8f2',10.5,camA,undefined,1);")
rep("l=mkLabel('  '+f.id,hex(MCOL[f.moon]),11.5,camA);", "l=mkLabel('  '+f.id,hex(MCOL[f.moon]),11.5,camA,undefined,1);")
rep("l=mkLabel('  closest approach','#ffd36b',10.5,camB);", "l=mkLabel('  closest approach','#ffd36b',10.5,camB,undefined,1);")
rep("function pruneSprites(){", """const LEAD=document.createElement('canvas');LEAD.id='lead';$('#stage').insertBefore(LEAD,$('#hud'));
let LBL=[];const _pv=new THREE.Vector3();
function visChain(o){for(;o;o=o.parent)if(o.visible===false)return false;return true}
/* Labels keep their horizontal position; where two would overlap on screen, the lower-priority one is
   moved vertically (up or down, whichever is shorter) and joined to its anchor by a thin line. */
function layoutLabels(){const st=$('#stage'),W=st.clientWidth,H=st.clientHeight;if(!W||!H)return;
  const scene=S.mode==='A'?sA:sB,cam=S.mode==='A'?camA:camB,dpr=Math.min(devicePixelRatio||1,2);
  if(LEAD.width!==Math.round(W*dpr)||LEAD.height!==Math.round(H*dpr)){LEAD.width=Math.round(W*dpr);LEAD.height=Math.round(H*dpr)}
  const g=LEAD.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  scene.updateMatrixWorld();cam.updateMatrixWorld();
  const L=[];
  for(const o of sprites){if(!o.lab||o.cam!==cam||!visChain(o.s)||!attached(o.s,scene))continue;
    _pv.setFromMatrixPosition(o.s.matrixWorld).project(cam);if(_pv.z>1||_pv.z<-1)continue;
    const hp=o.px*.9,wp=o.px*o.asp,sx=(_pv.x*.5+.5)*W,sy=(-_pv.y*.5+.5)*H,x0=sx-o.s.center.x*wp;
    if(x0>W||x0+wp<0||sy<-hp||sy>H+hp)continue;
    L.push({o,sx,sy,x0,x1:x0+wp,hp,pri:o.pri,dy:0})}
  L.sort((a,b)=>a.pri-b.pri||a.sy-b.sy);
  const placed=[];
  const clash=(l,dy)=>{const y0=l.sy+dy-l.hp/2,y1=y0+l.hp;for(const p of placed)if(l.x0<p.x1+2&&l.x1+2>p.x0&&y0<p.y1+1&&y1>p.y0-1)return p;return null};
  for(const l of L){let dn=0,up=0;
    for(let k=0;k<24;k++){const p=clash(l,dn);if(!p)break;dn=p.y1+2-(l.sy-l.hp/2)}
    for(let k=0;k<24;k++){const p=clash(l,up);if(!p)break;up=p.y0-2-(l.sy+l.hp/2)}
    const okDn=l.sy+dn+l.hp/2<=H-4,okUp=l.sy+up-l.hp/2>=4;
    l.dy=(okDn&&okUp)?(Math.abs(dn)<=Math.abs(up)?dn:up):okDn?dn:okUp?up:0;
    const y0=l.sy+l.dy-l.hp/2;placed.push({x0:l.x0,x1:l.x1,y0,y1:y0+l.hp,l})}
  for(const l of L){const o=l.o;o.dyS+=(l.dy-o.dyS)*.35;if(Math.abs(l.dy-o.dyS)<.25)o.dyS=l.dy;
    o.s.center.y=.5+o.dyS/o.px;l.dyS=o.dyS;
    if(Math.abs(o.dyS)>4){g.strokeStyle=o.col;g.globalAlpha=.55;g.lineWidth=1;g.beginPath();
      const ex=Math.min(Math.max(l.sx,l.x0),l.x1),ey=l.sy+o.dyS+(o.dyS>0?-l.hp/2:l.hp/2);g.moveTo(l.sx,l.sy);g.lineTo(ex,ey);g.stroke();g.globalAlpha=1}}
  for(const o of sprites)if(o.lab&&!L.some(l=>l.o===o)&&o.dyS){o.dyS=0;o.s.center.y=.5}
  LBL=L}
function pruneSprites(){""")
rep("if(S.mode==='A'){updateA();ctlA.update();R_.render(sA,camA)}else{updateB();ctlB.update();R_.render(sB,camB)}",
    "if(S.mode==='A'){updateA();ctlA.update();layoutLabels();R_.render(sA,camA)}else{updateB();ctlB.update();layoutLabels();R_.render(sB,camB)}")
rep("window.__viewer={S,", "window.__viewer={get LBL(){return LBL},S,")
open("template14.html", "w").write(h); print("template14", len(h))
