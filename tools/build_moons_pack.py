#!/usr/bin/env python3
"""Builds data/moons_pack.json for the moons/craft prototype from the local PDS volumes.

Everything numeric in the pack is read from a PDS file named next to it; frame
transformations are verified against independent columns of the same volumes
and the residuals are written into the pack (pack['checks']).

Frames (all right-handed):
  EME50  : as in GP_0001 PROBETRJ.TAB / ORBTRTRJ.TAB and GOMW ROTATT*.TAB
  S3     : System III (1965) Cartesian.  Z = Jovian pole unit vector (PROBETRJ.LBL),
           X = prime-meridian unit vector at the probe-entry epoch (PROBETRJ.LBL)
           rotated about Z by 360 deg / 9.92492104 h (PROBETRJ.LBL) per elapsed time.
           West longitude = -atan2(y, x).
  JSE    : azimuth = psi(t) - west longitude, psi(t) fitted per scene from the
           JUPCRDS files (psi = atan2(JSE_Y, JSE_X) + S3_WLON of the same row).
  JSM    : Sun direction in JSE = (cos b, 0, sin b), b fitted per orbit from JUPCRDS
           (JSM_X = JSE_X cos b + JSE_Z sin b).
"""
import os, re, json, glob, hashlib, datetime as dt
import numpy as np

HOME = os.environ['HOME']
ROOT = os.path.join(HOME, 'mnt/Desktop/Galileo - Jovian Magnetospheric Data/PDS_Galileo')
VB = os.path.join(HOME, 'mnt/Desktop/Galileo - Jovian Magnetospheric Data/viewer_build')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'moons_pack.json')
RJ = 71492.0
D2R = np.pi / 180

def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]
def tp(s):
    s = s.strip().rstrip('Z')
    return dt.datetime.strptime(s[:23], '%Y-%m-%dT%H:%M:%S.%f').replace(tzinfo=dt.timezone.utc).timestamp()
def iso(t): return dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:23]
def wrap(a): return (np.asarray(a) + 180) % 360 - 180
def unit(v): v = np.asarray(v, float); return v / np.linalg.norm(v, axis=-1, keepdims=True)
def ang(a, b): return np.degrees(np.arccos(np.clip(np.sum(unit(a) * unit(b), axis=-1), -1, 1)))
def rel(p): return os.path.relpath(p, ROOT)

# ---------------------------------------------------------------- constants from PROBETRJ.LBL
lbl = open(os.path.join(ROOT, 'GP_0001/DATA/DWE/PROBETRJ.LBL'), errors='replace').read().replace('\r', '')
def after(key, n=3):
    i = lbl.index(key); return [float(x) for x in lbl[i + len(key):].split()[:n]]
