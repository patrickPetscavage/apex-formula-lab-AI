import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
const sameJSON=(a:unknown,b:unknown)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
import {CIRCUITS,ACTIVE_CIRCUIT,referenceTrack} from '../lib/sim/track';
import {DEFAULT_SETUP} from '../lib/sim/setup';
import {SF26_DEFAULT} from '../lib/sim/sf26Model';
import {selectCircuit,validateTrajectory,CENTERLINE,buildTrajectory} from '../lib/sim/trajectory';
import {samePath,sections,stationSample} from '../lib/sim/experiments';
import {sampleLap,simulate} from '../lib/sim/physics';
import {BatchRunner,type WorkerPort} from '../lib/sim/batchRunner';
import {newBatch,modelVersion,makeJob,runBatchPair,completeRow,validateBatch,metrics,summaryCSV,explain,type BatchMode,type BatchRecord,type BatchJob,type VehicleId} from '../lib/sim/batch';
import {packBatch,unpackBatch,persistBatch,batchStore,type BatchStore} from '../lib/sim/batchStorage';

function make(mode:BatchMode='centerline',vehicle:VehicleId='f2004',identical=false):BatchRecord{
 const setup=vehicle==='f2004'?DEFAULT_SETUP:SF26_DEFAULT;
 return newBatch({version:1,id:'regression-'+mode+'-'+vehicle,name:'Regression study',createdAt:'2026-10-20T00:00:00.000Z',vehicleId:vehicle,modelVersion:modelVersion(vehicle),mode,a:{name:'Reference',setup:{...setup}},b:{name:'Reduced power',setup:{...setup,power:identical?setup.power:vehicle==='f2004'?400:250}},circuits:CIRCUITS.map(c=>({id:c.id,version:c.version}))});
}
const center=make(),pairs=new Map<string,ReturnType<typeof runBatchPair>>();
for(const circuit of CIRCUITS){
 const stages:string[]=[],job=makeJob(center.definition,circuit.id,1),result=runBatchPair(job,s=>stages.push(s));
 assert.deepEqual(stages,['A','B']);assert.equal(result.lap.circuitId,circuit.id);assert.ok(result.lap.lapTime>result.baseline.lapTime);assert.ok(samePath(result.baseline,result.lap));
 const row=completeRow(center.definition,circuit.id,result.baseline,result.lap);center.rows[center.rows.findIndex(r=>r.circuitId===circuit.id)]=row;pairs.set(circuit.id,result);
 const m=metrics(result.lap);assert.ok(Math.abs(m.bands.reduce((a,b)=>a+b,0)-m.lapTime)<1e-7);assert.ok(m.braking>=0&&m.braking<=m.lapTime&&m.fullThrottle>=0&&m.fullThrottle<=m.lapTime);
 assert.equal(m.topSpeed,Math.max(...result.lap.speed)*3.6);assert.equal(m.averageSpeed,result.lap.path.reduce((s,p)=>s+p.ds,0)/result.lap.lapTime*3.6);
 const end=sampleLap(result.lap,result.lap.lapTime);assert.equal(end.progress,1);assert.ok(Math.abs(stationSample(result.lap,referenceTrack(circuit.id).reduce((s,p)=>s+p.ds,0)).time-result.lap.lapTime)<1e-6);
 assert.ok(Math.abs(sections(result.baseline,result.lap).reduce((s,p)=>s+p.delta,0)-(result.lap.lapTime-result.baseline.lapTime))<1e-6);
 const repeat=runBatchPair(job);assert.deepEqual(repeat,result,'Deterministic solver and telemetry');
 const equal=make('centerline','f2004',true),same=runBatchPair(makeJob(equal.definition,circuit.id,2));assert.equal(same.lap.lapTime,same.baseline.lapTime);assert.deepEqual(metrics(same.lap),metrics(same.baseline));
 console.log('Batch centerline A/B and repeatability:',circuit.id);
}
// Explicit identities survive active-track changes and reject incompatible trajectories.
selectCircuit('monza');assert.equal(validateBatch(center).rows[0].a!.lap.circuitId,'suzuka');
const custom=validateTrajectory({...CENTERLINE,id:'custom',circuitId:'monza',trackVersion:CIRCUITS[1].version});
selectCircuit('spa');assert.throws(()=>buildTrajectory(custom),/another circuit/);assert.throws(()=>validateTrajectory({...CENTERLINE,id:'custom'}),/Legacy/);
const migrated=validateTrajectory({...CENTERLINE,id:'custom'},'spa','spa');assert.equal(migrated.circuitId,'spa');assert.equal(migrated.trackVersion,CIRCUITS[2].version);
assert.throws(()=>runBatchPair({...makeJob(center.definition,'monza',1),trackVersion:CIRCUITS[0].version}),/identity/);
const bad=structuredClone(center);bad.rows[0].circuitId='spa';assert.throws(()=>validateBatch(bad));
const input=make();const original=input.definition.a.setup.power;const job=makeJob(input.definition,'suzuka',4);input.definition.a.setup.power=350;assert.equal(job.definition.a.setup.power,original,'Queued job is immutable');

