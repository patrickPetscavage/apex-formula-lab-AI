import {validateAtlas,atlasTrack} from '../circuitAtlas';
import {DEFAULT_SETUP,validateSetup} from './setup';
import {SF26_DEFAULT,validateSF26Setup,sf26Model,SF26_MODEL_VERSION,SF26_CAPABILITIES} from './sf26Model';
import {simulate} from './physics';
import {vehicleModel} from './vehicle';
import {MODEL_VERSION} from './experiments';
self.onmessage=e=>{const {id}=e.data;try{
 const a=validateAtlas(e.data.atlas),vehicleId=e.data.vehicleId;
 if(!['f2004','sf26'].includes(vehicleId)||!Array.isArray(e.data.ghosts)||e.data.ghosts.length<1||e.data.ghosts.length>4)throw Error('Choose a supported vehicle and 1–4 physics ghosts');
 const path=atlasTrack(a),seen=new Set<string>(),laps=[];
 for(const input of e.data.ghosts){if(typeof input.id!=='string'||seen.has(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>60||!/^#[0-9a-f]{6}$/i.test(input.color))throw Error('Invalid ghost identity/color');seen.add(input.id);
  const setup=vehicleId==='sf26'?validateSF26Setup({...SF26_DEFAULT,...input.setup}):validateSetup({...DEFAULT_SETUP,...input.setup});
  const model=vehicleId==='sf26'?sf26Model(setup as typeof SF26_DEFAULT):vehicleModel(setup),lap=simulate(setup,path,'atlas-centerline',model,vehicleId==='sf26'?3.35:3.05,path);
  Object.assign(lap,{referencePath:path,circuitId:'atlas:'+a.id,trackVersion:a.version,vehicleId,modelVersion:(vehicleId==='sf26'?SF26_MODEL_VERSION:MODEL_VERSION)+'/atlas-dem-proxy-1',dimensions:{wheelbase:vehicleId==='sf26'?3.35:3.05,tireRadius:vehicleId==='sf26'?.355:.33}});
  if(vehicleId==='sf26')lap.capabilities={...SF26_CAPABILITIES};
  laps.push({id:input.id,name:input.name,color:input.color,setup:structuredClone(setup),lap});self.postMessage({id,kind:'progress',completed:laps.length,total:e.data.ghosts.length});
 }
 self.postMessage({id,kind:'result',atlasId:a.id,atlasVersion:a.version,vehicleId,laps});
}catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}};