POLE = unit(after('JOVIAN UNIT POLE VECTOR (X,Y,Z)'))
PM0 = np.array(after('AND THE JOVIAN EQUATOR IN EME50 AT THE EPOCH OF PROBE ENTRY (X,Y,Z)'))
PERIOD_H = after('PLANET ROTATION PERIOD, HRS', 1)[0]
R1BAR = after('JOVIAN 1-BAR RADIUS, KM', 1)[0]
GM_J, J2, J4 = after('GRAVITATIONAL CONSTANTS GM (KM3/SEC2), J2, J4', 3)
ENTRY_ET_STR = re.search(r'EPOCH OF PROBE ENTRY IN E\.T\. \(YEAR, DAY OF YEAR, HHMMSS\.SSSS\)=\s*(\d+),\s*(\d+),\s*([\d.]+)', lbl)
yr, doy, hms = int(ENTRY_ET_STR.group(1)), int(ENTRY_ET_STR.group(2)), ENTRY_ET_STR.group(3)
hh, mm, ss = int(hms[0:2]), int(hms[2:4]), float(hms[4:])
ENTRY_ET = (dt.datetime(yr, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(days=doy - 1, hours=hh, minutes=mm, seconds=ss)).timestamp()
times = open(os.path.join(ROOT, 'GP_0001/DOCUMENT/TIMES.TXT'), errors='replace').read().replace('\r', '')
ET_MINUS_UT = float(re.search(r'Conversion from UT to ET =\s*([\d.]+)', times).group(1))
ENTRY_UT = tp('1995-12-07T22:04:43.752')          # TIMES.TXT (day 341, 22:04:43.752 UT)
MF0_AFTER_ENTRY = float(re.search(r'MF0 occurs\s+([\d.]+)', times).group(1))
LOCK_AFTER_ENTRY = float(re.search(r'Link lockup occurs\s+([\d.]+)', times).group(1))
assert abs((ENTRY_ET - ET_MINUS_UT) - ENTRY_UT) < 0.05, (ENTRY_ET - ET_MINUS_UT - ENTRY_UT)
PMperp = PM0 - POLE * (PM0 @ POLE); PM_ORTHO_DEG = ang(PM0, PMperp); PM0 = unit(PMperp)
OMEGA_DEG_S = 360.0 / (PERIOD_H * 3600)

# ---------------------------------------------------------------- frame chain
def s3_basis(t_ut):
    """X(t), Y(t) of the S3 Cartesian frame in EME50 at UT time t (seconds)."""
    th = OMEGA_DEG_S * ((t_ut + ET_MINUS_UT) - ENTRY_ET) * D2R
    X = PM0 * np.cos(th) + np.cross(POLE, PM0) * np.sin(th)
    return X, np.cross(POLE, X)
def eme_to_s3(v, t_ut):
    v = np.atleast_2d(v); t = np.atleast_1d(t_ut)
    out = np.empty_like(v)
    for i in range(len(v)):
        X, Y = s3_basis(t[i] if len(t) > 1 else t[0]); out[i] = [v[i] @ X, v[i] @ Y, v[i] @ POLE]
    return out
def s3_sph(v):   # -> R, lat (deg), west lon (deg)
    v = np.atleast_2d(v); R = np.linalg.norm(v, axis=1)
    return R, np.degrees(np.arcsin(v[:, 2] / R)), (-np.degrees(np.arctan2(v[:, 1], v[:, 0]))) % 360
def jse_from_sph(R, lat, az):
    la, a = np.radians(lat), np.radians(az)
    return np.column_stack([R * np.cos(la) * np.cos(a), R * np.cos(la) * np.sin(a), R * np.sin(la)])

# ---------------------------------------------------------------- readers
def read_jupcrds(path):
    rows = [l for l in open(path, errors='replace').read().splitlines() if l.strip()]
    t = np.array([tp(l[:23]) for l in rows]); v = np.array([[float(x) for x in l[24:].split()] for l in rows])
    return dict(t=t, R=v[:, 0], lat=v[:, 1], wl=v[:, 2], jse=v[:, 3:6], jsm=v[:, 6:9], lh=v[:, 9], mlh=v[:, 10] if v.shape[1] > 10 else None)
def read_moons(path):
    rows = [l for l in open(path, errors='replace').read().splitlines() if l.strip()]
    t = np.array([tp(l[:24]) for l in rows]); v = np.array([[float(x) for x in l[25:].split()] for l in rows])
    m = {}
    for i, k in enumerate(['IO', 'EUROPA', 'GANYMEDE', 'CALLISTO']):
        c = 5 + 5 * i; m[k] = dict(R=v[:, c], lat=v[:, c + 1], wl=v[:, c + 2], sph=v[:, c + 3], eph=v[:, c + 4])
    return dict(t=t, gll=dict(R=v[:, 0], lat=v[:, 1], wl=v[:, 2], sph=v[:, 3], eph=v[:, 4]), moons=m)
def read_rotatt(path):
    rows = open(path, errors='replace').read().splitlines()
    t = np.array([tp(l[:23]) for l in rows]); A = np.array([[float(l[a - 1:a - 1 + 8]) for a in (45, 54, 63, 72, 81, 90, 99, 108, 117, 126, 135, 144, 153)] for l in rows])
    return dict(t=t, ra=A[:, 0], dec=A[:, 1], twist=A[:, 2], spin=A[:, 3], M=A[:, 4:].reshape(-1, 3, 3))
def read_crds(path):
    rows = [l for l in open(path, errors='replace').read().splitlines() if l.strip()]
    t = np.array([tp(l[:23]) for l in rows]); v = np.array([[float(x) for x in l[24:].split()] for l in rows])
    return dict(t=t, R=v[:, 0], lat=v[:, 1], elon=v[:, 2], xyz=v[:, 3:6])

def fit_psi(J, t_c, half_days=5.0):
    sel = np.abs(J['t'] - t_c) <= half_days * 86400
    if sel.sum() < 10: sel = np.argsort(np.abs(J['t'] - t_c))[:200]
    t = J['t'][sel]; psi = np.degrees(np.unwrap(np.radians(np.degrees(np.arctan2(J['jse'][sel, 1], J['jse'][sel, 0])) + J['wl'][sel])))
    A = np.column_stack([np.ones_like(t), (t - t_c) / 86400]); c, *_ = np.linalg.lstsq(A, psi, rcond=None)
    r = wrap(psi - A @ c)
    return dict(t_ref_utc=iso(t_c), psi0_deg=float(c[0] % 360), rate_deg_per_day=float(c[1]), n=int(sel.sum()), window_days=[float((t[0] - t_c) / 86400), float((t[-1] - t_c) / 86400)], resid_med_deg=float(np.median(np.abs(r))), resid_max_deg=float(np.abs(r).max()))
def psi_at(P, t): return P['psi0_deg'] + P['rate_deg_per_day'] * (t - tp(P['t_ref_utc'])) / 86400
def fit_beta(J, t_c=None, half_days=None):
    if t_c is not None:
        sel = np.abs(J['t'] - t_c) <= half_days * 86400
        if sel.sum() < 10: sel = np.argsort(np.abs(J['t'] - t_c))[:200]
        J = dict(t=J['t'][sel], jse=J['jse'][sel], jsm=J['jsm'][sel])
    X = np.c_[J['jse'][:, 0], J['jse'][:, 2]]; cb, sb = np.linalg.lstsq(X, J['jsm'][:, 0], rcond=None)[0]
    b = np.degrees(np.arctan2(sb, cb)); rr = J['jsm'][:, 0] - X @ np.array([np.cos(np.radians(b)), np.sin(np.radians(b))])
    return dict(beta_deg=float(b), norm_ab=float(np.hypot(cb, sb)), resid_med_Rj=float(np.median(np.abs(rr))), resid_max_Rj=float(np.abs(rr).max()), n=int(len(rr)), jsm_minus_jse_norm_max_Rj=float(np.abs(np.linalg.norm(J['jsm'], axis=1) - np.linalg.norm(J['jse'], axis=1)).max()))

def interp_ang(tq, t, a): return np.interp(tq, t, np.degrees(np.unwrap(np.radians(a))))

# ---------------------------------------------------------------- catalogues
JUP = {int(re.search(r'ORB_(\d+)_', p).group(1)): p for p in glob.glob(ROOT + '/GOMW_500*/DATA/TRAJECT/SURVEY/ORB_*_GLL_JUPCRDS.TAB')}
MOON = {int(re.search(r'ORB_(\d+)\.', p).group(1)): p for p in glob.glob(ROOT + '/GOMW_500*/GEOMETRY/MOON_TRAJECTORIES/MOONS_TRAJ_ORB_*.TAB')}
ROT = {int(re.search(r'ROTATT(\d+)\.', p).group(1)): p for p in glob.glob(ROOT + '/GOMW_500*/GEOMETRY/ROTOR_ATTITUDE/ROTATT*.TAB')}
CRDS = sorted(glob.glob(ROOT + '/GOMW_500*/DATA/TRAJECT/SATELLITES/*/ORB_*_GLL_*CRDS.TAB'))
MOONKEY = {'IO': 'IO', 'EUROPA': 'EUROPA', 'GANYMEDE': 'GANYMEDE', 'CALLISTO': 'CALLISTO', 'AMALTHEA': 'AMALTHEA'}
LET = {'IO': 'I', 'EUROPA': 'E', 'GANYMEDE': 'G', 'CALLISTO': 'C', 'AMALTHEA': 'A'}
MK4 = ['IO', 'EUROPA', 'GANYMEDE', 'CALLISTO']

# moon radii as stated in the flyby trajectory labels (DESCRIPTION text), plus the atlas values
def label_radius(p):
    t = open(p[:-4] + '.LBL', errors='replace').read().replace('\r', '')
    m = re.search(r'radii \((R[A-Z]*) = ([\d.]+) km\)', t)
    return (m.group(1), float(m.group(2)), m.group(0)) if m else None
RADII = {}
for p in CRDS:
    k = p.split('/')[-2]; r = label_radius(p)
    if r: RADII.setdefault(k, []).append((rel(p)[:-4] + '.LBL', r))
ATLAS = {m['key']: m for m in json.load(open(os.path.join(VB, 'mission_pack_v6.json')))['moons']}
moons_out = []
for k in MK4 + ['AMALTHEA']:
    lst = RADII.get(k, [])
    vals = sorted(set(r[1][1] for r in lst))
    moons_out.append(dict(key=k, name=ATLAS[k]['name'], rk_pds_km=vals[0] if vals else None, rk_pds_quote=lst[0][1][2] if lst else None, rk_pds_label=lst[0][0] if lst else None,
                          rk_pds_labels_with_statement=len(lst), rk_pds_distinct_values=vals, rk_atlas_km=ATLAS[k]['rk'], P_atlas_days=ATLAS[k]['P'], R_atlas_Rj=ATLAS[k]['R']))
# note: every CRDS label also contains the sentence 'where RI = 1818 km' in the R column description (copied Io text)
IO_TEXT_IN_ALL = sum(1 for p in CRDS if 'RI = 1818 km' in open(p[:-4] + '.LBL', errors='replace').read())

checks = {}
checks['pm0_orthogonality_to_pole_deg'] = float(PM_ORTHO_DEG)
checks['entry_ET_minus_ETmUT_minus_TIMES_entry_UT_s'] = float(ENTRY_ET - ET_MINUS_UT - ENTRY_UT)

# ---------------------------------------------------------------- 1. EME50->S3 and ->JSE chain check with ROTATT (radial unit vector) vs JUPCRDS
chain = []
for orb in sorted(set(ROT) & set(JUP)):
    Rt = read_rotatt(ROT[orb]); J = read_jupcrds(JUP[orb])
    idx = np.searchsorted(Rt['t'], J['t']).clip(1, len(Rt['t']) - 1); idx = np.where(abs(Rt['t'][idx - 1] - J['t']) < abs(Rt['t'][idx] - J['t']), idx - 1, idx)
    ok = abs(Rt['t'][idx] - J['t']) <= 2.0
    if ok.sum() < 20: continue
    iJ = np.where(ok)[0]; iR = idx[ok]
    r1 = Rt['M'][iR, 0]                                   # radial unit vector in EME50 (per label: row 1 = Radial)
    s3 = eme_to_s3(r1, J['t'][iJ]); R_, lat_, wl_ = s3_sph(s3)
    dlat = lat_ - J['lat'][iJ]; dwl = wrap(wl_ - J['wl'][iJ])
    P = fit_psi(J, float(np.median(J['t'][iJ])), half_days=1e9)       # whole-orbit fit for this check
    az = psi_at(P, J['t'][iJ]) - wl_
    jse = jse_from_sph(J['R'][iJ], lat_, az); dang = ang(jse, J['jse'][iJ])
    chain.append(dict(orb=orb, n=int(ok.sum()), dt_max_s=float(abs(Rt['t'][iR] - J['t'][iJ]).max()),
                      lat_resid_deg=[float(np.median(abs(dlat))), float(abs(dlat).max())], wlon_resid_deg=[float(np.median(abs(dwl))), float(abs(dwl).max())],
                      psi_fit=P, jse_dir_resid_deg=[float(np.median(dang)), float(abs(dang).max())],
                      pole_vs_row1xrow2=float(np.median(ang(np.cross(r1, Rt['M'][iR, 1]), POLE)))))
checks['eme50_to_s3_to_jse_chain_vs_JUPCRDS'] = chain
_ty = np.array([(tp(c['psi_fit']['t_ref_utc']) - ENTRY_UT) / 86400 / 365.25 for c in chain]); _wl = np.array([c['wlon_resid_deg'][0] for c in chain])
_cf = np.polyfit(_ty, _wl, 1); checks['chain_wlon_offset_linear_fit'] = dict(offset_at_entry_deg=float(_cf[1]), drift_deg_per_year=float(_cf[0]), rms_deg=float(np.sqrt(np.mean((_wl - np.polyval(_cf, _ty)) ** 2))), n_orbits=len(chain), omega_used_deg_per_day=float(OMEGA_DEG_S * 86400))

# ---------------------------------------------------------------- 2. beta per orbit, psi vs atlas
betas = {}
for orb, p in sorted(JUP.items()):
    J = read_jupcrds(p); b = fit_beta(J); b['file'] = rel(p); b['start'] = iso(J['t'][0]); b['stop'] = iso(J['t'][-1]); betas[orb] = b
checks['beta_per_orbit'] = betas

# ---------------------------------------------------------------- 3. Solar phase angle convention check (MOONS_TRAJ GLL_SOLAR_PHASE vs JSE azimuth)
sph_chk = []
for orb in sorted(set(MOON) & set(JUP))[:6]:
    M = read_moons(MOON[orb]); J = read_jupcrds(JUP[orb])
    sel = (J['t'] >= M['t'][0]) & (J['t'] <= M['t'][-1]); tq = J['t'][sel]
    if sel.sum() < 5: continue
    azJ = np.degrees(np.arctan2(J['jse'][sel, 1], J['jse'][sel, 0]))
    sp = np.interp(tq, M['t'], np.degrees(np.unwrap(np.radians(M['gll']['sph']))))
    d1 = wrap(azJ - (180 + sp)); d2 = wrap(azJ - (180 - sp))
    sph_chk.append(dict(orb=orb, n=int(sel.sum()), az_minus_180plus_phase=[float(np.median(abs(d1))), float(abs(d1).max())], az_minus_180minus_phase=[float(np.median(abs(d2))), float(abs(d2).max())]))
checks['solar_phase_convention'] = sph_chk

# ---------------------------------------------------------------- 4. flyby scenes
def moon_state(M, k, t, P):
    m = M['moons'][k]
    R = np.interp(t, M['t'], m['R']); lat = np.interp(t, M['t'], m['lat']); wl = interp_ang(t, M['t'], m['wl']) % 360
    az = (psi_at(P, t) - wl) % 360
    return R, lat, az, wl
flys = []
for p in CRDS:
    k = p.split('/')[-2]; orb = int(re.search(r'ORB_(\d+)_', p).group(1)); C = read_crds(p)
    ica = int(np.argmin(C['R'])); tca = C['t'][ica]
    lab = open(p[:-4] + '.LBL', errors='replace').read().replace('\r', '')
    ca_quote = re.search(r'fixed at the time of (?:\w+ )?closest\s+approach \(([^)]+)\)', re.sub(r'\s+', ' ', lab))
    # ROUND 7 (written without access to the PDS files; NOT YET RUN): keep every date-time string of the label so that an odd closest-approach
    # string (A34: '2002-11-18T06:18:26' against a 2002-11-05 trajectory) can be traced to the label text or to this parser.
    label_datetimes = sorted(set(re.findall(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?', lab)))
    ca_sentence = re.search(r'[^.]*closest\s+approach[^.]*\.', re.sub(r'\s+', ' ', lab))
    # modelled closest approach: minimum of a least-squares quadratic in R^2 over the nine samples centred on the closest one
    _a, _b = max(0, ica - 4), min(len(C['t']) - 1, ica + 4); _u = C['t'][_a:_b + 1] - C['t'][ica]; _c = np.polyfit(_u, C['R'][_a:_b + 1] ** 2, 2)
    ca_model_off = float(-_c[1] / (2 * _c[0])); ca_model_rmin = float(np.sqrt(np.polyval(_c, ca_model_off)))
    lr = label_radius(p)
    rk = lr[1] if lr else RADII[k][0][1][1]
    f = dict(id=f'{LET[k]}{orb}', moon=k, orb=orb, file=rel(p), sha=sha(p), rows=len(C['t']), tca_utc=iso(tca), tca_ms=int(round(tca * 1000)), ca_label=ca_quote.group(1) if ca_quote else None,
             rmin_radii=float(C['R'][ica]), ca_model_off_s=ca_model_off, ca_model_rmin_radii=ca_model_rmin, label_datetimes=label_datetimes, ca_label_sentence=ca_sentence.group(0).strip() if ca_sentence else None, rk_km=rk, rk_src=(rel(p)[:-4] + '.LBL') if lr else (RADII[k][0][0] + ' (this file\'s label has no radius statement for its own moon)'), cadence_s=float(np.median(np.diff(C['t']))))
    # subsample: 2 s within +-6 min of CA, else 20 s
    off = C['t'] - tca; keep = (np.abs(off) <= 360) | (np.round(off) % 20 == 0)
    f['traj'] = dict(t=[round(float(x), 1) for x in off[keep]], x=[round(float(x), 5) for x in C['xyz'][keep, 0]], y=[round(float(x), 5) for x in C['xyz'][keep, 1]], z=[round(float(x), 5) for x in C['xyz'][keep, 2]])
    J = read_jupcrds(JUP[orb]) if orb in JUP else None
    if J is not None:
        P = fit_psi(J, tca, 5.0); f['psi'] = P; f['beta_orbit'] = {kk: betas[orb][kk] for kk in ('beta_deg', 'resid_med_Rj', 'resid_max_Rj', 'n')}
        f['beta'] = fit_beta(J, tca, 5.0); f['beta']['window_days'] = 5.0
        # spacecraft JSE at CA from JUPCRDS (independent of the moon chain)
        sc = np.column_stack([np.interp(tca, J['t'], J['jse'][:, i]) for i in range(3)])[0]; f['sc_jse_jupcrds_Rj'] = [float(x) for x in sc]
        f['jupcrds_dt_to_nearest_row_s'] = float(np.min(np.abs(J['t'] - tca)))
    if orb in MOON and k in MK4 and J is not None:
        M = read_moons(MOON[orb])
        if M['t'][0] <= tca <= M['t'][-1]:
            R, lat, az, wl = moon_state(M, k, tca, P)
            f['moon_jse'] = dict(R_Rj=float(R), lat_deg=float(lat), az_deg=float(az), wlon_deg=float(wl), src=rel(MOON[orb]), table_dt_s=float(np.min(np.abs(M['t'] - tca))))
            # independent azimuth from the moon's solar phase angle column (convention: az = 180 + phase, checked above)
            sp = float(interp_ang(tca, M['t'], M['moons'][k]['sph'])); f['moon_jse']['az_from_solar_phase_deg'] = (180 + sp) % 360
            f['moon_jse']['az_psi_minus_az_phase_deg'] = float(wrap(az - (180 + sp)))
            # PHIO basis in JSE at CA
            a = np.radians(az); xh = np.array([-np.sin(a), np.cos(a), 0]); yh = np.array([-np.cos(a), -np.sin(a), 0]); zh = np.array([0, 0, 1.0])
            f['basis_jse'] = dict(x=xh.tolist(), y=yh.tolist(), z=zh.tolist())
            # check: moon + basis*rel vs JUPCRDS over the overlap (1-min rows)
            sel = (J['t'] >= C['t'][0]) & (J['t'] <= C['t'][-1]) & (J['t'] >= M['t'][0]) & (J['t'] <= M['t'][-1])
            if sel.sum() >= 3:
                tq = J['t'][sel]; Rm, latm, azm, _ = moon_state(M, k, tq, P); mp = jse_from_sph(Rm, latm, azm)
                relv = np.column_stack([np.interp(tq, C['t'], C['xyz'][:, i]) for i in range(3)])
                # basis fixed at CA (label); atlas rk vs pds rk both tested
                for tag, rr in (('pds', rk), ('atlas', ATLAS[k]['rk'])):
                    pred = mp + (relv[:, :1] * xh + relv[:, 1:2] * yh + relv[:, 2:3] * zh) * rr / RJ
                    e = np.linalg.norm(pred - J['jse'][sel], axis=1) * RJ
                    f[f'check_sc_jse_resid_km_{tag}'] = dict(n=int(sel.sum()), med=float(np.median(e)), max=float(e.max()))
                # moon-centred position check: JUPCRDS sc minus moon vs CRDS
                e2 = np.linalg.norm((J['jse'][sel] - mp) * RJ, axis=1) - np.linalg.norm(relv, axis=1) * rk
                f['check_range_km'] = dict(med=float(np.median(abs(e2))), max=float(abs(e2).max()))
            # moon track +-2 h, 5 min, and the other moons at CA
            tt = tca + np.arange(-7200, 7201, 300.0); tt = tt[(tt >= M['t'][0]) & (tt <= M['t'][-1])]
            R, lat, az, _ = moon_state(M, k, tt, P)
            f['moon_track'] = dict(t=[int(x - tca) for x in tt], R=[round(float(x), 5) for x in R], lat=[round(float(x), 4) for x in lat], az=[round(float(x), 4) for x in az])
            f['moons_at_tca'] = {}
            for kk in MK4:
                R, lat, az, wl = moon_state(M, kk, tca, P); f['moons_at_tca'][kk] = dict(R_Rj=float(R), lat_deg=float(lat), az_deg=float(az))
            # ROUND 7 (NOT YET RUN): full +-2 h tracks for every moon, 5-min samples, so that no moon is frozen or moved by an inferred rate
            f['moons_track'] = {}
            for kk in MK4:
                R, lat, az, _ = moon_state(M, kk, tt, P)
                f['moons_track'][kk] = dict(t=[int(x - tca) for x in tt], R=[round(float(x), 5) for x in R], lat=[round(float(x), 4) for x in lat], az=[round(float(x), 4) for x in az])
            # Sun direction in PHIO (beta from this orbit's JUPCRDS fit)
            b = np.radians(f['beta']['beta_deg']); sun = np.array([np.cos(b), 0, np.sin(b)])
            f['sun_phio'] = [float(sun @ xh), float(sun @ yh), float(sun @ zh)]
            f['sun_jse'] = sun.tolist()
    elif k == 'AMALTHEA' and J is not None:
        # no Amalthea row in MOONS_TRAJ; moon position relative to Jupiter is NOT in the volumes. Record only the spacecraft JSE position.
        f['moon_jse'] = None; f['note'] = 'MOONS_TRAJ tables carry Io, Europa, Ganymede, Callisto only; Amalthea position relative to Jupiter is not in the volumes read.'
        if orb in MOON:
            M = read_moons(MOON[orb]); f['moons_at_tca'] = {}
            if M['t'][0] <= tca <= M['t'][-1]:
                for kk in MK4:
                    R, lat, az, wl = moon_state(M, kk, tca, P); f['moons_at_tca'][kk] = dict(R_Rj=float(R), lat_deg=float(lat), az_deg=float(az))
        b = np.radians(f['beta']['beta_deg']); f['sun_jse'] = [float(np.cos(b)), 0.0, float(np.sin(b))]
    # orbiter attitude from ROTATT at CA
    if orb in ROT:
        Rt = read_rotatt(ROT[orb]); i = int(np.argmin(np.abs(Rt['t'] - tca))); dts = float(Rt['t'][i] - tca)
        if abs(dts) <= 1800:
            ra, dec = Rt['ra'][i], Rt['dec'][i]; axis = np.array([np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)])   # 3rd column of rotor->EME50 matrix (label)
            s3 = eme_to_s3(axis, Rt['t'][i])[0]; R_, la, wl = s3_sph(s3); az = psi_at(P, Rt['t'][i]) - wl[0] if J is not None else None
            att = dict(file=rel(ROT[orb]), utc=iso(Rt['t'][i]), dt_from_ca_s=dts, ra_rad=float(ra), dec_rad=float(dec), twist_rad=float(Rt['twist'][i]), spin_rad=float(Rt['spin'][i]))
            # local twist rate (rpm) from neighbouring rows
            lo, hi = max(0, i - 30), min(len(Rt['t']) - 1, i + 30)
            if hi > lo:
                tw = np.unwrap(Rt['twist'][lo:hi + 1]); dtv = Rt['t'][lo:hi + 1]
                rate = np.polyfit(dtv - dtv[0], tw, 1)[0]; att['twist_rate_rpm'] = float(rate * 60 / (2 * np.pi)); att['twist_rate_rows'] = int(hi - lo + 1)
            if az is not None:
                ax_jse = jse_from_sph(1.0, la, az)[0]; att['axis_jse'] = [float(x) for x in ax_jse]
                if f.get('basis_jse'):
                    B = f['basis_jse']; att['axis_phio'] = [float(ax_jse @ np.array(B[c])) for c in 'xyz']
                if f.get('sun_jse'): att['angle_axis_to_sun_deg'] = float(ang(ax_jse, np.array(f['sun_jse'])))
            f['att'] = att
        else: f['att'] = None; f['att_note'] = f'nearest ROTATT row is {dts:.0f} s from CA'
    else: f['att'] = None; f['att_note'] = 'no ROTATT file for this orbit'
    flys.append(f)
flys.sort(key=lambda f: f['tca_ms'])

# ---------------------------------------------------------------- 5. probe scene
raw = open(os.path.join(ROOT, 'GP_0001/DATA/DWE/PROBETRJ.TAB'), 'rb').read()
recs = [raw[i:i + 60].decode() for i in range(0, len(raw), 60)]
rows = [recs[i:i + 6] for i in range(0, len(recs) - 5, 6)]
def f6(r):  # one row (6 physical records) -> dict
    t = float(r[0][0:11]); alt = float(r[0][11:32])
    X = [float(r[1][0:15]), float(r[1][15:33]), float(r[1][33:51])]
    V = [float(r[2][0:15]), float(r[2][15:33]), float(r[2][33:51])]
    U = [float(r[3][0:15]), float(r[3][15:33]), float(r[3][33:51])]
    return t, alt, X, V, U
PT = np.array([f6(r)[0] for r in rows]); PA = np.array([f6(r)[1] for r in rows]); PX = np.array([f6(r)[2] for r in rows]); PV = np.array([f6(r)[3] for r in rows]); PU = np.array([f6(r)[4] for r in rows])
assert len(PT) == 5399, len(PT)
# label's initial state vs row 0
X0 = after('PROBE INITIAL STATE (AT ENTRY) - EME50 COORDINATE SYSTEM (KM; X,Y,Z)'); V0 = after('PROBE INITIAL (ENTRY) VELOCITY (EME50, KM/S ; XDOT, YDOT, ZDOT)')
checks['probetrj_row0_minus_label_initial_state_km'] = [float(x) for x in PX[0] - np.array(X0)]
checks['probetrj_row0_minus_label_initial_velocity_kms'] = [float(x) for x in PV[0] - np.array(V0)]
t_ut = ENTRY_UT + PT
s3 = eme_to_s3(PX, t_ut); Rp, latp, wlp = s3_sph(s3)
J0 = read_jupcrds(JUP[0]); P0 = fit_psi(J0, ENTRY_UT, 5.0)
azp = psi_at(P0, t_ut) - wlp
jse_p = jse_from_sph(Rp, latp, azp)              # km
def eme_dir_to_jse(V, t):
    Rv, lv, wv = s3_sph(eme_to_s3(V, t)); return jse_from_sph(1.0, lv, psi_at(P0, t) - wv)
vdir_p = eme_dir_to_jse(PV, t_ut); up_p = eme_dir_to_jse(PU, t_ut)
checks['probetrj_up_vs_radial_jse_deg_rows_0_mid_last'] = [float(ang(up_p[i], jse_p[i])) for i in (0, len(PT) // 2, len(PT) - 1)]
# checks: entry lat/lon vs MISSION.CAT (6.54 N, 4.46 W) and vs ASI UPPERATM columns
checks['probe_entry_s3_lat_wlon_from_PROBETRJ_row0'] = [float(latp[0]), float(wlp[0])]
checks['probe_entry_lat_wlon_MISSION_CAT'] = [6.54, 4.46]
# planetocentric vs planetographic: label's local vertical unit vector vs radial direction
checks['probetrj_local_vertical_vs_radial_deg_row0'] = float(ang(PU[0], PX[0]))
# altitude check: R - 1-bar radius of an oblate spheroid is not reproducible without the flattening; report R and altitude at row 0 and at the 1-bar crossing
i1 = int(np.argmin(np.abs(PA)))
checks['probetrj_R_km_at_rows_0_and_1bar'] = [float(Rp[0]), float(Rp[i1])]; checks['probetrj_alt_km_at_rows_0_and_1bar'] = [float(PA[0]), float(PA[i1])]; checks['probetrj_time_of_1bar_s'] = float(PT[i1])
# ASI UPPERATM lat/lon columns
upper = os.path.join(ROOT, 'GP_0001/DATA/ASI/UPPERATM.TAB'); U = np.array([[float(x) for x in l.split()] for l in open(upper).read().splitlines() if l.strip()])
# UPPERATM time is from MF0; entry = -MF0_AFTER_ENTRY
k_ent = int(np.argmin(np.abs(U[:, 0] + MF0_AFTER_ENTRY)))
checks['upperatm_row_nearest_entry'] = dict(row=k_ent + 1, time_from_mf0=float(U[k_ent, 0]), altitude_km=float(U[k_ent, 1]), latitude=float(U[k_ent, 10]), longitude=float(U[k_ent, 11]))
checks['probetrj_s3_lat_wlon_at_same_time'] = [float(np.interp(U[k_ent, 0] + MF0_AFTER_ENTRY, PT, latp)), float(np.interp(U[k_ent, 0] + MF0_AFTER_ENTRY, PT, np.degrees(np.unwrap(np.radians(wlp)))) % 360)]
# ORBTRTRJ
ob = open(os.path.join(ROOT, 'GP_0001/DATA/DWE/ORBTRTRJ.TAB'), 'rb').read().decode(errors='replace').replace('\r\n', '\n').split('\n')
hdr = ob[:11]; etmutc = float(ob[1][38:64].replace('D', 'E'))
bodies = [ob[2 + 3 * i][16:22].strip() for i in range(3)]
sun_req = float(ob[2][48:64].replace('D', 'E')); sun_gm = float(ob[2][22:48].replace('D', 'E'))
jup_req = float(ob[8][48:64].replace('D', 'E')); jup_rpol = float(ob[8][64:80].replace('D', 'E'))
earth_req = float(ob[5][48:64].replace('D', 'E'))
cards = ob[11:]; nrow = int(ob[0][:10]); assert bodies == ['SUN', 'EARTH', 'JUPITE'], bodies
OT = []; OV = []
for r in range(nrow):
    c = cards[7 * r:7 * r + 7]
    if len(c) < 7 or not c[0].strip(): break
    y, d, h, mi, s = int(c[0][0:4]), int(c[0][4:8]), int(c[0][8:11]), int(c[0][11:14]), float(c[0][14:22])
    et = (dt.datetime(y, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(days=d - 1, hours=h, minutes=mi, seconds=s)).timestamp()
    vec = []
    for b in range(3):
        pc = c[1 + 2 * b]; vc = c[2 + 2 * b]
        vec.append([float(pc[0:26].replace('D', 'E')), float(pc[26:52].replace('D', 'E')), float(pc[52:78].replace('D', 'E')), float(vc[0:26].replace('D', 'E')), float(vc[26:52].replace('D', 'E')), float(vc[52:78].replace('D', 'E'))])
    OT.append(et - etmutc); OV.append(vec)
OT = np.array(OT); OV = np.array(OV)     # OT in UT seconds
orb_eme = -OV[:, 2, :3]                  # orbiter position relative to Jupiter (EME50, km)
sun_eme = OV[:, 0, :3]                   # Sun relative to spacecraft
earth_eme = OV[:, 1, :3]
s3o = eme_to_s3(orb_eme, OT); Ro, lato, wlo = s3_sph(s3o); azo = psi_at(P0, OT) - wlo; jse_o = jse_from_sph(Ro, lato, azo)
# check orbiter vs ORB00 JUPCRDS (independent file) at matching minutes
sel = (J0['t'] >= OT[0]) & (J0['t'] <= OT[-1]); tq = J0['t'][sel]
pred = np.column_stack([np.interp(tq, OT, jse_o[:, i]) for i in range(3)]) / RJ
e = np.linalg.norm(pred - J0['jse'][sel], axis=1) * RJ
wl_pred = np.degrees(np.unwrap(np.radians(np.interp(tq, OT, np.degrees(np.unwrap(np.radians(wlo))))))) % 360
checks['orbtrtrj_chain_wlon_minus_JUPCRDS_wlon_deg'] = dict(med=float(np.median(wrap(wl_pred - J0['wl'][sel]))), max_abs=float(np.abs(wrap(wl_pred - J0['wl'][sel])).max()))
checks['orbtrtrj_chain_lat_minus_JUPCRDS_lat_deg'] = float(np.median(np.interp(tq, OT, lato) - J0['lat'][sel]))
checks['orbtrtrj_orbiter_jse_vs_ORB00_JUPCRDS_km'] = dict(n=int(sel.sum()), med=float(np.median(e)), max=float(e.max()), R_resid_km_max=float(np.abs(np.linalg.norm(pred, axis=1) - J0['R'][sel]).max() * RJ))
# Sun direction via chain vs beta
sun_dir_j = jse_from_sph(1.0, *s3_sph(eme_to_s3(unit(sun_eme), OT))[1:]) if False else None
Rs, lats, wls = s3_sph(eme_to_s3(sun_eme, OT)); azs = psi_at(P0, OT) - wls; sun_jse = jse_from_sph(1.0, lats, azs)
B0 = fit_beta(J0, ENTRY_UT, 5.0); B0['window_days'] = 5.0; b0 = B0['beta_deg']; sun_beta = np.array([np.cos(np.radians(b0)), 0, np.sin(np.radians(b0))])
checks['sun_dir_ORBTRTRJ_via_chain_vs_JSM_beta_deg'] = dict(med=float(np.median(ang(sun_jse, sun_beta))), max=float(ang(sun_jse, sun_beta).max()), sun_jse_az_deg_med=float(np.median(azs % 360 - 360 * ((azs % 360) > 180))), sun_jse_lat_deg_med=float(np.median(lats)), beta_ORB00_deg=b0)
sun_dist = np.linalg.norm(sun_eme, axis=1); earth_dist = np.linalg.norm(earth_eme, axis=1)
# probe relative to the orbiter at matching times (both files, same frame)
sel2 = (PT + ENTRY_UT >= OT[0]) & (PT + ENTRY_UT <= OT[-1])
orb_at_probe_t = np.column_stack([np.interp(PT[sel2] + ENTRY_UT, OT, orb_eme[:, i]) for i in range(3)])
rng = np.linalg.norm(PX[sel2] - orb_at_probe_t, axis=1)
checks['probe_to_orbiter_range_km_at_entry_MF0_lock_lossoflock'] = {str(tt): float(np.interp(tt, PT[sel2], rng)) for tt in (0.0, MF0_AFTER_ENTRY, LOCK_AFTER_ENTRY, 3685.25)}
# ROTATT coverage at the probe epoch
rot_cov = {orb: [iso(read_rotatt(p)['t'][0]), iso(read_rotatt(p)['t'][-1])] for orb, p in sorted(ROT.items()) if orb <= 1}
checks['rotatt_coverage_orbits_0_1'] = rot_cov
# psi fit vs atlas for the probe epoch
pack6 = json.load(open(os.path.join(VB, 'mission_pack_v6.json')))
def atlas_psi(t):
    best = None
    for s in pack6['segs']:
        T = t - s['t0ms'] / 1000
        if 0 <= T <= s['span']: best = (s['id'], (s['psi0'] + s['rate'] * T / 86400) % 360)
    return best
ap = atlas_psi(ENTRY_UT); checks['psi_entry_fit_vs_atlas'] = dict(fit=P0, atlas_segment=ap[0] if ap else None, atlas_psi_deg=ap[1] if ap else None, diff_deg=float(wrap(psi_at(P0, ENTRY_UT) - ap[1])) if ap else None)
fly_psi = []
for f in flys:
    if 'psi' in f:
        ap = atlas_psi(f['tca_ms'] / 1000)
        if ap: fly_psi.append(dict(id=f['id'], seg=ap[0], diff_deg=float(wrap(psi_at(f['psi'], f['tca_ms'] / 1000) - ap[1])), fit_resid_max_deg=f['psi']['resid_max_deg']))
checks['psi_flyby_fit_vs_atlas'] = fly_psi
# moon positions vs the atlas tables at CA (atlas moon table interpolated hourly as the atlas does)
import zlib, base64
def atlas_moon(k, t):
    for s in pack6['segs']:
        T = t - s['t0ms'] / 1000
        if 0 <= T <= (s['m'] - 1) * 3600:
            buf = zlib.decompress(base64.b64decode(s['blob'])); n, m = s['n'], s['m']
            o = 4 * n + 2 * n * 3 + 2 * n * 5 + 2 * n
            j = MK4.index(k); o += j * 12 * m
            az = np.frombuffer(buf, '<f4', m, o); R = np.frombuffer(buf, '<f4', m, o + 4 * m); la = np.frombuffer(buf, '<f4', m, o + 8 * m)
            jj = int(min(max(np.floor(T / 3600), 0), m - 2)); fr = min(max(T / 3600 - jj, 0), 1)
            return s['id'], (az[jj] + (az[jj + 1] - az[jj]) * fr) % 360, R[jj] + (R[jj + 1] - R[jj]) * fr, la[jj] + (la[jj + 1] - la[jj]) * fr
    return None
mchk = []
for f in flys:
    if f.get('moon_jse'):
        a = atlas_moon(f['moon'], f['tca_ms'] / 1000)
        if a:
            m = f['moon_jse']; p1 = jse_from_sph(m['R_Rj'], m['lat_deg'], m['az_deg'])[0]; p2 = jse_from_sph(a[2], a[3], a[1])[0]
            mchk.append(dict(id=f['id'], seg=a[0], d_az_deg=float(wrap(m['az_deg'] - a[1])), d_R_Rj=float(m['R_Rj'] - a[2]), d_lat_deg=float(m['lat_deg'] - a[3]), dist_km=float(np.linalg.norm(p1 - p2) * RJ)))
checks['moon_pos_at_ca_vs_atlas_table'] = mchk

# atmosphere profile tables (from the GP_0001 ASI tables), subsampled
desc = np.array([[float(x) for x in l.split()] for l in open(os.path.join(ROOT, 'GP_0001/DATA/ASI/DESCENT.TAB')).read().splitlines() if l.strip()])
lower = np.array([[float(x) for x in l.split()] for l in open(os.path.join(ROOT, 'GP_0001/DATA/ASI/LOWERATM.TAB')).read().splitlines() if l.strip()])
def nearest_rows(tab, pcol, levels):
    out = []
    for L in levels:
        i = int(np.argmin(np.abs(tab[:, pcol] - L))); out.append(dict(level_bar=L, row=i + 1, p_bar=float(tab[i, pcol]), **{}))
    return out
levels = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
layers = []
for L in levels:
    i = int(np.argmin(np.abs(desc[:, 2] - L))); j = int(np.argmin(np.abs(lower[:, 1] - L)))
    layers.append(dict(level_bar=L, descent=dict(row=i + 1, t=float(desc[i, 0]), alt_km=float(desc[i, 1]), p_bar=float(desc[i, 2]), T_K=float(desc[i, 3])), loweratm=dict(row=j + 1, t=float(lower[j, 0]), alt_km=float(lower[j, 4]), p_bar=float(lower[j, 1]), T_K=float(lower[j, 2]))))
upper_s = U[::4]
M0 = read_moons(MOON[0]); moons_probe = {}
cov0 = [iso(M0['t'][0]), iso(M0['t'][-1])]
for kk in MK4:
    if M0['t'][0] <= ENTRY_UT <= M0['t'][-1]:
        tt = ENTRY_UT + np.arange(-3600, 3701, 300.0); tt = tt[(tt >= M0['t'][0]) & (tt <= M0['t'][-1])]
        R, lat, az, wl = moon_state(M0, kk, tt, P0)
        moons_probe[kk] = dict(t=[int(x - ENTRY_UT) for x in tt], R=[round(float(x), 5) for x in R], lat=[round(float(x), 4) for x in lat], az=[round(float(x), 4) for x in az], src=rel(MOON[0]))
io_anom = []
for orb in sorted(set(MOON) & set(JUP)):
    M = read_moons(MOON[orb]); J = read_jupcrds(JUP[orb]); P = fit_psi(J, float(np.median(M['t'])), 1e9)
    for kk in MK4:
        az = (psi_at(P, M['t']) - M['moons'][kk]['wl']) % 360; d = wrap(az - (180 + M['moons'][kk]['sph']))
        io_anom.append(dict(orb=orb, moon=kk, az_minus_180plus_phase_med_deg=float(np.median(d)), max_abs_deg=float(np.abs(d).max())))
checks['moons_traj_phase_column_vs_longitude'] = io_anom
probe_scene = dict(moons=moons_probe, moons_table_coverage=cov0,
    entry_ut=iso(ENTRY_UT), entry_et_label='1995-341T22:05:44.9531 ET (PROBETRJ.LBL)', et_minus_ut_s=ET_MINUS_UT, mf0_after_entry_s=MF0_AFTER_ENTRY, lock_after_entry_s=LOCK_AFTER_ENTRY,
    loss_of_lock_ut='23:06:09', loss_of_lock_after_entry_s=3685.25, dwe_last_row_t_from_entry_s=3588.667,
    probetrj=dict(file='GP_0001/DATA/DWE/PROBETRJ.TAB', sha=sha(os.path.join(ROOT, 'GP_0001/DATA/DWE/PROBETRJ.TAB')), rows=len(PT),
                  t=[round(float(x), 3) for x in PT], alt_km=[round(float(x), 3) for x in PA], jse_km=[[round(float(v), 2) for v in r] for r in jse_p],
                  speed_kms=[round(float(x), 4) for x in np.linalg.norm(PV, axis=1)], vdir_jse=[[round(float(v), 4) for v in r] for r in vdir_p], up_jse=[[round(float(v), 4) for v in r] for r in up_p], s3_lat=[round(float(x), 4) for x in latp], s3_wlon=[round(float(x), 4) for x in wlp]),
    orbtrtrj=dict(file='GP_0001/DATA/DWE/ORBTRTRJ.TAB', sha=sha(os.path.join(ROOT, 'GP_0001/DATA/DWE/ORBTRTRJ.TAB')), rows=len(OT), etmutc_s=etmutc, bodies=bodies,
                  t_from_entry=[round(float(x - ENTRY_UT), 2) for x in OT], jse_km=[[round(float(v), 2) for v in r] for r in jse_o],
                  sun_dist_km=[float(sun_dist[0]), float(sun_dist[-1])], earth_dist_km=[float(earth_dist[0]), float(earth_dist[-1])],
                  sun_req_km=sun_req, sun_gm=sun_gm, jup_req_km=jup_req, jup_rpol_km=jup_rpol, earth_req_km=earth_req,
                  sun_jse_dir_med=[float(x) for x in unit(np.median(sun_jse, axis=0))]),
    psi=P0, beta=B0, beta_orbit_file=betas[0], layers=layers,
    upperatm=dict(file='GP_0001/DATA/ASI/UPPERATM.TAB', note='TIME is seconds from MF0 (label); every 4th row', t=[float(x) for x in upper_s[:, 0]], alt_km=[float(x) for x in upper_s[:, 1]], p_mbar=[float(x) for x in upper_s[:, 2]], T_K=[float(x) for x in upper_s[:, 3]]),
    descent=dict(file='GP_0001/DATA/ASI/DESCENT.TAB', note='derived profile (label: dry adiabat fit), every 3rd row', t=[float(x) for x in desc[::3, 0]], alt_km=[float(x) for x in desc[::3, 1]], p_bar=[float(x) for x in desc[::3, 2]], T_K=[float(x) for x in desc[::3, 3]]),
    aero_table_label=dict(masses_kg=[[0.0, 262.0], [35.0, 262.0], [95.0, 165.0], [115.0, 210.0]], second_table_masses_kg=[[0.0, 82.0], [110.0, 82.0], [125.0, 24.0]], note='PROBE AERODYNAMIC CHARACTERISTICS tables copied in PROBETRJ.LBL NOTE (model inputs of the trajectory program, not measured events)'))

pack = dict(
    meta=dict(built_utc=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), RJ_km=RJ, RJ_src='JUPCRDS/MOONS_TRAJ labels: "Rj = 71492 km"; PROBETRJ.LBL: "JOVIAN 1-BAR RADIUS, KM 71492.00000"',
              pole_eme50=POLE.tolist(), pm0_eme50_at_entry=PM0.tolist(), period_h=PERIOD_H, gm_j_km3s2=GM_J, j2=J2, j4=J4, entry_et=ENTRY_ET_STR.group(0), et_minus_ut_s=ET_MINUS_UT,
              frames_src='GP_0001/DATA/DWE/PROBETRJ.LBL (pole, prime meridian, period, 1-bar radius); GP_0001/DOCUMENT/TIMES.TXT (UT-ET, entry UT, MF0, lock); GOMW_500x/DATA/TRAJECT/SURVEY/ORB_xx_GLL_JUPCRDS.TAB (psi, beta)',
              crds_labels_total=len(CRDS), crds_labels_containing_io_text=IO_TEXT_IN_ALL),
    moons=moons_out, flybys=flys, probe=probe_scene, checks=checks)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(pack, open(OUT, 'w'), separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT))
print(json.dumps(checks, indent=1, default=str)[:20000])
print('MOONS', json.dumps(moons_out, indent=1))
for f in flys:
    print(f['id'], f['tca_utc'], 'rmin', round(f['rmin_radii'], 4), 'moon_jse', 'yes' if f.get('moon_jse') else 'no', 'resid_pds', f.get('check_sc_jse_resid_km_pds'), 'resid_atlas', f.get('check_sc_jse_resid_km_atlas'), 'att', (f['att'] or {}).get('utc'), f.get('att_note', ''), 'az_diff', (f.get('moon_jse') or {}).get('az_psi_minus_az_phase_deg'))
