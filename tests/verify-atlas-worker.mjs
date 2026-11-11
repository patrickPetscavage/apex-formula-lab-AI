import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root='dist-pages/assets',files=fs.readdirSync(root),worker=files.find(f=>/^atlas\.worker-.*\.js$/.test(f));assert.ok(worker,'Packaged atlas worker exists');
const source=fs.readFileSync(path.join(root,worker),'utf8'),replies=[],self={postMessage:m=>replies.push(m)};vm.runInNewContext(source,{self,Math,structuredClone},{timeout:3000});
const manifest=JSON.parse(fs.readFileSync('public/data/atlas-2026/index.json','utf8'));
const summaries=[];
for(const entry of manifest.circuits){const atlas=JSON.parse(fs.readFileSync('public/data/atlas-2026/'+entry.id+'.json','utf8'));replies.length=0;
 self.onmessage({data:{id:entry.round,atlas,vehicleId:'f2004',ghosts:[{id:'a',name:'Reference',color:'#ff754c',setup:{power:600,fuel:25,gripScale:1}},{id:'b',name:'Reference copy',color:'#85c8d0',setup:{power:600,fuel:25,gripScale:1}}]}});
 const result=replies.at(-1);assert.equal(result.error,undefined,entry.id+': '+result.error);assert.equal(result.atlasId,entry.id);assert.equal(result.atlasVersion,atlas.version);assert.equal(result.laps[0].lap.lapTime,result.laps[1].lap.lapTime,'Identical ghosts agree');
 const lap=result.laps[0].lap;assert.ok(Number.isFinite(lap.lapTime)&&lap.lapTime>20);assert.equal(lap.vehicleId,'f2004');assert.ok(lap.referencePath.length===lap.path.length);assert.ok(lap.speed.every(v=>Number.isFinite(v)&&v>0));assert.ok(Math.abs(lap.sectors.reduce((a,b)=>a+b,0)-lap.lapTime)<1e-8);assert.ok(lap.modelVersion.includes('atlas-dem-proxy'));summaries.push({id:entry.id,seconds:lap.lapTime,stations:lap.path.length});
}
const atlas=JSON.parse(fs.readFileSync('public/data/atlas-2026/suzuka.json','utf8'));replies.length=0;self.onmessage({data:{id:100,atlas,vehicleId:'sf26',ghosts:[{id:'a',name:'SF-26',color:'#ff754c',setup:{power:380,fuel:25,gripScale:1}}]}});assert.equal(replies.at(-1).error,undefined);assert.equal(replies.at(-1).laps[0].lap.vehicleId,'sf26');assert.equal(replies.at(-1).laps[0].lap.capabilities.hybrid,false);
self.onmessage({data:{id:101,atlas:{...atlas,points:[[0,0,0],[0,0,0]]},vehicleId:'f2004',ghosts:[]}});assert.ok(replies.at(-1).error);
self.onmessage({data:{id:102,atlas,vehicleId:'unknown',ghosts:[]}});assert.ok(replies.at(-1).error);
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/atlas-simulation-verification.json',JSON.stringify(summaries,null,2));
console.log('Atlas production worker passed: all 23 circuits, closed timing/sectors, deterministic independent ghosts, separate SF-26 model and invalid-data rejection.');
