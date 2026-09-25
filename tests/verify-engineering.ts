import assert from 'node:assert/strict';
import {simulate,sampleLap} from '../lib/sim/physics';
import {vehicleModel} from '../lib/sim/vehicle';
import {DEFAULT_SETUP,PARAMS,validateSetup} from '../lib/sim/setup';
import {optimizeLine} from '../lib/sim/optimizer';
import {TRACK,TRACK_LENGTH} from '../lib/sim/track';
import {CORRIDOR,boundOffset,pathFromOffsets,trajectoryKey,SMOOTH_LINE} from '../lib/sim/trajectory';
const base=simulate(DEFAULT_SETUP),optimized=optimizeLine(DEFAULT_SETUP,trajectoryKey(SMOOTH_LINE));
assert.ok(optimized.lapTime<base.lapTime);
assert.ok(optimized.telemetry.some(t=>t.offset>2)&&optimized.telemetry.some(t=>t.offset< -2),'Line must use both sides');
optimized.telemetry.forEach((t,i)=>{assert.ok(t.offset>=CORRIDOR[i].min-1e-8&&t.offset<=CORRIDOR[i].max+1e-8);assert.ok(t.utilization<=1.002,'Combined axle grip limit');});
const boundary=pathFromOffsets(TRACK.map((_,i)=>boundOffset(i%2?100:-100,i)));
assert.ok(boundary.every(p=>Number.isFinite(p.k)));
for(const change of [{frontSpring:300},{rearARB:120},{tirePressure:28},{camber:0},{toe:.3},{gear7:.8},{brakeLimit:2},{gripScale:.7},{frontWing:32},{rearWing:36}]){
 const lap=simulate({...DEFAULT_SETUP,...change},optimized.path);
 assert.notEqual(lap.lapTime,optimized.lapTime,JSON.stringify(change));
 assert.ok(lap.telemetry.every(t=>Object.values(t).every(Number.isFinite)));
}
for(const bound of ['min','max'] as const){
 const s=validateSetup({...DEFAULT_SETUP,...Object.fromEntries(PARAMS.map(p=>[p.key,p[bound]]))});
 const lap=simulate(s);
 assert.ok(lap.speed.every(v=>Number.isFinite(v)&&v>0));assert.ok(lap.residual<1e-6);
 assert.ok(lap.telemetry.every(t=>t.utilization<=1.005));
}
const highWing=vehicleModel({...DEFAULT_SETUP,frontWing:32,rearWing:36}),lowWing=vehicleModel({...DEFAULT_SETUP,frontWing:8,rearWing:8});
assert.ok(highWing.loads(70).total>lowWing.loads(70).total);assert.ok(highWing.loads(70).drag>lowWing.loads(70).drag);
assert.ok(highWing.capacity(70,.005).frontLat+highWing.capacity(70,.005).rearLat>lowWing.capacity(70,.005).frontLat+lowWing.capacity(70,.005).rearLat);
const heavy=simulate({...DEFAULT_SETUP,ballast:60},optimized.path);assert.ok(heavy.lapTime>optimized.lapTime);
const lowGrip=optimizeLine({...DEFAULT_SETUP,gripScale:.7},'low-grip');
assert.notDeepEqual(lowGrip.path,optimized.path,'Optimization must respond to setup');
assert.ok(lowGrip.lapTime<=simulate({...DEFAULT_SETUP,gripScale:.7}).lapTime);
assert.ok(Math.abs(optimized.sectors.reduce((a,b)=>a+b)-optimized.lapTime)<1e-8);
assert.ok(Math.abs(sampleLap(optimized,optimized.lapTime).station-TRACK_LENGTH)<1e-6);
console.log({engineering:'passed',centerline:base.lapTime,optimized:optimized.lapTime,gain:base.lapTime-optimized.lapTime,offsetRange:[Math.min(...optimized.telemetry.map(t=>t.offset)),Math.max(...optimized.telemetry.map(t=>t.offset))],candidates:optimized.optimization?.evaluations});
