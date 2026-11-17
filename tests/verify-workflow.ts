import fs from 'node:fs';import assert from 'node:assert/strict';
import {validateArchive,validateIndex} from '../lib/fastf1';
import {trainPrediction,evaluatePrediction,validateModel,predictRace,PREDICTION_VERSION} from '../lib/racePrediction';
import {positionSegments} from '../lib/replayPaths';
const index=validateIndex(JSON.parse(fs.readFileSync('public/data/fastf1/index.json','utf8')));
const archives=index.sessions.map(e=>validateArchive(JSON.parse(fs.readFileSync(`public/data/fastf1/${e.id}.json`,'utf8'))));
assert.equal(archives.length,6);assert.ok(archives.every(a=>a.provenance.provider==='OpenF1'&&a.provenance.rights.includes('CC BY-NC-SA')&&a.year<2025));
assert.ok(archives.reduce((n,a)=>n+a.laps.length,0)>5000);assert.ok(archives.every(a=>a.laps.every(l=>l.accurate===null&&l.deleted===null&&l.trackStatus===null)),'Unknown source flags must not be invented');
const options={testEventId:'2024-monza-R'},model=validateModel(trainPrediction(archives,options)),evaluation=evaluatePrediction(model,archives);
assert.equal(model.version,PREDICTION_VERSION);assert.deepEqual(model.split.test,[options.testEventId]);assert.equal(model.metrics.n,evaluation.length);assert.ok(model.metrics.n>500);
assert.ok(Math.abs(evaluation.reduce((n,r)=>n+Math.abs(r.predicted-r.actual),0)/evaluation.length-model.metrics.modelMAE)<1e-9);
// Alter held-out targets AND their sector totals while keeping their observations eligible.
// No fitted coefficient, baseline or regularization choice may depend on those values.
const changed=structuredClone(archives),test=changed.find(a=>a.id===options.testEventId)!;
for(const l of test.laps)if(l.lapTime!==null&&l.lapTime>70&&l.lapTime<100&&l.sectors[0]!==null){l.lapTime+=.25;l.sectors[0]+=.25;}
const modified=trainPrediction(changed,options);assert.deepEqual(modified.coefficients,model.coefficients);assert.equal(modified.lambda,model.lambda);assert.deepEqual(modified.baseline,model.baseline);assert.notEqual(modified.metrics.modelMAE,model.metrics.modelMAE);
assert.throws(()=>trainPrediction(archives,{testEventId:'2024-spa-R'}),/exclude future/);
const earlier=archives.filter(a=>a.id!=='2024-monza-R'),alternate=trainPrediction(earlier,{testEventId:'2024-spa-R'});assert.deepEqual(alternate.split.test,['2024-spa-R']);assert.ok(alternate.datasets.every(a=>a.id!=='2024-monza-R'));
assert.throws(()=>validateArchive({...archives[0],date:'2025-01-01T00:00:00Z'}));
assert.throws(()=>evaluatePrediction(model,[{...archives[0],contentHash:'f'.repeat(64)}]),/identity/);
const bundled=validateModel(JSON.parse(fs.readFileSync('public/data/fastf1/starter-model.json','utf8')));assert.deepEqual(bundled.coefficients,model.coefficients);assert.deepEqual(bundled.datasets,model.datasets);
assert.equal(validateModel({...model,version:'apex-ridge-dry-1'}).version,'apex-ridge-dry-1','Prior model family stays readable');
const g={id:'a',name:'Reference',color:'#ff754c',driver:model.drivers[0],compound:'MEDIUM',secondCompound:'HARD',pitLap:0,pitLoss:22,paceAdjustment:0,weatherPenalty:0};
const result=predictRace(model,{circuitId:'monza',date:'2026-01-01',laps:5,ghosts:[g,{...g,id:'b',name:'Offset',paceAdjustment:1}]});assert.ok(Math.abs(result[1].total-result[0].total-5)<1e-8);
assert.throws(()=>predictRace(model,{circuitId:'monza',date:'2024-01-01',laps:5,ghosts:[g]}));
const points=[{t:0,x:0,y:0},{t:1,x:1,y:1},{t:2,x:null,y:null},{t:3,x:3,y:3},{t:4,x:4,y:4},{t:10,x:10,y:10},{t:11,x:11,y:11}];
assert.deepEqual(positionSegments(points).map(s=>s.map(p=>p.t)),[[0,1],[3,4],[10,11]],'Missing samples and time gaps break drawn paths');
assert.deepEqual(positionSegments([{t:0,x:0,y:0}]),[]);
console.log({workflow:'passed',realSessions:archives.length,observedLaps:archives.reduce((n,a)=>n+a.laps.length,0),testMAE:model.metrics.modelMAE,baselineMAE:model.metrics.baselineMAE,heldOut:evaluation.length,leakage:'no target influence on fit',gapConnectors:'prevented',legacyModel:'readable'});
