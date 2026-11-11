# Multi-circuit data and accuracy — 2026-10-19

Suzuka GP reference length: 5,807 m. Monza GP reference length: 5,793 m. Spa GP reference length: 7,004 m.
Sources: https://www.suzukacircuit.jp/eng/course_s/ and https://www.formula1.com/en/racing/2026/italy

Horizontal geometry and left/right widths: TUMFTM/racetrack-database, tracks/Suzuka.csv tracks/Monza.csv and tracks/Spa.csv, retrieved 2026-10-19 (Suzuka retained from previous build).
https://github.com/TUMFTM/racetrack-database
TUM centerlines are smoothed OpenStreetMap coordinates; widths are image-derived estimates. No surveyed boundaries or exact reference-year configuration is claimed. Local x/z coordinates are mean-centered and axis-reflected; width sides are exchanged consistently with this reflection. Horizontal coordinates are uniformly scaled to the reference lap length including modeled vertical distance. Matching a stated lap length does not validate individual corner geometry.

Suzuka retains the existing original estimated elevation profile and three-dimensional crossover. Monza uses a flat approximation: gravity from its real terrain is not modeled. All banking is unsupported. Sector boundaries are equal-distance thirds, not official timing loops. Start/finish is the dataset origin, approximately located. Suzuka pit lane, kerbs and scenery are schematic; Monza/Spa omit unsupported kerbs, runoff strips, barriers and pit buildings; they do not contribute to the physical model. No map imagery or commercial game assets are included.

Licenses: TUM data LGPL-3.0; underlying OpenStreetMap data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Original CSVs, source README and LGPL/GPL license texts are supplied in each circuit directory. Derived coordinates are supplied in the source download under lib/sim/data. Preserve attribution and applicable share-alike obligations when redistributing these datasets. The application code has its separate project license.

## Spa elevation
Sparse station/altitude facts from the circuit operator's 2026 access map, page 3:
https://www.spa-francorchamps.be/assets/e70cff50-ae5d-4aaa-896b-54c8a953a357/all-plan-acces.pdf
Station m / altitude m: 0/418, 220/424, 310/419, 690/403, 890/391, 1130/415, 1490/446, 2200/463, 2470/470, 2870/455, 3110/438, 3600/402, 4280/377, 4740/375, 5100/373, 5700/388, 6000/398, 6540/408, 7004/418.
The original map/image is not redistributed. Interpolation is our approximate cosine reconstruction, not surveyed geometry. An inferred 170 m shift aligns the TUM La Source apex (~390 m) with the map's ~220 m marker. This alignment is approximate, especially between markers; point indices approximate uniform station before length normalization. Vertical coordinates are relative to 373 m. Grade affects acceleration/braking through the existing gravity term once. Banking, vertical tire-load changes from crests and suspension transients are not modeled. Performance remains uncalibrated.
