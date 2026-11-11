import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {HISTORICAL_CUTOFF,validateArchive,validateIndex,sampleHistorical,historicalAtProgress,historicalPosition,type HistoricalArchive} from '../lib/fastf1';
import {trainPrediction,validateModel,predictRace,sampleGhost,type GhostSetting} from '../lib/racePrediction';
import {getCircuit,type CircuitId} from '../lib/sim/track';
// Synthetic fixtures are TEST ONLY; never shipped as historical observations.
function fixture(year:number,circuitId:CircuitId):HistoricalArchive{
 const date=`${year}-${{spa:'08-01',monza:'09-01',suzuka:'10-01'}[circuitId]}T12:00:00Z`,base={spa:105,monza:82,suzuka:97}[circuitId];
 return validateArchive({schema:'apex-fastf1-1',cutoff:HISTORICAL_CUTOFF,id:`${year}-${circuitId}-R`,year,date,circuitId,trackVersion:getCircuit(circuitId).version,referenceLength:getCircuit(circuitId).referenceLength,session:'R',event:'TEST FIXTURE',layout:'TEST ONLY',contentHash:'a'.repeat(64),provenance:{provider:'FastF1',version:'TEST FIXTURE',retrievedAt:'2026-11-10T00:00:00Z',source:'TEST ONLY',cutoff:HISTORICAL_CUTOFF,rights:'TEST ONLY',channels:{},missing:'null',interpolation:'none'},laps:Array.from({length:160},(_,i)=>({driver:i%2?'AAA':'BBB',driverNumber:i%2?'1':'2',lap:Math.floor(i/2)+2,lapTime:base+.03*(i%20)+(i%2?.4:0)+(year-2022)*.15,sectors:[null,null,null],compound:i%3?'MEDIUM':'HARD',tireAge:i%20+1,stint:1,trackStatus:'1',accurate:true,deleted:false,pitIn:null,pitOut:null,sessionTime:100+i*60,startTime:10+i*60})),results:[],weather:[],traces:[],warnings:[]});
}
export const archives=([2022,2023,2024].flatMap(year=>(['spa','monza','suzuka'] as CircuitId[]).map(c=>fixture(year,c))));
assert.throws(()=>validateArchive({...archives[0],year:2025}));
assert.throws(()=>validateArchive({...archives[0],date:'2025-01-01T00:00:00Z'}));
assert.throws(()=>validateArchive({...archives[0],trackVersion:'other-layout'}));
assert.throws(()=>validateIndex({schema:'apex-fastf1-index-1',cutoff:HISTORICAL_CUTOFF,sessions:[{id:'2025-spa-R',year:2025,date:'2025-01-01',circuitId:'spa',session:'R',event:'BAD',contentHash:'a'.repeat(64)}]}));
const model=trainPrediction(archives),repeat=trainPrediction(archives);
assert.deepEqual(model.coefficients,repeat.coefficients,'Deterministic training');
assert.deepEqual(model.metrics,repeat.metrics);
assert.equal(new Set(Object.values(model.split).flat()).size,9,'Disjoint event groups');
assert.deepEqual(validateModel(JSON.parse(JSON.stringify(model))).coefficients,model.coefficients);
const changed=structuredClone(archives);for(const a of changed)if(model.split.test.includes(a.id))for(const l of a.laps)l.lapTime!+=8;
const independent=trainPrediction(changed);assert.deepEqual(model.coefficients,independent.coefficients,'Test outcomes cannot influence fitted coefficients/lambda');assert.notEqual(model.metrics.modelMAE,independent.metrics.modelMAE);
assert.throws(()=>trainPrediction([archives[0],archives[0]]));
assert.throws(()=>validateModel({...model,cutoff:'2026-01-01'}));
assert.throws(()=>validateModel({...model,split:{...model.split,test:[model.split.train[0]]}}));
const g:GhostSetting={id:'one',name:'Reference',color:'#ff754c',driver:'AAA',compound:'MEDIUM',pitLap:0,secondCompound:'HARD',pitLoss:20,paceAdjustment:0,weatherPenalty:0},scenario={circuitId:'spa' as const,date:'2024-12-01',laps:8,ghosts:[g,{...g,id:'two',name:'Offset',paceAdjustment:1}]};
const results=predictRace(model,scenario);assert.ok(Math.abs(results[1].total-results[0].total-8)<1e-8,'Explicit pace offset applied per lap');
g.name='Edited later';assert.equal(results[0].setting.name,'Reference','Ghost settings snapshotted');
const pit=predictRace(model,{...scenario,ghosts:[{...g,pitLap:4,pitLoss:20},{...g,id:'pit0',pitLap:4,pitLoss:0}]});assert.ok(Math.abs(pit[0].total-pit[1].total-20)<1e-8);
assert.equal(sampleGhost(results[0],results[0].total).finished,true);assert.equal(sampleGhost(results[0],0).progress,0);
assert.ok(predictRace(model,{...scenario,date:'2026-01-01'})[0].total>0,'Future hypothetical target dates do not introduce future observations');assert.throws(()=>predictRace(model,{...scenario,date:'2022-01-01'}));assert.throws(()=>predictRace(model,{...scenario,ghosts:[{...g,driver:'UNKNOWN'}]}));
const trace={driver:'AAA',lap:2,lapTime:100,car:Array.from({length:11},(_,i)=>({t:i*10,date:`2024-08-01T12:${String(Math.floor(i/6)).padStart(2,'0')}:${String(i*10%60).padStart(2,'0')}Z`,sessionTime:i*10,speed:200,throttle:100,brake:false,rpm:10000,gear:6,distance:i*500,source:'car'})),positions:[{t:0,date:'2024-08-01T12:00:00Z',x:0,y:0,z:0,status:'OnTrack',source:'pos'},{t:1,date:'2024-08-01T12:00:01Z',x:10,y:10,z:0,status:'OnTrack',source:'pos'}]};
assert.equal(historicalAtProgress(trace,.5)!.t,50);assert.equal(sampleHistorical(trace,50).progress,.5);assert.equal(sampleHistorical(trace,55).missing,true,'Long telemetry gaps flagged');assert.deepEqual(historicalPosition(trace,.5),{x:5,y:5});assert.equal(historicalPosition(trace,2),null,'Do not extrapolate missing positions');
const withTrace=structuredClone(archives[6]);withTrace.laps[0]={...withTrace.laps[0],driver:'AAA',lap:2,lapTime:100};withTrace.laps=withTrace.laps.filter((l,i)=>i===0||l.driver!=='AAA'||l.lap!==2);withTrace.traces=[trace];validateArchive(withTrace);
const future=structuredClone(withTrace);future.traces[0].car[0].date='2025-01-01T00:00:00Z';assert.throws(()=>validateArchive(future));
const unordered=structuredClone(withTrace);unordered.traces[0].car[1].t=0;assert.throws(()=>validateArchive(unordered));
// If authorized real archives exist, verify every exported file and train/evaluate them.
const dir='data-local/fastf1';let real=0;if(fs.existsSync(dir)){const data=fs.readdirSync(dir).filter(f=>f!=='index.json'&&f.endsWith('.json')).map(f=>validateArchive(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))));real=data.length;if(data.filter(a=>a.session==='R').length>=5){const actual=trainPrediction(data);validateModel(actual);console.log(`Real-data evaluation: ${JSON.stringify(actual.metrics)}`);fs.writeFileSync('data-local/evaluated-model.json',JSON.stringify(actual));}}
console.log(`Research checks passed: cutoff/imports, chronological splits, no test leakage, determinism, model roundtrip, ghost settings/pits, interpolation gaps. Real archives validated: ${real}. Synthetic fixtures remain test-only.`);
