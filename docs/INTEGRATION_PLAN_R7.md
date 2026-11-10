# Integration plan, revision 7: a modular web app

Supersedes INTEGRATION_PLAN.md where they differ. Decisions taken by the owner: the moons/probe viewer becomes a third mode inside the atlas; the product is a web app made of separate files, not one large file; one source of truth for radii; the atlas loop becomes render-on-demand in the same release.

Standing requirement: the product only maps data. Everything drawn is from a cited file, or labelled illustrative, or marked inferred (†) with its basis. No interpretation.

## 1. Does the current approach serve a hosted web app?

| Current single-file technique | Why it existed | For a hosted app |
|---|---|---|
| All code, CSS and data inline in one HTML file (atlas 14,517,989 bytes; moons 1,718,455) | the artifact host serves one file with a 16 MB cap | Drop. Nothing can be cached separately; every visit downloads everything; one change invalidates all of it |
| Data as base64 of deflate inside the HTML, decoded with DecompressionStream | to fit under the cap | Drop. Base64 adds 33 %. Serve JSON or binary files and let the host compress them (gzip or brotli) |
| three.js from a CDN `<script>` (r147, UMD build) | no bundling | Vendor the ES module build in the repository, pinned |
| Worker built from function source text in a Blob | no second file was possible | A module worker file that imports the same texture module |
| Run-time procedural textures | no image assets allowed, no size budget | Keep. They cost zero transfer and keep the "no imagery" property. Option later: cache built textures in IndexedDB |
| One pack for all 36 flybys and the probe | one file anyway | Split per scene and load on demand |

Measured on the module build delivered with this plan (static server, gzip -9 estimate): first load of a flyby scene is 11 files, 2,918,386 bytes raw, 728,902 bytes gzip. Of that, three.js is 238,311, the data pack 416,135, application code 66,031. The probe scene is the same today because the pack is one file. HIGH adds the worker and its imports: 14 files, 738,954 bytes gzip.

## 2. Tooling recommendation

- Development: no build step. Native ES modules, an import map for the bare `three` specifier, any static server (`python3 -m http.server`). This is what the delivered folder does.
- Production: Vite as an optional build (`vite build`): bundles and minifies the app code, hashes file names for long-lived caching, keeps `public/data` as plain files. Reason for Vite over hand-rolled import maps only: content-hashed names and tree-shaken three.js (the app uses a small part of the 1.17 MB module) without changing source layout. Reason for keeping the no-build path: the repository stays runnable and testable with Python and a browser.
- three.js: stay on r147 for the migration so that pixel comparisons against the single-file builds remain valid; the atlas already uses r147. Upgrade once, for both modes, after the migration, as its own change with its own screenshot review (colour management defaults changed in later releases).
- Hosting: GitHub Pages or any static host. All routes are in the URL hash, so no server rewrites are needed. Add `Cache-Control: immutable` for hashed assets where the host allows; a service worker is optional and only worth adding if offline use is wanted.

## 3. Repository layout

```
galileo-data-atlas/
  index.html                 moons/probe viewer entry today; atlas shell after stage 4
  src/
    css/                     moons.css (+ atlas.css)
    js/
      util.js                constants, clamp
      data.js                fetch + cache of data files
      textures.js            pure procedural texture code (main thread and worker)
      craft.js               orbiter, probe, parachute models
      main.js                moons viewer scene, HUD, UI (to be split further, below)
      shared/                time.js, route.js, bodies.js, labels.js, hud.js, tier.js   (stage 2)
      atlas/                 modules cut from template15.html                         (stage 3)
    workers/texture-worker.js
    vendor/                  three.module.js r147, OrbitControls.js, licence
  public/data/
    bodies.json              single source of truth for radii
    moons_pack.json          to be split: flyby/<id>.json, probe.json, index.json     (stage 2)
    atlas/                   segments and flyby blobs as binary files                 (stage 3)
  tests/                     Playwright scripts, run against a static server
  tools/                     Python: pack builders, single-file assembler, splitter
  docs/                      audits and plans
  legacy/                    moons_template.html (single-file source during the migration)
```

## 4. Shared modules

| Module | Contents | Used by |
|---|---|---|
| `shared/bodies.js` | loads `bodies.json`; `radius(k)`, `labelUnit(k)` | both; fixes the atlas altitude unit defect |
| `shared/time.js` | UTC ms ↔ seconds from a scene origin; modelled closest approach; play/pause/speed | both |
| `shared/route.js` | parse and write the hash: `#orb=`, `#fly=`, `#probe`, `&t=`, `&view=close`, `&tier=`, `&ly=`, `&pc=` | both |
| `shared/labels.js` | one overlap-avoiding label layer | both |
| `shared/hud.js` | HUD container, rows with data / inferred † / illustrative marks | both |
| `shared/tier.js` | LOW / MEDIUM / HIGH, frame probe, governor | close view; atlas reads LOW/normal only |
| `shared/render-loop.js` | render on demand: draw when time, camera, size, state or assets change | both |
| `data.js` | per-file fetch, in-memory cache, lazy per flyby and per segment | both |

