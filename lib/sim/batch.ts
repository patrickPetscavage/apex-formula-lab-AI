import {getCircuit,referenceTrack} from './track';
import {DEFAULT_SETUP,validateSetup,type Setup} from './setup';
import {SF26_MODEL_VERSION,SF26_DEFAULT,validateSF26Setup,simulateSF26,type SF26Setup} from './sf26Model';
import {MODEL_VERSION,validateExperiment,snapshot,samePath,sections,type Experiment} from './experiments';
import {selectCircuit,CENTERLINE,SMOOTH_LINE,buildTrajectory,trajectoryKey,validateTrajectory} from './trajectory';
import {simulate,type Lap} from './physics';
import {optimizeLine} from './optimizer';
import {attachSuspension} from './suspension';
export type VehicleId='f2004'|'sf26';
export type BatchMode='shared'|'independent'|'centerline';
export const MODE_LABELS:Record<BatchMode,string>={shared:'Controlled · A-optimized shared line',independent:'Independent optimization · setup + line',centerline:'Controlled · shared centerline'};
export const modelVersion=(v:VehicleId)=>v==='f2004'?MODEL_VERSION:SF26_MODEL_VERSION;
export const setupKey=(s:Setup)=>JSON.stringify(Object.entries(s).sort(([a],[b])=>a.localeCompare(b)));
export const checkSetup=(v:VehicleId,s:unknown):Setup|SF26Setup=>v==='f2004'?validateSetup(s):validateSF26Setup(s);
export type BatchDefinition={version:1;id:string;name:string;createdAt:string;vehicleId:VehicleId;modelVersion:string;mode:BatchMode;a:{name:string;setup:Setup};b:{name:string;setup:Setup};circuits:{id:string;version:string}[]};
export type BatchRow={circuitId:string;trackVersion:string;status:'pending'|'running'|'completed'|'failed'|'cancelled';stage?:'A'|'B';error?:string;a?:Experiment;b?:Experiment};
export type BatchRecord={definition:BatchDefinition;rows:BatchRow[]};
export type BatchJob={kind:'batch';id:number;key:string;definition:BatchDefinition;circuitId:string;trackVersion:string};
const requireValue=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
function label(value:unknown,max=80):string{requireValue(typeof value==='string'&&value.trim().length>0&&value.length<=max,'Invalid experiment label.');return (value as string).trim();}
export function validateDefinition(input:unknown):BatchDefinition{
 const d=input as BatchDefinition;requireValue(d&&d.version===1&&['f2004','sf26'].includes(d.vehicleId),'Unsupported batch/vehicle.');
 requireValue(d.modelVersion===modelVersion(d.vehicleId),'Unsupported batch model version. Keep this export for its original application version.');
 requireValue(['shared','independent','centerline'].includes(d.mode)&&(d.vehicleId==='f2004'||d.mode==='centerline'),'This vehicle supports shared centerline batches only.');
 requireValue(Array.isArray(d.circuits)&&d.circuits.length>=1&&d.circuits.length<=3&&new Set(d.circuits.map(c=>c.id)).size===d.circuits.length,'Select 1–3 distinct circuits.');
 const circuits=d.circuits.map(c=>{const ref=getCircuit(c.id);requireValue(ref.id===c.id&&ref.version===c.version,'Circuit version mismatch.');return {id:c.id,version:c.version};});
 requireValue(typeof d.createdAt==='string'&&Number.isFinite(Date.parse(d.createdAt)),'Invalid creation time.');
 return {version:1,id:label(d.id,120),name:label(d.name),createdAt:d.createdAt,vehicleId:d.vehicleId,modelVersion:d.modelVersion,mode:d.mode,a:{name:label(d.a?.name),setup:checkSetup(d.vehicleId,d.a?.setup)},b:{name:label(d.b?.name),setup:checkSetup(d.vehicleId,d.b?.setup)},circuits};
}
export function newBatch(input:BatchDefinition):BatchRecord{const definition=validateDefinition(input);return {definition,rows:definition.circuits.map(c=>({circuitId:c.id,trackVersion:c.version,status:'pending'}))};}
export function jobKey(d:BatchDefinition,circuitId:string){return JSON.stringify([d.id,d.vehicleId,d.modelVersion,d.mode,d.circuits.find(c=>c.id===circuitId),setupKey(d.a.setup),setupKey(d.b.setup)]);}
export function makeJob(d:BatchDefinition,circuitId:string,id:number):BatchJob{const c=d.circuits.find(c=>c.id===circuitId);if(!c)throw Error('Circuit missing from batch.');return {kind:'batch',id,key:jobKey(d,circuitId),definition:structuredClone(d),circuitId,trackVersion:c.version};}
export function runBatchPair(job:BatchJob,progress:(stage:'A'|'B')=>void=()=>{}){
 const d=validateDefinition(job.definition);requireValue(job.key===jobKey(d,job.circuitId)&&d.circuits.some(c=>c.id===job.circuitId&&c.version===job.trackVersion),'Batch job identity mismatch.');
 selectCircuit(job.circuitId);const line=validateTrajectory(d.mode==='centerline'?CENTERLINE:SMOOTH_LINE),pathId=trajectoryKey(line);
 const run=(s:Setup)=>d.vehicleId==='sf26'?simulateSF26(s,buildTrajectory(line),pathId):d.mode==='centerline'?simulate(s,buildTrajectory(line),pathId):optimizeLine(s,pathId);
 progress('A');const baseline=run(d.a.setup);progress('B');
 const identical=setupKey(d.a.setup)===setupKey(d.b.setup);
 const lap=identical?baseline:d.mode==='shared'?simulate(d.b.setup,baseline.path,pathId):run(d.b.setup);
 for(const l of identical?[baseline]:[baseline,lap]){l.vehicleId=d.vehicleId;l.modelVersion=d.modelVersion;if(d.vehicleId==='f2004')attachSuspension(l);}
 return {baseline,lap};
}
export function completeRow(d:BatchDefinition,circuitId:string,baseline:Lap,lap:Lap):BatchRow{
 const line=MODE_LABELS[d.mode],a=snapshot(baseline,d.a.name,line),b=snapshot(lap,d.b.name,line);
 const row:BatchRow={circuitId,trackVersion:getCircuit(circuitId).version,status:'completed',a,b};return validateRow(d,row);
}
function validateRow(d:BatchDefinition,row:BatchRow):BatchRow{
 requireValue(row&&d.circuits.some(c=>c.id===row.circuitId&&c.version===row.trackVersion),'Row circuit mismatch.');
 requireValue(['pending','running','completed','failed','cancelled'].includes(row.status),'Invalid job status.');
 if(row.status!=='completed'){requireValue(!row.a&&!row.b,'Incomplete job contains results.');return {circuitId:row.circuitId,trackVersion:row.trackVersion,status:row.status==='running'?'cancelled':row.status,...(row.error?{error:String(row.error).slice(0,500)}:{})};}
 const a=validateExperiment(row.a),b=validateExperiment(row.b);
 for(const [r,s] of [[a,d.a.setup],[b,d.b.setup]] as const){requireValue(r.vehicleId===d.vehicleId&&r.modelVersion===d.modelVersion&&r.lap.modelVersion===d.modelVersion&&r.trackVersion===row.trackVersion&&r.lap.circuitId===row.circuitId&&setupKey(r.lap.setup)===setupKey(s),'Result identity/setup mismatch.');}
 if(d.mode!=='independent')requireValue(samePath(a.lap,b.lap),'Controlled comparison must use identical trajectories.');
 if(d.mode==='centerline'){const ref=referenceTrack(row.circuitId);requireValue(a.lap.path.every((p,i)=>Math.abs(p.x-ref[i].x)<1e-7&&Math.abs(p.z-ref[i].z)<1e-7),'Expected centerline results.');}
 // Share equal paths in memory and IndexedDB's structured clone; exports deduplicate explicitly.
 if(samePath(a.lap,b.lap))b.lap.path=a.lap.path;
 return {circuitId:row.circuitId,trackVersion:row.trackVersion,status:'completed',a,b};
}
export function validateBatch(input:unknown):BatchRecord{const v=input as BatchRecord;const definition=validateDefinition(v?.definition);requireValue(Array.isArray(v.rows)&&v.rows.length===definition.circuits.length&&new Set(v.rows.map(r=>r.circuitId)).size===v.rows.length,'Invalid batch rows.');return {definition,rows:v.rows.map(row=>validateRow(definition,row))};}
export function metrics(l:Lap){
 let braking=0,fullThrottle=0;const bands=[0,0,0];
 l.speed.forEach((v,i)=>{const dt=l.time[i+1]-l.time[i];if(l.telemetry[i].brake>.01)braking+=dt;if(l.telemetry[i].throttle>=.99)fullThrottle+=dt;bands[v*3.6<150?0:v*3.6<250?1:2]+=dt;});
 return {lapTime:l.lapTime,averageSpeed:l.path.reduce((s,p)=>s+p.ds,0)/l.lapTime*3.6,topSpeed:l.topSpeed,peakBrake:Math.max(0,-Math.min(...l.ax))/9.81,peakLateral:Math.max(...l.ay)/9.81,braking,fullThrottle,bands};
}
export function explain(row:BatchRow,mode:BatchMode){if(!row.a||!row.b)return '';const a=metrics(row.a.lap),b=metrics(row.b.lap),ss=sections(row.a.lap,row.b.lap),best=ss.reduce((a,b)=>b.delta<a.delta?b:a),worst=ss.reduce((a,b)=>b.delta>a.delta?b:a);const delta=b.lapTime-a.lapTime,top=b.topSpeed-a.topSpeed;
 return `Observed B versus A: ${delta.toFixed(3)} s (${(delta/a.lapTime*100).toFixed(2)}%), top speed ${top>=0?'+':''}${top.toFixed(1)} km/h; braking time ${(b.braking-a.braking).toFixed(2)} s; full-throttle time ${(b.fullThrottle-a.fullThrottle).toFixed(2)} s. Minimum speed ${(Math.min(...row.b.lap.speed)*3.6).toFixed(1)} versus ${(Math.min(...row.a.lap.speed)*3.6).toFixed(1)} km/h; peak braking ${b.peakBrake.toFixed(2)} versus ${a.peakBrake.toFixed(2)} g (B / A). Section ${best.number}: ${best.delta.toFixed(3)} s; section ${worst.number}: ${worst.delta.toFixed(3)} s (12 equal-distance sections). ${mode==='independent'?'Both setup and trajectory may contribute.':'The trajectory is held fixed.'} These outputs do not establish the cause of a difference when several parameters change.`;
}
export function summaryCSV(batch:BatchRecord){const quote=(v:unknown)=>'"'+String(v).replaceAll('"','""')+'"';const rows=[['experiment','vehicle','model','circuit','track_version','mode','configuration','setup_name','lap_s','delta_vs_A_s','delta_vs_A_percent','average_kmh','top_kmh','peak_brake_g','peak_lateral_g','braking_s','full_throttle_s','below150_s','150to250_s','above250_s','sector1_s','sector2_s','sector3_s']];for(const r of batch.rows)if(r.a&&r.b){for(const [label,run] of [['A',r.a],['B',r.b]] as const){const m=metrics(run.lap),delta=m.lapTime-r.a.lap.lapTime;rows.push([batch.definition.name,batch.definition.vehicleId,batch.definition.modelVersion,r.circuitId,r.trackVersion,batch.definition.mode,label,run.name,...[m.lapTime,delta,100*delta/r.a.lap.lapTime,m.averageSpeed,m.topSpeed,m.peakBrake,m.peakLateral,m.braking,m.fullThrottle,...m.bands,...run.lap.sectors].map(String)]);}}return rows.map(r=>r.map(quote).join(',')).join('\n');}
export const DEFAULTS={f2004:DEFAULT_SETUP,sf26:SF26_DEFAULT};
