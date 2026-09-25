# Build 2 numerical model

SI units. All physical relationships here are simplified, uncalibrated estimates. Detailed geometry does not supply aero maps, tire characteristics, mass distribution or thermal properties automatically.

## Track and trajectory
1,161 TUM/OSM plan points and derived half-widths. Original estimated cyclic elevation, about 8 m separation at the detected crossing. Horizontal coordinates are rescaled so the centerline’s 3D chord length is 5,807 m. Curvature uses horizontal circumcircles; grade = dy/ds. This is not a surveyed elevation/banking model.

A Trajectory is a versioned named definition independent of the road. Presets: centerline; a 160-pass bounded Laplacian smoothing heuristic (not time-optimal). Editable trajectories use twelve periodic lateral offsets, cosine interpolation, ±1.5 m limits. Positive offset is driver-right. This leaves vehicle clearance within even the narrowest supplied width estimate. No path is claimed to reproduce a driver.

Each generated path recomputes curvature, length and grade. Each Lap carries its own path and signature; playback never assumes the global centerline. Charts compare corresponding reference-track stations so different path lengths remain aligned. Same-line comparisons isolate setup effects; centerline-baseline mode changes both setup and trajectory. Sectors are exact equal-distance thirds of each path, not official timing sectors; cross-path sector endpoints are consequently not identical geographic points.

## Vehicle
Mass = 605 + fuel + ballast kg. Static front share defaults 0.45 (editable); CG height defaults .280 m (editable); wheelbase 3.05 m. These packaging/load assumptions are not derived from component mesh volume. Individual part masses are metadata, not summed. Fuel burn unsupported.

Aero area estimates: front=.9+.065*frontAngle; rear=1.3+.067*rearAngle; floor=1.65*max(.65,1-((rideHeight-35)/65)^2). ClA=sum; CdA=.72+.0007*frontAngle²+.00085*rearAngle². Front aero fraction=(front+.44*floor)/ClA. Angles degrees, height mm. These are explicit pedagogical functions, not CFD or measured Ferrari maps. Drag=.5*rho*CdA*v²; downforce=.5*rho*ClA*v²; rho=1.225 kg/m³.

Tire reference mu soft/medium/hard = 1.53/1.44/1.35. Axle force capacity = mu * Fref * (Fz/Fref)^.92, with Fref=m*g/2. Exponent .92 is an assumed load sensitivity; no fitted tire data. Normal loads combine static weight and aero distribution. Lateral demand m*v²*k is split according to static front share, a steady bicycle-model force allocation. Available longitudinal force per axle is sqrt(max(0,capacity²-lateralDemand²)). No lateral weight transfer, camber thrust, tire temperatures, transients, detailed slip curve or banking forces.

Corner caps use bisection on both axle lateral limits. Drive is rear-axle limited, conservatively without acceleration load transfer. Under braking, candidate tire deceleration a transfers m*a*h/wheelbase from rear to front. Bisection finds the greatest deceleration respecting brakeBias*mass*a at front and (1-brakeBias)*mass*a at rear. Brake bias now genuinely affects performance. Pitching from aero drag and vertical-curvature load changes are omitted.

## Drivetrain
Estimated seven ratios: 3.2,2.5,2,1.67,1.45,1.28,1.15. Editable final drive defaults 5.4. Effective tire radius .33 m. Engine rpm=v/r*ratio*finalDrive*60/(2*pi). Estimated wheel power rises linearly to the user peak at 14,000 rpm, stays flat until 18,300, then tapers 12% to 19,000 rpm. Select the gear supplying greatest power at that speed. Below 4,000 rpm the launch approximation clamps engine rpm (implicit clutch slip); no shift duration or torque transient. This is not a historical dyno map. Default 600 kW is peak power at wheels, not the manufacturer crank figure. Gearing limits speed, as does drag in propagation. Calculated gear indices are retained in Lap data; no decorative throttle telemetry.

## Solver and playback
Forward a=min(power/(m*v), rear longitudinal grip/m)-drag/m-g*grade. Backward deceleration=braking tire capacity+drag/m+g*grade. Gravity is added once. Normal weight uses m*g (small-slope approximation). Conservative segment endpoint grip limits; closed-loop propagation up to 180 passes or residual below 1e-7 m/s. Speed safety ceiling 110 m/s and gear redline limit.

dt=2*ds/(v+v_next); a=(v_next²-v²)/(2*ds). Playback integrates ds=v*dt+.5*a*dt². Ghost samples its own lap at the same time. Road pitch and camera orientation derive from trajectory tangents, not a suspension simulation.

## Explicitly unsupported
Measured aero/tire calibration; CFD; structural/thermal analysis; individual bolt-level mass effects; suspension dynamics; differential locking; detailed slip behavior; manual real-time driving; CAD editing. Camber and toe change appearance only. Dampers/rockers are inspectable but cannot yet be tuned dynamically. The schema distinguishes geometry effects, model inputs and implemented simulation dependencies per component.
