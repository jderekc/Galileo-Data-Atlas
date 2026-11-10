# Moons viewer: round-7 audit (2026-11-10)

Build: `moons_viewer.html` sha256 e38290fb567e4b5856f81e7dbd9e3ba5922a54d9c7c24a15d7662551d47a65af (1,718,455 bytes); template c7b2cbd0…; `data/bodies.json` a24148f5….
Backups: `moons_viewer.r6.html` a15b343f…, `moons_template.r6.html` 3383693a….

## What could not be validated, and why

The Mac bridge was down for the whole round (tried at the start, middle and end). No PDS file was re-read. Consequences:

- Label closest-approach strings were not re-read from the `.LBL` files. They are the strings captured in round 1. The A34 question (label content or parser) is still open.
- Moon positions over each flyby window were not extracted from MOONS_TRAJ. Non-target moons move by an inferred rate (below), not from the tables.
- Why the pack has no Jupiter-relative Callisto position for C30 is not established. The PDS volume index lists `MOONS_TRAJ_ORB_30.TAB`, so the file exists; the round-1 builder skipped it either because its orbit-number pattern did not match that file name or because the closest-approach time lay outside the table's time range.
- Probe-scene values were checked against the packed copies of the PDS tables (with their sha256), not against the files.

Prepared for when the Mac is reachable: `device_scripts/build_moons_pack.py` now records every date-time string in each label and the sentence containing "closest approach", computes the modelled closest approach, and writes ±2 h tracks for all four moons per flyby. It parses but has not been run.

What was reachable instead: the PDS data-set description `GO_POS_SC_MOONCRDS_DS.TXT` on the PDS PPI site (read through a summarising fetch tool), which lists a closest-approach time for every pass and the label radii.

## a. Closest-approach times

Scene time zero, the HUD clock offset and the timeline now use the modelled closest approach: the minimum of a least-squares quadratic in distance² over the nine 2-s samples centred on the closest sample. The page value equals an independent numpy fit to 4.5e-10 s and 3.6e-15 radii for all 36 passes.

Columns: closest 2-s sample in the trajectory file; modelled time minus that sample (s); label string minus sample (s); data-set-description time minus sample (s); attitude row minus label-sample time (s).

