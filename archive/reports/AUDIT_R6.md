# Moons viewer: round-6 audit (2026-11-10)

Build audited: `moons_viewer.html` sha256 a15b343f7e50205d8dd4562813fd3d1e03414bbef874fcc334f3b5da5606b6d2 (1,709,019 bytes), template sha256 3383693a690a20bb7cf227cbad9e73cbedf59bf4d751a49d0a43dc404c7741f8.
Backups: `moons_viewer.r5.html` 0328647e…, `moons_template.r5.html` 51626fc8….

Limits of this audit: the Mac bridge was down, so no PDS file could be re-read. Checks were made against (a) the data pack built from those files in round 1, (b) the atlas pack `viewer/mission_pack_v6.json`, built separately, (c) the two documents held in the sandbox, (d) published values fetched through a summarising web tool. Where a check rests on (d) or on general knowledge it says so.

## 1. Defects found and fixed in this round

| # | Defect | Evidence | Fix |
|---|---|---|---|
| 1 | Flyby C30 (Callisto, 2001-05-25) was silently missing from the scene list. Earlier reports said "36 scenes"; the pack holds 36 flybys plus the probe = 37. | Scene filter required `moon_jse`; the C30 pack entry has no `moon_jse`, `basis_jse`, `sun_jse`, `moons_at_tca` (the pack builder found no MOONS_TRAJ rows for it; cause not established; note `orb` is the string '30' in that entry). | C30 is now listed, with its moon position inferred (see 3). 37 scenes load in both tiers with zero errors. |
| 2 | A34 track drawn in the wrong orientation. The moon-centred PHIO coordinates were plotted directly on the JSE axes, so the track was rotated relative to Jupiter and the Sun. | Code path for flybys without `basis_jse` used x,y,z unrotated. | PHIO axes are now inferred from the spacecraft's own Jupiter-centred position (see 3). |
| 3 | A34 moon was anchored at the spacecraft's closest-approach position (a placeholder, 250 km off). | HUD said "moon-centred geometry only". | Moon position = spacecraft JUPCRDS position at CA minus its PHIO offset, with inferred axes (Z = pole, Y toward Jupiter, X = Y × Z). Validation on the 34 passes that have a data-derived basis: the inferred axes differ by ≤ 0.36° for every pass closer than 3.3 radii (G12 0.90°, G9 4.33° at 6.5 and 31 radii). Result: Amalthea 2.537 Rj from Jupiter, Callisto 26.285 Rj. HUD and panel mark it inferred (†) and "held fixed". |
| 4 | Frames were redrawn continuously when nothing changed. | 70 frames in 3 s idle (LOW, SwiftShader). | Render on demand: 0 frames in 3 s idle. |
| 5 | All four moons' 2048-px textures were built in the probe scene although the moons are points there. | 7 textures built, 76.2 s. | Built only when a body spans > 120 px: 3 textures, 54.4 s. |
| 6 | Build canvases kept on the CPU after upload (up to 167,772,160 B). | Round-4 design. | Freed after the GPU upload; no CPU cache. JS heap after the test sequence 64.0 → 42.1 MB. |
| 7 | LOW Callisto olive patches; LOW Amalthea bright rectangle; HIGH Io patches on the noise lattice; HIGH Ganymede uniform sine grooves. | Listed as weak points in rounds 4–5. | Callisto LOW uses 24 colour levels; Amalthea patch is an ellipse; Io patch field is two warped noise fields; groove phase and depth vary. Io still shows some lattice structure. |
| 8 | No keyboard time stepping; no focus ring; play button and speed select had no accessible name; texture-build status invisible on phones. | Code and 390-px screenshot. | ←/→ step 10 s (Shift 60 s); `:focus-visible` outline; aria-labels; `#stat` live region. |
| 9 | 390 px: HUD covered 310 px of a 705-px stage and the time slider was about 80 px wide. | `shots/r6_ui_390.png` before. | HUD capped at 32 % (214 px of 668); slider on its own row. |

## 2. Discrepancies that need Derek's decision (not changed)

