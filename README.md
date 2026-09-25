# APEX Formula Lab — Build 3B

For GitHub Pages deployment, follow [GITHUB_PAGES.md](GITHUB_PAGES.md). Current vehicle/model details are in [BUILD_3B.md](BUILD_3B.md). Use `pnpm build:pages` for the static website.

---

## Earlier documentation

# APEX / Formula Lab — Build 2B

A working browser engineering sandbox: 94 individually selectable 3D components, a parametric setup editor, configuration storage/import/export, worker-based lap simulation, 3D lap playback, and baseline telemetry comparisons.

## Start locally

Requires Node.js 22.13+ (Node 24 recommended) and pnpm matching `packageManager` in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by the server. WebGL hardware acceleration is needed for the 3D views. The simulation and editor do not require API keys or a paid service. Configuration storage belongs to the browser and origin; export JSON before clearing browser data.

For a local production build:

```sh
pnpm build
pnpm start
```

This project uses React, TypeScript, Three.js, Recharts, and the Vinext/Cloudflare Workers starter. The deployment helper may select environment-specific build behavior; portable commands are documented in `scripts/`.

## Use it

1. Select F2004, the one implemented historical reconstruction.
2. Click a component or use the searchable assembly tree. Orbit, pan, zoom, isolate, hide, or separate the model with Exploded view.
3. Edit its controls or open **Full setup**. `Simulated` controls affect the lap model; `Visual / stored` controls do not.
4. Save named browser configurations, duplicate them, or export/import versioned JSON.
5. Run simulation. Track playback supports chase, onboard-style, overhead, scrubbing, rate changes, and a baseline ghost.
6. Open Compare for speed, time delta, and equal-distance sector comparisons. Changing setup after a run marks results stale until rerun.

## Architecture

- `app/page.tsx`: workspace, persistence, history, worker lifecycle, playback UI.
- `components/lab/Viewport.tsx`: Three.js scene, picking, camera modes, track display.
- `components/lab/car.ts`: independent procedural mesh assemblies and visual parameter updates.
- `lib/components.ts`: 94 stable component IDs, parent assemblies, role, approximate mass, geometry references, parameter dependencies, provenance.
- `lib/sim/setup.ts`: schema/ranges, import validation, illustrative aero and grip coefficients.
- `lib/sim/track.ts`: TUM/OSM-derived Suzuka, estimated elevation, distance and curvature.
- `lib/sim/physics.ts`: deterministic closed-lap forward/backward solver and consistent playback interpolation.
- `lib/sim/lap.worker.ts`: numerical calculations off the UI thread.
- `components/lab/Telemetry.tsx`: synchronized numerical charts.
- `components/lab/Research.tsx`: user-facing assumptions, sources and roadmap.

## Verification

```sh
pnpm exec tsc --noEmit
pnpm exec tsc tests/verify.ts --outDir /tmp/apex-tests --module commonjs --moduleResolution node --target es2022 --esModuleInterop --resolveJsonModule --skipLibCheck
node /tmp/apex-tests/tests/verify.js
node tests/verify-model.mjs
node scripts/export-track.cjs
pnpm build
node tests/verify-production-worker.mjs
```

Tests cover deterministic runs, convergence, lap/sector closure, playback distance consistency, lateral grip, mass/power/grip trends, a controlled straight-line drag comparison, unsupported parameter invariance, invalid configuration rejection, JSON round trip, and unique component IDs.

## Scope and accuracy

Research date: 15–16 September 2026. Ferrari F2004 (2004) reference reconstruction; no factory CAD. The original 58 IDs remain compatible, with 36 additional parts. Separate material families, grooved tires, hollow spoked wheels and a schematic V10 replace the modern representative body. Suzuka’s full Grand Prix plan and widths come from TUM/OSM data; elevation and scenery are estimated. Choose a common trajectory for setup isolation or compare the modified trajectory with the baseline centerline. Centerline, bounded smooth generation and saved editable trajectories are available. The bridge has distinct upper and lower road levels. Gravity uses the estimated grades.

The car is not a complete assembly and the physics is unvalidated. Base mass is 605 kg plus fuel and added mass; default peak effective wheel power 600 kW is estimated. Aero, load-sensitive tires, seven gear ratios and internal component dimensions are schematic or illustrative. Camber/pressure use estimated grip curves; toe adds estimated scrub drag; effective spring/anti-roll wheel rates affect lateral load transfer; brake bias, static front mass, CG height and final drive are modeled. No measured driver trajectory, CAD editing, CFD, thermal model, damping or transient suspension dynamics.

Build 1 JSON configurations remain readable with unchanged parameter ranges, but run under the new car and track assumptions. Old lap results are not comparable. Reset restores Build 2 defaults. The internal legacy halo/battery IDs now identify historical mirror and electronics assemblies; they do not imply a halo or hybrid energy store.

Rendering needs WebGL. Balanced/High quality changes pixel and shadow resolution. All data is local; no external model download is needed at runtime. The runtime gracefully reports unavailable WebGL and keeps editing/simulation operational. The numerical worker uses a bundler-generated same-origin URL; a production regression test checks the shipped artifact and executes it.

Read `docs/METHODS.md`, `docs/SOURCES.md`, `docs/VERIFICATION.md`, `docs/ROADMAP.md` and `THIRD_PARTY_NOTICES.md`. Complete input and derived Suzuka databases and licenses live in `public/data/suzuka/`.

Component → model → lap → telemetry relationships are recorded per part with parent IDs and mounting references. Mechanical assemblies are extensible; unsupported parameters are explicit. This is a digital-twin-style **architecture**, not a validated digital twin. No manual steering/throttle driving mode has been implemented; the drivable-looking playback is numerical lap replay.

Trajectory controls are in Track. Select Optimized racing line, or Editable trajectory, edit 24 offsets (metres, positive right), name and save it. Run simulation again. Comparison charts align by reference-track station, not equal elapsed time. The baseline ghost follows its own path at the same elapsed time.

## Build 2B

See docs/BUILD-2B.md for new physics, bounded lap-time search, telemetry, A/B modes, validation and limitations. The default line now uses the optimization worker. Baselines are named snapshots saved in browser storage. Old setup JSON fills new fields with defaults; old 12-control trajectories remain supported.
