import {HISTORICAL_CUTOFF,validateArchive,type HistoricalArchive} from './fastf1';
import {z} from 'zod';
import {type CircuitId} from './sim/track';
export const PREDICTION_VERSION='apex-ridge-dry-1';
type Row={event:string;date:string;year:number;circuit:string;driver:string;compound:string;age:number;fraction:number;target:number};
export type PredictionModel={schema:'apex-prediction-1';version:typeof PREDICTION_VERSION;cutoff:typeof HISTORICAL_CUTOFF;trainedThrough:string;createdAt:string;drivers:string[];circuits:string[];compounds:string[];features:string[];coefficients:number[];lambda:number;baseline:Record<string,number>;globalBaseline:number;residual90:number;split:{train:string[];validation:string[];test:string[]};metrics:{modelMAE:number;baselineMAE:number;rmse:number;n:number;events:number};validation:{lambda:number;mae:number}[];datasets:{id:string;hash:string;date:string}[];trainingRows:number;assumptions:string[]};
const median=(n:number[])=>{const a=[...n].sort((a,b)=>a-b);return a.length%2?a[a.length>>1]:(a[(a.length>>1)-1]+a[a.length>>1])/2;};
const mean=(n:number[])=>n.reduce((a,b)=>a+b,0)/n.length;
function collect(archives:HistoricalArchive[]):Row[]{
 const rows:Row[]=[];
 for(const a of archives){if(a.session!=='R')continue;const maxLap={suzuka:53,monza:53,spa:44}[a.circuitId],times=a.laps.filter(l=>l.lapTime!==null).map(l=>l.lapTime!),mid=median(times);
  for(const l of a.laps)if(l.lapTime!==null&&l.accurate&&!l.deleted&&l.trackStatus==='1'&&l.pitIn===null&&l.pitOut===null&&l.lap>1&&l.tireAge!==null&&l.tireAge>=0&&['SOFT','MEDIUM','HARD'].includes(l.compound??'')&&l.lapTime>mid*.8&&l.lapTime<mid*1.15){rows.push({event:a.id,date:a.date,year:a.year,circuit:a.circuitId,driver:l.driver,compound:l.compound!,age:l.tireAge,fraction:l.lap/maxLap,target:l.lapTime});}
 }return rows;
}
type Vocabulary=Pick<PredictionModel,'drivers'|'circuits'|'compounds'>;
function features(v:Vocabulary,r:Omit<Row,'target'|'event'|'date'>){return [1,(r.year-2020)/4,r.fraction,r.age/20,(r.age/20)**2,...v.circuits.map(c=>+(c===r.circuit)),...v.drivers.map(d=>+(d===r.driver)),...v.compounds.map(c=>+(c===r.compound))];}
function solve(matrix:number[][],rhs:number[]){
 const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
 for(let c=0;c<n;c++){let p=c;for(let i=c+1;i<n;i++)if(Math.abs(a[i][c])>Math.abs(a[p][c]))p=i;[a[p],a[c]]=[a[c],a[p]];if(Math.abs(a[c][c])<1e-12)throw Error('Singular regression');const f=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=f;for(let i=0;i<n;i++)if(i!==c){const m=a[i][c];for(let j=c;j<=n;j++)a[i][j]-=m*a[c][j];}}
 return a.map(r=>r[n]);
}
function fit(rows:Row[],v:Vocabulary,lambda:number){const n=features(v,rows[0]).length,m=Array.from({length:n},()=>Array(n).fill(0) as number[]),b=Array(n).fill(0) as number[];for(const r of rows){const x=features(v,r),y=Math.log(r.target);for(let i=0;i<n;i++){b[i]+=x[i]*y;for(let j=0;j<n;j++)m[i][j]+=x[i]*x[j];}}for(let i=0;i<n;i++)m[i][i]+=i===0?1e-8:lambda;return solve(m,b);}
function estimate(coeff:number[],v:Vocabulary,r:Omit<Row,'target'|'event'|'date'>){return Math.exp(features(v,r).reduce((s,x,i)=>s+x*coeff[i],0));}
export function trainPrediction(inputs:unknown[]):PredictionModel{
 const archives=inputs.map(validateArchive),ids=archives.map(a=>a.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate session IDs; choose one version per event');
 const rows=collect(archives),events=[...new Map(rows.map(r=>[r.event,r.date])).entries()].sort((a,b)=>Date.parse(a[1])-Date.parse(b[1])||a[0].localeCompare(b[0]));
 if(events.length<5)throw Error('Import at least five race events with clean dry laps. Events are split chronologically; qualifying cannot train race pace.');
 const trainEnd=Math.max(3,Math.floor(events.length*.6)),valEnd=Math.min(events.length-1,Math.max(trainEnd+1,Math.floor(events.length*.8)));
 const split={train:events.slice(0,trainEnd).map(e=>e[0]),validation:events.slice(trainEnd,valEnd).map(e=>e[0]),test:events.slice(valEnd).map(e=>e[0])};
 const tr=rows.filter(r=>split.train.includes(r.event)),va=rows.filter(r=>split.validation.includes(r.event)),te=rows.filter(r=>split.test.includes(r.event));
 // Vocabulary uses training events only. No test-driver discovery or test scaling.
 const v={drivers:[...new Set(tr.map(r=>r.driver))].sort(),circuits:[...new Set(tr.map(r=>r.circuit))].sort(),compounds:[...new Set(tr.map(r=>r.compound))].sort()};
 if(tr.length<100||va.length<20||te.length<20)throw Error('Insufficient clean laps in chronological splits');
 const cache=new Map<number,number[]>();
 const validation=[.01,.1,1,10].map(lambda=>({lambda,mae:mean(va.map(r=>Math.abs(estimate(fitCached(lambda),v,r)-r.target)))}));
 function fitCached(lambda:number){if(!cache.has(lambda))cache.set(lambda,fit(tr,v,lambda));return cache.get(lambda)!;}
 const chosen=[...validation].sort((a,b)=>a.mae-b.mae)[0];
 const development=[...tr,...va],coefficients=fit(development,v,chosen.lambda),globalBaseline=median(development.map(r=>r.target)),baseline=Object.fromEntries(v.circuits.map(c=>[c,median(development.filter(r=>r.circuit===c).map(r=>r.target))]));
 const residuals=te.map(r=>estimate(coefficients,v,r)-r.target),abs=residuals.map(Math.abs).sort((a,b)=>a-b),residual90=abs[Math.min(abs.length-1,Math.ceil(abs.length*.9)-1)];
 return {schema:'apex-prediction-1',version:PREDICTION_VERSION,cutoff:HISTORICAL_CUTOFF,trainedThrough:events[valEnd-1][1],createdAt:new Date().toISOString(),...v,features:['intercept','year / 4 from 2020','race progress','tire age / 20','squared tire age',...v.circuits.map(c=>'circuit:'+c),...v.drivers.map(c=>'driver:'+c),...v.compounds.map(c=>'compound:'+c)],coefficients,lambda:chosen.lambda,baseline,globalBaseline,residual90,split,metrics:{modelMAE:mean(abs),baselineMAE:mean(te.map(r=>Math.abs((baseline[r.circuit]??globalBaseline)-r.target))),rmse:Math.sqrt(mean(residuals.map(r=>r*r))),n:te.length,events:split.test.length},validation,datasets:archives.filter(a=>a.session==='R').map(a=>({id:a.id,hash:a.contentHash,date:a.date})),trainingRows:development.length,assumptions:['Conditional clean dry-lap pace, not causal setup inference.','Features are driver/circuit/year and user-planned tire age, compound and race progress.','No future actual weather, safety-car timing or final results used as features.','Test residual envelope is descriptive, not a calibrated probability interval.','Total race times and order are independent scenario projections, not validated race-outcome forecasts.']};
}

const str=z.string().min(1).max(200),finite=z.number().finite();
export function validateModel(input:unknown):PredictionModel{
 const m=z.object({schema:z.literal('apex-prediction-1'),version:z.literal(PREDICTION_VERSION),cutoff:z.literal(HISTORICAL_CUTOFF),trainedThrough:str,createdAt:str,drivers:z.array(str).min(1).max(50),circuits:z.array(z.enum(['suzuka','monza','spa'])).min(1).max(3),compounds:z.array(z.enum(['SOFT','MEDIUM','HARD'])).min(1).max(3),features:z.array(str).max(100),coefficients:z.array(finite).max(100),lambda:finite.positive(),baseline:z.record(finite.positive()),globalBaseline:finite.positive(),residual90:finite.nonnegative(),split:z.object({train:z.array(str).min(3),validation:z.array(str).min(1),test:z.array(str).min(1)}),metrics:z.object({modelMAE:finite.nonnegative(),baselineMAE:finite.nonnegative(),rmse:finite.nonnegative(),n:finite.int().positive(),events:finite.int().positive()}),validation:z.array(z.object({lambda:finite.positive(),mae:finite.nonnegative()})),datasets:z.array(z.object({id:str,hash:z.string().regex(/^[a-f0-9]{64}$/),date:str})).max(500),trainingRows:finite.int().positive(),assumptions:z.array(str)}).parse(input);
 if(!Number.isFinite(Date.parse(m.trainedThrough))||Date.parse(m.trainedThrough)>=Date.parse(HISTORICAL_CUTOFF)||m.coefficients.length!==5+m.drivers.length+m.circuits.length+m.compounds.length||m.features.length!==m.coefficients.length)throw Error('Invalid model date/features');
 const all=[...m.split.train,...m.split.validation,...m.split.test];if(new Set(all).size!==all.length)throw Error('Event leakage between model splits');
 const dates=new Map(m.datasets.map(d=>{if(!/^20(1[89]|2[0-4])-(suzuka|monza|spa)-R$/.test(d.id)||!Number.isFinite(Date.parse(d.date))||Date.parse(d.date)>=Date.parse(HISTORICAL_CUTOFF)||new Date(d.date).getUTCFullYear()!==Number(d.id.slice(0,4)))throw Error('Dataset violates cutoff');return [d.id,Date.parse(d.date)];}));
 const groups=[m.split.train,m.split.validation,m.split.test].map(group=>group.map(id=>{const d=dates.get(id);if(d===undefined)throw Error('Missing split provenance');return d;}));
 if(Math.max(...groups[0])>=Math.min(...groups[1])||Math.max(...groups[1])>=Math.min(...groups[2])||Date.parse(m.trainedThrough)!==Math.max(...groups[0],...groups[1]))throw Error('Invalid chronological split');
 return m as PredictionModel;
}
export type GhostSetting={id:string;name:string;color:string;driver:string;compound:string;pitLap:number;secondCompound:string;pitLoss:number;paceAdjustment:number;weatherPenalty:number};
export type RaceScenario={circuitId:CircuitId;date:string;laps:number;ghosts:GhostSetting[]};
export type GhostResult={setting:GhostSetting;lapTimes:number[];elapsed:number[];total:number;modelVersion:string;provenance:string;uncertainty:number};
export function predictRace(raw:PredictionModel,scenario:RaceScenario):GhostResult[]{
 const m=validateModel(raw),d=Date.parse(scenario.date);if(!Number.isFinite(d)||d<=Date.parse(m.trainedThrough)||d>Date.parse("2035-12-31T00:00:00Z")||!m.circuits.includes(scenario.circuitId)||!Number.isInteger(scenario.laps)||scenario.laps<1||scenario.laps>80||scenario.ghosts.length<1||scenario.ghosts.length>8||new Set(scenario.ghosts.map(g=>g.id)).size!==scenario.ghosts.length)throw Error('Use a supported circuit and scenario after model training (through 2035), 1–80 laps, 1–8 distinct ghosts');
 return scenario.ghosts.map(setting=>{const g=structuredClone(setting);if(!g.id||!g.name.trim()||g.name.length>60||!/^#[0-9a-fA-F]{6}$/.test(g.color)||!m.drivers.includes(g.driver)||![g.compound,g.secondCompound].every(c=>m.compounds.includes(c))||!Number.isInteger(g.pitLap)||g.pitLap<0||g.pitLap>=scenario.laps||![g.pitLoss,g.paceAdjustment,g.weatherPenalty].every(Number.isFinite)||g.pitLoss<0||g.pitLoss>120||Math.abs(g.paceAdjustment)>10||g.weatherPenalty<0||g.weatherPenalty>30)throw Error('Invalid ghost settings');
  const elapsed=[0],lapTimes:number[]=[];
  for(let lap=1;lap<=scenario.laps;lap++){const after=g.pitLap>0&&lap>g.pitLap,age=after?lap-g.pitLap:lap,compound=after?g.secondCompound:g.compound;
   const pace=estimate(m.coefficients,m,{year:Math.min(2024,new Date(d).getUTCFullYear()),circuit:scenario.circuitId,driver:g.driver,compound,age,fraction:lap/scenario.laps});
   const t=pace+g.paceAdjustment+g.weatherPenalty+(g.pitLap===lap?g.pitLoss:0);if(!Number.isFinite(t)||t<20||t>600)throw Error('Prediction outside plausible numerical bounds');lapTimes.push(t);elapsed.push(elapsed.at(-1)!+t);
  }return {setting:g,lapTimes,elapsed,total:elapsed.at(-1)!,modelVersion:m.version,provenance:`Statistical prediction / ${m.version}; train through ${m.trainedThrough}; scenario assumptions retained`,uncertainty:m.residual90};
 });
}
export function sampleGhost(g:GhostResult,time:number){let lap=0;while(lap<g.lapTimes.length-1&&g.elapsed[lap+1]<=time)lap++;const duration=g.lapTimes[lap],pit=g.setting.pitLap===lap+1?g.setting.pitLoss:0,local=Math.max(0,Math.min(duration,time-g.elapsed[lap])),progress=Math.min(1,local/Math.max(1,duration-pit));return {lap:lap+1,progress,distance:lap+progress,finished:time>=g.total};}