| Pass | Closest sample (UTC) | Modelled − sample | Label − sample | DS − sample | ROTATT row |
|---|---|---|---|---|---|
| I0 | 1995-12-07 17:45:58 | +0.38 | 0 | 0 | none |
| G1 | 1996-06-27 06:29:06 | +0.67 | +2 | +1 | +0.23 |
| G2 | 1996-09-06 18:59:34 | −0.12 | 0 | 0 | +0.12 |
| C3 | 1996-11-04 13:34:28 | −0.30 | 0 | 0 | +0.33 |
| E4 | 1996-12-19 06:52:58 | −0.27 | 0 | 0 | −0.05 |
| E6 | 1997-02-20 17:06:10 | +0.21 | 0 | 0 | +0.02 |
| G7 | 1997-04-05 07:09:58 | +0.22 | 0 | 0 | −0.26 |
| G8 | 1997-05-07 15:56:10 | −0.44 | 0 | 0 | +0.13 |
| C9 | 1997-06-25 13:47:50 | −0.06 | 0 | 0 | +0.28 |
| G9 | 1997-06-26 17:19:30 | +2.28 | +5 | +5 | +0.22 |
| C10 | 1997-09-17 00:18:54 | +0.77 | +2 | +1 | +0.31 |
| E11 | 1997-11-06 20:31:44 | +0.15 | 0 | 0 | −0.31 |
| G12 | 1997-12-15 09:58:08 | +1.43 | +1 | +1 | −8.30 |
| E12 | 1997-12-16 12:03:20 | −0.15 | 0 | 0 | −0.02 |
| E14 | 1998-03-29 13:21:04 | +1.17 | +2 | +1 | +0.33 |
| E15 | 1998-05-31 21:12:56 | +0.61 | +2 | +540 | −0.27 |
| E16 | 1998-07-21 05:03:44 | +0.75 | +2 | +59 | none |
| E17 | 1998-09-26 03:54:20 | −0.09 | 0 | 0 | +931 |
| E18 | 1998-11-22 11:38:26 | +0.19 | 0 | +390 | none |
| E19 | 1999-02-01 02:19:50 | −0.03 | 0 | 0 | −0.05 |
| C20 | 1999-05-05 13:56:18 | +0.14 | 0 | −1 | −703 |
| C21 | 1999-06-30 07:46:50 | −0.35 | 0 | 0 | +143 |
| C22 | 1999-08-14 08:30:52 | −0.28 | 0 | 0 | +52 |
| C23 | 1999-09-16 17:27:02 | −0.21 | 0 | 0 | +107 |
| I24 | 1999-10-11 04:33:02 | +0.55 | +2 | +1 | −0.02 |
| E25 | 1999-11-25 16:29:04 | +1.25 | +1 | +1 | +44 |
| I25 | 1999-11-26 04:05:20 | +0.87 | +2 | +2 | +128 |
| E26 | 2000-01-03 17:59:44 | −0.70 | 0 | −1 | −0.27 |
| I27 | 2000-02-22 13:46:42 | −0.57 | 0 | −1 | −0.10 |
| G28 | 2000-05-20 10:10:10 | −0.35 | 0 | 0 | +0.23 |
| G29 | 2000-12-28 08:25:26 | +0.71 | +2 | +1 | −0.21 |
| C30 | 2001-05-25 11:23:58 | −0.27 | 0 | 0 | +0.16 |
| I31 | 2001-08-06 04:59:20 | +0.41 | 0 | +1 | +0.08 |
| I32 | 2001-10-16 01:23:20 | +0.56 | 0 | +1 | +0.09 |
| I33 | 2002-01-17 14:08:28 | +0.11 | 0 | 0 | +141 |
| A34 | 2002-11-05 06:18:40 | +0.87 | +1,123,186 (13.0 d) | 0 | −0.02 |

Findings:
- Labels and the data-set description give whole seconds and agree with the modelled time to within 2.7 s for every pass except those below.
- A34: the pack's label string is `2002-11-18T06:18:26`; the data-set description says `2002-11-05T06:18:40`, the same second as the trajectory. The other 35 label strings have the form `YYYY-MM-DD HH:MM:SS`; A34's has a `T`. That points to the label text being different for A34 (not a parser slip), but it is not confirmed.
- Data-set description, three passes flagged there as "encounter lost": E15 `21:21:56` (540 s after the trajectory; the label says 21:12:58), E16 +59 s, E18 +390 s. The trajectory and the labels agree with each other for these; the description table does not.
- G9 (31 radii) and G12 (6.5 radii) have flat minima; the modelled time is 2.28 s and 1.43 s from the closest sample.

Limits, as footnoted in the panel: 2-s samples; quadratic model; labels do not state how their time was derived; PHIO axes in each file are fixed at the file's own closest-approach epoch.

## b. One radius per body

`data/bodies.json` is the only place radii are defined. Verified against JPL SSD (IAU 2015, Archinal et al. 2018) and the NSSDCA fact sheet:

| Body | bodies.json (atlas table) | IAU 2015 mean | NSSDCA | Label unit |
|---|---|---|---|---|
| Io | 1821.6 | 1821.49 ± 0.50 | 1821.5 | 1818 |
| Europa | 1560.8 | 1560.80 ± 0.30 | 1560.8 | 1560 |
| Ganymede | 2631.2 | 2631.20 ± 1.70 | 2631.2 | 2634 |
| Callisto | 2410.3 | 2410.30 ± 1.50 | 2410.3 | 2409 |
| Amalthea | 83.5 (mean); 125 × 73 × 64 | 83.50 ± 3.00 | 125 × 73 × 64 | 86.2 |

