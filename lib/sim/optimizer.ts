import {simulate,type Lap} from './physics';
import type {Setup} from './setup';
import {TRACK} from './track';
import {boundOffset,pathFromOffsets,smoothOffsets} from './trajectory';
// Deterministic bounded local search. Full lap time includes acceleration/braking and all corners.
export function optimizeLine(setup:Setup,pathId:string):Lap{
 let evaluations=1,best=simulate(setup,TRACK,pathId),offsets=TRACK.map(()=>0);const centerlineTime=best.lapTime,n=TRACK.length;
 const assess=(candidate:number[])=>{const lap=simulate(setup,pathFromOffsets(candidate),pathId);evaluations++;if(lap.lapTime<best.lapTime-1e-5){best=lap;offsets=candidate;return true;}return false;};
 const seed=smoothOffsets();
 for(const factor of [.5,1])assess(seed.map((v,i)=>boundOffset(v*factor,i)));
 // Local support overlaps neighbouring corners: entry, apex and exit are not independent hand-picked points.
 for(const step of [1.5,.75]){
  for(let knot=0;knot<40;knot++){
   const center=knot*n/40,radius=n/28,original=offsets.slice();let candidateBest=offsets;
   for(const sign of [-1,1]){
    const trial=original.map((o,i)=>{const d=Math.min(Math.abs(i-center),n-Math.abs(i-center));const w=d<radius?(1+Math.cos(Math.PI*d/radius))/2:0;return boundOffset(o+sign*step*w,i);});
    if(assess(trial))candidateBest=trial;
   }offsets=candidateBest;
  }
 }
 best.optimization={evaluations,centerlineTime,gain:centerlineTime-best.lapTime};return best;
}
