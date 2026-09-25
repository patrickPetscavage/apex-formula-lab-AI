# Build 2D — driving motion and wheel-end detail

Rendering only; physics/model version and saved experiment schema remain unchanged.

- Shared absolute playback clock feeds the renderer every frame and HUD/telemetry at up to 30 Hz. Pause, rate changes and seeks re-anchor the same clock; slow frames no longer discard simulation time.
- Position stays exactly on the sampled simulation polyline. Heading/pitch interpolate neighboring segment directions using shortest-angle interpolation, including the lap seam. There is no positional spline or temporal lag filter.
- Trackside camera interpolates its look-ahead station instead of jumping one sample at a time.
- Separate steering, camber and spin pivots. Tire/rim/hub/rotor/bell spin by distance divided by an estimated 0.33 m rolling radius. Calipers, uprights, ducts and bearings do not spin. Both cars animate from their own saved laps.
- Front steering is a signed curvature / 3.05 m wheelbase kinematic visualization, not a tire-slip or steering dynamics solution. Both front wheels use the same curvature angle plus existing toe; no Ackermann model.
- Tire profile/camber sets wheel-center support height. Removed fixed above-road render lift; ride height no longer raises hubs independently from tires. Pitch follows estimated track elevation. Contact remains a geometric approximation: no tire deformation, banking forces, per-wheel terrain/suspension solver or crest dynamics.
- 16 schematic selectable parts (four corners each): hub bearing, rotor bell, caliper bridge, steering/toe arm. 110 selectable parts total; 114 batched meshes, 130,290 triangles. Existing IDs preserved. New geometry/mass are explicitly estimated, with parent/mount relationships and no independent physics controls. Part metadata is not an additive vehicle mass budget.
- Inspector distinguishes visual/hierarchy representation from shared model inputs and independent component physics.

Verification: TypeScript, motion/clock invariants, exact path position and boundaries, heading seam/wrap, wheel/caliper transforms, geometry, estimated flat-road contact at multiple camber/ride-height settings, existing engineering and saved-experiment regressions, production build and worker.

Automated WebGL rendering is unavailable in the Work browser. No visual success is claimed; final wheel/road appearance and camera smoothness require a normal WebGL-capable browser.

Deferred: suspension travel/body roll, Ackermann/link articulation, deformable tires, banking/contact dynamics, damping and differential dynamics. Existing quasi-steady physics and all Build 2C persistence/export functionality remain intact.
