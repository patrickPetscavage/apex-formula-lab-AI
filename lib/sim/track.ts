// Derived from TUMFTM racetrack-database / OSM. See public/data/suzuka notices.
import suzuka from './data/suzuka.json';
import monza from './data/monza.json';
import spa from './data/spa.json';
export type TrackPoint={x:number;y:number;z:number;s:number;k:number;ds:number;grade:number;left:number;right:number};
// Original estimated vertical profile, NOT surveyed elevation. Crossing indices 509 / 984.
const heights=[[0,18],[.10,12],[.20,24],[.30,44],[.38,35],[.4384,23],[.51,26],[.62,37],[.72,42],[.80,36],[.84755,31],[.91,23],[1,18]];
function elevation(t:number){let j=0;while(j<heights.length-2&&heights[j+1][0]<t)j++;const a=heights[j],b=heights[j+1],u=(t-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*(1-Math.cos(Math.PI*u))/2;}
export type CircuitId='suzuka'|'monza'|'spa';
export type CircuitDefinition={schemaVersion:1;units:{distance:'m';angle:'rad';grade:'rise/path distance'};id:CircuitId;name:string;location:string;configuration:string;version:string;referenceLength:number;coordinates:number[][];elevation:'estimated'|'unsupported';elevationProfile?:{knots:number[][];offsetFraction:number;datum:number};origin:{latitude:number;longitude:number;accuracy:'approximate locator only'};sectors:{fractions:number[];accuracy:'equal-distance approximation'};startFinish:{index:number;accuracy:'dataset origin, approximate'};banking:null;pitLane:null;kerbs:null;surface:{type:'asphalt';grip:'vehicle model, uniform'};provenance:{source:string;license:string;horizontal:string;width:string;reference:string}};
function definition(id:CircuitId,name:string,location:string,length:number,coordinates:number[][],latitude:number,longitude:number,reference:string):CircuitDefinition{return {schemaVersion:1,units:{distance:'m',angle:'rad',grade:'rise/path distance'},id,name,location,configuration:'Full Grand Prix layout · TUM dataset',version:id==='suzuka'?'suzuka-5807-v1':id+'-tum-v1',referenceLength:length,coordinates,elevation:id==='monza'?'unsupported':'estimated',elevationProfile:id==='suzuka'?{knots:heights,offsetFraction:0,datum:0}:id==='spa'?{knots:spaHeights.map(([s,h])=>[s/7004,h]),offsetFraction:-170/7004,datum:373}:undefined,origin:{latitude,longitude,accuracy:'approximate locator only'},sectors:{fractions:[1/3,2/3,1],accuracy:'equal-distance approximation'},startFinish:{index:0,accuracy:'dataset origin, approximate'},banking:null,pitLane:null,kerbs:null,surface:{type:'asphalt',grip:'vehicle model, uniform'},provenance:{source:'https://github.com/TUMFTM/racetrack-database',license:'LGPL-3.0; underlying OSM ODbL',horizontal:'Smoothed map-derived reconstruction; not surveyed',width:'Image-derived estimates',reference}};}
const spaHeights=[[0,418],[220,424],[310,419],[690,403],[890,391],[1130,415],[1490,446],[2200,463],[2470,470],[2870,455],[3110,438],[3600,402],[4280,377],[4740,375],[5100,373],[5700,388],[6000,398],[6540,408],[7004,418]];
export const CIRCUITS:CircuitDefinition[]=[definition('suzuka','Suzuka International Racing Course','Japan',5807,suzuka,34.8431,136.541,'https://www.suzukacircuit.jp/eng/course_s/'),definition('monza','Autodromo Nazionale Monza','Italy',5793,monza,45.6156,9.2811,'https://www.formula1.com/en/racing/2026/italy'),definition('spa','Circuit de Spa-Francorchamps','Belgium',7004,spa,50.4372,5.9714,'https://www.spa-francorchamps.be/assets/e70cff50-ae5d-4aaa-896b-54c8a953a357/all-plan-acces.pdf')];
export function getCircuit(id:string):CircuitDefinition{const c=CIRCUITS.find(c=>c.id===id||c.version===id);if(!c)throw Error('Unsupported circuit: '+id);return c;}
// Sparse published station/altitude facts, interpolated with an approximate origin alignment.
// Dataset La Source apex ~390 m vs official map ~220 m: inferred 170 m station shift.

function profileHeight(c:CircuitDefinition,t:number){const profile=c.elevationProfile;if(!profile)return 0;const knots=profile.knots,u=(t+profile.offsetFraction+1)%1;let j=0;while(j<knots.length-2&&knots[j+1][0]<u)j++;const a=knots[j],b=knots[j+1],f=(u-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*(1-Math.cos(Math.PI*f))/2-profile.datum;}
export function makeTrack(circuit:CircuitDefinition=CIRCUITS[0]):TrackPoint[]{
 const coordinates=circuit.coordinates;
 if(coordinates.length<8||coordinates.length>100000||!Number.isFinite(circuit.referenceLength)||circuit.referenceLength<=0||!coordinates.every(p=>p.length===4&&p.every(Number.isFinite)&&p[2]>1.2&&p[3]>1.2))throw Error('Invalid circuit coordinates, widths or reference length.');
 if(coordinates.some((p,i)=>{const q=coordinates[(i+1)%coordinates.length];return Math.hypot(p[0]-q[0],p[1]-q[1])<.01;}))throw Error('Duplicate adjacent circuit points.');
 const cx=coordinates.reduce((s,p)=>s+p[0],0)/coordinates.length,cz=coordinates.reduce((s,p)=>s-p[1],0)/coordinates.length;
 const pts=coordinates.map((p,i)=>({x:p[0]-cx,z:-p[1]-cz,y:profileHeight(circuit,i/coordinates.length),left:p[3],right:p[2],s:0,k:0,ds:0,grade:0}));
 let low=.9,high=1.1;for(let it=0;it<50;it++){const scale=(low+high)/2,L=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+Math.hypot((q.x-p.x)*scale,(q.z-p.z)*scale,q.y-p.y);},0);if(L<circuit.referenceLength)low=scale;else high=scale;}
 const scale=(low+high)/2;pts.forEach(p=>{p.x*=scale;p.z*=scale;});let distance=0;
 pts.forEach((b,i)=>{const a=pts[(i+pts.length-1)%pts.length],c=pts[(i+1)%pts.length],ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(c.x-b.x,c.z-b.z),ca=Math.hypot(c.x-a.x,c.z-a.z);b.k=Math.abs(2*((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/(ab*bc*ca));b.ds=Math.hypot(c.x-b.x,c.z-b.z,c.y-b.y);b.grade=(c.y-b.y)/b.ds;b.s=distance;distance+=b.ds;});return pts;
}
export function bounds(points:TrackPoint[]){return {minX:Math.min(...points.map(p=>p.x))-80,minZ:Math.min(...points.map(p=>p.z))-80,width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+160,height:Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))+160};}
export let ACTIVE_CIRCUIT=CIRCUITS[0];
export let TRACK=makeTrack(ACTIVE_CIRCUIT);
export let TRACK_LENGTH=TRACK.reduce((s,p)=>s+p.ds,0);
export let TRACK_BOUNDS=bounds(TRACK);
// Compatibility adapter for the existing single-session UI/worker. Jobs are synchronous;
// immutable circuit definitions and makeTrack are independent of rendering and streaming.
export function activateTrack(id:string){ACTIVE_CIRCUIT=getCircuit(id);TRACK=makeTrack(ACTIVE_CIRCUIT);TRACK_LENGTH=TRACK.reduce((s,p)=>s+p.ds,0);TRACK_BOUNDS=bounds(TRACK);}

const referenceCache=new Map<string,TrackPoint[]>();
export function referenceTrack(id:string){if(!referenceCache.has(id))referenceCache.set(id,makeTrack(getCircuit(id)));return referenceCache.get(id)!;}
