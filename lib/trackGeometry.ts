import type {TrackPoint} from './sim/track';
type XZ={x:number;z:number};
export function segmentDistance(p:XZ,a:XZ,b:XZ){const dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-u*dx,p.z-a.z-u*dz);}
const cross=(a:XZ,b:XZ,c:XZ)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function inside(p:XZ,a:XZ,b:XZ,c:XZ){const s=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return s.every(v=>v>=0)||s.every(v=>v<=0);}
function intersects(a:XZ,b:XZ,c:XZ,d:XZ){return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
/** Spatially indexed conservative corridor, including between road stations and at bridges. */
export function roadCorridor(track:TrackPoint[],margin=1.5){
 const cell=64,buckets=new Map<string,number[]>();
 const range=(lo:number,hi:number)=>[Math.floor(lo/cell),Math.floor(hi/cell)];
 for(let i=0;i<track.length;i++){const a=track[i],b=track[(i+1)%track.length],w=Math.max(a.left,a.right,b.left,b.right)+margin,[x0,x1]=range(Math.min(a.x,b.x)-w,Math.max(a.x,b.x)+w),[z0,z1]=range(Math.min(a.z,b.z)-w,Math.max(a.z,b.z)+w);for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z;const list=buckets.get(key)??[];list.push(i);buckets.set(key,list);}}
 function triangleCeiling(a:XZ,b:XZ,c:XZ){const [x0,x1]=range(Math.min(a.x,b.x,c.x),Math.max(a.x,b.x,c.x)),[z0,z1]=range(Math.min(a.z,b.z,c.z),Math.max(a.z,b.z,c.z)),ids=new Set<number>();for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const id of buckets.get(x+','+z)??[])ids.add(id);let ceiling=Infinity;
  for(const i of ids){const p=track[i],q=track[(i+1)%track.length],w=Math.max(p.left,p.right,q.left,q.right)+margin;const edges=[[a,b],[b,c],[c,a]];if(inside(p,a,b,c)||inside(q,a,b,c)||edges.some(([u,v])=>intersects(p,q,u,v)||Math.min(segmentDistance(u,p,q),segmentDistance(v,p,q),segmentDistance(p,u,v),segmentDistance(q,u,v))<=w))ceiling=Math.min(ceiling,p.y,q.y);}
  return ceiling;
 }
 return {triangleCeiling};
}
/** Lower every vertex of any intersecting terrain triangle. Vertex-only proximity misses slopes. */
export function carveTerrain(positions:{count:number;getX:(i:number)=>number;getY:(i:number)=>number;getZ:(i:number)=>number;setY:(i:number,y:number)=>unknown},indices:ArrayLike<number>,track:TrackPoint[],clearance=1){const corridor=roadCorridor(track),ceiling=new Float64Array(positions.count).fill(Infinity);let affected=0;for(let j=0;j<indices.length;j+=3){const ids=[indices[j],indices[j+1],indices[j+2]],p=ids.map(i=>({x:positions.getX(i),z:positions.getZ(i)})),h=corridor.triangleCeiling(p[0],p[1],p[2]);if(Number.isFinite(h)){affected++;for(const i of ids)ceiling[i]=Math.min(ceiling[i],h-clearance);}}for(let i=0;i<positions.count;i++)positions.setY(i,Math.min(positions.getY(i),ceiling[i]));return affected;}
/** Reject a footprint if any of its edges or interior overlaps the racing corridor. */
export function footprintOnRoad(poly:number[][],track:TrackPoint[],margin=2){const corridor=roadCorridor(track,margin),a={x:poly[0][0],z:poly[0][1]};for(let j=1;j<poly.length-1;j++)if(Number.isFinite(corridor.triangleCeiling(a,{x:poly[j][0],z:poly[j][1]},{x:poly[j+1][0],z:poly[j+1][1]})))return true;return false;}