// Both optimizer modes use the same real engine on every circuit.
const shared=make('shared'),independent=make('independent');
for(const circuit of CIRCUITS){
 const fixed=runBatchPair(makeJob(shared.definition,circuit.id,10));assert.ok(samePath(fixed.baseline,fixed.lap));assert.ok(fixed.baseline.optimization);assert.equal(fixed.lap.optimization,undefined);
 const adapted=runBatchPair(makeJob(independent.definition,circuit.id,11));assert.ok(adapted.baseline.optimization&&adapted.lap.optimization);assert.deepEqual(adapted.baseline.path,fixed.baseline.path);
 assert.ok(adapted.lap.optimization!.gain>=0);assert.ok(adapted.lap.lapTime<=simulate(independent.definition.b.setup,buildTrajectory(CENTERLINE)).lapTime+1e-7);
 const row=completeRow(independent.definition,circuit.id,adapted.baseline,adapted.lap);independent.rows[independent.rows.findIndex(r=>r.circuitId===circuit.id)]=row;
 assert.match(explain(row,'independent'),/setup and trajectory/);console.log('Shared and independently optimized A/B:',circuit.id);
}
const sameOpt=make('shared','f2004',true),equalOpt=runBatchPair(makeJob(sameOpt.definition,'suzuka',20));assert.equal(equalOpt.lap.lapTime,equalOpt.baseline.lapTime);
for(const circuit of CIRCUITS){const sf=make('centerline','sf26'),pair=runBatchPair(makeJob(sf.definition,circuit.id,30));const row=completeRow(sf.definition,circuit.id,pair.baseline,pair.lap);assert.equal(row.a!.vehicleId,'sf26');assert.ok(pair.lap.lapTime>pair.baseline.lapTime);assert.equal(pair.lap.suspension,undefined);}
assert.throws(()=>make('shared','sf26'),/centerline/);

// JSON identity, exact telemetry, path deduplication and summary agreement.
console.log('Vehicle/mode checks complete; testing archives and queue lifecycle.');
const packed=packBatch(center),archive=JSON.stringify(packed);assert.equal(packed.paths.length,3);assert.ok(archive.length<16000000);assert.ok(sameJSON(unpackBatch(JSON.parse(archive)),validateBatch(center)),'Centerline JSON round trip');
assert.ok(sameJSON(unpackBatch(JSON.parse(JSON.stringify(packBatch(independent)))),validateBatch(independent)),'Independent JSON round trip');
assert.equal(summaryCSV(center).split('\n').length,7);assert.match(summaryCSV(center),/"delta_vs_A_percent"/);assert.match(summaryCSV(center),/"suzuka"/);
for(const mutate of [(p:any)=>p.paths.pop(),(p:any)=>p.rows[0].a.lap.pathRef=99,(p:any)=>p.definition.modelVersion='wrong',(p:any)=>p.rows[0].b.lap.setup.power=699,(p:any)=>p.rows[0].b.lap.lapTime+=1,(p:any)=>p.definition.a.setup.power='600']){const p=JSON.parse(archive);mutate(p);assert.throws(()=>unpackBatch(p));}

