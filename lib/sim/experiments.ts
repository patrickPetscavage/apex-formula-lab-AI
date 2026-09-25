import {SUSPENSION_KEYS,SUSPENSION_VERSION} from './suspension';
import {requireSimulatedVehicle} from '../vehicleIdentity';
import {validateSF26Setup,SF26_CAPABILITIES} from './sf26Model';
import type {Lap} from './physics';
import {validateSetup} from './setup';
import {CORRIDOR} from './trajectory';
import {TRACK,TRACK_LENGTH} from './track';
export const MODEL_VERSION='apex-qss-2b.1';
export const TRACK_VERSION='suzuka-5807-v1';
export const HISTORY_KEY='apex-experiments-v1';
export const MAX_RUNS=8,MAX_HISTORY_CHARS=2200000;
export type Experiment={vehicleId?:'f2004'|'sf26';schemaVersion:1;id:string;name:string;createdAt:string;modelVersion:string;trackVersion:string;trajectoryName:string;lap:Lap};
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function requireValue(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
export function snapshot(lap:Lap,name:string,trajectoryName:string):Experiment{
 return structuredClone({schemaVersion:1,vehicleId:lap.vehicleId??'f2004',id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Experiment',createdAt:new Date().toISOString(),modelVersion:lap.modelVersion??MODEL_VERSION,trackVersion:TRACK_VERSION,trajectoryName:trajectoryName.slice(0,100),lap});
}
export function validateExperiment(input:unknown):Experiment{
 requireValue(input&&typeof input==='object','Invalid experiment.');
 const e=input as Experiment,l=e.lap,n=TRACK.length;const vehicle=requireSimulatedVehicle(e.vehicleId);
 requireValue(e.schemaVersion===1&&e.trackVersion===TRACK_VERSION,'Unsupported experiment schema or track grid.');
 for(const k of ['id','name','createdAt','modelVersion','trajectoryName'] as const)requireValue(typeof e[k]==='string'&&e[k].length>0&&e[k].length<=120,'Invalid experiment metadata.');
 requireValue(Number.isFinite(Date.parse(e.createdAt)),'Invalid timestamp.');
 requireValue(l&&typeof l==='object','Missing lap.');
 const checkedSetup=vehicle==='sf26'?validateSF26Setup(l.setup):validateSetup(l.setup);
 requireValue((l.vehicleId??'f2004')===vehicle,'Vehicle identity mismatch.');
 if(vehicle==='sf26'){
  requireValue(l.modelVersion===e.modelVersion&&typeof l.modelVersion==='string','SF-26 model identity missing.');
  requireValue(l.dimensions?.wheelbase===3.35&&l.dimensions?.tireRadius===.355,'Unsupported SF-26 animation dimensions.');
  requireValue(l.capabilities&&Object.entries(SF26_CAPABILITIES).every(([k,v])=>l.capabilities![k as keyof typeof SF26_CAPABILITIES]===v),'Unsupported SF-26 capabilities.');
  requireValue(l.suspension===undefined,'SF-26 suspension telemetry is unsupported in this model.');
 }
 for(const k of ['speed','ax','ay','gear'] as const)requireValue(Array.isArray(l[k])&&l[k].length===n&&l[k].every(finite),'Invalid '+k+' samples.');
 requireValue(l.speed.every(v=>v>0&&v<500)&&l.gear.every(v=>Number.isInteger(v)&&v>=1&&v<=(vehicle==='sf26'?8:7)),'Invalid speed or gear.');
 requireValue(Array.isArray(l.time)&&l.time.length===n+1&&l.time.every(finite)&&l.time[0]===0&&l.time.every((v,i)=>!i||v>l.time[i-1]),'Invalid time samples.');
 requireValue(finite(l.lapTime)&&l.lapTime>0&&Math.abs(l.time[n]-l.lapTime)<1e-6,'Lap time mismatch.');
 requireValue(Array.isArray(l.sectors)&&l.sectors.length===3&&l.sectors.every(v=>finite(v)&&v>0)&&Math.abs(l.sectors.reduce((a,b)=>a+b)-l.lapTime)<1e-5,'Invalid sectors.');
 requireValue(finite(l.topSpeed)&&Math.abs(l.topSpeed-Math.max(...l.speed)*3.6)<1e-5&&finite(l.iterations)&&finite(l.residual),'Invalid lap summary.');
 requireValue(typeof l.pathId==='string'&&l.pathId.length<50000&&Array.isArray(l.path)&&l.path.length===n,'Invalid sampled path.');
 let distance=0;
 l.path.forEach((p,i)=>{
  requireValue(p&&['x','y','z','s','k','ds','grade','left','right'].every(k=>finite(p[k as keyof typeof p])),'Nonfinite path.');
  const q=l.path[(i+1)%n],ref=TRACK[i],c=CORRIDOR[i],dx=p.x-ref.x,dz=p.z-ref.z,offset=dx*c.nx+dz*c.nz;
  requireValue(offset>=c.min-1e-5&&offset<=c.max+1e-5&&Math.abs(dx*c.nz-dz*c.nx)<1e-4&&Math.abs(p.y-ref.y)<1e-4,'Path does not match supported track corridor.');
  requireValue(p.ds>0&&p.k>=0&&Math.abs(p.s-distance)<1e-5,'Invalid path distance.');
  requireValue(q&&Math.abs(Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)-p.ds)<1e-5,'Path segment mismatch.');
  const dt=l.time[i+1]-l.time[i],j=(i+1)%n;
  requireValue(Math.abs(dt*(l.speed[i]+l.speed[j])/2-p.ds)<1e-4&&Math.abs(l.ax[i]-(l.speed[j]**2-l.speed[i]**2)/(2*p.ds))<1e-5,'Inconsistent playback samples.');
  distance+=p.ds;
 });
 requireValue(Array.isArray(l.telemetry)&&l.telemetry.length===n,'Missing telemetry.');
 l.telemetry.forEach(t=>requireValue(t&&['throttle','brake','rpm','downforce','frontAero','rearAero','drag','utilization','steering','offset'].every(k=>finite(t[k as keyof typeof t])),'Nonfinite telemetry.'));
 if(l.suspension!==undefined){
  const data=l.suspension;requireValue(data&&typeof data.version==='string'&&data.version.length>0&&data.version.length<=80&&Array.isArray(data.samples)&&data.samples.length===n,'Malformed suspension telemetry.');
  data.samples.forEach((v,i)=>{
   requireValue(v&&SUSPENSION_KEYS.every(k=>finite(v[k])),'Nonfinite suspension telemetry.');
   requireValue(['fl','fr','rl','rr'].every(k=>v[k as 'fl']>=0)&&Math.abs(v.fl+v.fr+v.rl+v.rr-((605+l.setup.fuel+l.setup.ballast)*9.81+l.telemetry[i].downforce))<.01,'Invalid wheel-load conservation.');
   requireValue(['flMM','frMM','rlMM','rrMM','heaveMM'].every(k=>Math.abs(v[k as 'flMM'])<=25.001)&&Math.abs(v.pitchDeg)<=2&&Math.abs(v.rollDeg)<=3&&Number.isInteger(v.warning)&&v.warning>=0&&v.warning<=3,'Invalid suspension bounds.');
  });
 }
 // Return only the supported schema; never recalculate historical performance.
 return structuredClone({...(e.vehicleId?{vehicleId:e.vehicleId}:{}),schemaVersion:1,id:e.id,name:e.name,createdAt:e.createdAt,modelVersion:e.modelVersion,trackVersion:e.trackVersion,trajectoryName:e.trajectoryName,lap:{...l,setup:checkedSetup}});
}
export function readHistory(storage:StorageLike):Experiment[]{
 const raw=storage.getItem(HISTORY_KEY);if(!raw)return [];
 requireValue(raw.length<=MAX_HISTORY_CHARS,'History exceeds the supported size; export before replacing it.');
 const rows=JSON.parse(raw);requireValue(Array.isArray(rows)&&rows.length<=MAX_RUNS,'Invalid history.');
 return rows.map(validateExperiment);
}
export function saveRun(storage:StorageLike,run:Experiment):Experiment[]{
 const rows=readHistory(storage);if(rows.some(r=>r.id===run.id))return rows;
 const next=[...rows,validateExperiment(run)],json=JSON.stringify(next);
 requireValue(next.length<=MAX_RUNS&&json.length<=MAX_HISTORY_CHARS,'History is full. Export the current run, then explicitly remove an old run to make room. Nothing was deleted.');
 storage.setItem(HISTORY_KEY,json);return next;
}
export function removeRun(storage:StorageLike,id:string):Experiment[]{const next=readHistory(storage).filter(r=>r.id!==id);storage.setItem(HISTORY_KEY,JSON.stringify(next));return next;}
export function stationSample(l:Lap,station:number){
 const s=Math.max(0,Math.min(TRACK_LENGTH,station));let i=0;while(i<TRACK.length-1&&TRACK[i].s+TRACK[i].ds<s)i++;
 const u=(s-TRACK[i].s)/TRACK[i].ds,d=l.path[i].ds*u,v=Math.sqrt(Math.max(0,l.speed[i]**2+2*l.ax[i]*d));
 return {i,speed:v,time:l.time[i]+2*d/(l.speed[i]+v)};
}
export function sections(a:Lap,b:Lap,count=12){
 return Array.from({length:count},(_,i)=>{
  const start=i*TRACK_LENGTH/count,end=(i+1)*TRACK_LENGTH/count;
  const stats=(l:Lap)=>{const first=stationSample(l,start),last=stationSample(l,end),speeds=[first.speed,last.speed],brakes:number[]=[];
   for(let j=first.i;j<=last.i;j++){if(TRACK[j].s>=start&&TRACK[j].s<=end)speeds.push(l.speed[j]);if(TRACK[j].s<end)brakes.push(Math.max(0,-l.ax[j]/9.81));}
   return {time:last.time-first.time,minSpeed:Math.min(...speeds)*3.6,peakBrake:Math.max(0,...brakes)};
  };const A=stats(a),B=stats(b);return {number:i+1,start,end,a:A,b:B,delta:B.time-A.time};
 });
}
export function samePath(a:Lap,b:Lap){return a.path.length===b.path.length&&a.path.every((p,i)=>p.x===b.path[i].x&&p.y===b.path[i].y&&p.z===b.path[i].z&&p.ds===b.path[i].ds);}
export function telemetryCSV(run:Experiment){
 const l=run.lap,header='reference_station_m,path_distance_m,time_s,speed_kmh,gear,rpm,throttle_fraction,brake_fraction,longitudinal_g,lateral_g,combined_g,steering_magnitude_deg,front_aero_N,rear_aero_N,downforce_N,drag_N,grip_utilization_fraction,lateral_offset_m,x_m,y_m,z_m';
 const extra=l.suspension?['fl_N','fr_N','rl_N','rr_N','front_transfer_N','rear_transfer_N','fl_compression_mm','fr_compression_mm','rl_compression_mm','rr_compression_mm','heave_mm','pitch_deg','roll_deg','inside_margin_N','validity_warning_bits']:[];
 return [[header,...extra].join(','),...TRACK.map((p,i)=>{const t=l.telemetry[i],q=l.path[i];return [p.s,q.s,l.time[i],l.speed[i]*3.6,l.gear[i],t.rpm,t.throttle,t.brake,l.ax[i]/9.81,l.ay[i]/9.81,Math.hypot(l.ax[i],l.ay[i])/9.81,t.steering,t.frontAero,t.rearAero,t.downforce,t.drag,t.utilization,t.offset,q.x,q.y,q.z,...(l.suspension?SUSPENSION_KEYS.map(k=>l.suspension!.samples[i][k]):[])].join(',');})].join('\n');
}
