import {referenceTrack,type CircuitId,type TrackPoint} from './sim/track';
import {roadFrame} from './geospatial';
import {sampleGhost,type GhostResult} from './racePrediction';
type Node=TrackPoint&{offset:number;speed:number;t:number;curvature:number};
export type GhostPath={nodes:Node[];length:number;duration:number;source:TrackPoint[]};
const cache=new Map<CircuitId,GhostPath>();
/** Approximate elastic-band racing line, constrained to each source cross-section. Metres. */
export function buildGhostPath(source:TrackPoint[]):GhostPath{
 const n=source.length,offsets=new Float64Array(n),frames=source.map((p,i)=>roadFrame(source[(i+n-1)%n],source[(i+1)%n]));
 const point=(i:number)=>({x:source[i].x+frames[i].right.x*offsets[i],z:source[i].z+frames[i].right.z*offsets[i]});
 // Shorten and fair the line. A 2.2 m reserve covers the 1.9 m car, spline overshoot and edge clearance.
 for(let pass=0;pass<180;pass++){const next=new Float64Array(n);for(let i=0;i<n;i++){const a=point((i+n-1)%n),b=point((i+1)%n),p=source[i],f=frames[i];const desired=((a.x+b.x)/2-p.x)*f.right.x+((a.z+b.z)/2-p.z)*f.right.z;next[i]=Math.max(-p.left+2.2,Math.min(p.right-2.2,offsets[i]+.45*(desired-offsets[i])));}offsets.set(next);}
 const nodes=source.map((p,i)=>({...p,...point(i),offset:offsets[i],speed:0,t:0,curvature:0}));let length=0;
 for(let i=0;i<n;i++){const a=nodes[(i+n-1)%n],p=nodes[i],b=nodes[(i+1)%n],ab=Math.hypot(p.x-a.x,p.z-a.z),bc=Math.hypot(b.x-p.x,b.z-p.z),ca=Math.hypot(b.x-a.x,b.z-a.z);p.curvature=ca<1e-8?0:2*((p.x-a.x)*(b.z-a.z)-(p.z-a.z)*(b.x-a.x))/(ab*bc*ca);p.k=Math.abs(p.curvature);p.ds=Math.hypot(b.x-p.x,b.y-p.y,b.z-p.z);p.s=length;length+=p.ds;p.speed=Math.min(95,Math.sqrt(22/Math.max(.001,p.k)));}
 // Cyclic forward acceleration and backward braking passes; no discontinuity at the finish.
 for(let pass=0;pass<6;pass++){for(let i=0;i<n;i++){const p=nodes[i],q=nodes[(i+1)%n];q.speed=Math.min(q.speed,Math.sqrt(p.speed*p.speed+2*7*p.ds));}for(let i=n-1;i>=0;i--){const p=nodes[i],q=nodes[(i+1)%n];p.speed=Math.min(p.speed,Math.sqrt(q.speed*q.speed+2*14*p.ds));}}
 let duration=0;for(let i=0;i<n;i++){nodes[i].t=duration;duration+=2*nodes[i].ds/(nodes[i].speed+nodes[(i+1)%n].speed);}return {nodes,length,duration,source};
}
export function ghostPath(id:CircuitId){if(!cache.has(id))cache.set(id,buildGhostPath(referenceTrack(id)));return cache.get(id)!;}
function component(path:GhostPath,i:number,u:number,key:'x'|'y'|'z'){const a=path.nodes[(i+path.nodes.length-1)%path.nodes.length][key],b=path.nodes[i][key],c=path.nodes[(i+1)%path.nodes.length][key],d=path.nodes[(i+2)%path.nodes.length][key],m=(c-a)/2,v=(d-b)/2;return {value:(2*u**3-3*u*u+1)*b+(u**3-2*u*u+u)*m+(-2*u**3+3*u*u)*c+(u**3-u*u)*v,derivative:(6*u*u-6*u)*b+(3*u*u-4*u+1)*m+(-6*u*u+6*u)*c+(3*u*u-2*u)*v};}
export function pathPose(path:GhostPath,station:number){const s=((station%path.length)+path.length)%path.length;let lo=0,hi=path.nodes.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(path.nodes[m].s<=s)lo=m;else hi=m-1;}const a=path.nodes[lo],b=path.nodes[(lo+1)%path.nodes.length],u=(s-a.s)/a.ds,x=component(path,lo,u,'x'),y=component(path,lo,u,'y'),z=component(path,lo,u,'z'),length=Math.hypot(x.derivative,z.derivative),curvature=a.curvature+(b.curvature-a.curvature)*u;return {x:x.value,y:y.value,z:z.value,index:lo,frame:{yaw:Math.atan2(x.derivative,z.derivative)+Math.PI,pitch:Math.atan2(y.derivative,length),forward:{x:x.derivative/length,z:z.derivative/length}},steer:Math.atan(3.35*curvature),curvature};}
// Time-density integration gives a continuous distance profile and exactly preserves each predicted lap duration.
const profiles=new WeakMap<GhostPath,Map<string,{times:number[];total:number}>>();
function profile(path:GhostPath,start:boolean,end:boolean){let variants=profiles.get(path);if(!variants){variants=new Map();profiles.set(path,variants);}const key=Number(start)+':'+Number(end);if(variants.has(key))return variants.get(key)!;const times=[0],n=path.nodes.length;
 const speed=(i:number)=>{const p=path.nodes[i%n],s=i===n?path.length:p.s;return Math.min(p.speed,start?Math.sqrt(2*7*s):Infinity,end?Math.sqrt(2*14*(path.length-s)):Infinity);};
 for(let i=0;i<n;i++)times.push(times[i]+2*path.nodes[i].ds/Math.max(.1,speed(i)+speed(i+1)));const result={times,total:times[n]};variants.set(key,result);return result;}
export function sampleGhostMotion(g:GhostResult,time:number,id:CircuitId){const path=ghostPath(id),basic=sampleGhost(g,time),lap=basic.lap-1,stop=g.setting.pitLap===lap+1&&g.setting.pitLoss>0,start=g.setting.pitLap===lap&&g.setting.pitLoss>0,pit=stop?g.setting.pitLoss:0,running=g.lapTimes[lap]-pit,local=Math.max(0,Math.min(running,time-g.elapsed[lap])),p=profile(path,start,stop),t=local/running*p.total;let lo=0,hi=path.nodes.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(p.times[m]<=t)lo=m;else hi=m-1;}const u=Math.max(0,Math.min(1,(t-p.times[lo])/(p.times[lo+1]-p.times[lo]))),a=path.nodes[lo],b=path.nodes[(lo+1)%path.nodes.length];
 // Integrate linear speed over a segment, rather than interpolating distance at a constant speed.
 const v0=Math.min(a.speed,start?Math.sqrt(14*a.s):Infinity,stop?Math.sqrt(28*(path.length-a.s)):Infinity),endS=lo===path.nodes.length-1?path.length:b.s,v1=Math.min(b.speed,start?Math.sqrt(14*endS):Infinity,stop?Math.sqrt(28*(path.length-endS)):Infinity),fraction=(2*v0*u+(v1-v0)*u*u)/Math.max(.1,v0+v1),station=local>=running?path.length:a.s+a.ds*fraction;
 return {...basic,...pathPose(path,station),progress:station/path.length,distance:lap+station/path.length,wheelDistance:lap*path.length+station,speed:local>=running?0:(v0+(v1-v0)*u)*p.total/running,pitHold:stop&&time-g.elapsed[lap]>=running};}
