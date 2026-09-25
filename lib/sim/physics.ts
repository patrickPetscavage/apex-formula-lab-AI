import {type Setup} from './setup';
import {vehicleModel} from './vehicle';
import {TRACK,TRACK_LENGTH,type TrackPoint} from './track';
import type {SuspensionTelemetry} from './suspension';
export type Lap={vehicleId?:'f2004'|'sf26';modelVersion?:string;dimensions?:{wheelbase:number;tireRadius:number};capabilities?:{hybrid:boolean;activeAero:boolean;suspension:boolean;engine:string;aero:string;calibrated:boolean};suspension?:SuspensionTelemetry;speed:number[];time:number[];ax:number[];ay:number[];lapTime:number;sectors:number[];topSpeed:number;setup:Setup;iterations:number;residual:number;path:TrackPoint[];pathId:string;gear:number[];telemetry:{throttle:number;brake:number;rpm:number;downforce:number;frontAero:number;rearAero:number;drag:number;utilization:number;steering:number;offset:number}[];optimization?:{evaluations:number;centerlineTime:number;gain:number}};
export function simulate(setup:Setup, track:TrackPoint[]=TRACK,pathId='centerline',model=vehicleModel(setup),wheelbase=3.05):Lap{
 const {c,engine,braking,ceiling,drag}=model,g=9.81,n=track.length;
 const axleCapacity=model.capacity;
 const v=track.map(p=>{let lo=1,hi=ceiling;for(let j=0;j<30;j++){const mid=(lo+hi)/2;if(axleCapacity(mid,p.k).cornerValid)lo=mid;else hi=mid;}return lo;});
 let residual=0,iterations=0;
 for(let pass=0;pass<180;pass++){
 residual=0;
 for(let i=0;i<n;i++){const j=(i+1)%n;const a=(Math.min(engine(v[i]).power/(c.mass*Math.max(v[i],8)),Math.min(axleCapacity(v[i],track[i].k).rear,axleCapacity(v[i],track[j].k).rear)/c.mass)-drag(v[i]))-g*(track[i].grade||0);const nv=Math.min(v[j],Math.sqrt(Math.max(1,v[i]**2+2*a*track[i].ds)));residual=Math.max(residual,v[j]-nv);v[j]=nv;}
 for(let i=n-1;i>=0;i--){const j=(i+1)%n;const a=Math.min(braking(v[i],track[i].k),braking(v[j],track[j].k))+drag(v[j])+g*(track[i].grade||0);const nv=Math.min(v[i],Math.sqrt(Math.max(1,v[j]**2+2*a*track[i].ds)));residual=Math.max(residual,v[i]-nv);v[i]=nv;}
 iterations=pass+1;if(residual<1e-7)break;
 }
 const time=[0],ax:number[]=[],ay:number[]=[];for(let i=0;i<n;i++){const j=(i+1)%n;time.push(time[i]+2*track[i].ds/(v[i]+v[j]));ax.push((v[j]**2-v[i]**2)/(2*track[i].ds));ay.push(v[i]**2*track[i].k);}
 const timeAtStation=(station:number)=>{let i=0;while(i<n-1&&TRACK[i].s+TRACK[i].ds<station)i++;const u=(station-TRACK[i].s)/TRACK[i].ds,d=track[i].ds*u,nextSpeed=Math.sqrt(Math.max(0,v[i]*v[i]+2*ax[i]*d));return time[i]+2*d/(v[i]+nextSpeed);};
 const splits=[timeAtStation(TRACK_LENGTH/3),timeAtStation(TRACK_LENGTH*2/3),time[n]];
 const telemetry=v.map((speed,i)=>{
  const aero=model.loads(speed),drive=engine(speed),force=c.mass*(ax[i]+g*(track[i].grade||0))+aero.drag;
  const brakeForce=Math.max(0,-force),traction=Math.max(0,force),cap=axleCapacity(speed,track[i].k,brakeForce/c.mass);
  const frontDemand=brakeForce*setup.brakeBias/100,rearDemand=brakeForce*(1-setup.brakeBias/100)+traction;
  const utilization=Math.max(Math.hypot(c.mass*ay[i]*model.frontShare/cap.frontLat,frontDemand/cap.frontLong),Math.hypot(c.mass*ay[i]*(1-model.frontShare)/cap.rearLat,rearDemand/cap.rearLong));
  const ref=TRACK[i],a=TRACK[(i+n-1)%n],b=TRACK[(i+1)%n],len=Math.hypot(b.x-a.x,b.z-a.z);
  return {throttle:Math.min(1,traction*speed/Math.max(1,drive.power)),brake:Math.min(1,brakeForce/(c.mass*setup.brakeLimit*g)),rpm:drive.rpm,downforce:aero.total,frontAero:aero.front,rearAero:aero.rear,drag:aero.drag,utilization,steering:Math.atan(wheelbase*track[i].k)*180/Math.PI,offset:((track[i].x-ref.x)*(-(b.z-a.z))+(track[i].z-ref.z)*(b.x-a.x))/len};
 });
 return {telemetry,gear:v.map(speed=>engine(speed).gear),path:track,pathId,speed:v,time,ax,ay,lapTime:time[n],sectors:[splits[0],splits[1]-splits[0],splits[2]-splits[1]],topSpeed:Math.max(...v)*3.6,setup:{...setup},iterations,residual};
}
export function sampleLap(lap:Lap,t:number){
 const path=lap.path??TRACK,length=path.reduce((sum,p)=>sum+p.ds,0);
 const tt=Math.max(0,Math.min(t,lap.lapTime));let lo=0,hi=path.length;while(lo+1<hi){const m=(lo+hi)>>1;if(lap.time[m]<=tt)lo=m;else hi=m;}
 const i=lo,j=(i+1)%path.length,dt=tt-lap.time[i],v0=lap.speed[i],a=lap.ax[i];const u=Math.max(0,Math.min(1,(v0*dt+.5*a*dt*dt)/path[i].ds));const p=path[i],q=path[j];return {station:TRACK[i].s+TRACK[i].ds*u,y:p.y+(q.y-p.y)*u,pitch:Math.atan2(q.y-p.y,Math.hypot(q.x-p.x,q.z-p.z)),x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u,heading:Math.atan2(q.x-p.x,q.z-p.z),speed:(v0+a*dt)*3.6,s:p.s+p.ds*u,ax:a/9.81,ay:lap.ay[i]/9.81,i,u,progress:(p.s+p.ds*u)/length};
}
