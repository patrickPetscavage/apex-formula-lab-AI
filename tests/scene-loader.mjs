import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const req=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apex-scene-')),THREE=req('three');
const compiled=new Map();
function compile(source,name){source=source.replaceAll(String.fromCharCode(92),'/');if(compiled.has(source))return compiled.get(source);name??=source.replace(/[\/]/g,'__').replace(/\.ts$/,'.cjs');compiled.set(source,name);let code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;code=code.replace(/require\("([^"]+)"\)/g,(_,spec)=>{if(spec==='three'||spec==='zod'||spec.startsWith('three/'))return 'require('+JSON.stringify(req.resolve(spec))+')';let target=spec.startsWith('@/')?spec.slice(2):spec.startsWith('.')?path.join(path.dirname(source),spec):null;if(!target)return 'require('+JSON.stringify(spec)+')';if(target.endsWith('.json'))return 'require('+JSON.stringify(path.resolve(target))+')';if(!target.endsWith('.ts'))target+='.ts';return 'require('+JSON.stringify('./'+compile(target))+')';});fs.writeFileSync(path.join(tmp,name),code);return name;}
compile('lib/sim/track.ts','track.cjs');compile('components/lab/circuit.ts','circuit.cjs');
const tracks=req(path.join(tmp,'track.cjs'));

export {req,tmp,compiled,compile,tracks,THREE,fs,path};
