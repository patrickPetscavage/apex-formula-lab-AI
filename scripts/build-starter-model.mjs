import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const req=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apex-starter-'));
try{
 for(const folder of ['lib/sim','lib'])for(const file of fs.readdirSync(folder)){
  if(!file.endsWith('.ts'))continue;const source=path.join(folder,file),dest=path.join(tmp,folder,file.replace(/\.ts$/,'.js'));
  let code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  code=code.replace(/require\("(\.[^"]+\.json)"\)/g,(_,p)=>`require(${JSON.stringify(path.resolve(path.dirname(source),p))})`).replace(/require\("zod"\)/g,`require(${JSON.stringify(req.resolve('zod'))})`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,code);
 }
 const {trainPrediction,evaluatePrediction,validateModel}=req(path.join(tmp,'lib/racePrediction.js'));
 const index=JSON.parse(fs.readFileSync('public/data/fastf1/index.json','utf8')),archives=index.sessions.map(e=>JSON.parse(fs.readFileSync('public/data/fastf1/'+e.id+'.json','utf8')));
 const events=archives.filter(a=>a.session==='R').sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)),development=events.slice(0,-3),folds=[];
 const metrics=rows=>({n:rows.length,mae:rows.reduce((s,r)=>s+Math.abs(r.predicted-r.actual),0)/rows.length,rmse:Math.sqrt(rows.reduce((s,r)=>s+(r.predicted-r.actual)**2,0)/rows.length),baselineMAE:rows.reduce((s,r)=>s+Math.abs(r.baseline-r.actual),0)/rows.length});
 for(let i=4;i<development.length;i++){const fold={test:development[i].id,methods:{}};for(const estimator of ['ridge','huber-ridge','recent-ridge','stationary-ridge']){const m=validateModel(trainPrediction(development.slice(0,i+1),{testEventId:development[i].id,estimator})),rows=evaluatePrediction(m,development.slice(0,i+1));fold.methods[estimator]={...metrics(rows),lambda:m.lambda,train:m.split.train,validation:m.split.validation};}folds.push(fold);}
 const selection=Object.fromEntries(['ridge','huber-ridge','recent-ridge','stationary-ridge'].map(estimator=>[estimator,{raceMeanMAE:folds.reduce((s,f)=>s+f.methods[estimator].mae,0)/folds.length,lapWeightedMAE:folds.reduce((s,f)=>s+f.methods[estimator].mae*f.methods[estimator].n,0)/folds.reduce((s,f)=>s+f.methods[estimator].n,0)}]));
 const selected=Object.keys(selection).sort((a,b)=>selection[a].raceMeanMAE-selection[b].raceMeanMAE)[0],model=validateModel(trainPrediction(archives,{estimator:selected})),evaluation=evaluatePrediction(model,archives);
 const heldout={};for(const estimator of ['ridge','huber-ridge','recent-ridge','stationary-ridge']){const m=trainPrediction(archives,{estimator}),rows=evaluatePrediction(m,archives);heldout[estimator]=metrics(rows);}
 const grouped=key=>Object.fromEntries([...new Set(evaluation.map(key))].sort().map(k=>[k,metrics(evaluation.filter(r=>key(r)===k))]));
 const report={schema:'apex-prediction-benchmark-1',cutoff:model.cutoff,createdAt:new Date().toISOString(),selectionRule:'Lowest equal-race mean MAE on development-only chronological rolling folds. Each fold tunes lambda on its latest preceding race. Final 2024 test events never select estimator or lambda.',selected,selection,folds,finalSplit:model.split,heldout,groups:{circuit:grouped(r=>r.circuit),driver:grouped(r=>r.driver),compound:grouped(r=>r.compound),tireAge:grouped(r=>r.tireAge<=10?'01-10':r.tireAge<=20?'11-20':r.tireAge<=30?'21-30':'31+')},data:events.map(a=>({id:a.id,laps:a.laps.length,source:a.provenance.source,hash:a.contentHash})),limitations:['Only three circuits; original FastF1 flags and less strict OpenF1 quality differ.','Historical era and surface changes remain confounders.','No calibrated probability interval or validated race-order forecast.']};
 fs.writeFileSync('public/data/fastf1/starter-model.json',JSON.stringify(model));fs.writeFileSync('public/data/fastf1/starter-evaluation.json',JSON.stringify(evaluation));fs.writeFileSync('public/data/fastf1/model-benchmark.json',JSON.stringify(report));
 console.log(JSON.stringify({selected,selection,heldout,split:model.split,trainingRows:model.trainingRows,sessions:archives.length,observedLaps:archives.reduce((s,a)=>s+a.laps.length,0)}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
