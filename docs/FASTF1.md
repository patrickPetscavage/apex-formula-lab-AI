# Historical FastF1 research and race scenarios

This milestone adds `/history` and `/predictions`. Both are linked from the existing garage. Existing F2004/SF-26 setup, physics, single-run history and batch experiments remain separate.

## Run locally

Use Node 22.13+ and the package manager version in package.json. On this Windows checkout the Sites installer required WSL, which is unavailable; the locked dependency installation succeeded through an npm-exec pnpm bootstrap. Dependency versions were not changed.

```powershell
node scripts/dev-node.mjs
```

Open the printed local URL, then Historical Data. This Node preview avoids a native Cloudflare workerd development failure observed on this Windows host. `node scripts/run-framework.mjs dev` remains the normal Cloudflare-backed preview. Production builds still use Cloudflare:

```powershell
node scripts/run-framework.mjs build
```

The development optimizer also stalled during verification on this host. The built application was successfully served and inspected using the portable Vinext production server instead:

```powershell
node node_modules/vinext/dist/cli.js start --port 5174 --hostname 127.0.0.1
```

Both `/history` and `/predictions` returned HTTP 200. Their empty-library states were visually inspected at desktop and narrow panel widths, IndexedDB initialization enabled import/training controls, navigation worked, and the shipped research worker displayed the expected actionable error when asked to train without sufficient events. Real-data replay/ghost rendering is still pending an authorized session archive. Production-server local imports work; the development-only local index middleware is not part of this production server.

The source export was missing `.openai/hosting.json`, despite importing it in vite.config.ts. A local manifest with null storage bindings was added. It has no invented Site/project ID. No hosted deployment is claimed; publishing needs the actual hosting identity and source linkage.

## Ingest authorized historical data

```powershell
python -m pip install -r requirements-fastf1.txt
python -m fastf1 auth f1tv --authenticate
python scripts/fastf1_ingest.py --years 2024 --circuits suzuka monza spa --session Q --telemetry-drivers 4
python scripts/fastf1_ingest.py --years 2019 2022 2023 2024 --circuits suzuka monza spa --session R --telemetry-drivers 0
```

FastF1 3.9.0 includes a local F1 authentication flow. Authenticate in your own terminal; never enter passwords/tokens into Apex, source files, exports or chat. Authentication state belongs to FastF1's local user store. No token is copied into website code. Authorization/subscription requirements are controlled by the provider.

The first attempted real session was 2024 Japanese qualifying. The official static endpoint returned HTTP 401 and FastF1's configured mirror returned 404. Consequently, no real-data archive or fitted real-data model was produced during that attempt. Implementation tests use clearly identified synthetic fixtures only in `tests/`; they are not shipped as historical data. Finish the real-data verification after signing in locally.

Inputs are checked **before** any session/schedule request: only 2018–2024, known circuits, and known session codes. FastF1 timing/telemetry availability starts in 2018; the website does not imply that F2004 telemetry is available. Session and per-sample UTC dates must also precede 2025. Cache contents, browser imports, indexes and model lineage undergo date checks. Retrieval timestamps can be later than 2024; they are not observation timestamps.

For an authorized existing cache:

```powershell
python scripts/fastf1_ingest.py --years 2024 --circuits suzuka --session Q --cache-dir C:\path\to\cache --offline
```

Offline mode never requests network data. A cache from an incompatible FastF1 version may need regeneration; version checks are not disabled. Default cache is `.fastf1-cache/pre2025-v1` and is ignored by source control.

Default telemetry export selects the fastest accurate, non-deleted, non-pit lap for up to the requested driver count. Download a particular driver/lap with:

```powershell
python scripts/fastf1_ingest.py --years 2024 --circuits monza --session R --drivers LEC NOR --laps 10 20 --telemetry-drivers 2
```

At most twenty driver/lap traces are exported per session. All lap timing rows, results and available weather observations remain in the archive. Missing/failed telemetry produces explicit warnings; it is never generated or zero-filled. Timing-only ingestion avoids the large car/position download for model training.

