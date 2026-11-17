# Real historical starter library — OpenF1

Data source and attribution: **OpenF1 and its contributors**, https://openf1.org/ and https://api.openf1.org/v1/ . Retrieved 17 November 2026. These are real 2023–2024 observations, not synthetic test fixtures. OpenF1 is unofficial and is not affiliated with Formula 1, FIA or the Formula One companies.

These six adapted session datasets, the derived starter regression model and evaluation are distributed under **Creative Commons Attribution–NonCommercial–ShareAlike 4.0 International (CC BY-NC-SA 4.0)**, separately from the application's MIT software license. License: https://creativecommons.org/licenses/by-nc-sa/4.0/ ; legal code: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode . Retain attribution, indicate changes, use only for non-commercial purposes, and distribute adaptations under the same license. No endorsement is implied. OpenF1's current homepage identifies educational research and non-commercial fan engagement as its intended uses and publishes this license. Other/commercial uses require appropriate permission from the rights holders.

Sessions: Belgian, Italian and Japanese races in 2023 and 2024. The legacy `fastf1` directory/index name is retained for URL compatibility. **Provider is OpenF1, not FastF1**; files use `apex-historical-1`. Original FastF1 archives remain a separate supported import format and retain their own rights.

Changes by Apex: joined lap times/sectors to driver acronyms, tire stints and pit visits; derived tire age from the stint starting age; converted source dates to lap/session-relative seconds; normalized field names and missing values. UTC session dates and content identities are retained. No later observations are included. Missing track-status, deleted-lap and FastF1 accuracy flags remain **null**, not fabricated booleans. Weather samples are retained but do not enter the current regression.

The acquisition attempted two car/position traces per 2024 event. The API returned no usable data for those requests; **the published library is timing-only**. No telemetry, positions, speed profiles or results classifications are invented. Illustrative prediction replay uses separate map-derived circuit geometry.

Model `apex-ridge-filtered-2` uses numeric sector consistency, known pit/out-lap exclusion, dry compounds and fixed broad lap-duration bounds: Monza 65–105 s, Suzuka 80–125 s, Spa 90–140 s. Unknown flags mean this cannot certify green-flag/deleted-lap quality. These filters are fixed before training and do not use held-out targets to choose feature preparation or coefficients. FastF1's original clean-lap filtering remains unchanged for FastF1 inputs.

Starter model split: train 2023 Spa/Monza/Suzuka and 2024 Suzuka; validate/tune on 2024 Spa; hold out 2024 Monza. Data and model lineage are included in the files. Metrics describe this conditional lap cohort, not finishing-order or future-race accuracy. No source artwork, logos, audio, video or proprietary circuit models are included.

Reproduction (developer only): `python scripts/build_openf1_library.py`, then `node scripts/build-starter-model.mjs`. Raw responses are cached under ignored `work/openf1-cache`; snapshots are served by the website, so ordinary visitors never need these commands, an API account, Python, FastF1 authentication or a local server.
