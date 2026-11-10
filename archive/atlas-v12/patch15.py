import re
h = open("template14_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:110]!r}"
    h = h.replace(old, new)

# 1. camera framing at the start time: back off far enough to include the spacecraft
rep("function fitA(full){const dist=full?clamp(SG.rmax*1.7,28,1200):clamp(SG.rmax*.7,28,130);",
    "function fitA(full,r0){let dist=full?clamp(SG.rmax*1.7,28,1200):clamp(SG.rmax*.7,28,130);if(r0>0)dist=Math.max(dist,r0*3);")
rep("fillSpeed();fitA()}", "fillSpeed();{const i0=near(d.ts,S.TA);fitA(false,Math.hypot(d.X[i0],d.Y[i0],d.Z[i0]))}}")

# 2. keep the Run and Graph labels at mid widths (hide only Layout)
rep("  .grp2 .gl{display:none}", "  #runGrp .gl,#viewGrp .gl{display:inline}\n  .grp2 .gl.lay{display:none}")
rep('<div class="grp2"><span class="gl">Layout</span>', '<div class="grp2"><span class="gl lay">Layout</span>')
rep("@media (min-width:881px) and (max-width:1180px){\n", "@media (min-width:881px) and (max-width:1180px){\n  #mission{height:70px}\n")

# 3. type scale: never below 10.5 px for text that was 10.5 px or larger
h2 = h
a = h.index("<style>"); b = h.index("</style>")
css = h[a:b]
def f(m):
    n = float(m.group(1))
    return f"max(10.5px,calc({m.group(1)}px*var(--u)))" if n >= 10.5 else f"{m.group(1)}px"
css2, k = re.subn(r'calc\((\d+(?:\.\d+)?)px\*var\(--u\)\)', f, css)
print("rescaled", k)
h = h[:a] + css2 + h[b:]

# 4./8. side-panel toggle: moves to the header (early in tab order), not on phone
rep(' id="sideTog" aria-pressed="true" title="Show or hide the side panel">Side panel</button>', ' aria-hidden="true" hidden></button>')  # remove the dock copy
rep("""      <button role="tab" id="tabB" aria-selected="false" aria-controls="stage">Moon pass</button>
    </div>""", """      <button role="tab" id="tabB" aria-selected="false" aria-controls="stage">Moon pass</button>
      <button id="sideTog" class="sidetog" type="button" aria-pressed="true" title="Show or hide the side panel">Side panel</button>
    </div>""")
rep("#lead{position:absolute;", ".tabs button.sidetog{margin-left:6px;text-transform:none;letter-spacing:.02em}\n.tabs button.sidetog[aria-pressed=true]{color:var(--acc);border-color:var(--acc)}\n@media (max-width:880px){.tabs button.sidetog{display:none}}\n#lead{position:absolute;")
rep("document.addEventListener('click',e=>{if(e.target.id!=='sideTog')return;", "document.addEventListener('click',e=>{if(e.target.id!=='sideTog'||mobileQ.matches)return;")
# Key chip: taller target
rep("padding:1px 9px;font:inherit;color:var(--mute);cursor:pointer}", "padding:3px 10px;min-height:22px;font:inherit;color:var(--mute);cursor:pointer}")

# 5./6. labels: avoid the readout box, keep text inside the stage, drop crowded ring numbers instead of moving them far
rep("""    const hp=o.px*.9,wp=o.px*o.asp,sx=(_pv.x*.5+.5)*W,sy=(-_pv.y*.5+.5)*H,x0=sx-o.s.center.x*wp;
    if(x0>W||x0+wp<0||sy<-hp||sy>H+hp)continue;
    L.push({o,sx,sy,x0,x1:x0+wp,hp,pri:o.pri,dy:0})}""",
"""    const hp=o.px*.9,wp=o.px*o.asp,sx=(_pv.x*.5+.5)*W,sy=(-_pv.y*.5+.5)*H,ax=o.s.center.x;let x0=sx-ax*wp;
    if(x0>W||x0+wp<0||sy<-hp||sy>H+hp)continue;
    let dx=0;if(x0<4)dx=4-x0;else if(x0+wp>W-4)dx=W-4-(x0+wp);
    if(wp<W-8){o.s.center.x=ax-dx/wp;x0+=dx}
    L.push({o,sx,sy,x0,x1:x0+wp,hp,pri:o.pri,dy:0,ax})}""")
rep("""  const placed=[];
  const clash=""", """  const placed=[];
  { const hd=$('#hud');if(hd&&hd.offsetWidth){placed.push({x0:hd.offsetLeft-2,x1:hd.offsetLeft+hd.offsetWidth+2,y0:hd.offsetTop-2,y1:hd.offsetTop+hd.offsetHeight+2,l:null})} }
  const clash=""")
rep("""    l.dy=(okDn&&okUp)?(Math.abs(dn)<=Math.abs(up)?dn:up):okDn?dn:okUp?up:0;
    const y0=l.sy+l.dy-l.hp/2;placed.push({x0:l.x0,x1:l.x1,y0,y1:y0+l.hp,l})}""",
"""    l.dy=(okDn&&okUp)?(Math.abs(dn)<=Math.abs(up)?dn:up):okDn?dn:okUp?up:0;
    l.hide=l.pri>=4&&Math.abs(l.dy)>20;
    if(l.hide){l.dy=0;continue}
    const y0=l.sy+l.dy-l.hp/2;placed.push({x0:l.x0,x1:l.x1,y0,y1:y0+l.hp,l})}""")
rep("""  for(const l of L){const o=l.o;o.dyS+=(l.dy-o.dyS)*.35;""", """  for(const l of L){const o=l.o;o.s.material.opacity=l.hide?0:1;if(l.hide){o.dyS=0;o.s.center.y=.5;continue}o.dyS+=(l.dy-o.dyS)*.35;""")
rep("""  for(const o of sprites)if(o.lab&&!L.some(l=>l.o===o)&&o.dyS){o.dyS=0;o.s.center.y=.5}""", """  for(const o of sprites)if(o.lab&&!L.some(l=>l.o===o)){if(o.dyS){o.dyS=0;o.s.center.y=.5}o.s.material.opacity=1}""")

# 9. do not rewrite an unchanged hash
rep("function setHash(){try{const tt=S.mode==='B'?S.TB:S.TA;history.replaceState(null,'','#'+(S.mode==='B'&&FM?'fly='+FM.id:'orb='+(SG?SG.id:''))+(Number.isFinite(tt)?'&t='+Math.round(tt):'')+(S.sel.length?'&ly='+S.sel.join(','):'')+(S.colorBy!=='br'?'&pc='+S.colorBy:''))}catch(e){}}",
    "let lastHashStr='';\nfunction setHash(){try{const tt=S.mode==='B'?S.TB:S.TA,hs='#'+(S.mode==='B'&&FM?'fly='+FM.id:'orb='+(SG?SG.id:''))+(Number.isFinite(tt)?'&t='+Math.round(tt):'')+(S.sel.length?'&ly='+S.sel.join(','):'')+(S.colorBy!=='br'?'&pc='+S.colorBy:'');if(hs!==lastHashStr){lastHashStr=hs;history.replaceState(null,'',hs)}}catch(e){}}")
rep("window.__viewer={get LBL(){return LBL},", "window.__viewer={camA,camB,get LBL(){return LBL},")
open("template15.html", "w").write(h); print("template15", len(h))