Files land in ignored `data-local/fastf1`, outside public website assets. The **Load local / hosted sessions** button reads a validated local index in development, or import the JSON files directly. Multiple files and exported whole libraries are accepted. IndexedDB saves the library in `apex-historical-research-1`, independent of existing simulator storage. Transactions are explicit; storage failures retain in-memory data and offer JSON exports. A different version of an already-loaded session is rejected until the library is explicitly cleared. Exports are the portable backup.

The Vite development middleware serves only exact supported pre-2025 session filenames and validates every response. There is no arbitrary URL proxy or backend endpoint that can request future sessions. Production contains an empty public index by default and uses local JSON import; it cannot run Python. If you have rights to host datasets, deploy authorized archive files and their index to `public/data/fastf1` before building. Browser validation still applies. Do not copy authentication caches into public assets.

## Telemetry and comparison methods

Archives keep separate original car/position time bases, source UTC timestamps, session times and FastF1 Source fields. Speed is km/h, throttle percent, RPM rev/min and gear an integer. Brake is boolean activation, **not measured pedal pressure**. FastF1 already parses/corrects the upstream timing stream; “source” does not mean unprocessed factory telemetry. Missing values are JSON null. Integrated distance is calculated by FastF1 from car speed. The exporter does not resample/merge the two streams.

Historical replay linearly interpolates source XY and continuous car channels at elapsed lap time; gear and brake use the previous sample. Gaps larger than two seconds and intervals outside available position/car data are hidden/marked unavailable. Historical lap durations and official sectors remain intact. The displayed plan uses broadcast XY in its source orientation and decimetre units; this is not surveyed GPS, elevation or a new track map. No position rotation/scale fit is claimed.

Charts normalize each lap's integrated speed distance between its first/last available samples to the matching reference circuit length. Thus normalized station is approximate and endpoints omit source start/finish gaps. Sampling gaps, endpoint gaps and distance mismatch are shown; none is a bound on position accuracy. Circuit ID, original year/session and map version are retained. Suzuka's crossing is not resolved through nearest-point projection, which could confuse its two road levels.

The comparison button executes the existing F2004 numerical worker on the selected circuit centerline. Historical observations are not converted into fabricated `Lap` physics inputs. The physics ghost is projected onto the first historical lap's shape using normalized station for visualization. A manual station offset is available. This does not establish exact start/finish correspondence between the TUM/OSM map and broadcast telemetry. Official sectors are shown only for real data; old physics sectors remain equal-distance approximations.

The experimental calibration searches 25 combinations of effective wheel power (350, 450, 550, 650, 700 kW) and grip multiplier (0.8–1.2), leaving other default F2004 inputs fixed. It minimizes aligned speed RMSE and reports another selected lap's error separately when available. The result owns its exact setup/trace identity. This is an illustrative **cross-era effective fit**, not an identification of actual F2004 power, tire properties or factory setup. Another lap in the same event is not independent event validation. Nonidentifiability, missing fuel/aero/geometry information and approximate station alignment prevent a validated digital-twin claim. No SF-26 physics is calibrated or relabeled.

## Regression and prediction scope

Training runs in `research.worker.ts`. It uses race sessions only, and requires at least five events plus minimum lap counts. Quality filtering uses accurate, non-deleted dry-compound laps under clear track status, excluding first/pit laps and gross event-relative time outliers. Those filters define retrospective evaluation eligibility; target-event outcomes are not prediction features. A nominal scheduled distance of 53 laps for Suzuka/Monza and 44 for Spa supplies race-progress fractions, instead of using the actual future completed distance of a shortened race.

Target is log clean lap duration in seconds. Features are intercept, year, planned race progress, planned tire age and its square, plus circuit/driver/compound categorical offsets. Public telemetry does not identify fuel loads, suspension settings or aerodynamic coefficients; those are not invented regression features. This is associational pace estimation, not a causal estimate of changing tires or driver/car performance.

Events are ordered by session timestamp and split approximately 60/20/20 with at least three training events, one validation event and one test event. No laps from an event cross split boundaries. Vocabulary comes from training only. Ridge λ in [0.01, 0.1, 1, 10] is selected on validation MAE, then coefficients are fit on train + validation. Test laps never fit coefficients or tune λ. A circuit-specific development-median (global median fallback) is the baseline. Test MAE, RMSE, sample/event counts and the empirical 90th percentile absolute test error are displayed. Test error envelopes are descriptive, not guaranteed confidence intervals, and cannot be multiplied into a valid race-total probability interval.

