import ts from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const req=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apex-geometry-'));
function compile(source,name){let code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;code=code.replaceAll('require("../vehicleIdentity")','require("./vehicleIdentity.cjs")').replaceAll('require("three/addons/utils/BufferGeometryUtils.js")',`require(${JSON.stringify(req.resolve('three/addons/utils/BufferGeometryUtils.js'))})`).replaceAll('require("three")',`require(${JSON.stringify(req.resolve('three'))})`).replaceAll("require(\"@/lib/components\")",'require("./components.cjs")');fs.writeFileSync(path.join(tmp,name),code);}
compile('lib/vehicleIdentity.ts','vehicleIdentity.cjs');compile('lib/components.ts','components.cjs');compile('components/lab/car.ts','car.cjs');compile('lib/sim/setup.ts','setup.cjs');
const {createCar}=req(path.join(tmp,'car.cjs')),{DEFAULT_SETUP}=req(path.join(tmp,'setup.cjs')),{PARTS,resolveGeometryIds}=req(path.join(tmp,'components.cjs'));
const car=createCar();assert.equal(car.parts.size,PARTS.length);
car.update(DEFAULT_SETUP,1,'front-flap','',new Set(['engine']),null,false,1);
assert.equal(car.parts.get('engine').visible,false);assert.ok(car.parts.get('front-flap').position.z<-2.5);
car.update({...DEFAULT_SETUP,frontWing:30},0,'front-flap','',new Set(),'front-flap',false,1);
assert.ok(Math.abs(car.parts.get('front-flap').rotation.x+Math.PI/6)<1e-9);assert.equal([...car.parts.values()].filter(p=>p.visible).length,1);
car.update(DEFAULT_SETUP,0,'','',new Set(),null,false,1);assert.equal([...car.parts.values()].filter(p=>p.visible).length,PARTS.length);
for(const p of car.parts.values())p.traverse(m=>{if(m.isMesh){assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));}});
const suspension=new Set(resolveGeometryIds('assembly:suspension'));car.update(DEFAULT_SETUP,0,suspension,'',new Set(),suspension,false,1);assert.equal([...car.parts].filter(([,g])=>g.visible).length,suspension.size,'Assembly isolation resolves descendants');
car.update(DEFAULT_SETUP,0,new Set(),'',suspension,null,false,1);assert.ok([...suspension].every(id=>!car.parts.get(id).visible));assert.ok([...car.parts].some(([id,g])=>!suspension.has(id)&&g.visible),'Assembly hiding leaves unrelated geometry');
const pad=new Set(resolveGeometryIds('detail:brake-pad-set-front-left'));assert.deepEqual([...pad],['caliper-front-left']);car.update(DEFAULT_SETUP,0,pad,'',new Set(),null,false,1);let highlighted=false;car.parts.get('caliper-front-left').traverse(m=>{if(m.isMesh)highlighted ||= m.material.emissive.getHex()!==0;});assert.ok(highlighted,'Hierarchy-only selection highlights shared geometry');
const meshes=[];car.group.traverse(m=>{if(m.isMesh)meshes.push(m);});console.log({selectableParts:car.parts.size,meshes:meshes.length,triangles:meshes.reduce((sum,m)=>sum+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)});
// Driving transforms: wheel spin is deterministic and stationary brake parts do not spin.
const THREE=req('three'),tire=car.parts.get('tire-front-left'),rim=car.parts.get('rim-front-left'),caliper=car.parts.get('caliper-front-left');
car.update(DEFAULT_SETUP,0,'','',new Set(),null,false,10);car.drive(0,.1);car.group.updateMatrixWorld(true);
const stationary=caliper.getWorldQuaternion(new THREE.Quaternion()),rimStart=rim.getWorldQuaternion(new THREE.Quaternion());
car.drive(.33*Math.PI,.1);car.group.updateMatrixWorld(true);
assert.ok(Math.abs(tire.parent.rotation.x+Math.PI)<1e-12);assert.equal(tire.parent,rim.parent);
assert.ok(caliper.getWorldQuaternion(new THREE.Quaternion()).angleTo(stationary)<1e-7);
assert.ok(rim.getWorldQuaternion(new THREE.Quaternion()).angleTo(rimStart)>3);
car.drive(7,-.1);const target=tire.parent.rotation.x;car.drive(100,.2);car.drive(7,-.1);assert.equal(tire.parent.rotation.x,target);
assert.ok(tire.parent.parent.parent.rotation.y<0);car.drive(7,.1);assert.ok(tire.parent.parent.parent.rotation.y>0);
for(const camber of [-4,0])for(const rideHeight of [20,65]){
 car.update({...DEFAULT_SETUP,camber,rideHeight},0,'','',new Set(),null,false,10);car.drive(0,.12);car.group.updateMatrixWorld(true);
 for(const side of ['left','right'])for(const axle of ['front','rear']){let minY=Infinity;car.parts.get(`tire-${axle}-${side}`).traverse(m=>{if(m.isMesh){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)minY=Math.min(minY,new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).y);}});assert.ok(minY>=-1e-6&&minY<.002,`Tire road support ${minY}`);}
}
// Chassis attitude is absolute/deterministic and must not move the road-supported wheels.
car.update(DEFAULT_SETUP,0,'','',new Set(),null,false,10);car.drive(21,.08);car.group.updateMatrixWorld(true);
const wheelBefore=tire.matrixWorld.clone(),body=car.group.getObjectByName('derived-sprung-body');
car.attitude({heaveMM:10,pitchDeg:-.2,rollDeg:-.3});car.group.updateMatrixWorld(true);
assert.deepEqual(tire.matrixWorld.elements,wheelBefore.elements);assert.equal(body.position.y,-.01);assert.ok(body.rotation.x<0&&body.rotation.z<0);
const bodyBefore=body.matrixWorld.clone();car.attitude({heaveMM:20,pitchDeg:1,rollDeg:1});car.attitude({heaveMM:10,pitchDeg:-.2,rollDeg:-.3});car.group.updateMatrixWorld(true);assert.deepEqual(body.matrixWorld.elements,bodyBefore.elements);
car.attitude();assert.equal(body.position.y,0);assert.equal(body.rotation.x,0);assert.equal(body.rotation.z,0);
console.log('Derived chassis attitude: deterministic seek, neutral garage reset, unchanged wheel contact/spin/steering passed.');
const ids=PARTS.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);for(const p of PARTS.filter(p=>/^(bearing|bell|bridge|arm)-/.test(p.id))){assert.equal(p.parameters.length,0);assert.ok(ids.includes(p.parentId));assert.ok(car.parts.has(p.id));}
console.log('Wheel checks passed: distance-derived spin, signed steering, stationary calipers, repeatable scrub, tire contact, and 16 nonfunctional-detail labels.');
console.log('Geometry checks passed: catalog-matched parts, finite meshes, explode, isolation, hide/show, and wing rotation.');fs.rmSync(tmp,{recursive:true});
