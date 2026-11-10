#!/usr/bin/env python3
"""Inline three.js r147, OrbitControls, data/attitude_pack.json, data/burnwin_pack.json, data/burn_events.json into attitude_model.html."""
import os
D=os.path.dirname(os.path.abspath(__file__)); V=os.path.join(D,'..','viewer','npm','node_modules','three')
r=lambda p:open(p).read()
h=r(os.path.join(D,'attitude_template.html'))
esc=lambda s:s.replace('</script','<\\/script')
for k,v in [('__THREE__',esc(r(os.path.join(V,'build','three.min.js')))),('__ORBIT__',esc(r(os.path.join(V,'examples','js','controls','OrbitControls.js')))),
            ('__ATT__',esc(r(os.path.join(D,'data','attitude_pack.json')))),('__BURNWIN__',esc(r(os.path.join(D,'data','burnwin_pack.json')))),('__BURNS__',esc(r(os.path.join(D,'data','burn_events.json'))))]:
    assert h.count(k)==1,k; h=h.replace(k,lambda m=None,v=v:v) if False else h.replace(k,v)
open(os.path.join(D,'attitude_model.html'),'w').write(h); print('attitude_model.html',len(h))
