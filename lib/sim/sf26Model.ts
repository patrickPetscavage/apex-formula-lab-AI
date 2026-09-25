import type {Setup} from './setup';
import {simulate} from './physics';
import type {TrackPoint} from './track';

export const SF26_MODEL_VERSION='sf26-ice-fixed-3b.1';
export const SF26_CAPABILITIES={hybrid:false,activeAero:false,suspension:false,engine:'estimated combustion-only wheel-power envelope',aero:'fixed coefficients',calibrated:false} as const;
// Independent hypothetical defaults. Common legacy fields are an adapter only;
// inactive fields are fixed and are neither shown as controls nor consumed by this model.
export const SF26_DEFAULT={frontWing:0,rearWing:0,rideHeight:35,fuel:25,ballast:0,power:380,tire:'medium' as const,brakeBias:56,camber:0,toe:0,finalDrive:4.1,frontWeight:46,cgHeight:300,frontSpring:0,rearSpring:0,frontARB:0,rearARB:0,tirePressure:0,gripScale:1,brakeLimit:5,gear1:3.1,gear2:2.55,gear3:2.12,gear4:1.81,gear5:1.58,gear6:1.4,gear7:1.26,gear8:1.14,dryMass:770,frontClA:2.0,rearClA:2.6,baseCdA:1.0};
export type SF26Setup=Setup & {gear8:number;dryMass:number;frontClA:number;rearClA:number;baseCdA:number};
export const SF26_PARAMETERS:{key:keyof SF26Setup;label:string;unit:string;min:number;max:number;step:number}[]=[
 {key:'dryMass',label:'Car + driver, excluding fuel (hypothesis)',unit:'kg',min:730,max:950,step:1},
 {key:'fuel',label:'Constant lap fuel mass',unit:'kg',min:0,max:100,step:1},
 {key:'power',label:'Peak combustion-only wheel power',unit:'kW',min:200,max:450,step:5},
 {key:'frontClA',label:'Front downforce area',unit:'m²',min:.7,max:3.5,step:.05},
 {key:'rearClA',label:'Rear downforce area',unit:'m²',min:1,max:4.5,step:.05},
 {key:'baseCdA',label:'Base drag area',unit:'m²',min:.65,max:1.6,step:.05},
 {key:'gripScale',label:'Tire grip scale',unit:'×',min:.7,max:1.2,step:.01},
 {key:'brakeBias',label:'Front brake bias',unit:'%',min:50,max:65,step:.5},
 {key:'brakeLimit',label:'Brake system ceiling',unit:'g',min:2,max:6,step:.1},
 {key:'finalDrive',label:'Final drive',unit:':1',min:3,max:5,step:.05},
 ...Array.from({length:8},(_,i)=>({key:`gear${i+1}` as keyof SF26Setup,label:`Gear ${i+1}`,unit:':1',min:.7,max:4,step:.01})),
];
export function validateSF26Setup(input:unknown):SF26Setup{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid SF-26 setup.');
 const v=input as Record<string,unknown>,out={...SF26_DEFAULT} as SF26Setup;
 for(const p of SF26_PARAMETERS){const n=v[p.key];if(typeof n!=='number'||!Number.isFinite(n)||n<p.min||n>p.max)throw Error(`${p.label}: expected ${p.min}–${p.max} ${p.unit}.`);Object.assign(out,{[p.key]:n});}
 for(let i=1;i<8;i++)if(Number(out[`gear${i}` as keyof SF26Setup])<=Number(out[`gear${i+1}` as keyof SF26Setup]))throw Error('SF-26 gear ratios must decrease from gear 1 to gear 8.');
 // Reject altered inactive fields so an imported control cannot appear functional.
 for(const k of Object.keys(SF26_DEFAULT) as (keyof SF26Setup)[])if(!SF26_PARAMETERS.some(p=>p.key===k)&&v[k]!==undefined&&v[k]!==SF26_DEFAULT[k])throw Error(`Unsupported SF-26 parameter: ${k}.`);
 return out;
}
export function sf26Model(s:SF26Setup){
 const g=9.81,rho=1.225,frontShare=.46,wheelbase=3.35,cg=.30,radius=.355;
 const c={mass:s.dryMass+s.fuel,clA:s.frontClA+s.rearClA,cdA:s.baseCdA+.025*(s.frontClA**2+s.rearClA**2),mu:1.45*s.gripScale,frontBalance:s.frontClA/(s.frontClA+s.rearClA),power:s.power*1000};
 const ratios=[s.gear1,s.gear2,s.gear3,s.gear4,s.gear5,s.gear6,s.gear7,s.gear8],redline=12000;
 const engine=(v:number)=>{let best={power:0,gear:8,rpm:redline};ratios.forEach((ratio,i)=>{const rpm=Math.max(3500,v/radius*ratio*s.finalDrive*60/(2*Math.PI));if(rpm>redline)return;const fraction=Math.min(1,rpm/9500)*(rpm>11000?1-.12*(rpm-11000)/1000:1),power=c.power*fraction;if(power>best.power)best={power,gear:i+1,rpm};});return best;};
 const loads=(v:number)=>{const q=.5*rho*v*v;return {total:q*c.clA,front:q*s.frontClA,rear:q*s.rearClA,drag:q*c.cdA};};
 const capacity=(v:number,k:number,deceleration=0)=>{
  const aero=loads(v),transfer=c.mass*deceleration*cg/wheelbase,fy=c.mass*v*v*k;
  const tire=(load:number)=>c.mu*2000*Math.pow(Math.max(0,load)/2000,.92);
  const axle=(load:number,track:number,share:number)=>{const shift=Math.min(load/2,fy*cg*share/track);return tire(load/2+shift)+tire(load/2-shift);};
  const f=axle(Math.max(1,c.mass*g*frontShare+aero.front+transfer),1.58,frontShare),r=axle(Math.max(1,c.mass*g*(1-frontShare)+aero.rear-transfer),1.53,1-frontShare),ff=fy*frontShare,fr=fy*(1-frontShare);
  return {front:f*Math.sqrt(Math.max(0,1-(ff/f)**2)),rear:r*Math.sqrt(Math.max(0,1-(fr/r)**2)),frontLat:f,rearLat:r,frontLong:f,rearLong:r,cornerValid:ff<=f&&fr<=r};
 };
 const braking=(v:number,k:number)=>{let lo=0,hi=s.brakeLimit*g;for(let i=0;i<16;i++){const a=(lo+hi)/2,cap=capacity(v,k,a);if(a*c.mass*s.brakeBias/100<=cap.front&&a*c.mass*(1-s.brakeBias/100)<=cap.rear)lo=a;else hi=a;}return lo;};
 return {c,frontShare,engine,loads,capacity,braking,ceiling:Math.min(110,redline*2*Math.PI*radius/(60*s.gear8*s.finalDrive)),drag:(v:number)=>loads(v).drag/c.mass};
}
export function simulateSF26(input:unknown,path:TrackPoint[],pathId:string){
 const setup=validateSF26Setup(input),lap=simulate(setup,path,pathId,sf26Model(setup),3.35);
 return {...lap,vehicleId:'sf26' as const,modelVersion:SF26_MODEL_VERSION,dimensions:{wheelbase:3.35,tireRadius:.355},capabilities:{...SF26_CAPABILITIES}};
}
