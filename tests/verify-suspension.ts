import assert from 'node:assert/strict';
import {DEFAULT_SETUP} from '../lib/sim/setup';
import {simulate} from '../lib/sim/physics';
import {cornerState,attachSuspension,sampleSuspension,SUSPENSION_KEYS} from '../lib/sim/suspension';
import {snapshot,validateExperiment,telemetryCSV} from '../lib/sim/experiments';
const s=DEFAULT_SETUP,near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const steady=cornerState(s,0,0,0,0),brake=cornerState(s,-10,0,0,0),accel=cornerState(s,10,0,0,0),left=cornerState(s,0,20,0,0),right=cornerState(s,0,-20,0,0);
near(steady.fl,steady.fr);near(steady.rl,steady.rr);near(steady.heaveMM,0);
assert.ok(brake.fl>steady.fl&&brake.rl<steady.rl&&brake.pitchDeg<0);
assert.ok(accel.fl<steady.fl&&accel.rl>steady.rl&&accel.pitchDeg>0);
assert.ok(left.fr>left.fl&&left.rr>left.rl&&left.rollDeg<0);
near(left.fr,right.fl);near(left.rr,right.rl);near(left.rollDeg,-right.rollDeg);
const aero=cornerState(s,0,0,1000,1000),heavy=cornerState({...s,ballast:30},0,0,0,0);
assert.ok(aero.fl>steady.fl&&aero.rl>steady.rl&&aero.heaveMM>0&&heavy.fl>steady.fl&&heavy.rl>steady.rl);
assert.ok(cornerState({...s,frontSpring:300,rearSpring:300},0,0,1000,1000).heaveMM<aero.heaveMM);
const stiff=cornerState({...s,frontARB:120},0,20,0,0);assert.ok(stiff.frontTransfer>left.frontTransfer&&Math.abs(stiff.rollDeg)<Math.abs(left.rollDeg));
for(const ax of [-100,0,100])for(const ay of [-100,0,100]){
 const q=cornerState(s,ax,ay,1500,2000);near(q.fl+q.fr+q.rl+q.rr,(605+s.fuel+s.ballast)*9.81+3500);
 assert.ok(SUSPENSION_KEYS.every(k=>Number.isFinite(q[k])));assert.ok(Math.min(q.fl,q.fr,q.rl,q.rr)>=0);
 assert.ok(Math.max(Math.abs(q.flMM),Math.abs(q.frMM),Math.abs(q.rlMM),Math.abs(q.rrMM))<=25.001);
}
assert.ok(cornerState(s,0,100,0,0).warning&1);assert.ok(cornerState(s,0,0,50000,50000).warning&2);
const lap=simulate(s),before=JSON.stringify(lap),old=snapshot(lap,'old','centerline');
assert.equal(validateExperiment(old).lap.suspension,undefined);
attachSuspension(lap);const {suspension,...original}=lap;assert.equal(JSON.stringify(original),before,'Lap physics unchanged');
for(const q of suspension!.samples){assert.ok(SUSPENSION_KEYS.every(k=>Number.isFinite(q[k])));}
const saved=snapshot(lap,'new','centerline');assert.deepEqual(validateExperiment(JSON.parse(JSON.stringify(saved))),JSON.parse(JSON.stringify(saved)));
const target=sampleSuspension(lap,10,.3);sampleSuspension(lap,400,.8);assert.deepEqual(sampleSuspension(lap,10,.3),target);
for(const k of SUSPENSION_KEYS.filter(k=>k!=='warning'))near(sampleSuspension(lap,lap.path.length-1,1)![k],sampleSuspension(lap,0,0)![k]);
assert.ok(telemetryCSV(saved).includes('fl_N'));assert.ok(!telemetryCSV(old).includes('fl_N'));
const bad=structuredClone(saved);bad.lap.suspension!.samples[0].fl=Infinity;assert.throws(()=>validateExperiment(bad));
console.log('Suspension: symmetry, transfer signs, conservation, spring/ARB response, lift/travel warnings, bounds, deterministic seam/seek, legacy JSON and new JSON/CSV, unchanged lap solver passed.');
