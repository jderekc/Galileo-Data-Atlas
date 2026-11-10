"""
Downloads Galileo ENGINEERING / ancillary files that are not in your local archive:

  goup    PPI volume GOUP_0001 (uplink sequence files: SEF, AS-RUN SEF, ISOE, SAFING.TXT, documents), launch to orbit E11
  rawmag  PPI GO-J-MAG-2-REDR-RAW-DATA-V1.0: AACS_*.DAT/.LBL (rotor RA/DEC/twist/spin, clock/cone) and DATA/ENG/MAG_ENG.*
  naif    NAIF SPICE kernels: SCLK, experimental GLL frame kernel, leap seconds, the 2021 reconstructed Galileo SPK (43 MB),
          a planetary ephemeris (de440s.bsp, 31 MB, needed for the Earth direction) and the extended-mission rotor CKs

    python3 pds_eng_get.py --list                         show every file that would be fetched, with sizes; download nothing
    python3 pds_eng_get.py                                download the default selection (all three sets, defaults below)
    python3 pds_eng_get.py --sets naif                    only one set (comma separated: goup,rawmag,naif)
    python3 pds_eng_get.py --orbits E11,J0                GOUP: also fetch these DATA/ORBITAL/<orbit>/ directories (default: none)
    python3 pds_eng_get.py --goup-all                     GOUP: the whole volume (several hundred MB)
    python3 pds_eng_get.py --prime-rotor-cks              NAIF: add prime-mission rotor CKs (1989-1997; hundreds of MB)
    python3 pds_eng_get.py --platform-cks                 NAIF: add scan-platform CKs gll_plt_rec_YYYY_mav_v00.bc (1995-2002, about 66 MB)

GOUP default selection: AAREADME.TXT, ERRATA.TXT, DATA/SAFING.TXT, DATA/DATAINFO.TXT and the files directly inside DOCUMENT/.
Files go to ./PDS_Galileo/ENGINEERING/<set>/<path on the server>, relative to the folder you run this from
(run it from the "Galileo - Jovian Magnetospheric Data" folder). Partly downloaded files are resumed; complete ones are skipped.
Sizes are printed before anything is downloaded. Nothing is asked interactively. Python 3 standard library only.

Certificates: the python.org macOS Python sometimes fails with CERTIFICATE_VERIFY_FAILED. This script first tries the default
certificate store (which honours SSL_CERT_FILE if you set it) and, if that fails with a certificate error, retries with
/etc/ssl/cert.pem automatically.
"""
import os, re, ssl, sys, time, urllib.request, urllib.error
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, unquote

UA = {"User-Agent": "galileo-atlas-engineering-download/1.0 (personal research; polite: 1 request at a time)"}
OUT = Path("PDS_Galileo/ENGINEERING")
PAUSE = 0.25  # seconds between requests

PPI_GOUP = "https://pds-ppi.igpp.ucla.edu/archive1/GOUP_0001/"
PPI_RAWMAG = "https://pds-ppi.igpp.ucla.edu/data/GO-J-MAG-2-REDR-RAW-DATA-V1.0/"
NAIF = "https://naif.jpl.nasa.gov/pub/naif/"
NAIF_FIXED = [  # all verified in directory listings on 2026-11-08
    "GLL/kernels/sclk/mk00062a.tsc",
    "GLL/misc/fk/gll_v0.tf",
    "GLL/kernels/spk/aareadme.txt",
    "GLL/kernels/spk/gll_951120_021126_raj2021.bsp",
    "GLL/kernels/spk/gll_951120_021126_raj2021.bsp.lbl",
    "generic_kernels/lsk/naif0012.tls",
    "generic_kernels/spk/planets/de440s.bsp",
]
NAIF_ROTOR_EXT = "GLL/kernels/ck/extended_mission/unvalidated/rtr/"
NAIF_ROTOR_PRIME = "GLL/kernels/ck/prime_mission/unvalidated/rtr/"
NAIF_CK = "GLL/kernels/ck/"

