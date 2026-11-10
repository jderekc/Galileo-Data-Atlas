# Plan: integrating the moons/probe viewer into the Galileo Data Atlas

Status: plan only. Nothing in the atlas was modified. Atlas source read: `scratchpad/viewer/template15.html` (119,581 bytes, 1,112 lines), `gen15.py`, `mission_pack_v6.json`; built `viewer.html` is 14,517,989 bytes.

Standing requirement for every stage: the product only maps data. Each drawn item is either from a cited file or column, or labelled illustrative on screen; inferred values carry the teal † marker; no interpretation is added.

## 1. What the two products already share

- three.js r147 and OrbitControls from the same CDN paths; one WebGL canvas `#gl` each; a `#gate` no-WebGL message.
- Flyby ids: the atlas pack has 36 `flys` (I0 … A34) and the moons pack has the same 36; `tca_ms` is identical for all 36.
- Hash state: atlas `#fly=<id>&t=<s>` and `#orb=<seg>&t=<s>&ly=…&pc=…` (URLSearchParams); moons `#FLY:<id>&tier=…` / `#PROBE&tier=…`.
- ψ(t) rotation per segment (atlas `psi0`, `rate`) and per scene (moons `psi`), agreeing to 0.016–0.2°.
- Atlas mode B ("Moon pass") already shows a moon-centred flyby with the field data; atlas mode A has a "Probe" camera target.

## 2. Recommended shape

Keep one page, one renderer, one canvas. Add the moons viewer as a third scene graph, not an iframe and not a second canvas.

- Mode A (Jupiter system) and mode B (Moon pass) stay as they are.
- New mode C "Close view": the moons-viewer scene (true-scale bodies, craft, Sun, km units, floating origin, logarithmic depth). It has two entry points:
  - from mode B, a "close view" toggle for the current flyby (same id, same time);
  - from mode A's ORB00/JUP_APP segments, "Probe descent" (the PROBE scene).
- The atlas renderer is created without `logarithmicDepthBuffer`; mode C needs it. Renderer flags cannot change after creation, so either the atlas renderer is created with the log depth buffer for all modes (must be regression-tested on modes A and B), or mode C keeps a second renderer on its own canvas that is created on first use and disposed on leaving. The second option costs one extra context only while mode C is open and leaves modes A and B byte-for-byte unchanged; it is the lower-risk choice.
- One time model: mode C's T is seconds from closest approach (flyby) or from entry (probe); the atlas `S.TB` is already seconds on the flyby axis. Mode C reads and writes `S.TB` for flybys so the graph cursor, the strips and the 3D view stay in step. The probe scene gets its own `S.TC` and maps to the atlas segment time by `tms`.
- The atlas time strips stay visible under mode C. This is the main gain: field and instrument data beside the true-scale geometry.

## 3. URL design

Extend the existing scheme, keep old links valid:

- `#fly=E4&t=120&view=close` — flyby in close view.
- `#probe&t=200` — probe descent (close view implied).
- `&tier=LOW|HIGH` optional, as now; `&follow=ORBITER|EUROPA|JUPITER|PROBE` optional.
- Old moons-viewer hashes (`#FLY:E4&tier=LOW`) are only in the prototype; no redirect needed unless Derek has shared them.

## 4. Size budget