1. **A34 label time.** The pack's `ca_label` for A34 reads `2002-11-18T06:18:26`; the trajectory minimum is 2002-11-05T06:18:40 and the ROTATT row used is 2002-11-05T06:18:39.980. 13 days apart. Every other pass agrees to 0–5 s. The panel prints the label string as "basis fixed at CA". Either the label carries this date or the round-1 parser mis-read it; the label must be re-read on the Mac. Until then the string should not be shown as a CA time.
2. **Two radius sets in two products.** The moons viewer uses PDS label radii (Io 1818, Europa 1560, Ganymede 2634, Callisto 2409, Amalthea 86.2 km); the atlas uses its table (1821.6, 1560.8, 2631.2, 2410.3, 83.5). Same closest-approach range, different altitude: I0 900.6 vs 902 km, G7 3101.9 vs 3099, G12 14402.5 vs 14387, G9 79740.8 vs 79656, A34 163.5 vs 158. One set must be chosen for the integrated product, or both shown.
3. **Io flyby altitude.** PDS trajectory minimum 1.4954 Ri = 2719 km from centre (900.6 km above 1818 km). Meltzer gives "890 kilometers (550 miles) from Io"; the press kit plan says "about 1,000 km". Not reconciled; the book figure is not shown in the flyby scene.
4. **Closest sample vs label time.** HUD "CA +0.0 min" is the label time; the trajectory's closest 2-s sample is 0, 1, 2 or 5 s (G9) earlier. Acceptable or to be footnoted.
5. **Other moons are frozen** at their closest-approach positions for each flyby window (about ±30 min; Io moves about 30,000 km in that time). The panel says so. The new shadow test therefore uses frozen positions for the non-target moons.
6. **Amalthea altitude** in the HUD is above an 86.2-km sphere while the body is drawn 125 × 73 × 64 km. Label or change.
7. **GRS longitude** outside 1999-10 to 2001-04 is extrapolated (±11–14° at the ends). Keep flagged illustrative, or omit the spot for those scenes.
8. **Probe base diameter**: 1.2192 m (RP-1130 model scale) vs 1.1284 m (1.000 m² reference area).
9. **Shadow dimming level** (3 %) and whether the shadow readout belongs in the HUD.
10. **A MEDIUM tier** (see 5).

## 3. Numbers rechecked

| Item | Value in viewer | Independent check | Result |
|---|---|---|---|
| Flyby CA times | 36 `tca_ms` | atlas pack `tca_ms` | 36 of 36 identical (0.0 s). Both derive from the same PDS files, so this checks parsing, not the source. |
| Flyby minimum range | `rmin_radii` | atlas `rmin` | agree to ≤ 0.0001 radii |
| Io flyby time | 1995-12-07 17:45:58 UTC | press kit: "10:38 a.m. PST" Earth-received = 18:38 UTC | difference 52 min 02 s, i.e. the one-way light time; consistent |
| ψ rate | 870.4553°/d (entry fit) | System III 870.536°/d (period 9.92492104 h) minus the Sun's apparent motion, about 0.0806°/d at 5.2765 au † | 870.4554; consistent |
| ψ vs atlas | entry fit | atlas ORB00_IO segment | 0.203° apart (pack check field); flyby fits 0.016–0.034° |
| β (sub-solar latitude) | −2.452° (1995-12) … +3.122° (2000-05) … +0.617° (2002-11) | sign change between C9 (−0.236°, 1997-06-25) and C10 (+0.183°, 1997-09-17); maximum 3.12° | consistent with a 3.13° obliquity and the 1997 and 2003 equinox seasons (general knowledge, not fetched) |
| Sun distance | 789,360,467 km = 5.2765 au | NSSDCA perihelion–aphelion 740.595–816.363·10⁶ km | inside the range |
| Amalthea distance (inferred) | 2.537 Rj = 181,400 km † | published semi-major axis about 181,400 km (general knowledge, not fetched) | agrees to the digits shown |
| Callisto distance (inferred, C30) | 26.285 Rj | other Callisto passes in the pack: 26.195–26.273 Rj | 0.012 Rj above the largest |
| Entry time | TIMES.TXT 22:04:43.752 UT | PROBETRJ ET − 61.184 s | 0.017 s apart (pack check field) |
| Probe–orbiter range | 215,255 km at entry; 231,236 km at loss of lock | pack check fields only | not independently checked |
| Spacecraft position vs JUPCRDS | residual max 48–59 km per pass | pack check fields | I25 is an outlier at 218 km |
| G29 shadow | Ganymede and orbiter inside Jupiter's geometric shadow from CA −17 min | G29 is known as an eclipse pass (general knowledge) | consistent |
| GRS longitude conversion | L3 = L2 + 81.245 + 0.266·d | published L2/L3 pairs for oval BA (2000-06-21, 2000-07-28) | 0.2° and 0.0° |
| Texture longitude mapping | texel at azimuth −L3 | mesh check in 5 scenes | within the 6.4° vertex spacing |

Time base. Every clock in the viewer is UTC at the spacecraft (data time). Earth-received times appear only inside quoted document rows and are labelled as such. No Earth-received clock is derived. Light time is not in the data; the only figure is the 52 min 02 s difference above.

