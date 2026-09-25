import assert from 'node:assert/strict';
import {PARTS,COMPONENTS,COMPONENT_BY_ID,COMPONENT_SUMMARY,componentDescendants,componentPath,filterComponents,resolveGeometryIds} from '../lib/components';
import {PARAMS} from '../lib/sim/setup';

assert.equal(PARTS.length,110,'Build 2D geometry IDs must remain intact');
assert.equal(new Set(PARTS.map(p=>p.id)).size,110);
assert.equal(new Set(COMPONENTS.map(c=>c.id)).size,COMPONENTS.length,'Unique component IDs');
assert.equal(COMPONENTS.filter(c=>c.kind==='subcomponent').length,48);
assert.ok(PARTS.every(p=>COMPONENT_BY_ID.has(p.id)),'Every legacy component remains selectable');
const parameterIds=new Set(PARAMS.map(p=>p.key));
for(const c of COMPONENTS){
 assert.ok(Number.isFinite(c.mass)&&c.mass>=0,`Valid mass ${c.id}`);
 assert.ok(c.simulationStatus&&c.dataClass&&c.confidence,`Required labels ${c.id}`);
 if(c.parentId)assert.ok(COMPONENT_BY_ID.has(c.parentId),`Valid parent ${c.id}: ${c.parentId}`);
 for(const id of c.mountsTo)assert.ok(COMPONENT_BY_ID.has(id),`Valid mount ${c.id}: ${id}`);
 for(const key of c.parameters)assert.ok(parameterIds.has(key),`Valid parameter ${c.id}: ${key}`);
 const path=componentPath(c.id);assert.equal(path[0].id,'vehicle:f2004',`Reachable from root ${c.id}`);assert.equal(new Set(path.map(p=>p.id)).size,path.length,`No cycle ${c.id}`);
 for(const id of resolveGeometryIds(c.id))assert.ok(PARTS.some(p=>p.id===id),`Geometry resolves ${c.id}: ${id}`);
}
for(const c of COMPONENTS)for(const child of c.childrenIds)assert.equal(COMPONENT_BY_ID.get(child)?.parentId,c.id,`Bidirectional child ${child}`);
for(const assembly of COMPONENTS.filter(c=>c.kind==='assembly')){const expected=new Set(COMPONENTS.filter(c=>c.assembly===assembly.name).flatMap(c=>c.geometryIds));assert.deepEqual(new Set(resolveGeometryIds(assembly.id)),expected,`Assembly resolves classified geometry ${assembly.id}`);}
const suspension=COMPONENT_BY_ID.get('assembly:suspension')!;
assert.ok(componentDescendants(suspension.id).length>20);assert.ok(resolveGeometryIds(suspension.id).length>20);
const detail=COMPONENT_BY_ID.get('detail:brake-pad-set-front-left')!;
assert.deepEqual(resolveGeometryIds(detail.id),['caliper-front-left']);
assert.equal(detail.simulationStatus,'HIERARCHY-ONLY');assert.equal(detail.parameters.length,0);
assert.ok(filterComponents('brake pad','HIERARCHY-ONLY','ESTIMATED').every(c=>c.id.startsWith('detail:brake-pad-set-')));
assert.equal(filterComponents('detail:center-lock-nut').length,4);assert.equal(filterComponents('', 'UNSUPPORTED').length,5);
assert.equal(COMPONENT_SUMMARY.geometryBacked,110);assert.equal(COMPONENT_SUMMARY.total,COMPONENTS.length);
console.log({components:'passed',total:COMPONENTS.length,geometryBacked:PARTS.length,addedSubcomponents:48,hierarchyOnly:COMPONENT_SUMMARY.hierarchyOnly,subsystems:COMPONENT_SUMMARY.bySubsystem,status:COMPONENT_SUMMARY.byStatus,provenance:COMPONENT_SUMMARY.byProvenance});
