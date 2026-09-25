# Build 3A — SF-26 research preview

The vehicle selector adds a separate 2026 launch-reference garage preview.
F2004 stays the only simulated vehicle. Its 172 nodes / 110 geometry IDs and
physics remain unchanged. SF-26 adds 65 nodes: 44 selectable procedural geometry
groups, seven internal component entries, and fourteen organizational nodes.
No third-party model or imagery is distributed. Shape, materials and dimensions
are illustrative estimates; no sponsor marks or official CAD claims are used.

Research reference: Formula1.com launch article and front-view imagery dated
23 January 2026. Ferrari's own page was inaccessible to automated inspection.
FIA Section C Issue 20 (published 5 August 2026) was verified on 18 September.
The UI includes source URLs, dates, scope, confidence, units and uncertainty.
Current regulations are not presented as the launch-date rule revision or as
measured Ferrari dimensions. No later race update is represented.

The shared catalog browser and Three.js viewport are reused. SF-26 owns its
catalog and mesh factory. The viewport Setup adapter is ignored by that factory;
SF-26 has null setup defaults and no functional engineering controls. Components
without meshes have explicit hierarchy-only status and disabled geometry actions.

New saved F2004 setups and experiment snapshots carry vehicleId=f2004. Legacy
records with no identity are accepted as F2004 without automatic storage rewrites.
Unknown identities and SF-26 setup/lap data are rejected by validators and the
worker. Opening the preview preserves Home's F2004 setup/results in memory and
pauses playback. Returning restores the same workspace; no cross-car comparison
or mislabeled SF-26 lap result is possible through the preview.

Future work: measured geometry, suspension hardpoints, tire/aero maps, eight-speed
drivetrain, turbo V6 model, energy store and MGU-K deployment/harvesting, active
wing modes. These require separate physics and validation, not renamed F2004 data.
The current preview has no independently simulated components.

Known Work browser WebGL limitation: geometry and interaction transforms are
tested without WebGL; final appearance requires owner inspection in their browser.
