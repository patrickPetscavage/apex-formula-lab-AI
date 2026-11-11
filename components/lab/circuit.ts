import {TRACK,ACTIVE_CIRCUIT,TRACK_BOUNDS} from '@/lib/sim/track';
import landmarks from '@/lib/sim/data/suzuka-landmarks.json';
import {realisticCircuit,roadSurface} from './realisticCircuit';
import type {RenderQuality} from './sceneStyle';
export const roadGeometry=(extra:number,lift:number)=>roadSurface(TRACK,extra,lift);
export function createCircuit(quality:RenderQuality='balanced'){return realisticCircuit({id:ACTIVE_CIRCUIT.id,track:TRACK,bounds:TRACK_BOUNDS,quality,landmarks:ACTIVE_CIRCUIT.id==='suzuka'?landmarks:undefined});}
