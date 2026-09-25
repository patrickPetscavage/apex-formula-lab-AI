import assert from 'node:assert/strict';
import {sampleMotion,angleDelta,clockTime,changeClock,type PlaybackClock} from '../lib/sim/motion';
import {simulate,sampleLap} from '../lib/sim/physics';
import {DEFAULT_SETUP} from '../lib/sim/setup';
import {optimizeLine} from '../lib/sim/optimizer';
import {CORRIDOR} from '../lib/sim/trajectory';
const lap=optimizeLine(DEFAULT_SETUP,'motion-test'),before=JSON.stringify(lap);
let left=false,right=false,maxJump=0;
for(let i=0;i<lap.path.length;i++){
 const t=lap.time[i],a=sampleMotion(lap,t===0?lap.lapTime-1e-7:t-1e-7),b=sampleMotion(lap,t+1e-7);
 const jump=Math.abs(angleDelta(a.heading,b.heading));maxJump=Math.max(maxJump,jump);assert.ok(jump<1e-5,'Heading continuous across samples/seam');assert.ok(Math.abs(a.pitch-b.pitch)<1e-5);
 for(const u of [0,.25,.5,.75,1]){const time=t+(lap.time[i+1]-t)*u,m=sampleMotion(lap,time),s=sampleLap(lap,time);assert.equal(m.x,s.x);assert.equal(m.y,s.y);assert.equal(m.z,s.z);assert.equal(m.s,s.s);assert.ok(Number.isFinite(m.steer));left ||= m.steer<-.01;right ||= m.steer>.01;}
 assert.ok(lap.telemetry[i].offset>=CORRIDOR[i].min-1e-8&&lap.telemetry[i].offset<=CORRIDOR[i].max+1e-8);
}
assert.ok(left&&right);assert.ok(Math.abs(angleDelta(Math.PI-.01,-Math.PI+.01)-.02)<1e-10);
assert.equal(JSON.stringify(lap),before,'Rendering must not mutate results');
for(const hz of [30,60,144]){const c:PlaybackClock={time:0,wall:0,rate:1,playing:true,duration:100};for(let i=0;i<=hz*10;i++)clockTime(c,i/hz*1000);assert.equal(clockTime(c,10000),10);}
const c:PlaybackClock={time:0,wall:0,rate:1,playing:true,duration:100};
assert.equal(changeClock(c,2000,{playing:false}),2);assert.equal(clockTime(c,6000),2);
changeClock(c,6000,{time:40});assert.equal(clockTime(c,8000),40);
changeClock(c,8000,{playing:true,rate:2});assert.equal(clockTime(c,10000),44);
changeClock(c,10000,{rate:.5});assert.equal(clockTime(c,12000),45);
changeClock(c,12000,{time:0,playing:false});assert.equal(clockTime(c,15000),0);
changeClock(c,15000,{playing:true,rate:4});assert.equal(clockTime(c,100000),100);
assert.equal(simulate(DEFAULT_SETUP).lapTime,108.59340246833438,'Physics regression');
console.log({motion:'passed',maxHeadingJump:maxJump,checks:'path equality, boundaries, seam, signed steering, immutable results, clocks/rates/seeking'});
