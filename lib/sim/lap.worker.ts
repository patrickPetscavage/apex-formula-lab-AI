import {runBatchPair} from './batch';
import {MODEL_VERSION} from './experiments';
import {ACTIVE_CIRCUIT} from './track';
import {selectCircuit} from './trajectory';
import {simulate,type Lap} from './physics';
import {validateSetup,DEFAULT_SETUP,type Setup} from './setup';
import {CENTERLINE,SMOOTH_LINE,validateTrajectory,buildTrajectory,trajectoryKey,type Trajectory} from './trajectory';
import {optimizeLine} from './optimizer';
import {attachSuspension} from './suspension';
import {requireSimulatedVehicle} from '../vehicleIdentity';
import {SF26_MODEL_VERSION,SF26_DEFAULT,simulateSF26,validateSF26Setup} from './sf26Model';
const cache=new Map<string,Lap>();
function run(s:Setup,t:Trajectory):Lap{
 const key=JSON.stringify(['f2004',MODEL_VERSION,ACTIVE_CIRCUIT.version,s,trajectoryKey(t)]);const cached=cache.get(key);if(cached)return cached;
 const lap=t.id==='smooth'?optimizeLine(s,trajectoryKey(t)):simulate(s,buildTrajectory(t),trajectoryKey(t));
 if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(key,lap);return lap;
}
self.onmessage=e=>{try{
 if(e.data.kind==='batch'){const result=runBatchPair(e.data,stage=>self.postMessage({kind:'progress',id:e.data.id,key:e.data.key,stage}));self.postMessage({kind:'result',id:e.data.id,key:e.data.key,...result});return;}
 selectCircuit(e.data.circuitId??'suzuka');
 const vehicle=requireSimulatedVehicle(e.data.vehicleId);
 if(e.data.trackVersion&&e.data.trackVersion!==ACTIVE_CIRCUIT.version)throw Error('Circuit version mismatch.');
 if(e.data.modelVersion&&e.data.modelVersion!==(vehicle==='sf26'?SF26_MODEL_VERSION:MODEL_VERSION))throw Error('Model version mismatch.');
 if(vehicle==='sf26'){
  const setup=validateSF26Setup(e.data.setup),base=validateSF26Setup(e.data.baselineSetup??SF26_DEFAULT),line=validateTrajectory(e.data.trajectory??CENTERLINE),mode=e.data.baselineMode??'same',baseLine=mode==='same'?line:mode==='centerline'?CENTERLINE:validateTrajectory(e.data.baselineTrajectory??CENTERLINE);
  if(line.id==='smooth'||baseLine.id==='smooth')throw Error('SF-26 optimization is deferred. Choose centerline or a saved/custom trajectory.');
  const lap=simulateSF26(setup,buildTrajectory(line),trajectoryKey(line)),baseline=simulateSF26(base,buildTrajectory(baseLine),trajectoryKey(baseLine));
  self.postMessage({id:e.data.id,lap,baseline});return;
 }
 const setup=validateSetup(e.data.setup),a=validateSetup(e.data.baselineSetup??DEFAULT_SETUP),line=validateTrajectory(e.data.trajectory??SMOOTH_LINE);
 const baselineLine=validateTrajectory(e.data.baselineTrajectory??SMOOTH_LINE),mode=e.data.baselineMode??'same';
 let lap:Lap,baseline:Lap;
 if(mode==='same'){baseline=run(a,line);lap=JSON.stringify(setup)===JSON.stringify(a)?baseline:simulate(setup,baseline.path,trajectoryKey(line));}
 else {lap=run(setup,line);baseline=run(a,mode==='centerline'?CENTERLINE:baselineLine);}
 lap.vehicleId=baseline.vehicleId='f2004';lap.modelVersion=baseline.modelVersion=MODEL_VERSION;attachSuspension(lap);attachSuspension(baseline);
 self.postMessage({id:e.data.id,lap,baseline});
 }catch(error){self.postMessage({id:e.data.id,key:e.data.key,error:String(error)});}};