One difference: the table's Io value is 0.11 km above the IAU 2015 mean, inside its uncertainty. It was kept as instructed; changing it to 1821.49 is a one-line edit.

Positions are converted to km with the label unit of the file; altitude = centre distance − bodies.json radius. Centre distance is unchanged by this round.

Defect found in the atlas (not changed): its altitude equals `rmin × table radius − table radius`, i.e. it multiplies a distance expressed in label radii by the table radius. The last column reproduces every atlas value to the kilometre.

| Pass | Centre distance km | Altitude before (label radius) | Altitude now | Atlas | Atlas − now |
|---|---|---|---|---|---|
| I0 | 2718.6 | 900.6 | 897.0 | 902 | +5.0 |
| G1 | 3469.0 | 835.0 | 837.8 | 834 | −3.8 |
| G2 | 2895.4 | 261.4 | 264.2 | 261 | −3.2 |
| C3 | 3538.9 | 1129.9 | 1128.6 | 1131 | +2.4 |
| E4 | 2257.1 | 697.1 | 696.3 | 697 | +0.7 |
| E6 | 2151.3 | 591.3 | 590.5 | 592 | +1.5 |
| G7 | 5735.9 | 3101.9 | 3104.7 | 3099 | −5.7 |
| G8 | 4237.2 | 1603.2 | 1606.0 | 1602 | −4.0 |
| C9 | 2821.1 | 412.1 | 410.8 | 412 | +1.2 |
| G9 | 82374.8 | 79740.8 | 79743.6 | 79656 | −87.6 |
| C10 | 2938.3 | 529.3 | 528.0 | 530 | +2.0 |
| E11 | 3608.3 | 2048.3 | 2047.5 | 2049 | +1.5 |
| G12 | 17036.5 | 14402.5 | 14405.3 | 14387 | −18.3 |
| E12 | 1766.0 | 206.0 | 205.2 | 206 | +0.8 |
| E14 | 3209.1 | 1649.1 | 1648.3 | 1650 | +1.7 |
| E15 | 4079.5 | 2519.5 | 2518.7 | 2521 | +2.3 |
| E16 | 3399.2 | 1839.2 | 1838.4 | 1840 | +1.6 |
| E17 | 5147.4 | 3587.4 | 3586.6 | 3589 | +2.4 |
| E18 | 3835.8 | 2275.8 | 2275.0 | 2277 | +2.0 |
| E19 | 3004.4 | 1444.4 | 1443.6 | 1445 | +1.4 |
| C20 | 3724.4 | 1315.4 | 1314.1 | 1316 | +1.9 |
| C21 | 3451.1 | 1042.1 | 1040.8 | 1043 | +2.2 |
| C22 | 4702.3 | 2293.3 | 2292.0 | 2295 | +3.0 |
| C23 | 3455.4 | 1046.4 | 1045.1 | 1047 | +1.9 |
| I24 | 2432.6 | 614.6 | 611.0 | 616 | +5.0 |
| E25 | 10206.1 | 8646.1 | 8645.3 | 8651 | +5.7 |
| I25 | 2121.8 | 303.8 | 300.2 | 304 | +3.8 |
| E26 | 1908.4 | 348.4 | 347.6 | 349 | +1.4 |
| I27 | 2019.3 | 201.3 | 197.7 | 202 | +4.3 |
| G28 | 3442.7 | 808.7 | 811.5 | 808 | −3.5 |
| G29 | 4971.5 | 2337.5 | 2340.3 | 2335 | −5.3 |
| C30 | 2540.9 | 131.9 | 130.6 | 132 | +1.4 |
| I31 | 2014.7 | 196.7 | 193.1 | 197 | +3.9 |
| I32 | 2005.7 | 187.7 | 184.1 | 188 | +3.9 |
| I33 | 1922.8 | 104.8 | 101.2 | 105 | +3.8 |
| A34 | 249.2 | 163.0 | 165.7 | 158 | −7.7 |

The probe scene has no flyby altitude. The viewer and the atlas will agree for every pass once the atlas reads `bodies.json` and converts with the label unit; until then they differ by the last column.

