import * as THREE from 'three';
import type {CarRig} from './car';
import {SF26_CATALOG,SF26_PREVIEW as D} from '../../lib/sf26';

/** Original ESTIMATED launch reconstruction; no team CAD or aerodynamic surface claims. */
export function createSF26(ghost=false):CarRig{
 const group=new THREE.Group(),parts=new Map<string,THREE.Group>();
 const red=0xc91621,black=0x171a1c,white=0xe9e6e2,metal=0x696d72;
 const box=(x:number,y:number,z:number)=>new THREE.BoxGeometry(x,y,z);
 const mesh=(g:THREE.BufferGeometry,color:number)=>new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:ghost?0x85c8d0:color,roughness:color===black?.72:.30,metalness:color===metal?.8:.12,clearcoat:color===red?.65:.05,transparent:ghost,opacity:ghost?.24:1,depthWrite:!ghost}));
 const at=(m:THREE.Object3D,x:number,y:number,z:number)=>{m.position.set(x,y,z);return m;};
 const rod=(a:number[],b:number[],r=.012,color=black)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),12),color);m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;};
 // Smooth, capped elliptical lofts. Width/height interpolation stays positive.
 const shape=(stations:number[][],color:number)=>{
  const rows:number[][]=[];
  for(let j=0;j<stations.length-1;j++)for(let t=0;t<8;t++){const u=t/8,a=stations[j],b=stations[j+1],before=stations[Math.max(0,j-1)],after=stations[Math.min(stations.length-1,j+2)];rows.push(a.map((v,k)=>k===0?v+(b[k]-v)*u:Math.max(k===1||k===3?.008:-Infinity,(2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*(b[k]-before[k])*.5+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*(after[k]-v)*.5)));}rows.push(stations.at(-1)!);
  const vertices:number[]=[],indices:number[]=[],n=32;
  for(const [z,w,y,h] of rows)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;vertices.push(Math.cos(a)*w,y+Math.sin(a)*h,z);}
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
  for(const end of [0,rows.length-1]){const [z,,y]=rows[end],center=vertices.length/3;vertices.push(0,y,z);for(let i=0;i<n;i++){const a=end*n+i,b=end*n+(i+1)%n;indices.push(...(end===0?[center,b,a]:[center,a,b]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,color);
 };
 const part=(key:string,items:THREE.Object3D[],explode:number[])=>{const id=`sf26:${key}`,p=new THREE.Group();p.name=id;p.userData.explode=new THREE.Vector3(...explode);p.userData.base=new THREE.Vector3();for(const m of items){m.traverse(o=>{o.userData.partId=id;if(o instanceof THREE.Mesh){o.castShadow=!ghost;o.receiveShadow=true;}});p.add(m);}group.add(p);parts.set(id,p);return p;};
 // The cockpit has a lowered central shell and side sills, leaving an actual recess.
 part('tub',[shape([[-1.66,.16,.33,.13],[-1.2,.25,.36,.17],[-.78,.30,.37,.17],[-.58,.31,.28,.09],[.05,.31,.28,.10],[.55,.25,.33,.18]],red),...[-1,1].map(s=>{const sill=shape([[-.78,.055,.45,.085],[-.55,.055,.48,.075],[.06,.055,.49,.08],[.35,.06,.44,.08]],red);sill.position.x=s*.285;return sill;})],[0,.6,0]);
 part('seat',[at(mesh(box(.32,.045,.40),black),0,.37,-.16),rod([-.13,.39,.05],[-.13,.57,.16],.055),rod([.13,.39,.05],[.13,.57,.16],.055)],[0,.7,0]);
 const steering=at(mesh(new THREE.TorusGeometry(.105,.017,8,24),black),0,.51,-.48);steering.scale.y=.65;steering.rotation.x=-.35;part('steering-wheel',[steering,at(mesh(box(.10,.055,.025),metal),0,.51,-.48)],[0,.8,-.2]);
 part('nose',[shape([[-2.72,.045,.205,.025],[-2.58,.095,.23,.055],[-2.25,.115,.285,.08],[-1.90,.14,.32,.10],[-1.65,.16,.33,.13]],red)],[0,.3,-.8]);
 const haloPoints=[[-.29,.65,.14],[-.34,.73,-.19],[0,.73,-.66],[.34,.73,-.19],[.29,.65,.14]].map(p=>new THREE.Vector3(...p));
 part('halo',[mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(haloPoints),48,.024,10,false),black),rod([0,.73,-.66],[0,.48,-.70],.022)],[0,.7,0]);
 part('cover',[shape([[.18,.12,.67,.19],[.38,.18,.66,.25],[.7,.185,.57,.245],[1.08,.14,.44,.20],[1.48,.095,.33,.135],[1.83,.035,.26,.08]],white)],[0,.8,.5]);
 const intake=at(mesh(new THREE.TorusGeometry(.083,.018,10,30),black),0,.81,.155);intake.scale.y=.85;const intakeBack=at(mesh(new THREE.CircleGeometry(.079,30),black),0,.81,.168);intakeBack.rotation.y=Math.PI;part('air-intake',[intake,intakeBack],[0,.8,-.1]);
 for(const side of [-1,1]){
  const pod=shape([[-.48,.17,.43,.13],[-.30,.23,.42,.17],[.05,.24,.38,.18],[.5,.19,.30,.12],[1.05,.105,.245,.075],[1.35,.035,.235,.055]],red);pod.position.x=side*.48;
  const inlet=at(mesh(new THREE.CircleGeometry(.13,32),black),side*.48,.455,-.485);inlet.scale.set(1.22,.65,1);inlet.rotation.y=Math.PI;
  part(`sidepod-${side<0?'left':'right'}`,[pod,inlet],[side*.7,.25,.1]);
  const mirror=at(mesh(new THREE.SphereGeometry(1,16,10),red),side*.61,.62,-.65);mirror.scale.set(.08,.036,.056);part(`mirror-${side<0?'left':'right'}`,[mirror,rod([side*.30,.49,-.60],[side*.61,.60,-.65],.011)],[side*.8,.5,-.2]);
 }
 // Cambered, tapered multi-element profiles, rather than rectangular wing slabs.
 const wing=(span:number,z:number,y:number,chord:number,color:number)=>{
  const vertices:number[]=[],idx:number[]=[],n=32;
  for(const side of [-1,1])for(let i=0;i<n;i++){const a=i/n*2*Math.PI,u=(1-Math.cos(a))/2;vertices.push(side*span/2,y+.045*Math.sin(Math.PI*u)+(Math.sin(a)*.014),z+(u-.5)*chord);}
  for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+i,j,n+j,n+i);}for(let i=1;i<n-1;i++)idx.push(0,i+1,i,n,n+i,n+i+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,color);
 };
 part('front-wing',[wing(1.76,-2.60,.12,.30,black),rod([-.11,.24,-2.48],[-.11,.15,-2.58],.018),rod([.11,.24,-2.48],[.11,.15,-2.58],.018)],[0,.1,-1]);
 part('front-flaps',[wing(1.68,-2.40,.185,.16,black)],[0,.35,-.7]);
 part('front-flap-upper',[wing(1.58,-2.25,.235,.13,black)],[0,.55,-.6]);
 for(const side of [-1,1])part(`front-endplate-${side<0?'left':'right'}`,[at(mesh(box(.025,.16,.47),red),side*.875,.19,-2.49)],[side*.5,.2,-.8]);
 const floor=at(mesh(box(1.46,.025,2.75),black),0,.095,.23);part('floor',[floor,...[-1,1].map(s=>rod([s*.73,.11,-1.04],[s*.73,.11,1.50],.016))],[0,-.06,0]);
 const diffuser=at(mesh(box(1.05,.028,.70),black),0,.18,1.68);diffuser.rotation.x=-.17;part('diffuser',[diffuser,...[-.42,-.21,0,.21,.42].map(x=>at(mesh(box(.012,.15,.55),black),x,.20,1.72))],[0,.1,.75]);
 part('rear-wing',[wing(1.18,1.99,.90,.30,black)],[0,.8,.7]);
 part('rear-flap',[wing(1.18,2.17,1.00,.19,black)],[0,1,.8]);
 part('rear-endplates',[-1,1].map(s=>at(mesh(box(.022,.40,.46),black),s*.60,.83,2.04)),[0,.55,.9]);
 for(const side of [-1,1])part(`rear-support-${side<0?'left':'right'}`,[rod([side*.12,.32,1.66],[side*.12,.90,1.98],.020)],[side*.25,.7,.6]);
 const wheels:{steer:THREE.Group;spin:THREE.Group;front:boolean}[]=[];
 for(const axle of ['front','rear'])for(const side of [-1,1]){
  const front=axle==='front',z=front?D.frontZ:D.rearZ,x=side*(front?D.frontTrack:D.rearTrack)/2,r=D.tireRadius,w=front?.27:.32,id=`${axle}-${side<0?'left':'right'}`;
  const profile=[[.238,-w*.46],[.26,-w/2],[.325,-w/2],[r-.005,-w*.36],[r,-w*.22],[r,w*.22],[r-.005,w*.36],[.325,w/2],[.26,w/2],[.238,w*.46],[.238,-w*.46]].map(p=>new THREE.Vector2(...p));
  const tire=mesh(new THREE.LatheGeometry(profile,64),black);tire.rotation.z=Math.PI/2;tire.position.set(x,r,z);part(`tire-${id}`,[tire],[side*.65,.15,0]);
  const wheel=(radius:number,depth:number,color:number)=>{const m=mesh(new THREE.CylinderGeometry(radius,radius,depth,40),color);m.rotation.z=Math.PI/2;m.position.set(x,r,z);return m;};
  const rings=[-1,1].map(s=>{const ring=at(mesh(new THREE.TorusGeometry(.23,.012,8,40),metal),x+s*w*.38,r,z);ring.rotation.y=Math.PI/2;return ring;});
  const spokes=Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return rod([x+side*w*.38,r,z],[x+side*w*.38,r+.22*Math.cos(a),z+.22*Math.sin(a)],.013,metal);});part(`rim-${id}`,[...rings,...spokes],[side*.85,.15,0]);
  part(`hub-${id}`,[wheel(.06,w+.01,metal)],[side*1.1,.15,0]);
  const nut=wheel(.04,.025,0xc9b78c);nut.position.x=x+side*(w/2+.015);part(`center-lock-${id}`,[nut],[side*1.3,.15,0]);
  const disc=wheel(.165,.022,0x46494a);disc.position.x=x-side*w*.35;part(`disc-${id}`,[disc],[side*.45,.35,0]);
  const bell=wheel(.082,.03,metal);bell.position.x=x-side*w*.40;part(`rotor-bell-${id}`,[bell],[side*.60,.35,0]);
  part(`caliper-${id}`,[at(mesh(box(.07,.13,.07),0x877354),x-side*w*.30,r,z+.13)],[side*.65,.4,.2]);
  const duct=at(mesh(new THREE.TorusGeometry(.047,.013,8,20),black),x-side*.19,r+.10,z-.12);duct.scale.y=1.5;duct.rotation.y=Math.PI;part(`brake-duct-${id}`,[duct,rod([x-side*.19,r+.10,z-.1],[x-side*.12,r,z],.032)],[side*.6,.6,-.2]);
  part(`upright-${id}`,[rod([x-side*.16,.22,z],[x-side*.16,.45,z],.034,metal)],[side*.55,.4,0]);
  for(const [name,y,innerY] of [['upper-wishbone',.44,.43],['lower-wishbone',.22,.19]] as [string,number,number][]){part(`${name}-${id}`,[rod([side*.23,innerY,z-.25],[x-side*.16,y,z]),rod([side*.23,innerY,z+.25],[x-side*.16,y,z])],[side*.45,.35,0]);}
  part(`pushrod-${id}`,[rod([side*.22,.57,z+.08],[x-side*.16,.23,z],.013,metal)],[side*.5,.6,0]);
  part(`link-${id}`,[rod([side*.23,.31,z+.13],[x-side*.16,.32,z+.12],.010,metal)],[side*.5,.45,.2]);
  // Separate steering/spin frames; absolute-distance spin is deterministic on seek.
  const steer=new THREE.Group(),spin=new THREE.Group();steer.position.set(x,r,z);steer.add(spin);group.add(steer);steer.name=`sf26:steer-${id}`;spin.name=`sf26:spin-${id}`;
  for(const key of ['tire','rim','hub','disc','center-lock','rotor-bell','caliper','upright','brake-duct']){const p=parts.get(`sf26:${key}-${id}`)!;const parent=['caliper','upright','brake-duct'].includes(key)?steer:spin;parent.add(p);p.position.set(-x,-r,-z);p.userData.base=p.position.clone();}
  wheels.push({steer,spin,front});
 }
 const update:CarRig['update']=(_setup,e,selected,hover,hidden,isolate,transparent,dt)=>{
  const sel=typeof selected==='string'?new Set([selected]):selected,iso=typeof isolate==='string'?new Set([isolate]):isolate;
  for(const [id,p] of parts){const target=(p.userData.base as THREE.Vector3).clone().addScaledVector(p.userData.explode,e);p.position.lerp(target,1-Math.exp(-12*dt));p.visible=!hidden.has(id)&&(!iso||iso.has(id));p.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshPhysicalMaterial;m.emissive.setHex(sel.has(id)?0xff4f14:id===hover?0x59432b:0);m.emissiveIntensity=.28;m.transparent=ghost||transparent;m.opacity=ghost?.24:transparent&&!sel.has(id)?.23:1;m.depthWrite=!ghost&&!transparent;}});}
 };
 if(parts.size!==SF26_CATALOG.summary.geometryBacked)throw Error('SF-26 catalog/geometry mismatch');
 return {group,parts,update,drive:(distance,steering)=>{for(const w of wheels){w.steer.rotation.y=w.front?steering:0;w.spin.rotation.x=-distance/D.tireRadius;}},attitude:()=>{}};
}
