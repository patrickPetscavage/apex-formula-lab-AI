import type {Lap} from './physics';
import type {Setup} from './setup';
import {vehicleModel} from './vehicle';
import {sampleMotion} from './motion';

export const SUSPENSION_VERSION='apex-quasistatic-2f.1';
export type SuspensionSample={fl:number;fr:number;rl:number;rr:number;frontTransfer:number;rearTransfer:number;flMM:number;frMM:number;rlMM:number;rrMM:number;heaveMM:number;pitchDeg:number;rollDeg:number;insideMargin:number;warning:number};
export type SuspensionTelemetry={version:string;samples:SuspensionSample[]};
export const SUSPENSION_KEYS: (keyof SuspensionSample)[]=['fl','fr','rl','rr','frontTransfer','rearTransfer','flMM','frMM','rlMM','rrMM','heaveMM','pitchDeg','rollDeg','insideMargin','warning'];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** DERIVED / ESTIMATED: flat-road quasi-static rigid sprung body, effective wheel rates.
 * Positive signed ay turns toward local -X (left); right wheels are outside.
 * Static springs are preloaded: displacement is change from static reference, not total sag.
 * No unsprung split, geometric roll centres, third spring, damping or tire deflection.
 * This postprocessor does NOT feed the lap solver. */
export function cornerState(s:Setup,ax:number,signedAy:number,frontAero:number,rearAero:number):SuspensionSample{
 const {c,frontShare}=vehicleModel(s),weight=c.mass*9.81,total=weight+frontAero+rearAero;
 const transfer=c.mass*ax*(s.cgHeight/1000)/3.05;
 const rawFront=weight*frontShare+frontAero-transfer,front=clamp(rawFront,0,total),rear=total-front;
 const kf=s.frontSpring+s.frontARB,kr=s.rearSpring+s.rearARB;
 const share=kf*1.47**2/(kf*1.47**2+kr*1.405**2);
 const moment=c.mass*signedAy*s.cgHeight/1000;
 const df=moment*share/1.47,dr=moment*(1-share)/1.405;
 const raw=[front/2-df,front/2+df,rear/2-dr,rear/2+dr];
 // At lift, redistribute within each axle to conserve vertical load; explicitly flag invalidity.
 const fl=clamp(raw[0],0,front),fr=front-fl,rl=clamp(raw[2],0,rear),rr=rear-rl;
 const fCommon=(front-weight*frontShare)/(2*s.frontSpring),rCommon=(rear-weight*(1-frontShare))/(2*s.rearSpring);
 const rollF=df/kf,rollR=dr/kr;
 const rawDisplacements=[fCommon-rollF,fCommon+rollF,rCommon-rollR,rCommon+rollR];
 // A shared bound preserves a planar body and avoids suggesting unmodeled bottoming is valid.
 const maxTravel=Math.min(25,Math.max(5,s.rideHeight-12));
 const factor=Math.min(1,maxTravel/Math.max(1,...rawDisplacements.map(Math.abs)));
 const [flMM,frMM,rlMM,rrMM]=rawDisplacements.map(x=>x*factor);
 const f=(flMM+frMM)/2,r=(rlMM+rrMM)/2;
 return {fl,fr,rl,rr,frontTransfer:fr-fl,rearTransfer:rr-rl,flMM,frMM,rlMM,rrMM,
 heaveMM:(f*1.55+r*1.5)/3.05,pitchDeg:Math.atan2(r-f,3050)*180/Math.PI,
 rollDeg:-Math.atan2(frMM-flMM,1470)*180/Math.PI,insideMargin:Math.min(...raw),
 warning:(Math.min(...raw)<0||rawFront<0||rawFront>total?1:0)+(factor<1?2:0)};
}
export function attachSuspension(lap:Lap):Lap{
 if(lap.suspension?.version===SUSPENSION_VERSION)return lap;
 lap.suspension={version:SUSPENSION_VERSION,samples:lap.path.map((_,i)=>{
 const sign=Math.sign(sampleMotion(lap,lap.time[i]).curvature);
 return cornerState(lap.setup,lap.ax[i],lap.ay[i]*sign,lap.telemetry[i].frontAero,lap.telemetry[i].rearAero);
 })};return lap;
}
export function sampleSuspension(lap:Lap,i:number,u:number):SuspensionSample|undefined{
 const data=lap.suspension;if(!data||data.version!==SUSPENSION_VERSION)return;
 const a=data.samples[i],b=data.samples[(i+1)%data.samples.length];
 const out={} as SuspensionSample;
 for(const key of SUSPENSION_KEYS)out[key]=key==='warning'?(a.warning|b.warning):a[key]+(b[key]-a[key])*u;
 return out;
}
