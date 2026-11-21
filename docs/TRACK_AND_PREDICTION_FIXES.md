# Track and prediction verification — 19 November 2026

## Road surfaces and scale

The old terrain adjustment tested proximity only at coarse mesh vertices. A triangle could span Spa's road and rise through the asphalt between those vertices. Cross-width downward ray tests reproduced a maximum 0.563 m overlap. Tests also exposed shoulder ribbons crossing adjacent road sections at tight corners, and a raised decorative rubber strip on two atlas tracks.

Terrain and shoulder triangles now query a spatially indexed road corridor, including the segments between stations. Every vertex of an intersecting triangle is constrained below the lowest intersecting road segment. This is deliberately conservative at Suzuka's crossing: the terrain stays below the lower road while the upper deck remains separate. The raised decorative rubber strip was removed. Buildings are rejected by footprint/corridor intersection rather than centroid proximity alone. Source footprints remain in their data files.

`verification/road-before.json` records the original check, including finish paint 0.026 m above the asphalt. The final check allows 0.04 m for markings and samples three lateral positions at every second station. `verification/road-after.json` records zero scenery overlaps and zero missing support across all 26 configurations: three historical prediction scenes plus 23 atlas scenes. This is sampled geometry evidence, not a proof that every possible scenery overlap is absent.

The TUM width estimates reached only 7.5–7.9 m at their narrowest. The historical three-track reference now smooths estimated local variation over nine stations and constrains total width to published ranges, preserving the estimated left/right proportions:

| Track | Published overall width | Reference |
|---|---|---|
| Monza | 10–12 m | https://www.monzanet.it/en/circuit/ |
| Suzuka | 10–16 m | https://www.suzukacircuit.jp/eng/course_s/ |
| Spa | 11–14 m | FIA WEC media guide: https://press.fiawec.com/assets/fileuploads/64/3a/643ad7b694128.pdf |

These sources establish overall ranges, not surveyed widths at each station. Exact local boundaries, banking and runoff remain approximate. Horizontal layouts, travel direction and registered structures retain the TUM/OSM source lineage. No circuit was mirrored, reversed or flattened. Spa retains its published-station elevation approximation; Suzuka retains its separated crossing and registered pit-building/grandstand sides. Monza reference elevation remains unsupported/flat. The atlas DEM/OSM source notices remain unchanged.

## Ghost motion

`lib/ghostMotion.ts` builds an approximate elastic-band racing line in world metres. Each station's offset is constrained with a 2.2 m reserve from the usable edge. Periodic cubic Hermite interpolation supplies continuous positions and tangents, including at the finish. It supplies steering and pitch directly, avoiding discrete polyline headings and temporal position lag.

Curvature limits an illustrative speed profile. Cyclic acceleration/braking passes smooth changes into corners and over the finish. Integrated time is normalized to each predicted lap duration, so changing the visual speed profile never changes the predicted result. It is not measured telemetry, a tire-force solver or a validated SF-26 dynamics model. Very slow or fast statistical laps can imply physically unrealistic rescaled speeds; lap-time accuracy does not validate those speeds.

Playback samples the existing monotonic wall-clock directly on each animation frame. It does not integrate car position with variable frame durations. The analytic path/time sampler therefore produces the same pose for the same time at 30, 60 or 144 Hz, including playback-rate changes and seeks. Pit-loss laps decelerate to a finish-line hold and the following lap accelerates from that same pose. **Mapped pit-lane entry, stall selection and exit are not implemented.** No pit route is fabricated. Independent ghosts have no collisions, traffic or overtaking decisions. There are no lateral display offsets.

The optional racing-line overlay and lightweight map use the same reference path. Prediction-only car batching reduces 152 meshes to 32 material/frame batches per car while preserving dimensions, front steering and wheel spin. Editable garage geometry is unaffected.