## c. Number validation

| Item | Viewer | Source and row | Result |
|---|---|---|---|
| Io flyby, 1995-12-07 | centre distance 2718.6 km; altitude 897.0 km above 1821.6 km; 17:45:58.4 UTC | `ORB_00_GLL_IOCRDS.TAB`, nine samples around 17:45:58 | — |
| same, Meltzer | "890 kilometers (550 miles) from Io" | SP-2007-4231, ch. 8 | 7.0 km below the viewer's altitude. The book does not say which radius or trajectory solution; "from Io" reads as altitude |
| same, press kit | "about 1,000 km" | Arrival press kit, Quick Look Facts p. 5 | a pre-arrival plan value |
| same, press kit time | "10:38 a.m. PST" Earth-received = 18:38 UTC | same page | 52 min 02 s after the viewer's time: one-way light time |
| same, atlas | 902 km | atlas pack | atlas unit defect above; correct value with its radius is 897.0 |
| Descent rate, entry +700 s | −62.1 m/s | `DESCENT.TAB` row 81 (TIME 529.51 s after MF0), dz/dt | equal |
| Radial velocity, +700 / +1500 / +3500 s | 59.2 / 41.6 / 26.1 m/s | `ASI2REF.TAB` rows 20–21, 40–41, 72–73, RADIAL VELOCITY, linear | equal |
| Wind, +700 / +1500 / +3500 s | 149.3 / 178.4 / 170.9 m/s | `WIND.TAB` rows 710–711, 1910–1911, 4910–4911, WIND | equal |
| Pressure, same times | 2.053 / 5.780 / 19.547 bar | `WIND.TAB` PRESSURE, same rows | equal |
| ψ rate | 870.4553°/d | System III 870.536°/d (9.92492104 h) − 0.0806°/d apparent solar motion † | 870.4554 |
| β | −2.452° … +3.122° … +0.617° | sign change between 1997-06-25 and 1997-09-17; maximum 3.12° | consistent with a 3.13° obliquity (general knowledge) |
| Sun distance | 789,360,467 km | NSSDCA 740.595–816.363·10⁶ km | inside the range |
| Amalthea distance (inferred) | 2.537 Rj | published orbit radius about 181,400 km (general knowledge) | agrees |

Checked against the packed tables only (sha256: DESCENT 85cb03e0…, ASI2REF 16641a9c…, WIND 0413c0ed…, XSEC22 bb72ce65…, TCNF d34afa5f…). Haze and light were not re-derived this round.

Open item found: the HUD's "ASI DESCENT.TAB row" line (pressure, temperature, altitude) uses an every-third-row copy of the table, so it can show a row up to about 13 s from the row used for the descent rate (at +700 s: row 79, 1.998 bar, against row 81, 2.061 bar). Not changed.

## d. Moving moons

- Target moon in each flyby, and all four moons in the probe scene: from the packed 5-minute MOONS_TRAJ samples, linear in distance, latitude and azimuth. Error of that interpolation, estimated by predicting every other sample from its neighbours and dividing by four: Io 0.21 km, Europa 0.31, Ganymede 0.29, Callisto 0.82. (Linear interpolation in x, y would be 8.2 km for Io; cubic is not needed.)
- Non-target moons in flybys: the pack has one table position each. They now move † at the circular-orbit rate √(GM/R³) for that distance, less the rotation of the Sun direction. Against the 34 packed tracks this rate is within 0.45 % of the tabulated rate; after 30 min the position error is at most 111 km (Europa), 70 km (Io), 42 km (Callisto), 19 km (Ganymede). Page check: Io moves 31,155–31,311 km in 30 min across scenes.
- Amalthea (A34) and Callisto (C30): inferred position at the file's closest sample, then moved at the same circular rate (Amalthea 47,425 km in 30 min). Assumes a circular orbit in the equatorial plane.
- The Jupiter-shadow effect was removed (item h), so it was not re-run.

## e–i. Other changes

