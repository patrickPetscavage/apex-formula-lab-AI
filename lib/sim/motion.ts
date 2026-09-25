import {sampleLap,type Lap} from './physics';
import type {TrackPoint} from './track';
export const WHEELBASE=3.05;
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const mixAngle=(a:number,b:number,u:number)=>a+angleDelta(a,b)*u;
const cache=new WeakMap<TrackPoint[],{heading:number;pitch:number;curvature:number}[]>();
function frames(path:TrackPoint[]){
 let result=cache.get(path);if(result)return result;
 const n=path.length;
 result=path.map((p,i)=>{const a=path[(i+n-1)%n],b=path[(i+1)%n];
 const incoming=Math.atan2(p.x-a.x,p.z-a.z),outgoing=Math.atan2(b.x-p.x,b.z-p.z);
 const before=Math.atan2(p.y-a.y,Math.hypot(p.x-a.x,p.z-a.z)),after=Math.atan2(b.y-p.y,Math.hypot(b.x-p.x,b.z-p.z));
 return {heading:mixAngle(incoming,outgoing,.5),pitch:(before+after)/2,curvature:angleDelta(incoming,outgoing)/((a.ds+p.ds)/2)};
 });cache.set(path,result);return result;
}
// Render-only orientation: positions remain exactly on the solver's sampled polyline.
// No filtering in time, no trajectory overshoot, no changes to lap results.
export function sampleMotion(lap:Lap,time:number){
 const s=sampleLap(lap,time),f=frames(lap.path),a=f[s.i],b=f[(s.i+1)%f.length];
 const curvature=a.curvature+(b.curvature-a.curvature)*s.u;
 return {...s,heading:mixAngle(a.heading,b.heading,s.u),pitch:a.pitch+(b.pitch-a.pitch)*s.u,steer:Math.atan((lap.dimensions?.wheelbase??WHEELBASE)*curvature),curvature};
}
export type PlaybackClock={time:number;wall:number;rate:number;playing:boolean;duration:number};
export function clockTime(c:PlaybackClock,now:number){return Math.max(0,Math.min(c.duration,c.time+(c.playing?Math.max(0,now-c.wall)*c.rate/1000:0)));}
export function changeClock(c:PlaybackClock,now:number,change:Partial<PlaybackClock>){Object.assign(c,{time:clockTime(c,now),wall:now},change);return clockTime(c,now);}