## 5. How `template15.html` decomposes

Its section markers map to files as follows (line numbers from the 1,112-line template):

| Template section (line) | Module |
|---|---|
| decoding, zlib via DecompressionStream (357) | removed; `data.js` fetches binary files |
| helpers (382) | `util.js` |
| renderer, scenes A and B, lights, moon meshes (404–544) | `atlas/renderer.js`, `atlas/scene-system.js`, `atlas/scene-pass.js` |
| state (545) | `atlas/state.js` + `shared/route.js` |
| segment loading (552), history (579), trajectory trace (589) | `atlas/segments.js`, `atlas/trace.js` |
| other-instrument values (648) | `atlas/layers.js` |
| flyby loading (671) | `atlas/flyby.js` (reads `bodies.json`) |
| selectors and info cards (702), UI wiring (740) | `atlas/ui.js` |
| whole-mission strip (826), time strips (854), time axis (906), hover readout (989) | `atlas/mission-strip.js`, `atlas/strips.js`, `atlas/axis.js`, `atlas/hover.js` |
| per-frame update (1016), loop (1062) | `atlas/update.js`, `shared/render-loop.js` |
| resizable panels (1087) | `atlas/layout.js` |

The moons `main.js` (121 KB) splits the same way in stage 2: `close/scene.js`, `close/probe.js`, `close/flyby.js`, `close/jupiter-features.js`, `close/hud.js`, `close/sources.js`, `close/ui.js`.

## 6. Stages, each with a test gate

| Stage | Work | Gate | Effort (estimate) |
|---|---|---|---|
| 1 (done in this round) | Moons viewer as modules: HTML, CSS, textures, craft, data loader, module worker, vendored three r147, `bodies.json`. Generated mechanically from the single-file template. | `tests/allscenes.js` 37 × 3 tiers, zero errors; `tests/compare_single_file.js` six cases identical in HUD, positions, camera, triangle and draw counts, and every pixel | done |
| 2 | Make the modules the edited source; split `main.js`; split the pack per scene; shared time, route, bodies, tier, render loop. Single-file build becomes a packaging script. | same two tests; first-load bytes for a flyby below the stage-1 figure | 2–3 working sessions |
| 3 | Atlas to modules, behaviour unchanged except: reads `bodies.json` with the label-unit conversion; render on demand. Data blobs become binary files. | atlas `shot*.js`, `interact.js`, `mchk.js` screenshots unchanged apart from the altitude figures listed in AUDIT_R7 (b); idle frame count zero | 3–5 sessions |
| 4 | Close view as the third mode: own renderer created on entry and disposed on exit; shared flyby time; `#fly=…&view=close`, `#probe`. | mode switches A↔C, B↔C 20 times with renderer memory counts back to start; strip cursor equals close-view clock to 1 s | 2–3 sessions |
| 5 | Vite production build, cache headers, GitHub Pages workflow; optional packaged single-file artifact. | built site passes all tests from `dist/` | 1 session |
| 6 | three.js upgrade for both modes. | screenshot review | 1 session |

Running the tests from the repository: `python3 -m http.server 8080` in the root, then `npm test` (all scenes), `npm run test:compare` (needs the single-file build and three r147 UMD files; see README), `npm run test:load` (transfer sizes).

## 7. What stays from revision 6

Third mode with its own renderer; one time model shared with the data strips; URL scheme; Sources panel grouped; legend vocabulary (data / illustrative / not in data / inferred †) in every mode. The 16 MB budget no longer constrains the web app; it applies only if a single-file artifact is still wanted.

## 8. Risks

- Stage 1 modules are generated from the template. Until stage 2 flips the source of truth, edits must go to the template and be re-split, or the two builds drift.
- Module workers need a current browser (Chromium, Safari 15+, Firefox 114+); the main-thread fallback covers the rest.
- `fetch` of local files does not work from `file://`; the web app needs a server, the single-file build does not.
- The atlas has no unit tests, only screenshot scripts; stage 3 depends on them being stable.

## 9. Decisions needed

1. Keep a packaged single-file artifact after the web app exists, or retire it.
2. Vite for production builds (recommended), or stay build-free.
3. Io radius: table 1821.6 or IAU 1821.49.
4. Licence for the repository (none is set).
5. Whether built textures should be cached in the browser (IndexedDB) to avoid rebuilding on each visit.
