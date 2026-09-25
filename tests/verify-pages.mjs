import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root='dist-pages',base=process.env.PAGES_BASE_PATH??'/apex-formula-lab-AI/';
const html=fs.readFileSync(root+'/index.html','utf8');
assert.ok(html.includes('<div id="root"></div>'));
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const url=match[1];assert.ok(url.startsWith(base),`Asset outside repository path: ${url}`);assert.ok(fs.existsSync(path.join(root,url.slice(base.length))),`Missing asset: ${url}`);
}
const files=fs.readdirSync(root+'/assets').filter(f=>f.endsWith('.js'));
const scripts=files.map(f=>fs.readFileSync(root+'/assets/'+f,'utf8')).join('\n');
const worker=files.find(f=>/^lap\.worker-/.test(f));assert.ok(worker);
assert.ok(scripts.includes(base+'assets/'+worker),'Worker URL includes repository path');
assert.ok(!scripts.includes('file:///'),'No build-machine URLs');
for(const asset of ['apex-formula-lab-source.zip','data/suzuka/NOTICE.md','data/suzuka/Suzuka.csv','data/suzuka/derived-track.json']){assert.ok(scripts.includes(base+asset));assert.ok(fs.existsSync(root+'/'+asset));}
const replies=[],self={postMessage:r=>replies.push(r)};
vm.runInNewContext(fs.readFileSync(root+'/assets/'+worker,'utf8'),{self,Math},{timeout:2000});
const trajectory={version:1,id:'centerline',name:'Reference',offsets:Array(24).fill(0)};
const setup={frontWing:18,rearWing:22,rideHeight:35,fuel:25,ballast:0,power:600,tire:'medium',brakeBias:56,camber:-2.5,toe:.1};
self.onmessage({data:{id:1,vehicleId:'f2004',setup,trajectory}});
assert.ok(!replies[0].error,replies[0].error);assert.ok(Math.abs(replies[0].lap.lapTime-108.59340246833438)<1e-8);
const sf={frontWing:0,rearWing:0,rideHeight:35,fuel:25,ballast:0,power:380,tire:'medium',brakeBias:56,camber:0,toe:0,finalDrive:4.1,frontWeight:46,cgHeight:300,frontSpring:0,rearSpring:0,frontARB:0,rearARB:0,tirePressure:0,gripScale:1,brakeLimit:5,gear1:3.1,gear2:2.55,gear3:2.12,gear4:1.81,gear5:1.58,gear6:1.4,gear7:1.26,gear8:1.14,dryMass:770,frontClA:2,rearClA:2.6,baseCdA:1};
self.onmessage({data:{id:2,vehicleId:'sf26',setup:sf,trajectory}});
assert.ok(!replies[1].error,replies[1].error);assert.equal(replies[1].lap.vehicleId,'sf26');assert.ok(Math.abs(replies[1].lap.lapTime-126.71084397032935)<1e-8);
console.log('Pages passed: static entry, repository-prefixed assets/downloads/worker, F2004 and SF-26 regression laps.');