Tests: `verify-ghost-motion.ts` covers sampled car-width clearance, C1 heading continuity, speed variation, exact clock/rate equivalence, finish wrap and pit-hold transitions. `verification/ghost-motion.json` includes sampler timing. `verify-replay-rig.mjs` verifies batching preserves dimensions and wheel animation. Geometry tests retain the Suzuka crossing and landmark-side checks. Spa and Suzuka screenshots are in `verification/`. The final headless Chrome browser run completed the data-load/model/ghost workflow without JavaScript errors. Median animation intervals were about 16.7 ms (60 Hz), with approximately 16.8–16.9 ms 95th-percentile intervals over 90 frames per track in this environment. This is a short local measurement, not a performance guarantee on other GPUs or longer races; see `verification/browser-replay.json`. The chase camera now follows analytically at a fixed distance, and trackside transitions are damped.

## Historical data and statistical evaluation

The library now contains **14 races, 12,561 observed laps**, all before 1 January 2025. Eight 2019–2022 races were added from TracingInsights' FastF1 exports. These retain original accuracy, deletion and track-status fields. Six 2023–2024 OpenF1 races retain unknown flags as null. No synthetic observations, future weather or results are features. Data quality differs by provider and historical car/layout eras remain confounders.

`public/data/fastf1/model-benchmark.json` contains all folds, source URLs/hashes and held-out breakdowns by circuit, driver, compound and tire-age band. The builder compares ordinary ridge, robust Huber ridge, recency-weighted ridge and ridge without a year trend. A circuit-median baseline is evaluated separately.

Seven development-only rolling folds hold whole races out chronologically. In each fold, the latest preceding event tunes regularization and earlier events fit coefficients. Categories originate in training only. The estimator is selected by the lowest equal-race mean absolute error on these development folds. The final 2024 Suzuka, Spa and Monza races never select estimator, categories or regularization. The selected model is fit on the ten training races plus 2023 Suzuka validation (8,028 eligible laps).

Ordinary ridge won development selection (1.357 s race-mean MAE). Its final three-race test error was **3.571 s MAE / 3.917 s RMSE** on 2,452 eligible laps, compared with **2.045 s MAE for the circuit-median baseline**. Robust, recent-weighted and stationary variants had final MAEs of 3.386, 2.665 and 2.148 s respectively. The broader test therefore **does not establish an accuracy improvement**. The earlier 0.636 s result used only Monza 2024 with later development data and is not comparable to this stricter three-event holdout.

For this model, the browser defaults a new scenario to the better-evaluated **baseline**, with explicit regression opt-in. Baseline pace has no driver/tire response; only explicit pit-loss, pace-offset and weather-penalty assumptions alter its lap times. This is a conservative product choice after the frozen evaluation, not a claim of a second unbiased model-selection test. The report retains all original comparisons. User-selected single-event retraining remains available.

Long stints and unsupported driver/circuit or compound/circuit combinations produce support warnings. Dates after 2024 remain hypothetical historical-era transfers. `residual90` is a descriptive held-out residual statistic, not a calibrated probability interval. No finishing-order accuracy or full-race uncertainty is asserted.

## Sources and reproduction

- TUM racetrack database / OSM: existing LGPL-3.0 and ODbL notices retained in the source assets. Width constraints and scenery carving are Apex transformations.
- OpenF1 and contributors: https://openf1.org/ ; original six snapshots and combined OpenF1-derived model/evaluation remain CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/ .
- TracingInsights-Archive: https://github.com/TracingInsights/2019 , /2020 , /2021 , /2022 . Original repository MIT notice is retained as `TRACINGINSIGHTS-LICENSE.txt`. That software/repository notice is not an assertion of commercial rights to underlying F1 timing data.

Developer reproduction: obtain each recorded `session_laptimes.json` into `work/tracing-cache`, run `python scripts/import-tracing-library.py`, then `node scripts/build-starter-model.mjs`. Run `node tests/run-typescript.mjs verify-workflow verify-ghost-motion`, `node tests/verify-road-scene.mjs`, and `node tests/verify-replay-rig.mjs`. Website visitors need no terminal, Python, account or local data service.
