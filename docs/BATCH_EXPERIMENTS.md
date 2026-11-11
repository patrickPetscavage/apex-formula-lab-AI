# Automated engineering experiments — 20 October 2026

## Workflow

Open the existing **Compare** workspace, then **Experiment laboratory**. Choose a vehicle, two saved configurations or the current editor setup, and one or more circuits. Name and run the batch. Results appear after each circuit's A/B pair. Cancel terminates the numerical worker immediately; **Retry unfinished circuits** keeps completed pairs and uses the original setup snapshots.

The vehicle selector inside the batch form is independent of the garage selector. To use the SF-26 editor, edit/save its setup in the existing SF-26 workspace, return to the main Compare workspace, then choose SF-26 in the batch form. The current SF-26 draft defaults to the stock setup until edited in this session. Switching garage vehicles cancels a running queue and retains its completed results in session memory. Switching the main Garage/Track/Compare tabs keeps the queue mounted.

Choose **Open telemetry & replay** on a completed row to load that circuit and reuse the existing A/B charts, equal-distance sections, sectors, ghost and playback. A is the row's own configuration A, never an arbitrary historical run. Opening a row requires the batch and any standalone simulation to finish. Changing circuits subsequently hides the old detail until it is reopened. Vehicle configurations are unaffected by circuit selection.

Save the batch explicitly in the browser, or export it before leaving/reloading. Starting another experiment or opening/importing another batch replaces the current session view; save/export first. There is no automatic deletion of saved batches.

## Modes and scientific scope

| Vehicle | Available batch modes |
| --- | --- |
| F2004 | A-optimized shared line; independently optimized A/B lines; shared centerline |
| SF-26 | Shared centerline only |

The controlled optimized mode runs the existing bounded optimizer using A on each circuit, then simulates B on exactly A's sampled path. Independent mode optimizes each setup separately, so its difference combines setup and trajectory adaptation. Identical configurations reuse the same deterministic lap. The optimizer is a local search, not a guaranteed global optimum. Existing standalone custom-line editing/comparisons remain available; choosing custom lines inside a batch is deferred.

Both sides use the same circuit version and environmental assumptions. Every selected setup value remains part of the experiment, including fuel, tire compound and the user-defined surface/tire grip multiplier. No performance bonuses or circuit-specific corrections were added. F2004 and SF-26 retain their separate existing vehicle models; SF-26 has no hybrid deployment, active-aero control or suspension telemetry in this model. This milestone does not change physical coefficients, car geometry or track data. Results remain unvalidated model estimates.

## Identity and execution

- `lib/sim/batch.ts`: validated immutable definition, explicit vehicle/model/circuit versions, trajectory generation policy, solver dispatch, result validation, metrics and explanations. Completed records include both exact sampled trajectories, their recipe IDs, setup snapshots and model versions.
- `lib/sim/batchRunner.ts`: serial circuit queue using the existing `lap.worker.ts` implementation in an isolated worker instance. A unique request number plus a key containing batch ID, vehicle/model, circuit/version, comparison mode and canonical A/B setups guards each reply. There is no batch result cache. Standalone worker caches now include vehicle/model/track version and bound trajectory identity.
- The worker posts configuration A/B progress and a complete pair. A circuit has a 120-second timeout. Worker failures leave an error row, recreate the worker for subsequent circuits, and permit retry. Cancellation/supersession increments a generation guard and terminates the worker. Settled jobs ignore late errors and replies.
- The main renderer's mutable active circuit is never used to label worker results. Results validate their own vehicle, setup, circuit/version and model, plus trajectory geometry, time/segment consistency and controlled-mode path equality before entering the matrix.
- `components/lab/BatchExperiments.tsx`: orchestration UI, reusable detailed comparison, persistence/export controls. Existing editor, graphics and standalone experiment components remain in place.

## Telemetry definitions

