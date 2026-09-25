import assert from 'node:assert/strict';
import {SF26_CATALOG as c,SF26_DEFINITION,SF26_SPECS} from '../lib/sf26';
import {COMPONENTS,PARTS} from '../lib/components';
import {vehicleId,requireSimulatedVehicle} from '../lib/vehicleIdentity';
import {DEFAULT_SETUP,validateSaved} from '../lib/sim/setup';
import {simulate} from '../lib/sim/physics';
import {snapshot,validateExperiment} from '../lib/sim/experiments';
assert.equal(COMPONENTS.length,172);assert.equal(PARTS.length,110);
assert.equal(c.byId.size,c.nodes.length);assert.equal(c.summary.geometryBacked,75);assert.equal(c.nodes.length,96);
for(const n of c.nodes){assert.ok(n.id.startsWith('sf26:'));assert.ok(!COMPONENTS.some(p=>p.id===n.id));const path=c.path(n.id);assert.equal(path[0].id,'sf26:vehicle');assert.equal(new Set(path.map(n=>n.id)).size,path.length);for(const child of n.childrenIds)assert.equal(c.byId.get(child)?.parentId,n.id);for(const mount of n.mountsTo)assert.ok(c.byId.has(mount));for(const g of c.resolve(n.id))assert.ok(c.byId.get(g)?.geometryIds.includes(g));}
assert.equal(c.resolve('sf26:Wheels & brakes').length,32);assert.equal(c.resolve('sf26:Power unit').length,0);assert.equal(c.filter('caliper').length,4);
assert.equal(SF26_DEFINITION.setupDefaults,'sf26-ice-fixed-3b.1');assert.equal(SF26_DEFINITION.capabilities.simulation,true);
assert.ok(SF26_SPECS.filter(s=>s.scope==='Preview geometry').every(s=>s.provenance==='ESTIMATED'));
assert.equal(vehicleId(undefined),'f2004');assert.equal(requireSimulatedVehicle('sf26'),'sf26');assert.throws(()=>vehicleId('other'));
const legacy={version:1 as const,name:'Legacy',setup:DEFAULT_SETUP};assert.equal(validateSaved(legacy).vehicleId,undefined);assert.equal(validateSaved({...legacy,vehicleId:'f2004'}).vehicleId,'f2004');assert.throws(()=>validateSaved({...legacy,vehicleId:'sf26'}));
const lap=simulate(DEFAULT_SETUP);assert.ok(Math.abs(lap.lapTime-108.59340246833438)<1e-8,'F2004 centerline result unchanged');
const run=snapshot(lap,'new','centerline');assert.equal(run.vehicleId,'f2004');const old={...run};delete old.vehicleId;assert.equal(validateExperiment(old).vehicleId,undefined);assert.throws(()=>validateExperiment({...run,vehicleId:'sf26'}));assert.equal(validateExperiment(JSON.parse(JSON.stringify(run))).vehicleId,'f2004');
console.log('Vehicles passed: 96 SF-26 nodes / 75 visible groups, hierarchy integrity, estimated geometry labels, identity guards, legacy files, explicit new identities, unchanged F2004 result.');
