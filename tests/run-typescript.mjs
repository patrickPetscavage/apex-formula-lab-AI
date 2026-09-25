import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const req=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apex-tests-'));
try{
 for(const folder of ['lib/sim','lib','tests'])for(const file of fs.readdirSync(folder)){
 if(!file.endsWith('.ts'))continue;const source=path.join(folder,file),dest=path.join(tmp,folder,file.replace(/\.ts$/,'.js'));
 let code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 code=code.replace(/require\("(\.[^"]+\.json)"\)/g,(_,p)=>`require(${JSON.stringify(path.resolve(path.dirname(source),p))})`);
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,code);
 }
 for(const name of process.argv.slice(2))req(path.join(tmp,'tests',name+'.js'));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
