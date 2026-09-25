# Build 2B — engineering experiment workflow

## Implemented
- Existing car, 94 components, Suzuka mesh and stable IDs preserved.
- Track corridor derives left/right boundaries, widths, heading and distance from existing map data. Elevation remains estimated; banking is explicitly zero (unknown).
- Optimized line: geometric seed plus deterministic, overlapping multiscale lateral perturbations. 163 full-lap evaluations, selecting lowest simulated time, retaining centerline as a fallback. The candidate support spans neighbouring corners; there are no hand-picked apex points. Local search, not a global optimum.
- Each sample reserves 1.2 m between car center and boundary (0.9 m approximate half-width + 0.3 m margin). This does not establish swept-body clearance under large slip angles or full collision physics.
- Multiple named browser-saved lines; centerline, optimized and user-edited options. 24 smooth control offsets, legacy 12-control imports retained. “Edit last simulated line” resamples to controls, so it is an approximation of the optimized samples.
- Shared-line A/B holds the baseline-setup path fixed. Independent mode uses each configuration's selected line and optimizes each when “Optimized” is selected. Centerline comparison retained.
- Baseline snapshots persist setup, name and selected trajectory in browser storage. Existing named configurations serve as experiments or selectable baselines.

## Physics actually modeled
Quasi-steady lateral speed bounds plus convergent forward acceleration/backward braking passes. Effective wheel-power envelope, individual gear ratios/final drive/rev limit, drag, front/rear downforce, fuel/ballast mass, static weight distribution, CG height, along-road gravity, rear-wheel traction, brake-bias allocation and braking load transfer. Backward limits evaluate both segment endpoints to prevent combined-grip overshoot.

Replaceable vehicle.ts contains estimated per-tire load-sensitive force curves at a fixed reference normal load. Front/rear spring and anti-roll effective wheel rates set roll-stiffness distribution and lateral load transfer; no spring geometry or heave dynamics are claimed. Tire pressure has a hypothetical optimum at 21 psi, camber a hypothetical lateral optimum at −2.5 degrees with longitudinal loss, and toe increases equivalent drag area. All are sensitivity approximations, not measured F2004 data. Damping, differential locking, transient slip/yaw, tire heat/wear, fuel burn, banking forces, vertical crest loads and shift delay remain unsupported.

Forward traction uses quasi-steady rear axle loading; acceleration-induced longitudinal load transfer is not modeled. Brake system ceiling applies to tire demand; aerodynamic drag can produce greater total deceleration.

## Telemetry
Speed and delta overlays plus selectable throttle/brake demand, gear, RPM, longitudinal/lateral/combined G, steering magnitude, axle aero load, total downforce, drag, estimated grip utilization and lateral offset. Click charts or use the station scrubber to move playback/map position. Distance alignment and sector divisions use common reference track stations, avoiding mismatched sector locations for different paths.

Throttle/brake are inferred from the calculated force requirement, not measured driver inputs. Steering is atan(wheelbase × curvature) magnitude. Axle friction-ellipse utilization is estimated. No claims of team-grade predictive accuracy.

## Verification and remaining gate
Type checking and regression scripts:
- tests/verify.ts: deterministic simulation, timing, sensible mass/power/grip/drag trends, imports, geometry compatibility.
- tests/verify-engineering.ts: new parameter sensitivity, all-min/all-max finite/convergent laps, combined grip, optimized improvement, corridor bounds, setup-dependent paths, common station closure.
- Existing geometry/scene and production-worker regression scripts retained.

Default model result: centerline 108.593402 s; optimized 107.368174 s (1.225228 s improvement). Offsets span roughly −3.271 to +3.271 m. These are model estimates, not observed lap times.

Browser: front wing 18→24 changes lap and overlay; synchronized end-of-lap seeking works. Pinning the current setup gives equal A/B results; editing and saving a custom line in independent mode produces a distinct lap with rendered overlays. The managed browser cannot create WebGL, so visual car/track rendering remains unverified and publication is held pending that required check or explicit user waiver.

Highest-value next work: calibrate aero/tire/engine maps against measured data; inspect line placement and corner-level traces in WebGL; add finer adaptive trajectory controls and convergence diagnostics before adding transient dynamics.