# ---------------------------------------------------------------- network
_CTX = [None]  # chosen SSL context, decided on first use

def _contexts():
    yield "default certificate store", ssl.create_default_context()
    if os.path.exists("/etc/ssl/cert.pem"):
        yield "/etc/ssl/cert.pem", ssl.create_default_context(cafile="/etc/ssl/cert.pem")

def _is_cert_error(e):
    r = getattr(e, "reason", e)
    return isinstance(r, ssl.SSLCertVerificationError) or "CERTIFICATE_VERIFY_FAILED" in str(e)

def open_url(url, method="GET", headers=None, timeout=90):
    h = dict(UA); h.update(headers or {})
    req = urllib.request.Request(url, headers=h, method=method)
    if _CTX[0] is not None:
        return urllib.request.urlopen(req, timeout=timeout, context=_CTX[0])
    last = None
    for name, ctx in _contexts():
        try:
            r = urllib.request.urlopen(req, timeout=timeout, context=ctx)
            _CTX[0] = ctx
            if name != "default certificate store":
                print(f"  (certificates: using {name})")
            return r
        except Exception as e:
            if _is_cert_error(e):
                last = e; continue
            raise
    raise last

def fetch_text(url, tries=3):
    err = None
    for k in range(tries):
        try:
            with open_url(url) as r:
                time.sleep(PAUSE)
                return r.read().decode("latin-1")
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            err = e
        except Exception as e:
            err = e
        time.sleep(2 * (k + 1))
    print("  failed:", url, err); return None

def remote_size(url):
    try:
        with open_url(url, method="HEAD") as r:
            time.sleep(PAUSE)
            n = r.headers.get("Content-Length")
            return int(n) if n else None
    except Exception as e:
        print("  size unknown:", url, e); return None

# ---------------------------------------------------------------- listings
class Links(HTMLParser):
    def __init__(s): super().__init__(); s.h = []
    def handle_starttag(s, t, a):
        if t == "a":
            for k, v in a:
                if k == "href" and v: s.h.append(v)

def list_dir(url, html=None):
    """Return (subdirs, files) as absolute URLs below url, from an Apache-style index page."""
    html = fetch_text(url) if html is None else html
    if html is None: return [], []
    p = Links(); p.feed(html); dirs, files = [], []
    for h in p.h:
        if h.startswith(("?", "#", "mailto:", "/")) or h in ("../", "./") or "://" in h and not h.startswith(url): continue
        full = urljoin(url, h)
        if not full.startswith(url) or full == url: continue
        (dirs if full.endswith("/") else files).append(full)
    return sorted(set(dirs)), sorted(set(files))

def crawl(url, keep=lambda u: True, max_depth=8):
    out, todo = [], [(url, 0)]
    while todo:
        u, d = todo.pop()
        dirs, files = list_dir(u)
        out += [f for f in files if keep(f)]
        if d < max_depth: todo += [(x, d + 1) for x in dirs]
    return sorted(set(out))

# ---------------------------------------------------------------- selections
def sel_goup(args):
    if "--goup-all" in args:
        return crawl(PPI_GOUP)
    files = [PPI_GOUP + p for p in ("AAREADME.TXT", "ERRATA.TXT", "DATA/SAFING.TXT", "DATA/DATAINFO.TXT")]
    files += list_dir(PPI_GOUP + "DOCUMENT/")[1]
    for orb in [o.strip().upper() for o in opt(args, "--orbits", "").split(",") if o.strip()]:
        files += crawl(PPI_GOUP + f"DATA/ORBITAL/{orb}/")
    return sorted(set(files))

def keep_rawmag(u):
    n = u.rsplit("/", 1)[-1]
    return bool(re.match(r"AACS_.*\.(DAT|LBL)$", n, re.I) or re.match(r"MAG_ENG\.(CSV|LBL)$", n, re.I))

