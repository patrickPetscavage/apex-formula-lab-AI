# Build 2E — scalable component architecture

Build 2E separates the engineering catalog from the 3D mesh registry. The 110 stable geometry-backed IDs remain unchanged. A 172-node hierarchy now contains one vehicle root, four subsystems, nine assemblies, the 110 existing components, and 48 estimated wheel/brake/suspension subcomponents.

Each catalog node records a stable ID, kind, subsystem, assembly, parent, children, mounts, material category, non-additive mass metadata, geometry references, setup parameters, simulation dependencies, status, provenance class, confidence, sources and limitations. Component metadata is never summed into simulated mass; fuel, ballast and the existing vehicle mass model remain authoritative.

The 48 new subcomponents cover wheel centers, center-lock nuts, two rotor friction rings, caliper bodies, pad sets, piston banks, brake-duct inlets/outlets and wishbone leg records at all four corners. They are `ESTIMATED`, `HIERARCHY-ONLY`, and reuse aggregate parent geometry. They add no independent physics, mass, thermal, wear, compliance or inertia behavior.

The Garage browser provides subsystem/assembly expansion, name/ID search, simulation-status and provenance filters, child counts, breadcrumbs and catalog summaries. Selecting a hierarchy-only node highlights its shared geometry. Hiding or isolating an assembly resolves every geometry-backed member classified to that assembly.

Status meanings:

- `VISUAL`: selectable mesh without a model input.
- `HIERARCHY-ONLY`: organization or detail record using child/shared geometry.
- `SHARED MODEL INPUT`: existing setup parameters feed the current vehicle model.
- `INDEPENDENTLY SIMULATED`: reserved for future component states; currently zero.
- `UNSUPPORTED`: damping/differential detail is shown but its dynamics are absent.

Validation covers unique IDs, valid parents/mounts/parameters, cycle freedom, root reachability, finite nonnegative mass metadata, mandatory uncertainty labels, assembly geometry resolution, search/filter results, shared-geometry selection, assembly hide/isolate, the unchanged 110 mesh registry and existing physics/experiment regressions.

No lap physics, optimizer, track, car mesh, model version or experiment schema changed.
