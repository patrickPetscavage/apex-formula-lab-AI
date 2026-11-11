import assert from 'node:assert/strict';
import {CIRCUITS,TRACK,TRACK_LENGTH,ACTIVE_CIRCUIT} from '../lib/sim/track';
import {selectCircuit,CORRIDOR,buildTrajectory,CENTERLINE} from '../lib/sim/trajectory';
import {simulate,sampleLap} from '../lib/sim/physics';
import {optimizeLine} from '../lib/sim/optimizer';
import {DEFAULT_SETUP,PARAMS,validateSetup} from '../lib/sim/setup';
import {snapshot,validateExperiment,saveRun,readHistory,telemetryCSV,sections} from '../lib/sim/experiments';
import {simulateSF26,SF26_DEFAULT} from '../lib/sim/sf26Model';
const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
const runs:ReturnType<typeof snapshot>[]=[];const before=JSON.stringify(DEFAULT_SETUP);
for(const c of CIRCUITS){
 selectCircuit(c.id);assert.equal(ACTIVE_CIRCUIT.id,c.id);assert.ok(Math.abs(TRACK_LENGTH-c.referenceLength)<.01);
 assert.ok(TRACK.every(p=>Object.values(p).every(Number.isFinite)&&p.ds>0&&p.left>1.2&&p.right>1.2));
 const base=simulate(DEFAULT_SETUP),opt=optimizeLine(DEFAULT_SETUP,'optimized');assert.ok(opt.lapTime<=base.lapTime);assert.equal(opt.circuitId,c.id);
 opt.path.forEach((p,i)=>{const dx=p.x-TRACK[i].x,dz=p.z-TRACK[i].z,offset=dx*CORRIDOR[i].nx+dz*CORRIDOR[i].nz;assert.ok(offset>=CORRIDOR[i].min-1e-6&&offset<=CORRIDOR[i].max+1e-6);});
 assert.ok(opt.speed.every(v=>Number.isFinite(v)&&v>0));assert.ok(opt.residual<1e-6);assert.equal(sampleLap(opt,opt.lapTime).progress,1);
 assert.notEqual(simulate({...DEFAULT_SETUP,rearWing:36},opt.path).lapTime,opt.lapTime);
 assert.ok(simulate({...DEFAULT_SETUP,power:350},opt.path).lapTime>opt.lapTime);
 for(const edge of ['min','max'] as const){const input={...DEFAULT_SETUP};for(const p of PARAMS)input[p.key]=p[edge];const lap=simulate(validateSetup(input));assert.ok(Number.isFinite(lap.lapTime)&&lap.speed.every(v=>v>0&&Number.isFinite(v)));}
 const custom=buildTrajectory({...CENTERLINE,id:'custom',circuitId:c.id,trackVersion:c.version,offsets:Array(24).fill(15)});assert.ok(custom.every(p=>Number.isFinite(p.k)));
 const sf=simulateSF26(SF26_DEFAULT,buildTrajectory(CENTERLINE),'centerline');assert.ok(sf.lapTime>0&&sf.circuitId===c.id);
 const run=snapshot(opt,c.name,'Optimized');validateExperiment(run);saveRun(storage,run);runs.push(run);
 console.log(c.id,{length:TRACK_LENGTH,centerline:base.lapTime,optimized:opt.lapTime,samples:TRACK.length});
}
selectCircuit('suzuka');assert.equal(JSON.stringify(DEFAULT_SETUP),before);assert.equal(readHistory(storage).length,CIRCUITS.length);
for(const run of runs){assert.equal(validateExperiment(run).trackVersion,run.trackVersion);assert.equal(telemetryCSV(run).split('\n').length,run.lap.path.length+1);assert.equal(sampleLap(run.lap,run.lap.lapTime).progress,1);}
assert.throws(()=>sections(runs[0].lap,runs[1].lap));assert.throws(()=>selectCircuit('fictional'));
console.log('Multi-circuit geometry, optimizer, setups, extreme bounds, history identity, CSV and playback passed.');
