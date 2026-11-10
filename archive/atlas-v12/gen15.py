import json
d = "/mnt/user-data/uploads/Desktop/Galileo - Jovian Magnetospheric Data/viewer_build/"
pack = json.load(open("mission_pack_v6.json")); L = json.load(open(d + "layers_pack.json"))
L["segs"]["ORB00_JCA"] = None
assert set(L["segs"]) == {s["id"] for s in pack["segs"]} and set(L["flys"]) == {f["id"] for f in pack["flys"]}
pack["layers"] = L["layers"]; pack["lsegs"] = L["segs"]; pack["lflys"] = L["flys"]
js = json.dumps(pack, separators=(",", ":")).replace("</", "<\\/")
html = open("template15.html").read().replace("__PACK__", js)
assert "__PACK__" not in html
open("viewer.html", "w").write(html)
sk = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open("viewer_wrapped.html", "w").write(sk)
print("bytes", len(html), "layers", len(L["layers"]))
