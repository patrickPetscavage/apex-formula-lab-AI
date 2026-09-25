# Build 2 source and asset record
Research date: 15 September 2026. Continue Build 1; no imported game models or commercial assets.

## Three historical candidates

| Candidate | Sources / rights | Actual detail and decision |
|---|---|---|
| Ferrari F2004 (2004) | Manufacturer archive: https://www.ferrari.com/en-EN/formula1/f2004 and https://www.ferrari.com/en-EN/history/garage/2004/f2004 . Factual reference only; no Ferrari photographs or geometry redistributed. Official pages require browser verification in this environment; indexed manufacturer specifications were accessible in research. | Selected as a practical **original reconstruction**, not because a complete downloadable assembly was found. 3.0 L V10 and 605 kg baseline reference; manufacturer engine output about 636 kW is crank output, not wheel power. No engine map, aero map or part inventory verified. |
| McLaren MP4/4 (1988) | Official heritage: https://www.mclaren.com/racing/heritage/formula-1/cars/1988-formula-1-mclaren-mp4-4/ ; MemesaMillion https://sketchfab.com/3d-models/mclaren-mp44-f27186936c16497a802f1b30627c1c03 advertises CC Attribution, 3.6k triangles / 2k vertices. https://blendswap.com/blend/18333 advertises CC BY but states converted from rFactor. | Blockbench model is too coarse for intended realism; hierarchy not downloaded or inspected, so no internal assembly claim. BlendSwap game conversion rejected regardless of uploader’s license label. Paid CGTrader alternatives were not purchased. |
| Lotus 49 / 49C (1967–70) | Sketchfab search surfaced “Formula 1 || Lotus 49c” by dark_igorek, advertised CC Attribution, plus printable toy replicas. Model-level rights, accessible download and full hierarchy were not verified. These are **leads**, not cleared assets. | Exposed engine/suspension make it promising, but no complete usable CAD assembly was established. No files imported. Further licensing and topology inspection required before use. |

No candidate supplied “every part.” Only the geometry authored for Build 2 has been inspected programmatically. Its 94 IDs contain genuinely separate meshes but are functional assemblies, not every fastener. External aesthetic proportions have medium confidence; internals low confidence. Stable legacy IDs `halo` and `battery` now map to mirrors/cockpit surroundings and electronics respectively, not nonexistent historical hybrid equipment.

## Implemented car
All meshes and surface textures authored in components/lab/car.ts. Reconstruction targets: wheelbase 3.05 m, front/rear wheel-center tracks 1.470/1.405 m, nominal 13-inch rims, tire radius 0.33 m. These are targets, not dimensional certification. Fine contours, mounting locations, wing cross sections, tire widths and internal packaging are approximations. Reference lookup also consulted https://www.f1technical.net/f1db/cars/873/ferrari-f2004 as a secondary cross-check; headline engine/mass context is manufacturer-based, and geometry remains explicitly reconstructed rather than verified.

No trademarks/logos, sponsor textures, third-party images, commercial CAD or game geometry embedded. Original geometry and texture-generation code are provided in full for modification. Software dependencies retain their licenses; Three.js (including RoomEnvironment) is MIT. See THIRD_PARTY_NOTICES.md.

## Suzuka
https://github.com/TUMFTM/racetrack-database, tracks/Suzuka.csv, LGPL-3.0 repository. Downloaded and parsed 1,161 rows. Original CSV, README and license texts included. Underlying OSM centerline attribution and ODbL obligations retained: https://www.openstreetmap.org/copyright . Public derived data is available alongside raw input. Read public/data/suzuka/NOTICE.md.

Plan shape follows full GP layout including Esses, Degner, hairpin, Spoon, 130R, chicane and grade-separated crossing. Reference length target 5,807 m. Source does not establish an exact survey year; do not label it a 2004 survey. This is a modern-layout historical-car sandbox. Crossing found by segment intersection near input indices 509 and 984. Added elevation is original estimated geometry with roughly 8 m road-to-road clearance; it is not a measured Suzuka elevation model. Width is upstream derived data; buildings, pit lane, barriers, curbs, Ferris wheel and terrain are schematic, approximately placed and not period authenticated. No satellite/map imagery redistributed.

## Telemetry
https://openf1.org/docs/#location : modern data from 2023 onwards, location about 3.7 Hz with acknowledged insufficient lateral detail for precise racing lines. No matching 2004 driver lap sourced. No driver telemetry embedded, no Max Verstappen attribution, no invented gear/throttle. Both cars use a fixed geometric centerline, not an optimized racing line. Three sectors are interpolated equal-distance thirds, not official timing lines.

## Follow-up research, 16 September 2026
- Ferrari manufacturer indexed specification explicitly describes independent pushrod / twin-wishbone / torsion-bar front suspension. No coil springs were fabricated on the model dampers.
- Brembo: https://www.brembo.com/en/news-archive/20-years-f1-brake-discs . Used to inform carbon friction faces and radial ventilation architecture. Vent count, dimensions and carrier placement in this reconstruction are estimates, not an exact F2004 brake drawing. No photographs reused.
- Suzuka official guide: https://www.suzukacircuit.jp/eng/course_s/ verifies 5.807 km, 18 four-wheel corners and nominal width 10–16 m. TUM width estimates differ locally (some below 10 m); retain the original derived data and disclose that mismatch rather than silently invent surveyed boundaries.
- Official F1 circuit description: https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-suzuka-circuit.2BbgsRdkeux78UBGbmYiZV ; supports section identity and figure-eight layout, not precise elevation.
- A further F2004 download by Dave Love / Tyler_Dave was found: https://sketchfab.com/3d-models/2004-ferrari-f2004-827e64acecba4f008759ae30a5bfeecc . Direct page access was denied; original authorship, model license and hierarchy could not be inspected. Not imported. An advertised downloadable asset is not sufficient proof of redistribution rights.

The 94 authored parts include separate uprights, hubs, tie rods, torsion-bar rockers, dampers, ducts, steering wheel/column/rack, driveshafts, differential casing, cylinder heads, exhaust banks and bargeboards. These are engineering-informed reconstructions with low confidence in exact shape, not authentic machined-part CAD.
