import {trainPrediction,predictRace} from '../racePrediction';
import {validateArchive,traceError,type CalibrationResult} from '../fastf1';
import {referenceTrack,activateTrack} from './track';
import {simulate} from './physics';
import {validateSetup} from './setup';
self.onmessage=e=>{const {id,kind}=e.data;try{
 if(kind==='train'){const model=trainPrediction(e.data.archives);self.postMessage({id,kind,model});}
 else if(kind==='predict'){const results=predictRace(e.data.model,e.data.scenario);self.postMessage({id,kind,results});}
 else if(kind==='calibrate'){
  const a=validateArchive(e.data.archive),train=a.traces.find(t=>`${t.driver}:${t.lap}`===e.data.traceKey),validation=a.traces.find(t=>`${t.driver}:${t.lap}`===e.data.validationKey);
  if(!train)throw Error('Choose a historical trace');if(validation===train)throw Error('Validation trace must be distinct');
  const input=validateSetup(e.data.setup),track=referenceTrack(a.circuitId);activateTrack(a.circuitId);let best:CalibrationResult|null=null;
  const powers=[350,450,550,650,700],grips=[.8,.9,1,1.1,1.2];
  let completed=0;for(const power of powers)for(const gripScale of grips){const setup=validateSetup({...input,power,gripScale}),lap=simulate(setup,track,'centerline'),error=traceError(lap,train);if(!best||error<best.trainRMSE)best={vehicleId:'f2004',circuitId:a.circuitId,setup,lap,trainRMSE:error,validationRMSE:validation?traceError(lap,validation):null,trainTrace:`${a.id}/${train.driver}/${train.lap}`,validationTrace:validation?`${a.id}/${validation.driver}/${validation.lap}`:null,assumption:'Experimental cross-era effective power/grip grid fit at fixed centerline. Not measured F2004 parameters; nonunique and uncalibrated geometry/aero. Validation is another lap in the same event, not independent event validation.'};self.postMessage({id,kind:'progress',completed:++completed,total:25});}
  self.postMessage({id,kind,result:best});
 }else throw Error('Unknown research worker request');
}catch(error){self.postMessage({id,kind,error:error instanceof Error?error.message:String(error)});}};
