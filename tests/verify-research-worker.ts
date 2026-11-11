import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {archives} from './verify-research';
import {trainPrediction,predictRace} from '../lib/racePrediction';
import {DEFAULT_SETUP} from '../lib/sim/setup';
const root='dist/client',files=fs.readdirSync(root,{recursive:true}) as string[],chunks=files.filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(root,f),'utf8'));
const asset=chunks.map(s=>s.match(/\/_next\/static\/research\.worker-[\w-]+\.js/)?.[0]).find(Boolean);assert.ok(asset,'Same-origin research worker URL shipped');
const code=fs.readFileSync(path.join(root,asset),'utf8'),replies:any[]=[],self={postMessage:(m:unknown)=>replies.push(m),onmessage:(_e:any)=>{}};
vm.runInNewContext(code,{self,structuredClone,Math},{timeout:5000});
self.onmessage({data:{id:1,kind:'train',archives}});const response=replies.at(-1);assert.equal(response.id,1);assert.equal(response.error,undefined,response.error);assert.deepEqual(JSON.parse(JSON.stringify(response.model.coefficients)),trainPrediction(archives).coefficients);
const scenario={circuitId:'spa' as const,date:'2024-12-01',laps:5,ghosts:[{id:'p',name:'Ghost',driver:'AAA',color:'#ff754c',compound:'MEDIUM',secondCompound:'HARD',pitLap:2,pitLoss:22,paceAdjustment:0,weatherPenalty:0}]};
self.onmessage({data:{id:2,kind:'predict',model:response.model,scenario}});assert.equal(replies.at(-1).error,undefined);assert.equal(replies.at(-1).results[0].total,predictRace(response.model,scenario)[0].total);
self.onmessage({data:{id:3,kind:'train',archives:[{...archives[0],year:2025}]}});assert.ok(replies.at(-1).error,'Future data rejected by shipped worker');
self.onmessage({data:{id:4,kind:'predict',model:response.model,scenario:{...scenario,date:'2022-01-01'}}});assert.ok(replies.at(-1).error,'Pre-race target cannot precede training cutoff');
// Calibration failure must preserve previous results and report invalid selection.
self.onmessage({data:{id:5,kind:'calibrate',archive:archives[0],traceKey:'missing',setup:DEFAULT_SETUP}});assert.match(replies.at(-1).error,/Choose a historical trace/);
console.log('Packaged research worker passed: same-origin asset, deterministic training/inference, pre-2025 enforcement, error protocol.');
