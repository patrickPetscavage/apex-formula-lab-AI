import {simulate,type Lap} from './physics';
import {validateSetup,DEFAULT_SETUP,type Setup} from './setup';
import {CENTERLINE,SMOOTH_LINE,validateTrajectory,buildTrajectory,trajectoryKey,type Trajectory} from './trajectory';
import {optimizeLine} from './optimizer';
import {attachSuspension} from './suspension';
import {requireSimulatedVehicle} from '../vehicleIdentity';
import {SF26_DEFAULT,simulateSF26,validateSF26Setup} from './sf26Model';
const cache=new Map<string,Lap>();
function run(s:Setup,t:Trajectory):Lap{
 const key=JSON.stringify([s,t.id,t.offsets]);const cached=cache.get(key);if(cached)return cached;
 const lap=t.id==='smooth'?optimizeLine(s,trajectoryKey(t)):simulate(s,buildTrajectory(t),trajectoryKey(t));
 if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(key,lap);return lap;
}
self.onmessage=e=>{try{
 const vehicle=requireSimulatedVehicle(e.data.vehicleId);
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
 attachSuspension(lap);attachSuspension(baseline);
 self.postMessage({id:e.data.id,lap,baseline});
 }catch(error){self.postMessage({id:e.data.id,error:String(error)});}};
