#!/usr/bin/env python3
"""Inline data/probe_pack.json (+ HAD row and caveat list) into probe_descent.html."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(D, 'data/probe_pack.json')))
# HAD.TAB single data row, copied from the file (bytes 7281-7360): "0.157 0.004 0.136 0.003 0.238 0.005 0.234 0.006"
P['had'] = [["ABUNDANCE RATIO (He/H2 number density)", "0.157", "0.004"],
            ["HELIUM MOLE FRACTION", "0.136", "0.003"],
            ["HELIUM MASS RATIO (He/(He+H2) mass density)", "0.238", "0.005"],
            ["HELIUM MASS FRACTION (assumes 1.9% heavy elements, per label)", "0.234", "0.006"]]
P['caveats'] = [
 "Instruments disagree slightly and are NOT reconciled here: at equal time-from-MF0 the ASI LOWERATM, ASI DESCENT and NEP PTZ pressures agree to about 1% (e.g. t = 1000 s: 4.160, 4.142, 4.162 bar), altitudes to about 0.5–2 km (t = 3000 s: -115.8, -117.9, -117.4 km).",
 "ASI UPPERATM (MF0 base, shifted by 167.213 s) vs DWE PROBETRJ (entry base) altitude at the same entry time: 457.5 vs 450.3 km at t = 0 s, 141.6 vs 135.3 km at 50 s, 56.1 vs 56.8 km at 100 s, 23.9 vs 25.0 km at 166 s.",
 "LOWERATM.LBL has no description of its TIME zero point. It is drawn on the MF0 base; its pressures track DESCENT and NEP PTZ (MF0-based by their labels) to about 1%, which is consistent with but does not prove that base.",
 "UPPERATM.LBL START_TIME/STOP_TIME (22:01:44 to 22:05:44) do not equal MF0-240 s to MF0 in UT (22:03:31 to 22:07:31). They equal the entry epoch in ET minus 240 s to entry in ET (TIMES.TXT entry ET 22:05:44.936). The table's own TIME column (from MF0) is used, not the label times.",
 "TIMES.TXT entry in ET is 22:05:44.936; PROBETRJ.LBL gives the entry epoch as 1995-341T22:05:44.9531 ET, 0.017 s later. Not corrected.",
 "RESID.TAB pressure differs from WIND.TAB pressure at 11 of 5043 rows with identical times (e.g. row 2979, t = 2212.667 s: RESID 19.58 bar, WIND 10.0096 bar; row 4993: RESID 29.44 vs WIND 20.0094). Pressure is taken from WIND.TAB on this page; RESID is only used for altitude.",
 "PROBETRJ rows for 105 s and 2186 s are missing and the 167 s row is at 167.106 s (PROBETRJ.LBL).",
 "NEP cross-section and scatter tables have negative values (baseline). They are plotted as given, on a linear axis. Fill -9.999 is dropped.",
 "DESCENT dz/dt and dT/dz are -999.99 fill in the first rows; those rows are dropped for those quantities only.",
 "NFR TCNF has no UNIT keyword; the unit W/m^2 is taken from each column's DESCRIPTION string.",
]
html = open(os.path.join(D, 'probe_template.html')).read()
s = json.dumps(P, separators=(',', ':')).replace('</', '<\\/')
out = html.replace('__PACK__', s)
open(os.path.join(D, 'probe_descent.html'), 'w').write(out)
print('probe_descent.html', len(out))