| Item | Bytes |
|---|---|
| Atlas v12 today | 14,517,989 |
| Headroom to 16,000,000 | 1,482,011 |
| Headroom to 16 MiB (16,777,216) | 2,259,227 |
| Moons pack, JSON | 1,542,464 |
| Moons pack, deflate + base64 (the atlas's existing DecompressionStream path) | 564,752 |
| Moons code today (template) | 166,563 |
| Estimated code after sharing helpers, HUD, hash, resize with the atlas | about 130,000 (estimate) |
| Estimated atlas after integration | about 15,210,000 (estimate), leaving about 790,000 under 16,000,000 |

Which limit applies (16,000,000 or 16,777,216) should be confirmed before stage 2. Further savings if needed: the probe trajectory (612,389 bytes of JSON, 5,399 rows) can be stored as quantised typed arrays like the atlas blobs; the `checks` block (56,073 bytes) can be trimmed to the fields the panel prints; per-flyby `traj` duplicates the atlas flyby blobs in a different frame and cadence (15,882 bytes each) and could be derived from the atlas blob plus a basis.

## 5. Data pack

- Add a `close` section to the atlas pack: per flyby `{basis_jse, moon_track, moons_at_tca, sun_jse, att, rk}` and one `probe` object. Decode lazily on first entry to mode C, as the atlas does for flyby blobs.
- Build step: `gen16.py` merges `moons_pack.json` (and the GP_0001 columns `assemble_moons.py` takes from `probe_pack.json`) into the atlas pack, with the same `assert` on matching flyby ids.
- Resolve before merging: one radius set (audit item 2), the A34 label time (audit item 1), the C30 gap in the moons pack (re-run the pack builder on the Mac and find why MOONS_TRAJ gave no rows).

## 6. Tiers, memory, performance

- The atlas has no tier system. Mode C brings LOW/HIGH/auto; modes A and B ignore it.
- Memory in mode C, HIGH: 22.4 MB per 2048×1024 body and 44.7 MB per cap on the GPU, built lazily; with the round-6 changes the probe scene holds 3 such textures (about 112 MB) and a flyby usually 1–2. Canvases are freed after upload. LOW holds under 2 MB.
- Leaving mode C disposes its scene graph, textures and (if used) its renderer.
- Render on demand should be applied to the whole atlas loop in the same stage; today the atlas loop renders every frame.
- The texture workers are created on first HIGH use only.

## 7. UI placement

- Header tabs: "Jupiter system", "Moon pass", plus a "Close view" toggle that is enabled when a flyby or the probe segment is selected. On phones it is a third tab.
- Side panel: mode C adds one card "Close view" (follow target, zoom craft/local/system, tier, Sun glow, stars, atmosphere) and replaces the legend card with the Sources panel, collapsed into groups (Frame and time, Bodies, Jupiter surface, Craft, Probe atmosphere, Documents, Cross-checks).
- HUD: reuse the atlas `#hud` container with its close button; mode C fills it with its own rows, including the inferred markers.
- Labels: one label layer. The atlas `layoutLabels()` and the moons `drawLabels()` both avoid overlaps; keep the atlas one and feed it mode C's anchors.
- Legend: "data / illustrative / not in data / inferred †" chips become part of the atlas legend so the same vocabulary is used in all modes.

## 8. Test plan

- Existing atlas regressions (`viewer/shot*.js`, `interact.js`, `mchk.js`) must pass unchanged with mode C never opened. With the second-renderer option, screenshots of modes A and B should be pixel-identical to v12.
- Moons tests carried over: `allscenes.js` (37 scenes × 2 tiers, zero errors), `r3test.js` (HUD values), `zoomfade.js`, `zoomout.js`, `r4/t6.js` (tier switching, Worker-less fallback), `r6/a.js` (shadow scan, keyboard, 1400/1024/390 layout), `r6/m.js` (frame time, triangles, idle frames).
- New: mode switches A→C→A and B→C→B 20 times with `renderer.info.memory` returning to its starting counts; hash round-trips for every new parameter; time cursor in the strips equals mode C's clock to 1 s; file size assert in `gen16.py`.
- One run on a real GPU (HIGH has never been measured on hardware).

## 9. Stages

| Stage | Content | Size added (estimate) | Exit test |
|---|---|---|---|
| 0 | Decisions (section 11). Re-run the pack builder on the Mac: C30, A34 label. | 0 | decisions recorded |
| 1 | `gen16.py` merges the close-view data, compressed; no UI. | +565 KB | atlas regressions pass; size assert |
| 2 | Mode C for flybys: second renderer, shared time, hash `view=close`, HUD, labels, LOW tier only. | +80 KB | allscenes (flybys), mode-switch leak test |
| 3 | Probe descent scene with atmosphere, readouts, cross-check tables. | +35 KB | r3test, zoomfade, zoomout |
| 4 | HIGH tier, workers, mesh craft, Jupiter painting. | +45 KB | tier tests, real-GPU run |
| 5 | Sources panel grouping, legend vocabulary, phone layout, accessibility pass. | +10 KB | 1400/1024/390 screenshots |

Stages 2–5 can each ship as an atlas version. If the budget becomes tight, stage 4 is the one to drop or reduce (LOW-only close view costs about 45 KB less code and no texture memory).

## 10. Risks

- Size: about 790 KB spare under 16,000,000 after integration, before any other atlas growth.
- Two renderers on phones: some mobile browsers limit live WebGL contexts; mode C must dispose on exit and handle `webglcontextlost`.
- Two frames in one page: the atlas draws in Rj with its own axes; mode C draws in km in JSE. Shared helpers must not mix them; keep mode C's world in its own module scope.
- The Sources panel is long; without grouping it will crowd the atlas side panel.
- HIGH is unmeasured on hardware; the adaptive render scale is untested outside software rendering.
- Extrapolated content (GRS longitude outside 1999–2001, oval longitudes) sits beside measured field data once integrated; the illustrative flags must stay visible in the atlas legend, not only in the panel.

## 11. Decisions needed from Derek

1. Integrate as a third mode in the atlas (recommended), or keep the moons viewer as a separate artifact linked from the atlas.
2. Which size limit applies, and whether HIGH (stage 4) is in scope.
3. One radius set for both products, or show both.
4. Whether the Great Red Spot and dated ovals are drawn for dates where their longitude is extrapolated.
5. Whether C30 and A34 are shown with inferred moon positions, or listed as "not in data" without a Jupiter-relative view.
6. Probe base diameter (1.2192 m or 1.1284 m).
7. Whether the atlas loop should also become render-on-demand in the same release.