def sel_rawmag(args):
    files = [PPI_RAWMAG + p for p in ("AAREADME.TXT", "ERRATA.TXT")]
    return sorted(set(files + crawl(PPI_RAWMAG + "DATA/", keep_rawmag)))

def sel_naif(args):
    files = [NAIF + p for p in NAIF_FIXED]
    files += [f for f in list_dir(NAIF + NAIF_ROTOR_EXT)[1] if f.endswith("_rtr.bc")]
    if "--prime-rotor-cks" in args:
        files += [f for f in list_dir(NAIF + NAIF_ROTOR_PRIME)[1] if f.endswith("_rtr.bc")]
    if "--platform-cks" in args:
        files += [f for f in list_dir(NAIF + NAIF_CK)[1] if re.search(r"gll_plt_rec_\d{4}_mav_v00\.bc$", f)]
    return sorted(set(files))

SETS = {"goup": (PPI_GOUP, sel_goup), "rawmag": (PPI_RAWMAG, sel_rawmag), "naif": (NAIF, sel_naif)}

def opt(args, name, default):
    for i, a in enumerate(args):
        if a == name and i + 1 < len(args): return args[i + 1]
        if a.startswith(name + "="): return a.split("=", 1)[1]
    return default

def dest(setname, base, url):
    return OUT / setname / unquote(url[len(base):])

def human(n):
    if n is None: return "?"
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB": return f"{n:.0f} {u}" if u == "B" else f"{n:.1f} {u}"
        n /= 1024

# ---------------------------------------------------------------- download (resumable)
def download(url, dst, size):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and size is not None and dst.stat().st_size == size: return "skip"
    part = dst.with_name(dst.name + ".part")
    have = part.stat().st_size if part.exists() else 0
    if size is not None and have > size: part.unlink(); have = 0
    hdr = {"Range": f"bytes={have}-"} if have else {}
    for k in range(4):
        try:
            with open_url(url, headers=hdr, timeout=300) as r:
                mode = "ab" if (have and r.status == 206) else "wb"
                with open(part, mode) as f:
                    while True:
                        b = r.read(1 << 20)
                        if not b: break
                        f.write(b)
            break
        except Exception as e:
            print("   retry", k + 1, e); time.sleep(3 * (k + 1))
            have = part.stat().st_size if part.exists() else 0; hdr = {"Range": f"bytes={have}-"} if have else {}
    else:
        return "failed"
    got = part.stat().st_size
    if size is not None and got != size:
        return f"incomplete ({got} of {size} bytes; run again to resume)"
    part.replace(dst); time.sleep(PAUSE)
    return "ok"

def main(args):
    names = [s.strip() for s in opt(args, "--sets", "goup,rawmag,naif").split(",") if s.strip()]
    plan = []
    for s in names:
        if s not in SETS: print("unknown set:", s, "(choose from goup, rawmag, naif)"); return 2
        base, fn = SETS[s]
        print(f"[{s}] listing {base} ...")
        files = fn(args)
        if not files: print(f"[{s}] nothing found; open {base} in a browser to check it is reachable"); continue
        for u in files: plan.append((s, base, u, remote_size(u)))
    total = sum(p[3] or 0 for p in plan); unknown = sum(p[3] is None for p in plan)
    for s, base, u, n in plan:
        d = dest(s, base, u)
        done = d.exists() and n is not None and d.stat().st_size == n
        print(f"{human(n):>9}  {'have ' if done else '     '}{d}")
    print(f"{len(plan)} files, {human(total)} total" + (f" ({unknown} sizes unknown)" if unknown else ""))
    if "--list" in args: return 0
    bad = 0
    for i, (s, base, u, n) in enumerate(plan):
        r = download(u, dest(s, base, u), n)
        if r != "skip": print(f"[{i+1}/{len(plan)}] {r:<10} {dest(s, base, u)}")
        bad += r not in ("ok", "skip")
    print("done" if not bad else f"done with {bad} problem(s); run the same command again to resume")
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
