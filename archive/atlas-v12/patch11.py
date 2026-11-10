h = open("template10_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:100]!r}"
    h = h.replace(old, new)

# ---------------- 1. earlier orbits: lower and dimmer ----------------
rep("const fade=k=>.1+.6*Math.pow(.93,k-1);", "const fade=k=>.08+.4*Math.pow(.93,k-1);")

# ---------------- 2. one colour per meaning (grey only for 'position from the trajectory file') ----------------
rep("const COL={pos:0xff7a59,neg:0x5aa9ff,weak:0x8d97b0,meas:0xffb347,lit:0xb9a3ff};", "const COL={pos:0xff7a59,neg:0x5aa9ff,weak:0xa78bdb,meas:0xffb347,lit:0xb9a3ff};")
rep("const MISS=[.3,.34,.45], ZERO=[.2,.1,.3];", "const MISS=[.13,.32,.36], ZERO=[.55,.36,.2];   /* no value: dark teal; at or below the layer's range: bronze; grey is kept for trajectory-file positions */")
rep("return Math.abs(b)<.5?[.55,.6,.72]:(b>0?[1,.48,.35]:[.35,.66,1])", "return Math.abs(b)<.5?[.65,.55,.86]:(b>0?[1,.48,.35]:[.35,.66,1])")
rep("g.fillStyle=Math.abs(v)<.5?'#4b5575':(v>0?'#ff7a59':'#5aa9ff')", "g.fillStyle=Math.abs(v)<.5?'#a78bdb':(v>0?'#ff7a59':'#5aa9ff')")
rep("g.strokeStyle=(spec.kind==='br'&&v===0)?'#4b5575':'#1d2336'", "g.strokeStyle=(spec.kind==='br'&&v===0)?'#5a6a96':'#1d2336'")
rep("""<i style="border-color:#8d97b0"></i>|Br| under 0.5 nT""", """<i style="border-color:#a78bdb"></i>|Br| under 0.5 nT""")
rep("""<span><i style="border-color:#6b7799;opacity:.6"></i>earlier orbits, fading with age</span>""", """<span><i style="border-top:2px solid;border-image:linear-gradient(90deg,#ff7a59,#5aa9ff) 1;opacity:.4"></i>earlier orbits: same colours, dimmer with age</span>""")
rep("""<span><i style="border-color:#b4bccd"></i>grey: position from the trajectory file, no field data</span>""", """<span><i style="border-color:#b4bccd"></i>grey (path and dot): position from the trajectory file, nothing measured</span>""")
# distance rings and local-time ticks: steel blue instead of grey
rep("new THREE.LineBasicMaterial({color:0x6b7799,transparent:true,opacity:r%50===0?.30:.13})", "new THREE.LineBasicMaterial({color:0x4f77b8,transparent:true,opacity:r%50===0?.34:.16})")
rep("setFromPoints([new THREE.Vector3(x*q,y*q,0),new THREE.Vector3(x*q*1.06,y*q*1.06,0)]),new THREE.LineBasicMaterial({color:0x9aa4bd})", "setFromPoints([new THREE.Vector3(x*q,y*q,0),new THREE.Vector3(x*q*1.06,y*q*1.06,0)]),new THREE.LineBasicMaterial({color:0x6f95d6})")
rep("""<span class="sw" style="border-color:#4b5575"></span>Distance rings and local-time labels""", """<span class="sw" style="border-color:#4f77b8"></span>Distance rings and local-time labels""")
rep("""<span class="sw" style="border-color:#4b5575"></span>Flow, Jupiter and north axes""", """<span class="sw" style="border-color:#4f77b8"></span>Flow, Jupiter and north axes""")

# ---------------- 3. date axis on the graph ----------------
rep("function timelineNeed(W){const spec=focusSpec();return 18+60+28+extraH(spec)", "const AXH=13;\nfunction timelineNeed(W){const spec=focusSpec();return 18+60+AXH+28+extraH(spec)")
rep("const nm=extraH(spec),yT=18,yMoon=H-6-lb-24,yMag=yMoon-nm,yDist=yMag-28,hp=yDist-4-yT;", "const nm=extraH(spec),yT=18,yMoon=H-6-lb-24,yMag=yMoon-nm,yDist=yMag-28,hp=yDist-4-yT-AXH;")
rep("yCap=H-6-lb-16,yMag=yCap-nm,yDist=yMag-28,hp=yDist-4-yT;", "yCap=H-6-lb-16,yMag=yCap-nm,yDist=yMag-28,hp=yDist-4-yT-AXH;")
rep("g.fillRect(sx0,yT,Math.max(1.5,sx1-sx0),hp+4+28+nm+24)", "g.fillRect(sx0,yT,Math.max(1.5,sx1-sx0),hp+AXH+4+28+nm+24)")
rep("drawFocus(g,x0,w,yT,hp,spec,agg(fn,w,mission),ax);", "drawFocus(g,x0,w,yT,hp,spec,agg(fn,w,mission),ax);\n    axisA(g,x0,w,yT+hp,mission,T1);")
rep("const yb=yT+hp;\n", "const yb=yT+hp;axisB(g,x0,w,yb,t0,t1);\n")
rep("function drawTimeline(){", r"""/* ---- time axis: dates (UTC) for the orbit and mission views, minutes from closest approach for a moon pass ---- */
function dateTicks(t0,t1,w){const span=t1-t0;if(!(span>0))return [];const H=3600e3,D=86400e3,ppm=w/span;
  const C=[[H,'h',1],[2*H,'h',2],[3*H,'h',3],[6*H,'h',6],[12*H,'h',12],[D,'d',1],[2*D,'d',2],[5*D,'d',5],[10*D,'d',10],[20*D,'d',20],[30.4*D,'M',1],[91*D,'M',3],[182*D,'M',6],[365*D,'y',1],[730*D,'y',2]];
  let c=C.find(q=>q[0]*ppm>=64)||C[C.length-1];const out=[];
  if(c[1]==='h'||c[1]==='d'){const s=c[0];for(let t=Math.ceil(t0/s)*s;t<=t1;t+=s)out.push([t,c[1]])}
  else{const d0=new Date(t0);let y=d0.getUTCFullYear(),m=d0.getUTCMonth();for(let n=0;n<400;n++){const mm=m+n,yy=y+Math.floor(mm/12),mo=((mm%12)+12)%12;const t=Date.UTC(yy,mo,1);if(t>t1)break;if(t<t0)continue;
      if(c[1]==='M'&&mo%c[2]===0)out.push([t,'M']);if(c[1]==='y'&&mo===0&&yy%c[2]===0)out.push([t,'y'])}}
  return out}
function fmtTick(ms,type){const d=new Date(ms),p=n=>String(n).padStart(2,'0'),Y=d.getUTCFullYear(),M=p(d.getUTCMonth()+1),Dd=p(d.getUTCDate());
  if(type==='h')return d.getUTCHours()===0?`${M}-${Dd}`:`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  if(type==='d')return (d.getUTCMonth()===0&&d.getUTCDate()===1)?`${Y}-${M}-${Dd}`:`${M}-${Dd}`;
  if(type==='M')return `${Y}-${M}`;return String(Y)}
function axisA(g,x0,w,yA,mission,T1){const b0=mission?SEGS[0].t0ms:SG.t0ms,len=(mission?G:T1)*1000,t1=b0+len,tk=dateTicks(b0,t1,w);
  g.save();g.font=SFONT;g.textBaseline='middle';g.fillStyle='#8d97b0';g.strokeStyle='#4a5470';g.lineWidth=1;
  g.beginPath();g.moveTo(x0,yA+.5);g.lineTo(x0+w,yA+.5);g.stroke();
  g.textAlign='left';g.fillText('UTC',0,yA+7);
  let lastR=-1e9;tk.forEach(([t,ty])=>{const x=x0+(t-b0)/len*w;g.beginPath();g.moveTo(x+.5,yA);g.lineTo(x+.5,yA+3);g.stroke();
    const s=fmtTick(t,ty),tw=g.measureText(s).width;if(x-tw/2<lastR+6||x+tw/2>x0+w+4)return;g.textAlign='center';g.fillText(s,x,yA+8);lastR=x+tw/2});
  g.textAlign='right';g.fillText(`${fmtD(b0)} to ${fmtD(t1)}`,x0+w,8);g.restore()}
function axisB(g,x0,w,yA,t0,t1){const span=t1-t0;if(!(span>0))return;const st=[1,2,5,10,15,30,60,120,300,600,900,1800,3600,7200],s=st.find(q=>q/span*w>=56)||st[st.length-1];
  g.save();g.font=SFONT;g.textBaseline='middle';g.fillStyle='#8d97b0';g.strokeStyle='#4a5470';g.lineWidth=1;g.beginPath();g.moveTo(x0,yA+.5);g.lineTo(x0+w,yA+.5);g.stroke();
  g.textAlign='left';g.fillText('from CA',0,yA+7);g.textAlign='center';
  for(let t=Math.ceil(t0/s)*s;t<=t1;t+=s){const x=x0+(t-t0)/span*w;g.beginPath();g.moveTo(x+.5,yA);g.lineTo(x+.5,yA+3);g.stroke();
    const a=Math.abs(t),u=a===0?'0':(a<120?a+' s':(a<7200?(a/60)+' min':(a/3600)+' h'));if(x>x0+16&&x<x0+w-16)g.fillText((t<0?'−':(t>0?'+':''))+u,x,yA+8)}
  g.restore()}
function drawTimeline(){""")

# ---------------- 4. compact HUD ----------------
rep("#hud{position:absolute;left:10px;top:10px;background:rgba(10,12,19,.78);border:1px solid var(--line);border-radius:5px;padding:8px 10px;font:12px/1.55 var(--mono);pointer-events:none;max-width:calc(100% - 20px)}",
"""#hud{position:absolute;left:10px;top:10px;background:rgba(10,12,19,.78);border:1px solid var(--line);border-radius:5px;padding:6px 9px;font:11.5px/1.5 var(--mono);pointer-events:none;width:max-content;max-width:min(340px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:hidden}
#hud .hh{display:flex;gap:8px;align-items:center}
#hud .hh .t{flex:1}
#hud .chip{font:11px var(--cond);padding:0 7px;border-radius:9px;border:1px solid;white-space:nowrap}
#hud .chip.m{color:#ffb347;border-color:#ffb347}
#hud .chip.g{color:#b4bccd;border-color:#b4bccd}
#hud .chip.n{color:#ff7a59;border-color:#ff7a59}
#hud button{position:absolute;right:4px;top:3px;pointer-events:auto;background:none;border:0;color:var(--mute);cursor:pointer;font:12px var(--mono);padding:0 3px}
#hud .hh{padding-right:16px}
#hud .hg{display:grid;grid-template-columns:auto auto auto auto;gap:0 8px;justify-content:start;align-items:baseline}
#hud .hg .w2{grid-column:span 3}
#hud .hn{margin-top:3px;font-size:11px;line-height:1.4;white-space:normal}
#hud .hl{margin-top:4px;border-top:1px solid #262d42;padding-top:3px}
#hud .hlc{display:flex;gap:6px;align-items:baseline;white-space:nowrap}
#hud .hlc i{display:inline-block;width:8px;height:8px;flex:none}""")

rep(r"""function hudLayers(T){const ids=S.sel.slice();if(LIDX[S.colorBy]&&!ids.includes(S.colorBy))ids.push(S.colorBy);if(!ids.length)return '';
  return '<div style="margin-top:3px;border-top:1px solid #262d42;padding-top:3px">'+ids.map(id=>{const l=LIDX[id],q=codeAt(l.i,T);return `<div><span style="color:${S.lcol[id]||'#9aa4bd'}">&#9632;</span> <span class="k">${lname(l)}</span> <b>${fmtL(l,q)}</b></div>`}).join('')+'</div>'}""",
r"""function hudLayers(T){const ids=S.sel.slice();if(LIDX[S.colorBy]&&!ids.includes(S.colorBy))ids.push(S.colorBy);if(!ids.length)return '';
  const rows=ids.map(id=>({id,l:LIDX[id],q:codeAt(LIDX[id].i,T)})),have=rows.filter(r=>r.q>=1).length,show=rows.slice(0,4),more=rows.length-show.length;
  return `<div class="hl"><div class="k">layers: ${rows.length} on, ${have} with a value here</div>`+show.map(r=>`<div class="hlc"><i style="background:${S.lcol[r.id]||'#9aa4bd'}"></i><span class="k">${lname(r.l)}</span><b>${fmtL(r.l,r.q)}</b></div>`).join('')+(more>0?`<div class="k">+${more} more, see the graph</div>`:'')+'</div>'}
let HUDMIN=false;try{HUDMIN=localStorage.getItem('galileoAtlasHud')==='1'}catch(_){}
const setHudBtn=()=>{const b=$('#hudx');if(!b)return;b.textContent=HUDMIN?'▸':'▾';b.title=b.ariaLabel=(HUDMIN?'expand':'collapse')+' readout'};""")

old_a_start="  $('#hud').innerHTML=`<div class=\"t\">${fmtMs(ms)} UTC</div>\n<div><span class=\"k\">${pretty(SG.id)}</span> · segment"
i=h.index(old_a_start); j=h.index("  $('#clock').textContent=fmtMs(ms)+' UTC'}", i)
new_a = r"""  const stat=gap?(pos?'<span class="chip g" title="position from the PDS trajectory file; no field data at this time">○ position only</span>':'<span class="chip n" title="no position in the archive">∅ no position</span>'):'<span class="chip m" title="field data at this time">● measured</span>';
  const moonTxt=mOK&&nk?`<span class="k">nearest moon</span> ${MN(nk)} <b>${nd<1?(nd*RJKM/MBY[nk].rk).toFixed(1)+' radii':nd.toFixed(2)+' Rj'}</b>`:'<span class="k">no moon table at this time</span>';
  const fld=gap?'<div class="warnc">no field data at this time</div>':SG.novec?`<div class="hg"><span class="k">|B|</span><b class="meas">${d.B[i].toFixed(1)} nT</b></div><div class="k">field components are not in this file</div>`:`<div class="hg"><span class="k">|B|</span><b class="meas">${d.B[i].toFixed(1)} nT</b><span class="k">Br</span><b>${f1(d.Br[i])} nT</b></div><div class="hg"><span class="k">B (JSE)</span><span class="w2">${f1(d.Bx[i],0)} ${f1(d.By[i],0)} ${f1(d.Bz[i],0)} nT</span></div>`;
  const note=gap?(()=>{const n=gapNote(ms);return n?`<div class="hn k">${n}</div>`:''})():'';
  $('#hudc').innerHTML=`<div class="hh"><span class="t">${fmtMs(ms)} UTC</span>${stat}</div>`+(HUDMIN?'':`<div class="k">${pretty(SG.id)} · ${SG.idx+1}/${SEGS.length} · day ${(T/86400).toFixed(1)} of ${(SG.span/86400).toFixed(1)}</div>
<div class="hg"><span class="k">distance</span><b>${pos?R.toFixed(1):'–'} Rj</b><span class="k">lat</span><b>${pos?f1(lat)+'°':'–'}</b><span class="k">W lon</span><b>${pos?wl.toFixed(0)+'°':'–'}</b><span class="k">local time</span><b>${pos?lt.toFixed(1)+' h':'–'}</b></div>
<div>${moonTxt}</div>${fld}${note}${hudLayers(T)}`);
"""
h = h[:i] + new_a + h[j:]

old_b_start="  $('#hud').innerHTML=`<div class=\"t\">${fmtMs(ms)} UTC</div>\n<div><span class=\"k\">${f.id} · ${MN(f.moon)}</span>"
i=h.index(old_b_start); j=h.index("  $('#clock').textContent=fmtMs(ms)+' UTC'}", i)
new_b = r"""  const statB=have?'<span class="chip m" title="field sample at this time">● measured</span>':'<span class="chip n" title="no field sample at this time">∅ no field</span>';
  $('#hudc').innerHTML=`<div class="hh"><span class="t">${fmtMs(ms)} UTC</span>${statB}</div>`+(HUDMIN?'':`<div class="k">${f.id} · ${MN(f.moon)} · ${f1(T/60)} min from closest approach</div>
<div class="hg"><span class="k">distance</span><b>${r.toFixed(2)} radii</b><span class="k">altitude</span><b>${alt.toLocaleString('en-US',{maximumFractionDigits:0})} km</b></div>
${have?`<div class="hg"><span class="k">|B|</span><b class="meas">${bm.toFixed(0)} nT</b></div><div class="hg"><span class="k">Bx By Bz</span><span class="w2">${f1(bx,0)} ${f1(by,0)} ${f1(bz,0)} nT</span></div>`:`<div class="warnc">${f.nf?'no field sample at this time':'no field samples for this pass'}</div>`}${hudLayers(T)}`);
"""
h = h[:i] + new_b + h[j:]
rep("window.__viewer={S,jump,", "$('#hud').addEventListener('click',e=>{if(e.target.id!=='hudx')return;HUDMIN=!HUDMIN;try{localStorage.setItem('galileoAtlasHud',HUDMIN?'1':'0')}catch(_){}setHudBtn();if(S.mode==='A')updateA();else updateB()});setHudBtn();\nwindow.__viewer={S,jump,")
rep('<div id="hud" aria-live="off"></div>', '<div id="hud" aria-live="off"><button id="hudx" type="button"></button><div id="hudc"></div></div>')
open("template11.html", "w").write(h); print("template11", len(h))
