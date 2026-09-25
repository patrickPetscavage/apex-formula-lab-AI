# Build 2F — derived suspension telemetry

Lap solver/model version remains `apex-qss-2b.1`. A separate optional telemetry
block, `apex-quasistatic-2f.1`, is added only to completed worker results, not
optimizer candidates. Old saved runs are not enriched or rewritten.

## Model (DERIVED / ESTIMATED)

Wheelbase 3.05 m; front/rear track 1.47/1.405 m. Existing effective wheel rates
are N/mm; no additional motion ratio is applied. Static normal load is
mass × 9.81 distributed by the setup weight balance. Static spring preload is
the reference position; static sag per wheel would be static load / wheel rate.

Front axle load = static front weight + front aero − mass × ax × CG height / wheelbase.
Rear axle receives the opposite transfer. Lateral moment = mass × signed ay × CG height.
Front roll share = (front spring + front anti-roll rate) × front track² divided
by the corresponding sum over both axles. Each axle's side-to-side shift is
its share of lateral moment divided by track width. Positive curvature turns
toward the car's local −X (left); right wheels load up.

Displacement decomposition before the validity bound:

- Axle heave: axle aero / (2 × axle wheel rate).
- Longitudinal pitch contribution: −transfer / (2 × front rate), +transfer / (2 × rear rate).
- Roll contribution: ± axle lateral shift / (spring + anti-roll rate).
- Total corner compression: axle heave + longitudinal contribution + roll contribution.

Chassis heave is interpolated between front/rear mean compression at local Z=0.
Pitch and roll follow the resulting support plane. Compression is positive;
braking nose-down pitch is negative, and left turns produce negative body roll.
Zero wheel load is permitted. Infeasible negative loads are redistributed within
their axle while conserving total vertical load, and flagged (warning bit 1).
An estimated travel envelope min(25 mm, ride height − 12 mm), at least 5 mm,
uniformly scales displacement when exceeded; warning bit 2 exposes this limit.
This is a bounded estimate, **not** a bump-stop/bottoming or wheel-lift solver.

## Rendering and limitations

Physical 1× only. Road-supported wheel pivots stay on the sampled road plane;
the sprung-body group moves around them, giving relative wheel/body travel.
Spin, camber, toe, calipers, selection and exploded geometry are preserved.
Transforms are absolute functions of the shared playback cursor, not frame-integrated.
Unknown derived telemetry versions are readable for comparison but not animated.
Detailed wishbone/pushrod/rocker/damper-shaft/tie-rod articulation is deferred;
these meshes follow the body rigidly, except existing wheel-mounted steering arms.

No per-wheel terrain/banking surface, unsprung-mass split, geometric roll centres,
third springs, damper dynamics, tire deformation, compliance, thermal behavior or
transient chassis oscillation. Flat-road weight conservation ignores vertical
acceleration/grade corrections. Nothing here improves calibrated F1 prediction
or changes lap results. The 172-node hierarchy and 110 geometry IDs are unchanged.

New JSON retains the optional versioned samples; new CSV adds units-bearing
columns and a validity bit mask (1=lift, 2=travel bound, 3=both). Old files remain
readable with unavailable suspension channels. Browser history limits remain
unchanged; full storage reports an error without deleting previous runs.

Automated WebGL remains unavailable in the Work browser. Numerical and Three.js
transform tests cover this milestone; final visual checking is left to the owner.
