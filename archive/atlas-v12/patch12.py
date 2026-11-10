h = open("template11_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:100]!r}"
    h = h.replace(old, new)

# --- earlier orbits: faint but still findable; notes text made accurate
rep("const fade=k=>.08+.4*Math.pow(.93,k-1);", "const fade=k=>.12+.36*Math.pow(.93,k-1);")
rep("(the oldest fade to a fixed minimum so they stay visible)", "(the oldest fade to a fixed, faint minimum)")
# --- weak-Br violet: darker, so it separates from negative Br under red-green colour blindness
rep("weak:0xa78bdb", "weak:0x7861ad")
rep("return Math.abs(b)<.5?[.65,.55,.86]:", "return Math.abs(b)<.5?[.47,.38,.68]:")
rep("g.fillStyle=Math.abs(v)<.5?'#a78bdb':", "g.fillStyle=Math.abs(v)<.5?'#7861ad':")
rep("""<i style="border-color:#a78bdb"></i>|Br| under 0.5 nT</span>'""", """<i style="border-color:#7861ad"></i>|Br| under 0.5 nT</span>'+(SG&&SG.novec?'<span><i style="border-color:'+rgbCss(MISS)+'"></i>Br not in this file</span>':'')""")
rep("function updateA(){if(!SD)return;const T=S.TA,d=SD;", "let LEG_NV=null;\nfunction updateA(){if(!SD)return;const T=S.TA,d=SD;if(LEG_NV!==!!SG.novec){LEG_NV=!!SG.novec;legend()}")
# --- first-sample gap rule respects the gap limit
rep("gap=Math.abs(d.ts[i]-T)>d.gap||T>d.ts[d.ts.length-1]||T<d.ts[0],", "gap=Math.abs(d.ts[i]-T)>d.gap||T>d.ts[d.ts.length-1]||(T<d.ts[0]&&d.ts[0]-T>d.gap),")
# --- date axis: calendar-aligned day ticks, year on the first tick, no range text on narrow graphs
rep("if(c[1]==='h'||c[1]==='d'){const s=c[0];for(let t=Math.ceil(t0/s)*s;t<=t1;t+=s)out.push([t,c[1]])}",
"""if(c[1]==='h'){const s=c[0];for(let t=Math.ceil(t0/s)*s;t<=t1;t+=s)out.push([t,'h'])}
  else if(c[1]==='d'){const n=c[2],d0=new Date(t0),b=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth(),d0.getUTCDate());
    for(let t=b;t<=t1;t+=D){if(t<t0)continue;const dom=new Date(t).getUTCDate(),nx=new Date(t+D).getUTCDate();if(n===1||((dom-1)%n===0&&nx!==1))out.push([t,'d'])}}""")
rep("function fmtTick(ms,type){", "function fmtTick(ms,type,first){")
rep("if(type==='d')return (d.getUTCMonth()===0&&d.getUTCDate()===1)?", "if(type==='d')return (first||(d.getUTCMonth()===0&&d.getUTCDate()===1))?")
rep("let lastR=-1e9;tk.forEach(([t,ty])=>{", "let lastR=-1e9;tk.forEach(([t,ty],k)=>{")
rep("const s=fmtTick(t,ty),tw=g.measureText(s).width;", "const s=fmtTick(t,ty,k===0),tw=g.measureText(s).width;")
rep("g.textAlign='right';g.fillText(`${fmtD(b0)} to ${fmtD(t1)}`,x0+w,8);g.restore()}", "if(w>520){g.textAlign='right';g.fillText(`${fmtD(b0)} to ${fmtD(t1)}`,x0+w,8)}g.restore()}")

# --- readout: room for the legend, bigger button, reachable chip hints, more symbols and aggregates
rep("max-height:calc(100% - 20px);overflow:hidden}", "max-height:calc(100% - 20px - var(--legendH,0px));overflow:hidden}")
rep("#hud .chip{font:11px var(--cond);", "#hud .chip{pointer-events:auto;font:11px var(--cond);")
rep("#hud button{position:absolute;right:4px;top:3px;pointer-events:auto;background:none;border:0;color:var(--mute);cursor:pointer;font:12px var(--mono);padding:0 3px}\n#hud .hh{padding-right:16px}",
    "#hud button{position:absolute;right:0;top:0;pointer-events:auto;background:none;border:0;color:var(--mute);cursor:pointer;font:13px var(--mono);padding:4px 8px;min-width:26px;min-height:26px}\n#hud .hh{padding-right:22px}\n#hud .sq{display:inline-block;width:7px;height:7px;margin-left:3px;box-sizing:border-box}\n#hud .pr{white-space:nowrap}")
rep("function legend(){$('#legend').innerHTML=", "function hudFit(){const l=$('#legend'),hd=$('#hud');if(l&&hd)hd.style.setProperty('--legendH',(l.offsetHeight+10)+'px')}\nfunction legend(){legend0();hudFit()}\nfunction legend0(){$('#legend').innerHTML=")
rep("sprites.forEach(sizeSprite);drawTimeline();drawMission()}", "sprites.forEach(sizeSprite);hudFit();drawTimeline();drawMission()}")
# layer block: header with one square per layer, rows only when the stage is tall enough
rep("""const rows=ids.map(id=>({id,l:LIDX[id],q:codeAt(LIDX[id].i,T)})),have=rows.filter(r=>r.q>=1).length,show=rows.slice(0,4),more=rows.length-show.length;
  return `<div class="hl"><div class="k">layers: ${rows.length} on, ${have} with a value here</div>`+show.map(""",
"""const rows=ids.map(id=>({id,l:LIDX[id],q:codeAt(LIDX[id].i,T)})),have=rows.filter(r=>r.q>=1).length,tall=$('#stage').clientHeight>=300,show=tall?rows.slice(0,4):[],more=rows.length-show.length;
  const sq=rows.map(r=>{const c=S.lcol[r.id]||'#9aa4bd';return `<i class="sq" style="${r.q>=1?'background:'+c:'border:1px solid '+c}"></i>`}).join('');
  return `<div class="hl"><div class="k">layers: ${rows.length} on, ${have} with a value here ${sq}</div>`+show.map(""")
rep("(more>0?`<div class=\"k\">+${more} more, see the graph</div>`:'')", "(more>0&&tall?`<div class=\"k\">+${more} more, see the graph</div>`:'')")
# instrument presence glyphs
rep("function hudLayers(T){", """const GC={};
function grpGlyph(g,T){const ls=LAYERS.filter(l=>l.grp===g&&SL[l.i]);if(!ls.length)return '∅';const key=SG.id+g;if(!(key in GC)){let c=0;const n=SD.ts.length;for(let i=0;i<n&&!c;i++)for(const l of ls)if(SL[l.i][i]>0){c=1;break}GC[key]=c}
  if(!GC[key])return '∅';return ls.some(l=>codeA(l.i,T)>=1)?'●':'○'}
function hudLayers(T){""")
rep("""radii':nd.toFixed(2)+' Rj'}</b>`:'<span class="k">no moon table at this time</span>';""", """radii':nd.toFixed(2)+' Rj'}</b> <span class="k">(${SG.tbl.some(([a,b])=>T>=a&&T<=b)?'table':'interpolated'})</span>`:'<span class="k">no moon table at this time</span>';""")
rep("const note=gap?(()=>{const n=gapNote(ms);return n?`<div class=\"hn k\">${n}</div>`:''})():'';", "const note=gap?`<div class=\"k\">${pos?'position from the PDS trajectory file':'no position in the archive'}</div>`+(()=>{const n=gapNote(ms);return n?`<div class=\"hn k\">${n}</div>`:''})():'';\n  const pres=`<div class=\"k pr\">MAG ${gap?'○':'●'} ${['EPD','PLS','PWS','HIC','DDS'].map(g=>g+' '+grpGlyph(g,T)).join(' ')}</div>`;")
rep("""<div class="k">${pretty(SG.id)} · ${SG.idx+1}/${SEGS.length} · day ${(T/86400).toFixed(1)} of ${(SG.span/86400).toFixed(1)}</div>""", """<div class="k">${pretty(SG.id)} · ${SG.idx+1}/${SEGS.length} · day ${(T/86400).toFixed(1)} of ${(SG.span/86400).toFixed(1)}${gap?'':' · <span style="white-space:nowrap">nearest sample '+Math.abs(d.ts[i]-T).toFixed(0)+' s</span>'}</div>""")
rep("<div>${moonTxt}</div>${fld}${note}${hudLayers(T)}", "<div>${moonTxt}</div>${fld}${note}${pres}${hudLayers(T)}")
# notes: key for the presence glyphs
rep("""<li><b class="meas">Run:</b>""", """<li><b>Readout symbols:</b> ● measured or has a value at this time; ○ no field data here (position only) or the segment has values but none at this time; ∅ nothing in this segment or no position in the archive. Instrument letters show whether that instrument has a value at the current time. Each small square under "layers" is one ticked layer, filled when it has a value here.</li>
        <li><b class="meas">Run:</b>""")
open("template12.html", "w").write(h); print("template12", len(h))
