import {coefficients,type Setup} from './setup';
export const G=9.81,RHO=1.225;
// All tire/suspension coefficients below are estimated sensitivity models.
export function vehicleModel(s:Setup){
 const c=coefficients(s),frontShare=s.frontWeight/100,cg=s.cgHeight/1000,wheelbase=3.05;
 const rollFront=(s.frontSpring+s.frontARB)*1.47**2,rollRear=(s.rearSpring+s.rearARB)*1.405**2;
 const rollShare=rollFront/(rollFront+rollRear),ratios=[s.gear1,s.gear2,s.gear3,s.gear4,s.gear5,s.gear6,s.gear7];
 const engine=(v:number)=>{let power=0,gear=1,rpm=4000;ratios.forEach((r,i)=>{const rev=Math.max(4000,v/.33*r*s.finalDrive*60/(2*Math.PI));if(rev>19000)return;const fraction=Math.min(1,rev/14000)*(rev>18300?1-(rev-18300)/700*.12:1);if(c.power*fraction>power){power=c.power*fraction;gear=i+1;rpm=rev;}});return {power,gear,rpm};};
 const loads=(v:number)=>{const total=.5*RHO*c.clA*v*v;return {front:total*c.frontBalance,rear:total*(1-c.frontBalance),total,drag:.5*RHO*c.cdA*v*v};};
 const capacity=(v:number,k:number,brakeAcceleration=0)=>{
  const aero=loads(v),transfer=c.mass*brakeAcceleration*cg/wheelbase,fy=c.mass*v*v*k;
  const nf=Math.max(1,c.mass*G*frontShare+aero.front+transfer),nr=Math.max(1,c.mass*G*(1-frontShare)+aero.rear-transfer);
  // Per-tire load sensitivity, fixed reference load so extra mass cannot scale grip linearly.
  const tire=(n:number)=>c.mu*1550*Math.pow(Math.max(0,n)/1550,.92);
  const axle=(load:number,track:number,share:number)=>{const shift=Math.min(load/2,fy*cg*share/track);return tire(load/2+shift)+tire(load/2-shift);};
  const f=axle(nf,1.47,rollShare),r=axle(nr,1.405,1-rollShare);
  const lateralFactor=Math.max(.8,1-.035*(s.camber+2.5)**2),longFactor=1-.012*Math.abs(s.camber);
  const fyF=fy*frontShare,fyR=fy*(1-frontShare),fLat=f*lateralFactor,rLat=r*lateralFactor;
  return {front: f*longFactor*Math.sqrt(Math.max(0,1-(fyF/fLat)**2)),rear:r*longFactor*Math.sqrt(Math.max(0,1-(fyR/rLat)**2)),
   cornerValid:fyF<=fLat&&fyR<=rLat,frontLat:fLat,rearLat:rLat,frontLong:f*longFactor,rearLong:r*longFactor};
 };
 const braking=(v:number,k:number)=>{let lo=0,hi=s.brakeLimit*G;for(let j=0;j<16;j++){const a=(lo+hi)/2,cap=capacity(v,k,a);if(a*c.mass*s.brakeBias/100<=cap.front&&a*c.mass*(1-s.brakeBias/100)<=cap.rear)lo=a;else hi=a;}return lo;};
 return {c,frontShare,engine,loads,capacity,braking,ceiling:Math.min(110,19000*2*Math.PI*.33/(60*Math.min(...ratios)*s.finalDrive)),drag:(v:number)=>loads(v).drag/c.mass};
}
