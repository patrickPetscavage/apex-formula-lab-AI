import type {Plugin} from 'vite';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {validateArchive,validateIndex} from '../lib/fastf1';
// Development only. Never copies raw timing archives into a production bundle.
export function fastf1Local():Plugin{return {name:'apex-fastf1-local',apply:'serve',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const match=/^\/data\/fastf1\/(index|20(?:1[89]|2[0-4])-(?:suzuka|monza|spa)-(?:Q|R|FP[123]|S|SQ))\.json$/.exec((req.url??'').split('?')[0]);
 if(!match||req.method!=='GET')return next();
 try{const file=path.resolve(server.config.root,'data-local','fastf1',match[1]+'.json'),raw=await readFile(file,'utf8');if(raw.length>32_000_000)throw Error('Historical archive exceeds 32 MB');const value=JSON.parse(raw);if(match[1]==='index')validateIndex(value);else validateArchive(value);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(raw);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return next();res.statusCode=422;res.end(JSON.stringify({error:'Invalid pre-2025 local archive'}));}
 });}};}
