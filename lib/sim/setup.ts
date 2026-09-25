import {requireSimulatedVehicle} from '../vehicleIdentity';
export const DEFAULT_SETUP = { frontWing: 18, rearWing: 22, rideHeight: 35, fuel: 25, ballast: 0, power: 600, tire: 'medium' as 'soft'|'medium'|'hard', brakeBias: 56, camber: -2.5, toe: 0.1, finalDrive:5.4, frontWeight:45, cgHeight:280, frontSpring:180, rearSpring:160, frontARB:40, rearARB:35, tirePressure:21, gripScale:1, brakeLimit:5.5, gear1:3.2, gear2:2.5, gear3:2, gear4:1.67, gear5:1.45, gear6:1.28, gear7:1.15 };
export type Setup = typeof DEFAULT_SETUP;
export type NumericKey = Exclude<keyof Setup,'tire'>;
export const PARAMS: {key:NumericKey;label:string;unit:string;min:number;max:number;step:number;help:string;modeled:boolean;provenance?:'ESTIMATED'|'USER-DEFINED'|'DERIVED'|'DOCUMENTED'}[] = [
{key:'frontWing',label:'Front wing angle',unit:'°',min:8,max:32,step:1,help:'Increases estimated front downforce and drag; shifts aero balance.',modeled:true},
{key:'rearWing',label:'Rear wing angle',unit:'°',min:8,max:36,step:1,help:'Increases estimated rear downforce and drag; shifts aero balance.',modeled:true},
{key:'rideHeight',label:'Ride height',unit:'mm',min:20,max:65,step:1,help:'Floor efficiency peaks at 35 mm in this illustrative aero model.',modeled:true},
{key:'fuel',label:'Fuel load',unit:'kg',min:5,max:100,step:1,help:'Adds constant mass for the lap. Fuel burn is not simulated.',modeled:true},
{key:'ballast',label:'Added component mass',unit:'kg',min:0,max:60,step:1,help:'Adds mass at the vehicle center; no weight-distribution change.',modeled:true},
{key:'power',label:'Effective wheel power',unit:'kW',min:350,max:700,step:10,help:'Peak effective wheel-power envelope for an estimated seven-speed V10 drivetrain; not a measured dyno curve.',modeled:true},
{key:'brakeBias',label:'Front brake bias',unit:'%',min:50,max:65,step:0.5,help:'Splits braking demand between axles. The axle reaching its grip limit first limits deceleration.',modeled:true},
{key:'finalDrive',label:'Final drive ratio',unit:':1',min:4.5,max:6.5,step:.1,help:'Scales seven estimated gear ratios. Changes engine speed, available wheel power and gearing ceiling.',modeled:true},
{key:'frontWeight',label:'Static front mass',unit:'%',min:42,max:48,step:.5,help:'Estimated weight distribution used for axle loads and steady lateral force allocation.',modeled:true},
{key:'cgHeight',label:'Center of gravity height',unit:'mm',min:200,max:400,step:5,help:'Estimated CG height used for braking load transfer. Not an automatically derived CAD property.',modeled:true},
{key:'camber',label:'Wheel camber',unit:'°',min:-4,max:0,step:0.1,help:'Estimated lateral grip peaks at −2.5°. Excess camber reduces longitudinal grip; no contact-patch solver.',modeled:true},
{key:'toe',label:'Wheel toe',unit:'°',min:-0.3,max:0.3,step:0.05,help:'Estimated tire scrub adds equivalent drag area away from zero toe.',modeled:true},
{key:'frontSpring',label:'Front wheel rate',unit:'N/mm',min:80,max:300,step:5,help:'Effective wheel rate, after motion ratio. Changes roll load-transfer distribution; no heave dynamics.',modeled:true,provenance:'ESTIMATED'},
{key:'rearSpring',label:'Rear wheel rate',unit:'N/mm',min:80,max:300,step:5,help:'Rear effective wheel rate. Changes axle grip through lateral load transfer.',modeled:true,provenance:'ESTIMATED'},
{key:'frontARB',label:'Front anti-roll wheel rate',unit:'N/mm',min:0,max:120,step:5,help:'Equivalent anti-roll contribution to front axle roll stiffness.',modeled:true,provenance:'ESTIMATED'},
{key:'rearARB',label:'Rear anti-roll wheel rate',unit:'N/mm',min:0,max:120,step:5,help:'Equivalent anti-roll contribution to rear axle roll stiffness.',modeled:true,provenance:'ESTIMATED'},
{key:'tirePressure',label:'Tire pressure',unit:'psi',min:16,max:28,step:0.5,help:'Hypothetical grip optimum at 21 psi; a sensitivity approximation, not a tire specification.',modeled:true,provenance:'ESTIMATED'},
{key:'gripScale',label:'Surface / tire grip scale',unit:'×',min:0.7,max:1.2,step:0.01,help:'User-defined multiplier on all tire force limits; dry reference = 1.',modeled:true,provenance:'USER-DEFINED'},
{key:'brakeLimit',label:'Brake system ceiling',unit:'g',min:2,max:7,step:0.1,help:'User-defined maximum tire braking demand before axle grip limits; drag is additional.',modeled:true,provenance:'USER-DEFINED'},
{key:'gear1',label:'Gear 1 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear2',label:'Gear 2 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear3',label:'Gear 3 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear4',label:'Gear 4 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear5',label:'Gear 5 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear6',label:'Gear 6 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
{key:'gear7',label:'Gear 7 ratio',unit:':1',min:.7,max:4,step:.01,help:'Estimated individual ratio. Solver selects the gear with greatest available wheel power; no shift delay.',modeled:true},
];
export function validateSetup(input: unknown): Setup {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Setup must be an object.');
 const s={...input} as Record<string,unknown>;
 for(const key of ['finalDrive','frontWeight','cgHeight','frontSpring','rearSpring','frontARB','rearARB','tirePressure','gripScale','brakeLimit','gear1','gear2','gear3','gear4','gear5','gear6','gear7'] as const)if(s[key]===undefined)s[key]=DEFAULT_SETUP[key];
 for(const p of PARAMS) if(typeof s[p.key]!=='number'||!Number.isFinite(s[p.key])||(s[p.key] as number)<p.min||(s[p.key] as number)>p.max) throw new Error(`${p.label} must be between ${p.min} and ${p.max} ${p.unit}.`);
 if(!['soft','medium','hard'].includes(String(s.tire))) throw new Error('Unknown tire compound.');
 return Object.fromEntries([...PARAMS.map(p=>[p.key,s[p.key]]),['tire',s.tire]]) as Setup;
}
export type SavedSetup = {vehicleId?:'f2004';version:1;name:string;setup:Setup};
export function validateSaved(input:unknown): SavedSetup { const s=input as SavedSetup;if(requireSimulatedVehicle(s?.vehicleId)!=='f2004')throw Error('This configuration belongs to another vehicle.');if(!s || s.version!==1 || typeof s.name!=='string'||s.name.trim().length<1||s.name.length>60)throw new Error('Use a version 1 configuration with a name (1–60 characters).');return {...(s.vehicleId?{vehicleId:s.vehicleId}:{}),version:1,name:s.name.trim(),setup:validateSetup(s.setup)}; }
export function coefficients(s:Setup){const front=0.9+s.frontWing*.065,rear=1.3+s.rearWing*.067,floor=1.65*Math.max(.65,1-((s.rideHeight-35)/65)**2);return {mass:605+s.fuel+s.ballast,clA:front+rear+floor,cdA:.72+.0007*s.frontWing**2+.00085*s.rearWing**2+.18*Math.abs(s.toe),mu:({soft:1.53,medium:1.44,hard:1.35}[s.tire])*s.gripScale*Math.max(.75,1-.003*(s.tirePressure-21)**2),frontBalance:(front+.44*floor)/(front+rear+floor),power:s.power*1000};}
