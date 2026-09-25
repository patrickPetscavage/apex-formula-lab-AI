# Suzuka data attribution and modification notice

Retrieved 15 September 2026 from https://github.com/TUMFTM/racetrack-database, master/tracks/Suzuka.csv.
Original data: TUMFTM racetrack-database; contact Alexander Heilmeier. Repository license: GNU LGPL version 3. License and its GPL dependency are included in this directory. Original README retained as SOURCE-README.md. Width extraction credited to Andressa de Paula Suiti.

Underlying centerline: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright, Open Database License 1.0, https://opendatacommons.org/licenses/odbl/1-0/ . No map tiles or satellite imagery are redistributed. Width values are upstream image-derived estimates, not surveyed boundaries.

Modification by APEX Formula Lab, 15 September 2026: parsed 1,161 CSV rows into JSON; translated the horizontal origin to the mean; converted source northing to negative world Z; added an ORIGINAL ESTIMATED vertical profile; uniformly rescaled horizontal coordinates so the three-dimensional closed path is 5,807 m; calculated chord distance, grade and circumcircle curvature. Unmodified width estimates retained. Exact input acquisition/configuration year is unspecified. This is not surveyed geometry, nor a verified 2004 circuit.

The derivative database in derived-track.json is offered under ODbL 1.0, with upstream LGPL-3.0 obligations preserved for the supplied TUM material. The input CSV, derived JSON and complete modification implementation (lib/sim/track.ts, LGPL-3.0 for this data module) are provided in the source download; you may modify and replace them. No technical restriction is imposed on replacing this data module or reverse-engineering its linkage for debugging modifications. This notice does not relicense unrelated application code or third-party dependencies.

Rebuild the derived JSON with the documented compilation command in README.md, then `node scripts/export-track.cjs`. Output contains metres, radians-per-metre curvature, dimensionless grade, distances and estimated half-widths. Banking is not measured or modeled.

No warranty. Check suitability and upstream rights for your intended use. OSM and TUM do not endorse this reconstruction.
