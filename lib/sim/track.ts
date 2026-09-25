// Derived from TUMFTM racetrack-database / OSM. See public/data/suzuka notices.
import coordinates from './data/suzuka.json';
export type TrackPoint={x:number;y:number;z:number;s:number;k:number;ds:number;grade:number;left:number;right:number};
// Original estimated vertical profile, NOT surveyed elevation. Crossing indices 509 / 984.
const heights=[[0,18],[.10,12],[.20,24],[.30,44],[.38,35],[.4384,23],[.51,26],[.62,37],[.72,42],[.80,36],[.84755,31],[.91,23],[1,18]];
function elevation(t:number){let j=0;while(j<heights.length-2&&heights[j+1][0]<t)j++;const a=heights[j],b=heights[j+1],u=(t-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*(1-Math.cos(Math.PI*u))/2;}
export function makeTrack():TrackPoint[]{
 const cx=coordinates.reduce((s,p)=>s+p[0],0)/coordinates.length,cz=coordinates.reduce((s,p)=>s-p[1],0)/coordinates.length;
 const pts=coordinates.map((p,i)=>({x:p[0]-cx,z:-p[1]-cz,y:elevation(i/coordinates.length),left:p[3],right:p[2],s:0,k:0,ds:0,grade:0}));
 let low=.9,high=1.1;for(let it=0;it<50;it++){const scale=(low+high)/2,L=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+Math.hypot((q.x-p.x)*scale,(q.z-p.z)*scale,q.y-p.y);},0);if(L<5807)low=scale;else high=scale;}
 const scale=(low+high)/2;pts.forEach(p=>{p.x*=scale;p.z*=scale;});let distance=0;
 pts.forEach((b,i)=>{const a=pts[(i+pts.length-1)%pts.length],c=pts[(i+1)%pts.length],ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(c.x-b.x,c.z-b.z),ca=Math.hypot(c.x-a.x,c.z-a.z);b.k=Math.abs(2*((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/(ab*bc*ca));b.ds=Math.hypot(c.x-b.x,c.z-b.z,c.y-b.y);b.grade=(c.y-b.y)/b.ds;b.s=distance;distance+=b.ds;});return pts;
}
export const TRACK=makeTrack();
export const TRACK_LENGTH=TRACK.reduce((s,p)=>s+p.ds,0);
export const TRACK_BOUNDS={minX:Math.min(...TRACK.map(p=>p.x))-80,minZ:Math.min(...TRACK.map(p=>p.z))-80,width:Math.max(...TRACK.map(p=>p.x))-Math.min(...TRACK.map(p=>p.x))+160,height:Math.max(...TRACK.map(p=>p.z))-Math.min(...TRACK.map(p=>p.z))+160};
