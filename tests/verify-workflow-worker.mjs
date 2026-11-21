import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const dir='dist-pages/assets',file=fs.readdirSync(dir).find(f=>/^research\.worker-.*\.js$/.test(f));assert.ok(file);
const code=fs.readFileSync(path.join(dir,file),'utf8'),replies=[],self={postMessage:m=>replies.push(m)};vm.runInNewContext(code,{self,Math,structuredClone},{timeout:3000});
const index=JSON.parse(fs.readFileSync('public/data/fastf1/index.json','utf8')),archives=index.sessions.map(e=>JSON.parse(fs.readFileSync('public/data/fastf1/'+e.id+'.json','utf8')));
self.onmessage({data:{id:1,kind:'train',archives,options:{testEventId:'2024-monza-R'}}});const trained=replies.at(-1);assert.equal(trained.error,undefined);assert.deepEqual(Array.from(trained.model.split.test),['2024-monza-R']);assert.ok(trained.evaluation.length>500);
const g={id:'a',name:'Reference',color:'#ff754c',driver:'VER',compound:'MEDIUM',secondCompound:'HARD',pitLap:0,pitLoss:22,paceAdjustment:0,weatherPenalty:0};
self.onmessage({data:{id:2,kind:'predict',model:trained.model,scenario:{circuitId:'monza',date:'2024-10-01',laps:10,ghosts:[g,{...g,id:'b',paceAdjustment:1}]}}});const predicted=replies.at(-1);assert.equal(predicted.error,undefined);assert.equal(predicted.results.length,2);assert.ok(Math.abs(predicted.results[1].total-predicted.results[0].total-10)<1e-8);
self.onmessage({data:{id:3,kind:'train',archives,options:{testEventId:'2024-spa-R'}}});assert.match(replies.at(-1).error,/exclude future/);
console.log('Packaged workflow worker passed: fourteen real races, selected chronological holdout, evaluation rows, independent ghosts and future-event rejection.');