// Queue protocol: progress, explicit job identity, switching, stale replies, retry, cancellation.
class FakeWorker implements WorkerPort{onmessage:WorkerPort['onmessage']=null;onerror:WorkerPort['onerror']=null;jobs:BatchJob[]=[];terminated=false;postMessage(job:BatchJob){this.jobs.push(job);}terminate(){this.terminated=true;}reply(job:BatchJob,override:any={}){this.onmessage?.({data:{kind:'result',id:job.id,key:job.key,...pairs.get(job.circuitId),...override}});}}
const workers:FakeWorker[]=[];let latest=center,active=false;
const runner=new BatchRunner(()=>{const w=new FakeWorker();workers.push(w);return w;},(r,b)=>{latest=r;active=b;});
runner.start(make());const w=workers[0],j0=w.jobs[0],oldHandler=w.onmessage!;
selectCircuit('spa');w.reply(j0,{key:'stale'});assert.equal(latest.rows[0].status,'running');w.reply(j0,{id:999});assert.equal(latest.rows[0].status,'running');
w.onmessage!({data:{kind:'progress',id:j0.id,key:j0.key,stage:'B'}});assert.equal(latest.rows[0].stage,'B');w.reply(j0);assert.equal(latest.rows[0].status,'completed');assert.equal(latest.rows[0].a!.lap.circuitId,'suzuka');assert.equal(ACTIVE_CIRCUIT.id,'spa','Result handling must not mutate the main active circuit');
runner.cancel();assert.ok(w.terminated);assert.equal(latest.rows[1].status,'cancelled');const cancelled=JSON.stringify(latest);oldHandler({data:{kind:'result',id:j0.id,key:j0.key,...pairs.get('suzuka')}});assert.equal(JSON.stringify(latest),cancelled);
runner.retry();const w2=workers[1];assert.equal(w2.jobs[0].circuitId,'monza');const staleError=w2.onerror!;w2.reply(w2.jobs[0]);staleError({});assert.equal(latest.rows[1].status,'completed','Settled errors cannot change completed jobs');
w2.onmessage!({data:{id:w2.jobs.at(-1)!.id,key:w2.jobs.at(-1)!.key,error:'Injected worker failure'}});assert.equal(latest.rows[2].status,'failed');assert.equal(active,false);
runner.retry();const w3=workers.at(-1)!;assert.equal(w3.jobs.length,1);assert.equal(w3.jobs[0].circuitId,'spa');w3.reply(w3.jobs[0]);assert.ok(latest.rows.every(r=>r.status==='completed'));assert.equal(active,false);runner.cancel();
runner.start(make());const superseded=workers.at(-1)!,oldJob=superseded.jobs[0],old= superseded.onmessage!;runner.start(make());old({data:{id:oldJob.id,key:oldJob.key,...pairs.get('suzuka')}});assert.equal(latest.rows[0].status,'running');runner.cancel();

async function storageTests(){
 const records=new Map<string,ReturnType<typeof packBatch>>();const memory:BatchStore={put:async v=>{records.set(v.definition.id,structuredClone(v));},list:async()=>[...records.values()]};
 await persistBatch(memory,center);assert.ok(sameJSON(unpackBatch((await memory.list())[0]),validateBatch(center)),'Stored batch round trip');const before=JSON.stringify([...records]);
 const full:BatchStore={...memory,put:async()=>{throw Error('QuotaExceededError');}};await assert.rejects(persistBatch(full,independent),/Quota/);assert.equal(JSON.stringify([...records]),before);assert.ok(center.rows.every(r=>r.a&&r.b));
 await assert.rejects(batchStore.list(),/IndexedDB unavailable/);console.log('Batch regressions passed. Centerline archive bytes:',archive.length);
}
storageTests().catch(e=>{console.error(e);process.exitCode=1;});
