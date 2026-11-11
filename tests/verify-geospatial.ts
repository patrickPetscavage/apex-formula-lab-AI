import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {geographicToLocal,localToGeographic,roadFrame,offsetRoad} from '../lib/geospatial';
import {validateAtlas,atlasTrack,terrainHeight} from '../lib/circuitAtlas';
import {TRACK} from '../lib/sim/track';
const origin={latitude:34.8433,longitude:136.5403,datumMSL:53};
for(const [longitude,latitude,h] of [[136.54,34.84,50],[136.52,34.85,100],[136.55,34.82,30]]){const local=geographicToLocal(longitude,latitude,h,origin),back=localToGeographic(local.x,local.y,local.z,origin);assert.ok(Math.abs(back.longitude-longitude)<1e-10);assert.ok(Math.abs(back.latitude-latitude)<1e-10);assert.equal(back.heightMSL,h);}
assert.ok(geographicToLocal(origin.longitude+.001,origin.latitude,53,origin).x>0);assert.ok(geographicToLocal(origin.longitude,origin.latitude+.001,53,origin).z<0);
for(const [a,b,right] of [[{x:0,y:0,z:0},{x:0,y:0,z:-10},{x:1,z:0}],[{x:0,y:0,z:0},{x:10,y:0,z:0},{x:0,z:1}]] as const){const f=roadFrame(a,b);assert.ok(Math.abs(f.right.x-right.x)<1e-12&&Math.abs(f.right.z-right.z)<1e-12);assert.ok(Math.abs(f.right.x*f.forward.x+f.right.z*f.forward.z)<1e-12);assert.equal(Math.hypot(f.right.x,f.right.z),1);}
const landmark=JSON.parse(fs.readFileSync('lib/sim/data/suzuka-landmarks.json','utf8'));
assert.ok(landmark.registration.rmsMetres<5,'Source landmark registration remains under 5 m RMS');const r=landmark.registration.rotation;assert.ok(r[0][0]*r[1][1]-r[0][1]*r[1][0]>.99999,'A reflection is forbidden');
function lateral(footprint:number[][]){const x=footprint.reduce((s,p)=>s+p[0],0)/footprint.length,z=footprint.reduce((s,p)=>s+p[1],0)/footprint.length;let best=Infinity,result=0;for(let i=0;i<TRACK.length;i++){const p=TRACK[i],q=TRACK[(i+1)%TRACK.length],f=roadFrame(p,q),d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;result=(x-p.x)*f.right.x+(z-p.z)*f.right.z;}}return result;}
assert.ok(lateral(landmark.buildings.find((b:any)=>b.osmId===184422099).footprint)>0,'Suzuka pit building is driver-right');assert.ok(lateral(landmark.buildings.find((b:any)=>b.osmId===183394522).footprint)<0,'Suzuka V2 grandstand is driver-left');
const manifest=JSON.parse(fs.readFileSync('public/data/atlas-2026/index.json','utf8'));assert.equal(manifest.circuits.length,23);assert.ok(manifest.circuits.some((c:any)=>c.id==='sepang'));assert.ok(!manifest.circuits.some((c:any)=>c.id==='jeddah'||c.id==='sakhir'));
const failures:string[]=[];const summaries=[];
for(const entry of manifest.circuits){const file=path.join('public/data/atlas-2026',entry.id+'.json');if(!fs.existsSync(file)){failures.push(entry.id+': missing');continue;}const a=validateAtlas(JSON.parse(fs.readFileSync(file,'utf8'))),p=atlasTrack(a);assert.equal(a.id,entry.id);assert.ok(p.every(q=>q.ds>0&&Number.isFinite(q.k)&&Number.isFinite(q.grade)));assert.ok(p.every(q=>Math.abs(q.x)<20000&&Math.abs(q.z)<20000));assert.ok(Math.abs(p.reduce((n,q)=>n+q.ds,0)-a.length)/a.length<.1);if(a.terrain){assert.equal(a.terrain.heights.length,a.terrain.size**2);assert.ok(terrainHeight(a,p[0].x,p[0].z)!==null);}
 if(a.id==='suzuka'){assert.ok(a.crossing);const [,lower,upper]=a.crossing!;assert.ok(p[upper].y-p[lower].y>7.5,'Upper and lower road levels stay separate');}
 summaries.push({id:a.id,stations:p.length,sourceWays:a.provenance.horizontal.wayIds.length,buildings:a.buildings.length,warnings:a.warnings.length});
}
assert.deepEqual(failures,[],'Every current calendar venue must have an explicit source asset');
console.log(JSON.stringify({geospatial:'passed',coordinateRoundtrip:true,noReflection:true,pitAndGrandstandSides:true,calendar:23,assets:summaries},null,2));