HUD values (flyby): range, altitude, moon distance and azimuth at CA were read from the page for all 37 scenes (`r6/audit_run.txt`) and match the pack arithmetic. Probe HUD values were re-run with `r3test.js`; unchanged from round 3.

Not rechecked this round: pressure, temperature, wind, haze and light values against the PDS tables (no file access); they are unchanged since round 3.

## 4. Visualisations and UI/UX

- Layout: no horizontal overflow at 1400, 1024 or 390 px. HUD 400 × 344 px at 1400 and 1024 (52 % of the 664-px stage width at 1024: large). 390 px: fixed as above.
- Contrast against #06080e: text 16.3, muted 7.0, accent 11.2, warn 8.8, ok 12.5, inferred teal 11.4. All above 4.5.
- Keyboard: Space plays, ←/→ step. No keyboard camera control (OrbitControls key handling is off). Scene and follow are native selects.
- Marker thresholds: craft model hidden beyond 6 km, marker shown beyond 0.3 km; moons get a marker below 3 px. Between 0.3 and 6 km both show. Acceptable; noted.
- Labels: craft labels read "(mesh model, illustrative)" / "(voxel model, illustrative)". Sun line "to Sun (JSM X; β fit)". Units present on all HUD values.
- Error states: no WebGL → message; Workers blocked → main-thread build (tested, no errors); software renderer → LOW.
- Wording: no interpretive claims found in HUD or panel. Two places lean on outside knowledge: the Jupiter "colour words" row and the GRS row; both are flagged illustrative where extrapolated.
- Weak: the Sources panel is now very long (about 130 lines in a flyby, more in the probe scene) with no search or grouping. The HUD has no collapse control. Tier buttons are explained only by tooltips.

## 5. Rendering efficiency (SwiftShader, 1400×900, same session, round 5 → round 6)

| Measure | LOW r5 | LOW r6 | HIGH r5 | HIGH r6 |
|---|---|---|---|---|
| Probe +170 s local, ms/frame | 169.4 | 160.5 | 544.3 | 575.7 |
| Probe +700 s local, ms/frame | 131.5 | 123.7 | 803.8 | 834.9 |
| Probe +170 s triangles | 39,680 | 39,680 | 269,892 | 171,588 |
| Probe +700 s triangles | 61,228 | 61,228 | 381,036 | 184,428 |
| E4, Europa local, ms/frame | 37.8 | 34.6 | 442.6 | 328.7 |
| Jupiter local, ms/frame | 39.3 | 40.0 | 344.5 | 379.7 |
| Frames drawn in 3 s idle | 70 | 0 | 10 | 0 |
| 2048-px textures built, probe scene | – | – | 7 | 3 |
| Time to last texture, probe scene | – | – | 76.2 s | 54.4 s |
| JS heap after the sequence | 11.2 MB | 10.6 MB | 64.0 MB | 42.1 MB |

Reading: LOW did not regress. HIGH triangle counts fell 36 % and 52 % in the probe scene but HIGH frame time under software rendering did not improve; it is bound by per-pixel shading at 1400×900, not by geometry. On a hardware GPU the triangle and texture savings should matter more and shading less; this is unmeasured. Timings were taken before the last CSS and aria edits, which do not touch the render path.

Done: render on demand; lazy 2048-px builds; canvases freed after upload; moon level of detail (960 triangles under 60 px); cap grids 160 and 128 (were 256 and 160); adaptive render scale in HIGH-auto (1 → 0.75 → 0.5 → LOW after 3 s of frames slower than 45 ms; untested on real hardware because SwiftShader always selects LOW in auto).

Looked at, not done:
- MEDIUM tier (1024×512 textures, 96-segment moons, mesh craft): about 5.6 MB GPU per body instead of 22.4 MB, a quarter of the build time. Worth adding only if HIGH proves too heavy on integrated graphics; needs a real-GPU measurement first.
- Texture generation on the GPU (render-to-texture): would cut the 54 s software build to well under a second on hardware, at the cost of porting the noise code to GLSL and keeping two copies in step.
- Compressed textures: not available for run-time generated canvases without a transcoder; not worth the bytes.
- Merging draw calls: the probe scene has 25–46 calls, mostly lines and sprites; not a bottleneck.
- Per-frame allocations: `updateWorld` builds the HUD string every drawn frame; with render on demand this now happens only on change.

Lighting: added Jupiter's geometric shadow for moons and the orbiter in flyby scenes (found in G9, E17, E18, E19, G28, G29, A34). Not added: Jupiter-shine on night sides, craft shadows, penumbra. Exposure is the same constant in every HIGH scene.