The exported model retains source archive hashes, split IDs/dates, λ, feature order, coefficients, baselines and metrics. SHA-256 values are ingestion fingerprints; browser imports validate schema/identity but do not establish a digital signature or independent authenticity. Imported model metrics are supplied claims until recomputed from their datasets. Repeating training on identical archives is deterministic apart from the `createdAt` timestamp.

The scenario date must follow the last development event. This prevents applying a model trained on a later race as a supposed earlier pre-race prediction. A future hypothetical target date is allowed through 2035, but never downloads or consumes 2025+ observations. Its year feature is held at 2024. This is an experimental transfer of historical-era pace assumptions, not a current-car or SF-26 forecast; no SF-26 identity is assigned.

## Ghost races

One to eight named ghosts retain independent colors, drivers and planned compound/stint settings. One optional pit stop resets planned tire age. Pit loss, pace offset and weather penalty are explicit user-defined seconds, not learned engineering effects. No actual target-event weather or safety-car timing is injected. Tire-age, year or shortened race scenarios beyond the development distribution can extrapolate poorly.

The model predicts lap duration, not intra-lap velocity. Ghosts move schematically at constant progress along the map-derived reference centerline per predicted moving lap and dwell at the finish for assumed pit loss. They do not show a learned corner-speed trace. A leaderboard compares progress, same-progress arrival gaps, laps and projected total. Predicted lap durations are charted. No traffic interaction, overtaking, collision, launch, pit-lane geometry, safety cars, failures or penalties are modeled. Finishing order is an independent scenario ordering, **not an evaluated full-race outcome forecast**.

Running a scenario freezes its model, settings and circuit identity. Later edits show a stale-results notice and never relabel those snapshots. Save/restore recomputes from the frozen model/settings; exports include them, output arrays and exact reference trajectory for reproducibility. Existing physical setup controls remain in the engineering garage; statistical ghosts do not pretend to use unsupported wing/suspension knobs.

## Verification

```powershell
python -m unittest discover -s tests -p test_fastf1_ingest.py
node node_modules/typescript/bin/tsc --noEmit
node tests/run-typescript.mjs verify-research
node scripts/run-framework.mjs build
node tests/run-typescript.mjs verify-research-worker
node tests/verify-production-worker.mjs
node tests/run-typescript.mjs verify verify-engineering verify-experiments verify-suspension verify-sf26-simulation verify-motion verify-circuits verify-batch
```

`verify-research` also validates any real `data-local/fastf1` session archives; with at least five race archives it fits/evaluates a real model and writes `data-local/evaluated-model.json`. Without those files, numerical checks use test-only synthetic fixtures and report zero real archives explicitly. Production-worker tests execute the shipped bundles rather than a replacement worker implementation.

Remaining evidence needed after authentication: successful actual session ingestion; real-data model metrics and coverage; browser click-through with real telemetry, IndexedDB quota/download behavior; cross-era calibration sensitivity review. Passing synthetic checks establishes implementation invariants, not forecast accuracy.

## Sources and rights

- [FastF1 documentation source / data reference](https://github.com/theOehrly/Fast-F1/blob/master/docs/data_reference/index.rst): availability and channel classes.
- [FastF1 source and documentation](https://github.com/theOehrly/Fast-F1): session loading, original car/position streams, caching and local authentication flow; installed 3.9.0 API signatures inspected during implementation.
- [FastF1 MIT software license](https://github.com/theOehrly/Fast-F1/blob/master/LICENSE): covers the library, not a grant to redistribute underlying Formula 1 timing datasets.
- [Formula 1 terms](https://www.formula1.com/en/toolbar/terms-of-use.html): upstream rights require separate review. This page was inaccessible to automated inspection in the implementation environment; no redistribution permission is inferred.

No third-party historical telemetry is bundled or published by default. Local acquisition still requires authorized provider access. Existing circuit licensing remains in `public/data/CIRCUITS.md` and the circuit-specific notices.
