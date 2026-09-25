import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const req=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sf26-geometry-'));
try{
 for(const source of ['components/lab/sf26Car.ts','lib/sf26.ts','lib/componentCatalog.ts']){
  const code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('require("three")',`require(${JSON.stringify(req.resolve('three'))})`);
  const dest=path.join(tmp,source.replace('.ts','.js'));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,code);
 }
 const {createSF26}=req(path.join(tmp,'components/lab/sf26Car.js')),{SF26_CATALOG:c}=req(path.join(tmp,'lib/sf26.js')),car=createSF26(),THREE=req('three');
 assert.equal(car.parts.size,75);let meshes=0,triangles=0;
 car.group.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));assert.ok(car.parts.has(m.userData.partId));}});
 assert.ok(meshes<200&&triangles<90000,'Bounded geometry complexity');
 const wheels=new Set(c.resolve('sf26:Wheels & brakes'));car.update({},0,new Set(),'',wheels,null,false,10);assert.ok([...wheels].every(id=>!car.parts.get(id).visible));
 car.update({},0,wheels,'',new Set(),wheels,false,10);assert.equal([...car.parts.values()].filter(p=>p.visible).length,32);
 car.update({},1,new Set(['sf26:nose']),'',new Set(),null,false,10);assert.ok(car.parts.get('sf26:nose').position.z<-.79);
 let highlighted=false;car.parts.get('sf26:nose').traverse(m=>{if(m.isMesh)highlighted||=m.material.emissive.getHex()!==0;});assert.ok(highlighted);
 car.update({},0,new Set(),'',new Set(),null,false,10);car.group.updateMatrixWorld(true);
 for(const axle of ['front','rear'])for(const side of ['left','right']){const bounds=new THREE.Box3().setFromObject(car.parts.get(`sf26:tire-${axle}-${side}`));assert.ok(Math.abs(bounds.min.y)<1e-6,'Tire rests on garage plane');}
 // Spin and steering use SF-26 dimensions; calipers do not spin.
 const tire=car.parts.get('sf26:tire-front-left'),caliper=car.parts.get('sf26:caliper-front-left');
 car.drive(0,.1);car.group.updateMatrixWorld(true);const stationary=caliper.getWorldQuaternion(new THREE.Quaternion());
 car.drive(.355*Math.PI,.1);car.group.updateMatrixWorld(true);assert.ok(Math.abs(tire.parent.rotation.x+Math.PI)<1e-12);assert.ok(caliper.getWorldQuaternion(new THREE.Quaternion()).angleTo(stationary)<1e-7);
 car.drive(17,-.2);const pose=tire.parent.rotation.x;car.drive(88,.3);car.drive(17,-.2);assert.equal(tire.parent.rotation.x,pose);assert.ok(tire.parent.parent.rotation.y<0);
 car.drive(0,0);car.group.updateMatrixWorld(true);
 const ghost=createSF26(true);ghost.update({},0,'','',new Set(),null,false,1);ghost.group.traverse(o=>{if(o.isMesh)assert.equal(o.material.opacity,.24);});
 const bounds=new THREE.Box3().setFromObject(car.group);assert.ok(bounds.max.x-bounds.min.x<2&&bounds.max.z-bounds.min.z<5.2);
 console.log({sf26Geometry:'passed',parts:car.parts.size,meshes,triangles,checks:'finite meshes, ID correspondence, assembly hide/isolate, highlight, explode, tire contact, bounds'});
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
