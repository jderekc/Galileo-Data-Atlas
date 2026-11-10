# Archive

Everything built before the web app, kept for reference and regeneration. Nothing here is the current source of truth; `../src`, `../public/data` and `../tools` are.

- `atlas-v12/`: source of the published single-file Galileo Data Atlas (artifact version 12). `template15.html` is the page; `gen15.py` inlines `mission_pack_v6.json` and `layers_pack.json` into it (`layers_pack.json` was built on the Mac in `viewer_build/` and is not in this archive; paths inside `gen15.py` point at that machine). `patch10.py` to `patch15.py` are the successive edits (each reads the previous template). `shot*.js` are the Playwright regression scripts.
- `moons-single-file/`: the single-file moons, craft and probe viewer (`moons_viewer.html`, built from `moons_template.html` by `assemble_moons.py`), the per-round patch and test scripts in `r4/` to `r7/`, and the pack builder in `device_scripts/`. The `.r*.html` round backups are not included.
- `prototype/`: the earlier probe-descent and attitude prototypes.
- `reports/`: audits (`AUDIT_R6.md`, `AUDIT_R7.md`), integration plans, and the Fable review reports for rounds 3 and 4.

Raw PDS volumes are not part of the repository. They are public NASA PDS data; see the top-level README for the volume names.
