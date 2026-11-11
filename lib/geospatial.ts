import type {TrackPoint} from './sim/track';
export const EARTH_RADIUS=6378137;
export type GeoOrigin={longitude:number;latitude:number;datumMSL:number};
/** Right-handed Three.js world: +X east, +Y up, -Z north. No mirror transform. */
export function geographicToLocal(longitude:number,latitude:number,heightMSL:number,origin:GeoOrigin){const radians=Math.PI/180;return {x:(longitude-origin.longitude)*radians*EARTH_RADIUS*Math.cos(origin.latitude*radians),y:heightMSL-origin.datumMSL,z:-(latitude-origin.latitude)*radians*EARTH_RADIUS};}
export function localToGeographic(x:number,y:number,z:number,origin:GeoOrigin){return {longitude:origin.longitude+x/(EARTH_RADIUS*Math.cos(origin.latitude*Math.PI/180))*180/Math.PI,latitude:origin.latitude-z/EARTH_RADIUS*180/Math.PI,heightMSL:y+origin.datumMSL};}
/** Positive lateral = driver's right. Object local +Z points BACKWARD. */
export function roadFrame(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number}){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-6)throw Error('Cannot construct frame from duplicate stations');const forward={x:(b.x-a.x)/length,z:(b.z-a.z)/length};return {forward,right:{x:-forward.z,z:forward.x},yaw:Math.atan2(forward.x,forward.z)+Math.PI,pitch:Math.atan2(b.y-a.y,length)};}
export function offsetRoad(p:TrackPoint,next:TrackPoint,lateral:number,lift=0){const f=roadFrame(p,next);return {x:p.x+f.right.x*lateral,y:p.y+lift,z:p.z+f.right.z*lateral};}
export function stationPoint(path:TrackPoint[],station:number){const total=path.reduce((n,p)=>n+p.ds,0),s=((station%total)+total)%total;let lo=0,hi=path.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(path[mid].s<=s)lo=mid;else hi=mid-1;}const a=path[lo],b=path[(lo+1)%path.length],u=(s-a.s)/a.ds;return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u,frame:roadFrame(a,b),index:lo};}
