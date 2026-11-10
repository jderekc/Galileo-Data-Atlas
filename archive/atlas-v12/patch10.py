h = open("template9_pub.html").read()
def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"expected {count} got {n} for: {old[:90]!r}"
    h = h.replace(old, new)
rep("(published mission timeline, E13 entry).'}", "(published mission timeline, E13 entry; the entry describes that flyby only).'}")
rep("Dipole tilt used for the illustration: about 9.6°.", "Dipole tilt used for the illustration: about 9.6° (a drawing parameter, not measured here). Planet and moon surfaces are drawn, not imaged.")
rep("<dt>Orbital period</dt><dd>${m.P} days</dd>", "<dt>Orbital period</dt><dd>${(+m.P).toFixed(2)} days</dd>")
# nearest-moon line comes from tables or an eccentric-orbit fit between tables: say so is already in notes; keep
open("template10.html", "w").write(h); print("template10", len(h))
