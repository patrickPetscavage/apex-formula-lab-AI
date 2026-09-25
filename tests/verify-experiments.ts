import assert from 'node:assert/strict';
import {simulate,sampleLap} from '../lib/sim/physics';
import {DEFAULT_SETUP} from '../lib/sim/setup';
import {buildTrajectory,CENTERLINE,trajectoryKey} from '../lib/sim/trajectory';
import {TRACK_LENGTH} from '../lib/sim/track';
import {snapshot,validateExperiment,readHistory,saveRun,removeRun,sections,samePath,stationSample,telemetryCSV,HISTORY_KEY,MAX_RUNS} from '../lib/sim/experiments';
const lap=simulate({...DEFAULT_SETUP},buildTrajectory(CENTERLINE)),a=snapshot(lap,'A','Centerline'),original=JSON.stringify(a);
lap.setup.frontWing=30;lap.path[0].x+=1;lap.speed[0]=5;
assert.equal(JSON.stringify(a),original,'Snapshot must not share mutable data');
assert.deepEqual(validateExperiment(JSON.parse(original)),JSON.parse(original));
const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
saveRun(storage,a);assert.deepEqual(JSON.parse(JSON.stringify(readHistory(storage))),JSON.parse(JSON.stringify([a])));saveRun(storage,a);assert.equal(readHistory(storage).length,1);
const custom={...CENTERLINE,id:'custom' as const,name:'Offset test',offsets:Array(24).fill(1.2)};
const b=snapshot(simulate({...DEFAULT_SETUP,frontWing:24},buildTrajectory(custom),trajectoryKey(custom)),'B',custom.name);
saveRun(storage,b);assert.equal(readHistory(storage).length,2);assert.ok(!samePath(a.lap,b.lap));
const equal=sections(a.lap,a.lap);assert.ok(equal.every(r=>r.delta===0&&r.a.minSpeed===r.b.minSpeed&&r.a.peakBrake===r.b.peakBrake));
const rows=sections(a.lap,b.lap);
assert.ok(Math.abs(rows.reduce((s,r)=>s+r.delta,0)-(b.lap.lapTime-a.lap.lapTime))<1e-8);
assert.equal(rows[0].start,0);assert.equal(rows.at(-1)!.end,TRACK_LENGTH);
for(const station of [0,1000,TRACK_LENGTH/2,TRACK_LENGTH]){const t=stationSample(b.lap,station).time;assert.ok(Math.abs(sampleLap(b.lap,t).station-station)<1e-6);}
assert.equal(telemetryCSV(b).split('\n').length,b.lap.path.length+1);
assert.ok(telemetryCSV(b).includes('reference_station_m,path_distance_m,time_s'));
const different=validateExperiment({...b,modelVersion:'future-model'});assert.equal(different.modelVersion,'future-model');
for(const modify of [
 (r:typeof a)=>{r.lap.speed[4]=Infinity;},
 (r:typeof a)=>{r.lap.telemetry[0].drag=NaN;},
 (r:typeof a)=>{r.lap.time[5]=-1;},
 (r:typeof a)=>{r.lap.path[10].x+=100;},
 (r:typeof a)=>{r.lap.lapTime+=10;},
 (r:typeof a)=>{r.trackVersion='other-grid';}
]){const invalid=structuredClone(a);modify(invalid);assert.throws(()=>validateExperiment(invalid));}
const before=storage.getItem(HISTORY_KEY);assert.throws(()=>saveRun({...storage,setItem:()=>{throw Error('Quota exceeded');}},snapshot(a.lap,'Quota','Centerline')));assert.equal(storage.getItem(HISTORY_KEY),before);
let blocked=false;for(let i=0;i<MAX_RUNS;i++){try{saveRun(storage,snapshot(a.lap,'Run '+i,'Centerline'));}catch{blocked=true;break;}}
assert.ok(blocked);assert.ok(readHistory(storage).some(r=>r.id===a.id),'Oldest run must remain');
removeRun(storage,b.id);assert.ok(!readHistory(storage).some(r=>r.id===b.id));
console.log({experiments:'passed',snapshotChars:original.length,sectionDelta:rows.reduce((s,r)=>s+r.delta,0),roundTrip:true,quotaPreservesHistory:true});
