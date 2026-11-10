# Galileo Data Atlas (web app)

Stage 1 of the move from single-file artifacts to a web app made of separate files. This folder holds the moons and craft viewer as ES modules. The atlas itself has not been migrated yet; the plan is in `docs/INTEGRATION_PLAN_R7.md`.

The product maps data. Everything drawn comes from a cited file, or is labelled illustrative, or is marked inferred (†) with its basis.

## Run

No build step.

```
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Routes are in the hash: `#FLY:E4&tier=LOW`, `#PROBE&tier=HIGH`, tiers `LOW`, `MEDIUM`, `HIGH`, `auto`. It needs a server (it fetches data files); opening `index.html` from disk will not work.

## Layout

- `index.html`, `src/css/moons.css`: page and styles.
- `src/js/main.js`: scene, HUD, UI. `textures.js`: procedural textures (also used by the worker). `craft.js`: orbiter, probe, parachute. `data.js`: loads the data files. `util.js`: constants.
- `src/workers/texture-worker.js`: builds MEDIUM and HIGH textures off the main thread.
- `src/vendor/`: three.js r147 (ES module) and OrbitControls, pinned.
- `public/data/bodies.json`: the one place body radii are defined. `public/data/moons_pack.json`: trajectories, moon positions, probe tables.
- `tools/`: `build_moons_pack.py` (reads the PDS volumes; run on the machine that has them), `assemble_moons.py` (single-file build), `split_single_file.py` (generates `src/` from `legacy/moons_template.html`).
- `legacy/moons_template.html`: the single-file source. During stage 1 this is still the file to edit; re-run `npm run split` afterwards. Stage 2 makes `src/` the source.
- `tests/`: Playwright scripts. `docs/`: audit and plan.

## Tests

```
npm install            # playwright and three (three is only needed for test:compare and split)
npm run serve          # in one terminal
npm test               # every scene in LOW, MEDIUM, HIGH: no page or console errors
npm run test:load      # files and bytes of a first load
SINGLE=file:///abs/path/moons_viewer.html THREE_DIR=$PWD/node_modules/three npm run test:compare
```

`test:compare` checks that the module build and the single-file build give the same HUD text, positions, camera, triangle and draw counts and the same pixels in six cases. Tests use software rendering by default; set `REAL_GPU=1` to use the machine's GPU.

## Licence

Not set. `src/vendor/THREE_LICENSE` is the three.js MIT licence.

## Source data

Public NASA PDS volumes, not stored in this repository: Galileo orbiter geometry/trajectory GOMW_5001 to GOMW_5005 and the entry probe volume GP_0001. `tools/build_moons_pack.py` reads them and writes `public/data/moons_pack.json`. See `archive/` for the earlier single-file builds.
