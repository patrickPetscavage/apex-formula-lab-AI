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
 const model=validateModel(trainPrediction(archives,{testEventId:'2024-monza-R'})),evaluation=evaluatePrediction(model,archives);
 fs.writeFileSync('public/data/fastf1/starter-model.json',JSON.stringify(model));
 fs.writeFileSync('public/data/fastf1/starter-evaluation.json',JSON.stringify(evaluation));
 console.log(JSON.stringify({version:model.version,split:model.split,metrics:model.metrics,trainingRows:model.trainingRows,drivers:model.drivers,circuits:model.circuits}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
