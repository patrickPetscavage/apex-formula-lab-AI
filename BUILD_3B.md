# Build 3B — SF-26 experimental simulation

Reference: 23 January 2026 SF-26 launch. Existing official F1 launch and FIA Issue 20 source links remain in lib/sf26.ts. No new measured Ferrari data or external assets were introduced.

## Dedicated model

lib/sim/sf26Model.ts defines version sf26-ice-fixed-3b.1. The shared forward/backward solver accepts this separate model; its F2004 default is unchanged. Hypothetical defaults: 770 kg car + driver excluding 25 kg constant fuel; 380 kW peak combustion-only effective wheel power; 3.35 m wheelbase; 1.58/1.53 m tracks; 0.355 m rolling radius; 46% front weight; 0.30 m CG; eight distinct estimated ratios and final drive 4.1. These are ESTIMATED hypotheses, not Ferrari measurements or substituted regulation limits.

The model includes axle friction ellipses, simplified tire load sensitivity, quasi-static braking/lateral load transfer, fixed front/rear downforce areas, downforce-dependent drag, an estimated RPM/power envelope, gear selection and a gearing speed ceiling. Mass/fuel, power, aero areas, drag area, grip multiplier, brake bias/ceiling and gearing are functional. Geometry metadata masses do not affect vehicle mass.

No electric deployment, harvesting, battery energy accounting, active-wing transitions, SF-26 suspension telemetry/attitude, damping, differential dynamics, tire degradation, shift delay or fuel burn. Fixed roll transfer follows static axle share, not reconstructed suspension hardpoints. Acceleration load transfer is not resolved as a separate per-wheel transient model. Lap times are uncalibrated experimental outputs.

## Geometry and components

Preserved all 65 previous SF-26 IDs; added 31 visible parts: flap/endplate/support details, seat, steering wheel, mirrors, air intake, four center-lock nuts, rotor bells, brake ducts, uprights and steering/toe links. Total 96 nodes / 75 geometry groups, 152 meshes / 37,310 triangles. Smooth capped body lofts, cockpit recess, curved wing profiles, shaped tires and open spoked rims replace the coarse shapes. Geometry is ESTIMATED. Linkages do not independently articulate or simulate forces. Tires, brakes, engine and gearbox explicitly connect to shared model inputs.

Separate wheel steering and spin transforms use 3.35 m wheelbase and 0.355 m rolling radius; calipers/uprights/ducts do not spin. The baseline ghost has separate geometry. No SF-26 F2004 suspension animation is applied.

## Compatibility

SF-26 setup storage is separate and versioned; experiment storage remains the shared bounded history without eviction. UI lists/imports only the selected vehicle; JSON retains vehicle, model, approximation capabilities, exact setup/path and telemetry. Legacy F2004 records remain readable. In-memory SF-26 session results survive garage/vehicle navigation; persistent history remains authoritative after reload. Invalid or incompatible configurations are rejected. Edited setups never relabel displayed results.

## Verification

Targeted tests cover separate vehicle parameters and model identity, parameter sensitivity, finite extreme runs, acceleration/braking constraints, corridor limits, motion dimensions, snapshot immutability, JSON/history restoration, comparison station alignment, component hierarchy, geometry selection/hide/isolate/explode, deterministic wheel animation, tire contact, F2004 regression, production build and packaged worker.

WebGL appearance remains manually unverified because of the known Work browser limitation. Inspect cockpit/wing/body surfaces, wheel animation and baseline ghost in a normal browser.

Deferred: hybrid energy accounting, active-aero transitions, SF-26 suspension model and articulation, setup-dependent trajectory optimization, calibrated tire/aero/engine data, additional internal geometry.
