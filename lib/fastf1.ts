import {z} from 'zod';
import {getCircuit, type CircuitId} from './sim/track';
import type {Lap} from './sim/physics';

export const HISTORICAL_CUTOFF='2025-01-01T00:00:00Z';
const date=z.string().refine(s=>Number.isFinite(Date.parse(s))&&Date.parse(s)>=Date.parse('2018-01-01T00:00:00Z')&&Date.parse(s)<Date.parse(HISTORICAL_CUTOFF),'Only dates in 2018–2024 are allowed');
const nullable=z.number().finite().nullable();
const lapSchema=z.object({driver:z.string().min(1).max(8),driverNumber:z.string().nullable(),lap:z.number().int().positive(),lapTime:nullable,sectors:z.array(nullable).length(3),compound:z.string().nullable(),tireAge:nullable,stint:nullable,trackStatus:z.string().nullable(),accurate:z.boolean(),deleted:z.boolean(),pitIn:nullable,pitOut:nullable,sessionTime:nullable,startTime:nullable});
const carSchema=z.object({t:z.number().finite().nonnegative(),date,sessionTime:nullable,speed:z.number().min(0).max(450).nullable(),throttle:z.number().min(0).max(100).nullable(),brake:z.boolean().nullable(),rpm:z.number().min(0).max(25000).nullable(),gear:z.number().int().min(0).max(8).nullable(),distance:nullable,source:z.string().nullable()});
const positionSchema=z.object({t:z.number().finite().nonnegative(),date,x:nullable,y:nullable,z:nullable,status:z.string().nullable(),source:z.string().nullable()});
export const archiveSchema=z.object({schema:z.literal('apex-fastf1-1'),cutoff:z.literal(HISTORICAL_CUTOFF),id:z.string().max(80),year:z.number().int().min(2018).max(2024),date,circuitId:z.enum(['suzuka','monza','spa']),trackVersion:z.string(),referenceLength:z.number().positive(),session:z.enum(['Q','R','FP1','FP2','FP3','S','SQ']),event:z.string().max(160),layout:z.string(),contentHash:z.string().regex(/^[a-f0-9]{64}$/),
 provenance:z.object({provider:z.literal('FastF1'),version:z.string(),retrievedAt:z.string().datetime({offset:true}),source:z.string(),cutoff:z.literal(HISTORICAL_CUTOFF),rights:z.string(),channels:z.record(z.string()),missing:z.string(),interpolation:z.string()}),
 laps:z.array(lapSchema).min(1).max(5000),results:z.array(z.record(z.union([z.string(),z.number().finite(),z.null()]))).max(30),
 weather:z.array(z.object({time:nullable,airTemp:nullable,trackTemp:nullable,rainfall:z.boolean().nullable(),humidity:nullable,pressure:nullable,windSpeed:nullable,windDirection:nullable})).max(1500),
 traces:z.array(z.object({driver:z.string(),lap:z.number().int().positive(),lapTime:z.number().positive(),car:z.array(carSchema).min(10).max(20000),positions:z.array(positionSchema).max(20000)})).max(20),warnings:z.array(z.string()).max(100)});
export type HistoricalArchive=z.infer<typeof archiveSchema>;
export type HistoricalTrace=HistoricalArchive['traces'][number];
export type HistoricalLap=HistoricalArchive['laps'][number];
export function validateArchive(input:unknown):HistoricalArchive {
 const a=archiveSchema.parse(input),c=getCircuit(a.circuitId);
 if(new Date(a.date).getUTCFullYear()!==a.year||a.id!==`${a.year}-${a.circuitId}-${a.session}`||c.version!==a.trackVersion||c.referenceLength!==a.referenceLength)throw Error('Archive year, circuit layout/version or identity mismatch.');
 const keys=new Set<string>();
 for(const l of a.laps){const key=`${l.driver}:${l.lap}`;if(keys.has(key))throw Error('Duplicate driver/lap');keys.add(key);if(l.lapTime!==null&&(l.lapTime<=0||l.lapTime>3600))throw Error('Invalid lap duration');}
 const seen=new Set<string>();
 for(const t of a.traces){const key=`${t.driver}:${t.lap}`,l=a.laps.find(l=>l.driver===t.driver&&l.lap===t.lap);if(seen.has(key)||!l||l.lapTime!==t.lapTime)throw Error('Trace has no matching unique lap');seen.add(key);
  for(const series of [t.car,t.positions]){let previous=-1;for(const s of series){if(s.t<=previous||s.t>t.lapTime||new Date(s.date).getUTCFullYear()!==a.year)throw Error('Invalid sample timestamp/order');previous=s.t;}}
  let d=-Infinity;for(const s of t.car)if(s.distance!==null){if(s.distance<d)throw Error('Integrated distance is not monotonic');d=s.distance;}
 }
 return a;
}
export const indexSchema=z.object({schema:z.literal('apex-fastf1-index-1'),cutoff:z.literal(HISTORICAL_CUTOFF),sessions:z.array(z.object({id:z.string().regex(/^20(1[89]|2[0-4])-(suzuka|monza|spa)-(Q|R|FP[123]|S|SQ)$/),year:z.number().int().min(2018).max(2024),date,circuitId:z.enum(['suzuka','monza','spa']),session:z.string(),event:z.string(),contentHash:z.string().regex(/^[a-f0-9]{64}$/)})).max(500)});
export function validateIndex(input:unknown){const index=indexSchema.parse(input);for(const e of index.sessions)if(e.id!==`${e.year}-${e.circuitId}-${e.session}`||new Date(e.date).getUTCFullYear()!==e.year)throw Error('Index identity/date mismatch');return index;}

