# Build 2 verification — 16 September 2026

## Automated checks completed
- TypeScript checking passed.
- Production compilation passed; final archive is rebuilt after the source bundle is refreshed.
- Numerical determinism, finite positive speeds, convergence, sector closure, exact integrated playback distance, lateral grip sanity, added-mass/reduced-power slowdown, softer-tire trend, controlled straight-line drag comparison, unsupported camber/toe invariance, brake-bias and final-drive sensitivity passed.
- Current baseline: 106.537721 s, 321.324900 km/h maximum, 3 iterations, residual zero. Generated smooth path: 106.846024 s; it is deliberately not advertised as time-optimal. These are **model estimates**, not observed F2004 results.
- Trajectory validation, deterministic generation, offset bounds, distinct-path playback and final-distance closure passed. Legacy setup JSON gets defaults for newly added fields; invalid configurations are rejected.
- 94 catalog-matched selectable parts, 98 render meshes after per-part batching, about 115,234 triangles per car. Finite positions/normals, explode, isolate, hide/show and wing rotation passed. Original IDs retained.
- Rendered scene CPU raycasts: road support around all 1,161 centerline points; no centerline obstruction at car height; crossing road separation about 8 m. Reference path length 5,807 m. Minimum supplied half-width 3.656 m; trajectory offsets limited to 1.5 m leave lateral clearance for the car. This is a geometry check, not visual GPU verification or full collision physics.
- Production worker regression passed: generated same-origin `/_next/static/lap.worker-…js` address, packaged asset existence, absence of the former file:// build address, compiled worker execution, and baseline/modified responses. All track data is bundled locally; no external model download is required.

## Actual browser checks completed
The managed preview loaded successfully and started the numerical worker.
- Front-wing edit 18→24, undo 24→18, redo 18→24.
- Hide/show controls and exploded-view slider reached their intended state; numerical geometry tests separately verify the transforms.
- Named setup saved; saved-setup list displayed it.
- JSON import through the actual file chooser updated the configuration name to “Imported regression.” Schema-level JSON round-trip and invalid-input rejection also passed.
- Modified setup completed a lap; baseline comparison and charts displayed results without a false stale-state warning.
- Custom trajectory name and offset edited, saved, and submitted with centerline-baseline comparison.
- Replay completed at 4× automatically, returned to Play, and reported the full lap time (106.987522 s for the tested modified setup/path). End scrubbing also reached 100%.
- No application-origin blocking runtime errors were returned by the browser log filter. Browser-extension metadata errors were separate from the application.

## Explicit limitations
The test browser cannot create a WebGL context. The application correctly displays its graphics fallback and keeps the numerical editor working. Car/track material appearance, rendered camera motion, close-up clipping, pointer mesh picking, visual ghost alignment, frame rate and responsive 3D appearance could **not** be GPU-verified. They must not be reported as visually accepted.

Clicking Export JSON did not produce an observable download event within the browser automation timeout. The serialization/validation path is tested, but browser download completion remains unverified. A successful build alone does not verify that interaction. Full browser reload persistence and all responsive breakpoints were not exhaustively checked.

The deployed domain cannot be opened from this managed browser environment. Browser QA used the supervised preview; production assets were checked in the actual generated output and the production worker executed in an isolated JS context. No live production GPU smoke test is claimed.

## Reproduce
Use the README TypeScript/numerical commands, then `node tests/verify-model.mjs`, `node tests/verify-scene.mjs`, and `node tests/verify-production-worker.mjs` after a production build. On a WebGL-capable desktop, inspect front/rear/side/top/focus views, remove bodywork, explode, and replay through both bridge crossings before considering visual acceptance complete.
