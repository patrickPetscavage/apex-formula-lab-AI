import {TRACK,type TrackPoint} from './track';
export type Trajectory={version:1;id:'centerline'|'smooth'|'custom';name:string;offsets:number[]};
export const CENTERLINE:Trajectory={version:1,id:'centerline',name:'Reference centerline',offsets:Array(24).fill(0)};
export const SMOOTH_LINE:Trajectory={version:1,id:'smooth',name:'Optimized racing line',offsets:Array(24).fill(0)};
export const trajectoryKey=(t:Trajectory)=>JSON.stringify([t.id,t.offsets]);
export const CAR_MARGIN=1.2; // 0.9 m approximate half-width + 0.3 m clearance.
export const CORRIDOR=TRACK.map((p,i)=>{
 const a=TRACK[(i+TRACK.length-1)%TRACK.length],q=TRACK[(i+1)%TRACK.length],d=Math.hypot(q.x-a.x,q.z-a.z),nx=-(q.z-a.z)/d,nz=(q.x-a.x)/d;
 return {nx,nz,min:-p.left+CAR_MARGIN,max:p.right-CAR_MARGIN,width:p.left+p.right,heading:Math.atan2(q.x-a.x,q.z-a.z),banking:0,
 left:{x:p.x-nx*p.left,z:p.z-nz*p.left},right:{x:p.x+nx*p.right,z:p.z+nz*p.right}};
});
export function validateTrajectory(input:unknown):Trajectory{
 const t=input as Trajectory;
 if(!t||t.version!==1||!['centerline','smooth','custom'].includes(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>60||!Array.isArray(t.offsets)||![12,24,TRACK.length].includes(t.offsets.length)||!t.offsets.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=15))throw Error('Invalid trajectory: use 12/24 control offsets or a sampled path, within ±15 m.');
 return {...t,name:t.name.trim(),offsets:[...t.offsets]};
}
export const boundOffset=(o:number,i:number)=>Math.max(CORRIDOR[i].min,Math.min(CORRIDOR[i].max,o));
export function pathFromOffsets(offsets:number[]):TrackPoint[]{
 const n=TRACK.length,pts=TRACK.map((p,i)=>({...p,x:p.x+CORRIDOR[i].nx*boundOffset(offsets[i],i),z:p.z+CORRIDOR[i].nz*boundOffset(offsets[i],i)}));let distance=0;
 pts.forEach((p,i)=>{const a=pts[(i+n-1)%n],b=pts[(i+1)%n],ab=Math.hypot(a.x-p.x,a.z-p.z),bc=Math.hypot(p.x-b.x,p.z-b.z),ca=Math.hypot(b.x-a.x,b.z-a.z);p.k=Math.abs(2*((p.x-a.x)*(b.z-a.z)-(p.z-a.z)*(b.x-a.x))/(ab*bc*ca));p.ds=Math.hypot(b.x-p.x,b.z-p.z,b.y-p.y);p.grade=(b.y-p.y)/p.ds;p.s=distance;distance+=p.ds;});return pts;
}
export function offsetsFor(t:Trajectory):number[]{
 if(t.id==='centerline')return TRACK.map(()=>0);
 const m=t.offsets.length;
 return TRACK.map((_,i)=>{const u=i/TRACK.length*m,j=Math.floor(u),f=u-j;
 // Periodic cubic B-spline gives continuous first/second derivatives and avoids abrupt turn-in.
 const at=(k:number)=>t.offsets[(k+m)%m];
 return boundOffset(((1-f)**3*at(j-1)+(3*f**3-6*f*f+4)*at(j)+(-3*f**3+3*f*f+3*f+1)*at(j+1)+f**3*at(j+2))/6,i);});
}
export function smoothOffsets(passes=1800):number[]{
 const n=TRACK.length;let offsets=Array(n).fill(0);
 for(let pass=0;pass<passes;pass++){
  const next=offsets.slice();
  for(let i=0;i<n;i++){const a=(i+n-1)%n,b=(i+1)%n,p=TRACK[i],v=CORRIDOR[i];
   const dx=(TRACK[a].x+CORRIDOR[a].nx*offsets[a]+TRACK[b].x+CORRIDOR[b].nx*offsets[b])/2-p.x-v.nx*offsets[i];
   const dz=(TRACK[a].z+CORRIDOR[a].nz*offsets[a]+TRACK[b].z+CORRIDOR[b].nz*offsets[b])/2-p.z-v.nz*offsets[i];
   next[i]=boundOffset(offsets[i]+.4*(dx*v.nx+dz*v.nz),i);
  }offsets=next;
 }return offsets;
}
export function buildTrajectory(t:Trajectory):TrackPoint[]{
 return t.id==='centerline'?TRACK.map(p=>({...p})):pathFromOffsets(t.id==='smooth'?smoothOffsets():offsetsFor(t));
}