export function bracket<T>(rows:T[],value:number,at:(v:T)=>number):[T,T,number]{
 if(!rows.length)throw Error('No samples');
 let lo=0,hi=rows.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(at(rows[mid])<=value)lo=mid;else hi=mid;}
 if(value<=at(rows[0]))return [rows[0],rows[0],0];
 if(value>=at(rows[hi]))return [rows[hi],rows[hi],0];
 return [rows[lo],rows[hi],(value-at(rows[lo]))/(at(rows[hi])-at(rows[lo]))];
}
const lerp=(a:number|null,b:number|null,u:number)=>a===null||b===null?null:a+(b-a)*u;
export function sampleHistorical(trace:HistoricalTrace,time:number){
 const [a,b,u]=bracket(trace.car,time,s=>s.t),ds=trace.car.filter(s=>s.distance!==null),first=ds[0]?.distance,last=ds.at(-1)?.distance;
 const distance=lerp(a.distance,b.distance,u),progress=distance===null||first==null||last==null||last<=first?null:Math.max(0,Math.min(1,(distance-first)/(last-first)));
 return {speed:lerp(a.speed,b.speed,u),throttle:lerp(a.throttle,b.throttle,u),brake:a.brake,rpm:lerp(a.rpm,b.rpm,u),gear:a.gear,progress,
  missing:time<trace.car[0].t||time>trace.car.at(-1)!.t||b.t-a.t>2,interval:b.t-a.t};
}
export function historicalAtProgress(trace:HistoricalTrace,progress:number){
 const ds=trace.car.filter(s=>s.distance!==null);if(ds.length<2)return null;
 const start=ds[0].distance!,end=ds.at(-1)!.distance!;if(end<=start)return null;
 const [a,b,u]=bracket(ds,start+Math.max(0,Math.min(1,progress))*(end-start),s=>s.distance!);
 return {t:a.t+(b.t-a.t)*u,speed:lerp(a.speed,b.speed,u),interval:b.t-a.t};
}
export function historicalPosition(trace:HistoricalTrace,time:number){
 const rows=trace.positions.filter(p=>p.x!==null&&p.y!==null);if(rows.length<2)return null;
 const [a,b,u]=bracket(rows,time,p=>p.t);if(time<rows[0].t||time>rows.at(-1)!.t||b.t-a.t>2)return null;
 return {x:lerp(a.x,b.x,u)!,y:lerp(a.y,b.y,u)!};
}
export function traceQuality(t:HistoricalTrace,length:number){
 const ds=t.car.filter(s=>s.distance!==null),maxGap=Math.max(...t.car.slice(1).map((s,i)=>s.t-t.car[i].t)),integratedLength=ds.length>1?ds.at(-1)!.distance!-ds[0].distance!:null;
 return {maxGap,integratedLength,distanceMismatch:integratedLength===null?null:Math.abs(integratedLength-length),startGap:t.car[0].t,endGap:t.lapTime-t.car.at(-1)!.t};
}
export function simulationAtProgress(lap:Lap,p:number){
 const total=lap.path.reduce((sum,p)=>sum+p.ds,0),distances=[0];for(const p of lap.path)distances.push(distances.at(-1)!+p.ds);
 const rows=distances.map((s,i)=>({s,t:i<lap.time.length?lap.time[i]:lap.lapTime,speed:lap.speed[i%lap.speed.length]*3.6}));
 const [a,b,u]=bracket(rows,Math.max(0,Math.min(1,p))*total,r=>r.s);return {t:a.t+(b.t-a.t)*u,speed:a.speed+(b.speed-a.speed)*u};
}
export type CalibrationResult={vehicleId:'f2004';circuitId:CircuitId;setup:Lap['setup'];lap:Lap;trainRMSE:number;validationRMSE:number|null;trainTrace:string;validationTrace:string|null;assumption:string};
export function traceError(lap:Lap,t:HistoricalTrace){let sum=0,n=0;for(let i=1;i<100;i++){const p=i/100,a=historicalAtProgress(t,p);if(a?.speed!==null&&a?.speed!==undefined&&a.interval<=2){sum+=(simulationAtProgress(lap,p).speed-a.speed)**2;n++;}}if(n<30)throw Error('Insufficient aligned speed samples for calibration');return Math.sqrt(sum/n);}
