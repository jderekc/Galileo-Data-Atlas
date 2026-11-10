h = open("template12_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:100]!r}"
    h = h.replace(old, new)

# R4: status chips inert
rep("#hud .chip{pointer-events:auto;font:11px var(--cond);", "#hud .chip{pointer-events:auto;cursor:default;font:11px var(--cond);")
rep(".chip:hover{border-color:#3a4466}", ".chip:hover{border-color:#3a4466}\n#hud .chip:hover{border-color:inherit}")
rep("#hud .chip.m{color:#ffb347;border-color:#ffb347}", "#hud .chip.m{color:#ffb347;border-color:#ffb347}\n#hud .chip.m:hover{border-color:#ffb347}#hud .chip.g:hover{border-color:#b4bccd}#hud .chip.n:hover{border-color:#ff7a59}")

# R1/R2: tag droppable lines, own line for nearest sample, drop whole lines by priority rather than clip
rep("""${gap?'':' · <span style="white-space:nowrap">nearest sample '+Math.abs(d.ts[i]-T).toFixed(0)+' s</span>'}</div>""", """</div>${gap?'':'<div class="k ns">nearest field sample '+Math.abs(d.ts[i]-T).toFixed(0)+' s away</div>'}""")
rep("""<div class="hg"><span class="k">B (JSE)</span>""", """<div class="hg bj"><span class="k">B (JSE)</span>""")
rep("""<div>${moonTxt}</div>${fld}${note}${pres}${hudLayers(T)}`);""", """<div class="mn">${moonTxt}</div>${fld}${note}${pres}${hudLayers(T)}`);
  hudLines();""")
rep("function hudFit(){", """function hudLines(){const hd=$('#hud'),c=$('#hudc');if(!hd||!c)return;let n=0,tg=null;
  for(const sel of ['.hl','.pr','.ns','.bj','.mn']){if(hd.scrollHeight<=hd.clientHeight+1)break;const e=c.querySelector(sel);if(!e)continue;e.remove();n++;
    if(!tg){const k=c.querySelector('.hh+.k');if(k){tg=document.createElement('span');tg.style.whiteSpace='nowrap';k.appendChild(tg)}}
    if(tg){tg.textContent=' · +'+n+' more';tg.title=n+' line'+(n>1?'s':'')+' not shown: the panel is too short'}}
}
function hudFit(){""")

# R3: wording stays within what the atlas carries
rep("""<li><b>Readout symbols:</b> ● measured or has a value at this time; ○ no field data here (position only) or the segment has values but none at this time; ∅ nothing in this segment or no position in the archive. Instrument letters show whether that instrument has a value at the current time. Each small square under "layers" is one ticked layer, filled when it has a value here.</li>""",
"""<li><b>Readout symbols:</b> the atlas carries values on the field file's own time grid. Status: ● the cursor is at a point of that grid; ○ no point of that grid here (position only); ∅ no position in the archive. Instrument letters: ● a value at this grid point (a coded zero counts as a value); ○ no value at this grid point; ∅ no values for that instrument anywhere in this segment's points. These describe what the atlas carries, not what each instrument's own files contain. Each small square under "layers" is one ticked layer, filled when it has a value here.</li>""")
open("template13.html", "w").write(h); print("template13", len(h))
