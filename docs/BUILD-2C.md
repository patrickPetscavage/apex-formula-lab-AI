# Build 2C — repeatable engineering experiments

The Build 2B numerical model, optimizer, car and circuit are unchanged. Model version remains apex-qss-2b.1; application version is Build 2C.

Completed experiments are copied into independent snapshots with name, timestamp, model/track identifiers, exact setup, complete sampled trajectory, lap results and telemetry. Browser history has both an eight-run cap and a 2.2-million-character safety bound, plus browser quota enforcement. No automatic eviction: a full/quota-blocked history leaves the latest result available for export and displays a warning. Removal requires explicit confirmation. Existing setup and trajectory storage keys are untouched.

Experiment history lets users select saved A/B results without simulation. Historical result labels distinguish saved runs from current editor values. The displayed baseline can also be saved as a run. Saving records input names when simulation starts, so editing a name while computation is pending does not relabel that result.

Twelve equal reference-station sections report time, minimum speed, peak braking and deltas. Timing interpolates each run's own path using the existing constant-acceleration playback model. Section intervals match across paths and their time deltas telescope to the full-lap delta. Selecting a section moves the shared telemetry/playback cursor.

JSON exports include schema and model identifiers, exact sampled path and complete results; imports validate lengths, finite values, supported track grid/corridor, path distances and playback timing consistency. Results are never recalculated on import. Structurally compatible different-model runs are allowed but labeled potentially noncomparable. JSON normalizes IEEE negative zero to zero without changing numerical behavior. Existing setup-only JSON remains a separate compatible workflow.

CSV exports include reference station, path distance, elapsed time, speed, gear, RPM, throttle/brake demand, acceleration, steering, aero forces, grip utilization, offset and coordinates, with units in the header. Rows represent the original simulation sample grid.

Validation: snapshot independence, JSON restoration, explicit quota/full behavior without eviction, zero self-comparison deltas, section-delta closure, distinct-path station alignment, malformed imports, CSV structure, type check and existing engineering regression. WebGL visual checks remain a known environment limitation; no new rendering architecture or physics is introduced.

Storage/export scope: local browser history and manual files only; no cloud account synchronization. Export before clearing site data. Physics uncertainty and unsupported damping/differential/transient systems remain as documented in Build 2B.