Lap delta is `B.lapTime - A.lapTime`; percentage delta is `100 * delta / A.lapTime`, separately for each circuit. No overall ranking or raw cross-circuit time score is shown.

Average speed is actual sampled path length divided by lap duration. Top speed is the maximum sampled speed. Peak braking is maximum net longitudinal deceleration in g (including modeled drag/grade), not an isolated brake-system force; peak lateral acceleration is the maximum sampled lateral acceleration in g. Braking duration sums segment times where modeled brake demand exceeds 1%; full throttle uses modeled throttle at least 99%. Speed-band durations use segment-entry speed: below 150, 150–250, and at least 250 km/h. The matrix shows band percentages; CSV includes seconds. These are discretized model outputs, not measured pedal telemetry.

Sectors and the 12 detailed comparison sections use reference-centerline distance, including when actual trajectories differ in length. They are explicitly approximate equal-distance divisions, not official timing sectors. Explanations report observed top/minimum speed, braking/full-throttle durations and section differences. They do not attribute effects to a particular edited parameter or claim causality from simultaneous changes.

## Storage and compatibility

Existing localStorage configurations, trajectory buckets, baseline data and single-run history remain untouched. The existing single-run history caps storage at 5,000,000 characters; full batch telemetry would quickly consume that budget. Batches therefore use a separate IndexedDB database `apex-batch-experiments`, version 1, with a `batches` object store keyed by immutable batch ID. Equal sampled paths are stored once per archive. JSON (`apex-batch-1`) uses path references and retains full telemetry; CSV is a summary, not a restorable archive.

Saving is explicit and transactional. A conflicting definition with the same stored ID is rejected. Quota, unavailable-storage and transaction errors are displayed; in-memory results and JSON export remain available. Existing saved batches are never automatically evicted. Browser/site data deletion or browser eviction can still remove browser-local data; JSON is the portable backup. Imports are limited to 16 MB and validated for supported schema, versions, setup ranges, result identity, path/corridor consistency and finite telemetry. Imports receive a new batch ID and never overwrite an existing saved batch. Incompatible stored archives are retained untouched and reported rather than silently migrated or recalculated.

Saved custom trajectories now bind circuit ID and track version. Older trajectories migrate in memory only from a known circuit-specific storage bucket. An unbound custom trajectory is accepted by the legacy API only as Suzuka data; it cannot silently attach to Monza/Spa. An old pinned baseline with an ambiguous custom trajectory retains its setup but resets that line in memory with a notice. Bound lines from another circuit are not reused; original stored bytes are preserved. Centerline/optimizer templates remain reusable instructions, bound to the current circuit when executed.

## Verification

```sh
node node_modules/typescript/bin/tsc --noEmit
node tests/run-typescript.mjs verify verify-engineering verify-experiments verify-suspension verify-sf26-simulation verify-motion verify-circuits
node --max-old-space-size=512 tests/run-typescript.mjs verify-batch
pnpm build
node tests/verify-production-worker.mjs
```

Batch tests exercise A/B on all three circuits, repeatability, zero delta for identical setups, both optimization policies, SF-26 restrictions, immutable job snapshots, trajectory rejection/migration, queue cancellation/supersession, settled stale errors, retries, persistence adapters, unavailable/quota storage, validated JSON round trips and metric/section consistency. Production tests execute the actual bundled worker, verify its same-origin asset URL, staged batch messages and identity/version rejection. The older motion regression now uses a 1e-9-second tolerance for a fixed lap-time constant to permit one-ulp JIT rounding; runtime repeated-run equality remains tested.

Browser automation is unavailable in this environment. WebGL rendering, real browser IndexedDB transactions/quota behavior, native download dialogs and click-through playback need manual verification after publication. CPU tests and compilation do not establish that those browser behaviors were tested.

## Remaining work

Custom-line selection per circuit in batches, SF-26 optimization when a suitable model exists, richer parameter-isolated sensitivity experiments, and optional persistent-storage management. No Cesium integration or new circuit data was added.
