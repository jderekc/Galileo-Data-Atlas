#!/usr/bin/env python3
"""Inline data/moons_pack.json (+ selected GP_0001 columns from ../prototype/data/probe_pack.json) into moons_template.html -> moons_viewer.html"""
import json, os
D=os.path.dirname(os.path.abspath(__file__))
P=json.load(open(os.path.join(D,'data/moons_pack.json')))
PP=json.load(open(os.path.join(D,'../prototype/data/probe_pack.json')))['tables']
def col(tab,name):
    t=PP[tab]; i=[c['name'] for c in t['columns']].index(name); return t['data'][i]
r=lambda v,n: None if v is None else round(v,n)
X={}
# ASI DESCENT.TAB: time from MF0, dz/dt (M/S, 'Descent velocity'; -999.99 fill -> null in the pack)
X['descent']=dict(file='GP_0001/DATA/ASI/DESCENT.TAB',sha=PP['DESCENT']['sha256'],t=col('DESCENT','TIME'),dzdt=col('DESCENT','dz/dt'),note='label: profiles derived using the dry adiabat which fits the data; dz/dt = Descent velocity (M/S); -999.99 fill rows are null')
# DWE ASI2REF.TAB: time from MF0, altitude, radial velocity (M/SEC)
X['asi2ref']=dict(file='GP_0001/DATA/DWE/ASI2REF.TAB',sha=PP['ASI2REF']['sha256'],t=col('ASI2REF','TIME FROM MINOR FRAME ZERO'),alt=col('ASI2REF','ALTITUDE'),rv=col('ASI2REF','RADIAL VELOCITY'))
# ASI UPPERATM.TAB: time from MF0, V_REL (KM/S), FPA (DEGREES), pressure (mbar), altitude
X['upper']=dict(file='GP_0001/DATA/ASI/UPPERATM.TAB',sha=PP['UPPERATM']['sha256'],t=col('UPPERATM','TIME'),vrel=col('UPPERATM','V_REL'),fpa=col('UPPERATM','FPA'),p_mbar=col('UPPERATM','PRESSURE'),alt=col('UPPERATM','ALTITUDE'))
# DWE WIND.TAB every 4th row: time from entry, pressure (bar), wind (m/s)
w=PP['WIND']; wt=col('WIND','TIME FROM ENTRY'); wp=col('WIND','PRESSURE'); ww=col('WIND','WIND')
X['wind']=dict(file='GP_0001/DATA/DWE/WIND.TAB',sha=w['sha256'],rows_total=len(wt),step=4,t=[r(x,3) for x in wt[::4]],p=[r(x,4) for x in wp[::4]],wind=[r(x,2) for x in ww[::4]])
# NEP XSEC22.TAB: pressure (bar), 5.8 deg and 40 deg cross sections (m^-1 sr^-1), fills null
X['xsec22']=dict(file='GP_0001/DATA/NEP/XSEC22.TAB',sha=PP['XSEC22']['sha256'],p=col('XSEC22','ATMOSPHERIC PRESSURE'),c5=col('XSEC22','M5.8 CROSS SECTION'),c40=col('XSEC22','M40 CROSS SECTION'))
# NFR TCNF.TAB: time from MF0, channels A (thermal 3-200 um), B (solar 0.3-3.5 um), E (solar 0.6-3.5 um) net fluxes W/m^2
X['tcnf']=dict(file='GP_0001/DATA/NFR/FLUXES/TCNF.TAB',sha=PP['TCNF']['sha256'],t=col('TCNF','TIME'),A=col('TCNF','A_TCNF'),B=col('TCNF','B_TCNF'),E=col('TCNF','E_TCNF'))
P['probe']['extra']=X
# single source of truth for radii
P['bodies']=json.load(open(os.path.join(D,'data/bodies.json')))
html=open(os.path.join(D,'moons_template.html')).read()
s=json.dumps(P,separators=(',',':')).replace('</','<\\/')
out=html.replace('__PACK__',s)
open(os.path.join(D,'moons_viewer.html'),'w').write(out)
print('moons_viewer.html',len(out),'bytes; extra rows:',{k:len(v['t'] if 't' in v else v['p']) for k,v in X.items()})