- Amalthea altitude: above the 83.5 km mean radius, marked `*`, with a note that the body is drawn triaxial with an illustrative orientation. Altitude to the drawn surface was not computed because the orientation is not from data.
- HUD: flyby HUD is 201 px tall at 1400 and 1024 px, 189 px at 390 px (was 344 / 344 / 214). Range is in km; the label-radius figure moved to a tooltip.
- GRS and ovals: unchanged in method (interpolated between published values, extrapolated beyond the outermost ones at a stated rate, so the longitude is continuous); panel wording now says so. Published longitudes were found only for 1999–2001.
- Probe: base diameter 1.26492 m † = 2 × 24.900 in, and nose radius 0.2226 m † = 0.176 × diameter, both from Intrieri (1988), NASA CR N88-24591 (NTRS 19880015207): "r (full scale) = 24.900 inches (0.632 m)", "Rn/d = 0.176". Measured in the page: radius 0.6325 m, height 0.900 m, parachute radius 1.250 m, canopy at 10.12 m (8 diameters). The descent module (0.66 m) stays illustrative.
- Shadow: removed entirely, including the readout and the constant. Judgement: with no HUD readout and no agreed light level, an unexplained darkening would be the only trace of it.
- MEDIUM tier added: 1024×512 body textures built in the background, caps 1024², no normal maps, half-segment craft meshes, 96-segment moons, 128-segment Jupiter, 4,000 stars, pixel ratio ≤ 1.5. Auto: frame probe ≤ 12 ms HIGH, ≤ 40 ms MEDIUM, else LOW; governor steps HIGH → MEDIUM → LOW.

## Measurements (SwiftShader, 1400×900, same session)

| Measure | LOW r6 | LOW r7 | MEDIUM r7 | HIGH r6 | HIGH r7 |
|---|---|---|---|---|---|
| Probe +170 s, ms/frame | 161.5 | 176.5 | 348.5 | 540.2 | 581.6 |
| Probe +700 s, ms/frame | 126.7 | 122.9 | 356.5 | 839.0 | 854.1 |
| E4 local, ms/frame | 39.6 | 36.1 | 146.6 | 331.2 | 332.2 |
| Jupiter local, ms/frame | 43.2 | 39.1 | 156.9 | 380.9 | 385.8 |
| Probe +170 s triangles | 39,680 | 39,668 | 61,756 | 171,588 | 171,588 |
| Probe +700 s triangles | 61,228 | 61,228 | 69,316 | 184,428 | 184,428 |
| Textures built, probe scene | – | – | 1 (12.6 s) | 3 (55.4 s) | 3 (54.4 s) |
| JS heap after sequence | 10.6 MB | 10.6 MB | 21.7 MB | 60.3 MB | 26.0 MB |

LOW at +170 s read 176.5 ms against 161.5 ms for round 6 in this run; the other three LOW views were faster. Earlier same-build runs of this view have ranged 160–187 ms, and LOW draws the same calls and 12 fewer triangles, so this is read as scatter, not confirmed by a repeat. MEDIUM GPU texture memory: 2.8 MB per 1024×512 body, 5.6 MB per 1024² cap (arithmetic).

Tests: 37 scenes × LOW/MEDIUM/HIGH with zero errors; zoomfade, zoomout, r3test, tier clicks (MED/HIGH/LOW/auto) with hash updates, Worker-less fallback, keyboard, 1400/1024/390 layouts: no errors, no horizontal overflow.

## Still open

1. Re-read labels and MOONS_TRAJ on the Mac; run the updated pack builder; replace the inferred moon motion with table tracks; settle A34's label and C30's missing position.
2. Atlas altitude unit defect (table above).
3. Io radius 1821.6 vs IAU 1821.49.
4. HUD ASI row uses a decimated table.
5. HIGH and MEDIUM unmeasured on a hardware GPU; LOW +170 s reading above.
6. Web quotes came through a summarising tool and are not byte-verified (data-set description table, Intrieri report, JPL SSD).
