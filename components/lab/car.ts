import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {PARTS} from '@/lib/components';
import type {Setup} from '@/lib/sim/setup';
import type {SuspensionSample} from '@/lib/sim/suspension';
const orange=0xb50817,carbon=0x181a1c,silver=0x7b8792;
function loft(stations:number[][]){
 const original=stations;stations=[];for(let j=0;j<original.length-1;j++)for(let step=0;step<5;step++){const t=step/5,a=original[Math.max(0,j-1)],b=original[j],c=original[j+1],d=original[Math.min(original.length-1,j+2)];stations.push(b.map((v,k)=>k===0?v+(c[k]-v)*t:.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t)));}stations.push(original.at(-1)!);
 const pos:number[]=[],uv:number[]=[],idx:number[]=[],n=40;stations.forEach(([z,w,y,h])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pos.push(Math.cos(a)*w,y+Math.sin(a)*h,z);uv.push(i/n*2*Math.PI*Math.max(w,h),z);}});for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;idx.push(a,c,b,b,c,d);}for(let i=1;i<n-1;i++){idx.push(0,i,i+1);const b=(stations.length-1)*n;idx.push(b,b+i+1,b+i);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}g.setIndex(idx);g.computeVertexNormals();return g;}
function rod(a:number[],b:number[],r=.022){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10));mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
export type CarRig={group:THREE.Group;parts:Map<string,THREE.Group>;attitude:(sample?:SuspensionSample)=>void;drive:(distance:number,steer:number)=>void;update:(s:Setup,explode:number,selected:string|Set<string>,hover:string,hidden:Set<string>,isolate:string|Set<string>|null,transparent:boolean,dt:number)=>void};
export function createCar(ghost=false):CarRig{
 const group=new THREE.Group(),parts=new Map<string,THREE.Group>();
 const wheels:{front:boolean;side:number;steering:THREE.Group;tilt:THREE.Group;spin:THREE.Group;profile:THREE.Vector2[];camber:number}[]=[],profiles=new Map<string,THREE.Vector2[]>(),wheelParts=new Set<string>();
 const weaveData=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=((Math.floor(x/4)+Math.floor(y/4))%2?85:130)+Math.round(12*Math.sin((x+y)*Math.PI/2));weaveData.set([v,v,v,255],i);}const weave=new THREE.DataTexture(weaveData,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(12,12);weave.generateMipmaps=true;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.magFilter=THREE.LinearFilter;weave.anisotropy=4;weave.needsUpdate=true;
 const mat=(color:number)=>new THREE.MeshPhysicalMaterial({color:ghost?0x8fe8e4:color,roughness:color===carbon?.48:color===silver?.32:color===0x101214?.88:.28,metalness:[silver,0x8c9195,0x73777b,0x666e74,0x93836b].includes(color)?.8:0,clearcoat:color===orange?.65:color===carbon?.12:0,clearcoatRoughness:.28,bumpMap:color===carbon?weave:null,bumpScale:.0003,transparent:ghost,opacity:ghost?.25:1});
 const part=(id:string,color:number,mesh:THREE.Mesh|THREE.Mesh[],position=[0,0,0],explode?:number[])=>{const g=new THREE.Group();g.position.set(...position as [number,number,number]);for(const m of Array.isArray(mesh)?mesh:[mesh]){m.material=mat(color);m.castShadow=!ghost;m.receiveShadow=true;m.userData.partId=id;g.add(m);}g.userData.base=g.position.clone();g.userData.explode=new THREE.Vector3(...(explode??[Math.sign(position[0])*.8,.5,Math.sign(position[2])*.8]) as [number,number,number]);parts.set(id,g);group.add(g);return g;};
 const box=(x:number,y:number,z:number)=>new THREE.Mesh(new THREE.BoxGeometry(x,y,z));
 const cyl=(radius:number,width:number)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,40));m.rotation.z=Math.PI/2;return m;};
 // All geometry below is an original referenced reconstruction, never factory CAD.
 const wing=(span:number,chord:number,thickness=.025)=>new THREE.Mesh(loft([[-chord*.5,span*.5,0,.002],[-chord*.36,span*.5,.004,thickness],[-chord*.05,span*.5,.008,thickness*.7],[chord*.5,span*.5,.012,.002]]));
 const ring=(r:number,tube:number)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,12,64));m.rotation.y=Math.PI/2;return m;};
 part('front-main',0xe7e7df,wing(1.38,.38),[0,.16,-2.08],[0,.12,-1.35]);
 part('front-flap',orange,wing(1.36,.18,.018),[0,.23,-1.99],[0,.55,-1.1]);
 for(const side of [-1,1])part(`front-end-${side<0?'left':'right'}`,orange,new THREE.Mesh(loft([[-.24,.014,0,.10],[.18,.014,.025,.13],[.24,.014,.01,.08]])),[side*.705,.20,-2.06],[side*.8,.2,-.8]);
 part('rear-main',0xe7e7df,wing(.98,.31),[0,.80,1.98],[0,1,1]);
 part('rear-flap',orange,wing(.98,.21),[0,.91,2.05],[0,1.5,1.4]);
 for(const side of [-1,1])part(`rear-end-${side<0?'left':'right'}`,orange,box(.018,.37,.50),[side*.51,.77,1.98],[side*.6,.9,.9]);
 part('rear-pylon',carbon,[rod([-.25,.24,1.70],[-.25,.80,1.99],.015),rod([.25,.24,1.70],[.25,.80,1.99],.015),box(.8,.02,.12)],[0,0,0],[0,.8,.6]);
 part('floor',carbon,new THREE.Mesh(loft([[-1.24,.28,0,.008],[-.65,.66,0,.009],[.1,.69,0,.009],[.8,.65,0,.009],[1.62,.49,.02,.01]])),[0,.045,0],[0,-.25,0]);
 const diffuser=part('diffuser',carbon,box(.98,.016,.58),[0,.15,1.40],[0,-.1,1]);diffuser.rotation.x=-.19;
 for(let i=0;i<4;i++)part(`fence-${i}`,carbon,box(.012,.10,.55),[(i-1.5)*.25,.15,1.4],[(i-1.5)*.3,-.2,1.1]);
 // The open tub is assembled from a lower shell and two sides, leaving real access to the seat.
 const tub=[new THREE.Mesh(loft([[-1.2,.19,.34,.105],[-.8,.26,.32,.12],[-.35,.31,.28,.08],[.35,.28,.28,.08],[.55,.23,.30,.12]]))];
 for(const side of [-1,1]){const wall=new THREE.Mesh(loft([[-.8,.06,.44,.07],[-.4,.065,.44,.12],[.25,.055,.44,.12],[.55,.07,.42,.10]]));wall.position.x=side*.26;tub.push(wall);}part('tub',orange,tub,[0,0,0],[0,.22,0]);
 part('nose',orange,new THREE.Mesh(loft([[-2.24,.065,.30,.035],[-2.02,.075,.35,.047],[-1.7,.10,.40,.06],[-1.4,.14,.44,.075],[-1.1,.20,.46,.09],[-.80,.25,.43,.105]])),[0,0,0],[0,.35,-.95]);
 // White upper nose paint is a mesh within the same selectable assembly.
 const noseStripe=new THREE.Mesh(loft([[-2.18,.045,.332,.004],[-1.8,.059,.403,.004],[-1.4,.070,.511,.004],[-1.05,.085,.548,.004]]),mat(0xf1f0e7));noseStripe.userData.partId='nose';parts.get('nose')!.add(noseStripe);
 const surround=new THREE.Mesh(new THREE.TorusGeometry(.25,.024,10,64));surround.rotation.x=Math.PI/2;surround.scale.set(1,1.65,1);part('cockpit',carbon,surround,[0,.56,-.07],[0,.75,0]);
 const seat=box(.26,.26,.27);seat.rotation.x=-.25;part('seat',0x161718,[seat,rod([-.12,.16,-.25],[.12,.16,-.25],.025)],[0,.37,.12],[0,1.3,0]);
 const mirrors:THREE.Mesh[]=[];for(const side of [-1,1]){mirrors.push(rod([side*.28,.53,-.39],[side*.43,.60,-.42],.009));const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,12));m.scale.set(.085,.038,.045);m.position.set(side*.44,.61,-.42);mirrors.push(m);}part('halo',orange,mirrors,[0,0,0],[0,1.1,0]);
 part('engine-cover',orange,new THREE.Mesh(loft([[.26,.11,.65,.21],[.40,.16,.65,.27],[.60,.18,.61,.27],[.90,.16,.49,.20],[1.22,.105,.35,.13],[1.52,.055,.28,.07]])),[0,0,0],[0,1.4,.3]);
 const intake=new THREE.Mesh(new THREE.TorusGeometry(.071,.018,12,40));intake.scale.y=1.18;part('airbox',carbon,intake,[0,.85,.31],[0,1.7,.2]);
 for(const side of [-1,1]){const name=side<0?'left':'right';part(`sidepod-${name}`,orange,new THREE.Mesh(loft([[-.48,.12,.40,.13],[-.34,.21,.41,.15],[-.1,.255,.37,.16],[.23,.25,.31,.14],[.6,.19,.25,.11],[1.02,.10,.21,.065],[1.28,.035,.19,.03]])),[side*.43,0,0],[side*1.15,.45,.1]);
 const vent=new THREE.Mesh(new THREE.PlaneGeometry(.29,.16),mat(0x08090a));vent.position.set(side*.01,.42,-.483);vent.rotation.y=Math.PI;vent.userData.partId=`sidepod-${name}`;parts.get(`sidepod-${name}`)!.add(vent);
 const fins:THREE.Mesh[]=[];for(let i=0;i<18;i++){const m=box(.19,.006,.42);m.position.y=(i-9)*.013;fins.push(m);}part(`radiator-${name}`,silver,fins,[side*.45,.34,.08],[side*1.1,.8,.1]);}
 for(const axle of ['front','rear'])for(const side of [-1,1]){
 const name=side<0?'left':'right',id=`${axle}-${name}`,z=axle==='front'?-1.50:1.55,x=side*(axle==='front'?.735:.7025),width=axle==='front'?.27:.325,r=.33;
 // Revolved tire profile: genuine hollow sidewalls, rounded shoulders and four recessed grooves.
 const profile:THREE.Vector2[]=[];const push=(radius:number,y:number)=>profile.push(new THREE.Vector2(radius,y));push(.168,-width/2);push(.24,-width/2);push(.303,-width/2+.012);push(r,-width/2+.035);
 for(let i=0;i<=64;i++){const y=-width/2+.04+i/64*(width-.08);const groove=[-.075,-.025,.025,.075].some(g=>Math.abs(y-g)<.0045);push(groove?r-.009:r,y);}push(.303,width/2-.012);push(.24,width/2);push(.168,width/2);push(.168,-width/2);
 profiles.set(id,profile);const tire=new THREE.Mesh(new THREE.LatheGeometry(profile,80));tire.rotation.z=Math.PI/2;part(`tire-${id}`,0x101214,tire,[x,r,z],[side*1.1,.2,Math.sign(z)*.35]);
 const rimMeshes:THREE.Mesh[]=[];for(const offset of [-width/2+.02,width/2-.02]){const lip=ring(.161,.008);lip.position.x=offset;rimMeshes.push(lip);}const hub=cyl(.041,.08);rimMeshes.push(hub);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;rimMeshes.push(rod([side*width*.35,Math.cos(a)*.043,Math.sin(a)*.043],[side*width*.40,Math.cos(a)*.153,Math.sin(a)*.153],.012));}part(`rim-${id}`,silver,rimMeshes,[x,r,z],[side*1.65,.2,Math.sign(z)*.35]);
 part(`disc-${id}`,0x464c50,cyl(.137,.023),[x-side*.025,r,z],[side*2.05,.2,Math.sign(z)*.35]);
 part(`caliper-${id}`,0x93836b,box(.075,.12,.07),[x-side*.03,r,z+.12],[side*2.4,.3,Math.sign(z)*.35]);
 for(const kind of ['upper','lower']){const y=kind==='upper'?.43:.21;part(`${id}-${kind}`,carbon,[rod([side*.23,y,z-.25],[side*.67,y,z],.013),rod([side*.23,y,z+.25],[side*.67,y,z],.013)],[0,0,0],[side*.5,kind==='upper'?.85:.25,Math.sign(z)*.5]);}
 part(`${id}-pushrod`,silver,rod([side*.25,.54,z+.06],[side*.67,.21,z],.011),[0,0,0],[side*.6,1.1,Math.sign(z)*.5]);
 }
 const engine:THREE.Mesh[]=[box(.25,.16,.52)];for(const side of [-1,1])for(let i=0;i<5;i++){const m=cyl(.053,.19);m.position.set(side*.115,.09,(i-2)*.098);m.rotation.z=side*.77;engine.push(m);const trumpet=new THREE.Mesh(new THREE.CylinderGeometry(.029,.021,.07,16));trumpet.position.set(side*.08,.22,(i-2)*.098);engine.push(trumpet);}part('engine',silver,engine,[0,.29,.81],[0,1.3,.8]);
 part('gearbox',silver,new THREE.Mesh(loft([[-.27,.14,0,.13],[.0,.11,0,.12],[.25,.085,0,.08]])),[0,.27,1.4],[0,.6,1.4]);
 part('battery',0x4c6670,box(.20,.06,.14),[0,.17,.22],[0,.6,.1]);
 part('fuel-cell',0x5c6053,box(.33,.27,.20),[0,.35,.39],[0,.9,.2]);
 const tube=(points:number[][],radius:number)=>new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,10,false));
 const washer=(radius:number,inner:number,width:number)=>{const shape=new THREE.Shape();shape.absarc(0,0,radius,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);const m=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,curveSegments:40}));m.rotation.y=Math.PI/2;m.position.x=-width/2;return m;};
 for(const axle of ['front','rear'])for(const side of [-1,1]){const name=side<0?'left':'right',id=`${axle}-${name}`,z=axle==='front'?-1.50:1.55,x=side*(axle==='front'?.735:.7025);
 const carrier=[rod([0,-.115,0],[0,.10,0],.027),rod([0,-.09,0],[0,0,.08],.02),rod([0,.09,0],[0,0,.08],.02),cyl(.055,.07)];part(`upright-${id}`,silver,carrier,[x-side*.09,.33,z],[side*1.9,.5,Math.sign(z)*.4]);
 const nut=new THREE.Mesh(new THREE.CylinderGeometry(.031,.031,.033,6));nut.rotation.z=Math.PI/2;nut.position.x=side*.16;part(`hub-${id}`,0x8c9195,[cyl(.037,.27),nut],[x,.33,z],[side*2.25,.3,Math.sign(z)*.4]);
 part(`damper-${id}`,silver,[rod([0,0,-.10],[0,0,.06],.025),rod([0,0,.06],[0,0,.15],.011)],[side*.16,.48,z+.06],[side*.45,1.3,Math.sign(z)*.35]);
 const bell=box(.065,.015,.11);bell.rotation.y=side*.45;part(`rocker-${id}`,0x73777b,[bell,rod([0,-.04,0],[0,-.22,0],.01)],[side*.24,.54,z+.06],[side*.7,1.1,Math.sign(z)*.4]);
 part(`tie-${id}`,carbon,rod([side*.2,.30,z-.1],[side*.67,.33,z-.09],.009),[0,0,0],[side*.5,.45,Math.sign(z)*.5]);
 const duct=new THREE.Mesh(loft([[-.10,.055,0,.065],[0,.045,0,.055],[.13,.02,-.02,.03]]));part(`duct-${id}`,carbon,duct,[x-side*.18,.34,z-.08],[side*1.3,.7,Math.sign(z)*.4]);
 part(`bearing-${id}`,silver,[ring(.059,.009),ring(.048,.007)],[x-side*.08,.33,z],[side*2.1,.6,Math.sign(z)*.4]);
 part(`bell-${id}`,0x666e74,washer(.073,.035,.016),[x-side*.025,.33,z],[side*2.2,.35,Math.sign(z)*.4]);
 part(`bridge-${id}`,0x93836b,box(.095,.025,.04),[x-side*.03,.40,z+.12],[side*2.5,.6,Math.sign(z)*.4]);
 part(`arm-${id}`,silver,rod([0,0,0],[-side*.035,0,-.095],.012),[x-side*.09,.33,z],[side*1.7,.65,Math.sign(z)*.4]);
 // Replace filled brake discs by two annular friction faces and radial ventilation vanes.
 const discGroup=parts.get(`disc-${id}`)!;for(const child of [...discGroup.children]){discGroup.remove(child);if(child instanceof THREE.Mesh){child.geometry.dispose();(child.material as THREE.Material).dispose();}}
 const faces:THREE.Mesh[]=[washer(.137,.046,.003),washer(.137,.046,.003)];faces[0].position.x-=.0125;faces[1].position.x+=.0125;
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,m=box(.022,.082,.003);m.position.set(0,Math.cos(a)*.091,Math.sin(a)*.091);m.rotation.x=a;faces.push(m);}for(const m of faces){m.material=mat(0x464c50);m.userData.partId=`disc-${id}`;discGroup.add(m);}
 }
 const steering=[new THREE.Mesh(new THREE.TorusGeometry(.105,.015,10,36,Math.PI*1.7)),box(.14,.035,.014)];steering[0].scale.y=.72;for(const side of [-1,1]){const grip=box(.035,.09,.027);grip.position.x=side*.095;steering.push(grip);}const wheel=part('steering-wheel',carbon,steering,[0,.51,-.38],[0,.9,-.3]);wheel.rotation.x=-.35;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.075,.026),new THREE.MeshPhysicalMaterial({color:0x536856,roughness:.17,metalness:.05,clearcoat:.7}));screen.position.set(0,.025,.016);screen.userData.partId='steering-wheel';wheel.add(screen);
 part('steering-column',silver,rod([0,.50,-.38],[0,.31,-1.56],.012),[0,0,0],[0,.65,-.6]);
 part('steering-rack',silver,rod([-.23,.3,-1.6],[.23,.3,-1.6],.025),[0,0,0],[0,.45,-.9]);
 part('differential',silver,cyl(.105,.22),[0,.29,1.55],[0,.65,1.45]);
 for(const side of [-1,1]){const name=side<0?'left':'right';part(`driveshaft-${name}`,silver,[rod([side*.11,.29,1.55],[side*.64,.33,1.55],.014),rod([side*.57,.325,1.55],[side*.66,.33,1.55],.03)],[0,0,0],[side*.8,.65,1]);
 const head:THREE.Mesh[]=[box(.12,.055,.49)];for(let i=0;i<5;i++){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.012,6));bolt.position.set(0,.03,(i-2)*.1);head.push(bolt);}part(`head-${name}`,0x666e74,head,[side*.18,.43,.81],[side*.5,1.7,.6]);
 const pipes:THREE.Mesh[]=[];for(let i=0;i<5;i++){const z=.61+i*.10;pipes.push(tube([[side*.21,.34,z],[side*.30,.30,z],[side*.36,.26,.98],[side*.35,.33,1.16],[side*.33,.51,1.22]],.018));}const exhaust=part(`exhaust-${name}`,0x806b56,pipes,[0,0,0],[side*.9,.9,.8]);exhaust.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshPhysicalMaterial;m.metalness=.9;m.roughness=.48;m.color.setHex(0xffffff);m.vertexColors=true;const position=o.geometry.getAttribute('position'),colors=[];for(let i=0;i<position.count;i++){const t=Math.max(0,Math.min(1,(position.getZ(i)-.7)/.55));const color=new THREE.Color(0xa4977b).lerp(new THREE.Color(0x626879),t*.7);colors.push(color.r,color.g,color.b);}o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}});
 const board=new THREE.Mesh(loft([[-.3,.012,0,.10],[0,.013,.03,.17],[.28,.012,.0,.10]]));part(`bargeboard-${name}`,carbon,board,[side*.43,.22,-.82],[side*.9,.25,-.4]);
 }
 // Batch geometry within each selectable part/material; keep component boundaries intact.
 for(const [id,assembly] of parts){const batches=new Map<string,THREE.Mesh[]>();for(const child of assembly.children){if(!(child instanceof THREE.Mesh))continue;const material=child.material as THREE.MeshPhysicalMaterial,key=[material.color.getHex(),material.roughness,material.metalness,material.clearcoat,material.bumpMap?.uuid].join(':');const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch);}
 for(const meshes of batches.values()){if(meshes.length<2)continue;const material=meshes[0].material;const geometries=meshes.map(m=>{m.updateMatrix();let g=m.geometry.clone();g.applyMatrix4(m.matrix);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));return g;});const combined=mergeGeometries(geometries,false);if(combined){const mesh=new THREE.Mesh(combined,material);mesh.castShadow=!ghost;mesh.receiveShadow=true;mesh.userData.partId=id;meshes.forEach(m=>{assembly.remove(m);m.geometry.dispose();if(m.material!==material)(m.material as THREE.Material).dispose();});assembly.add(mesh);}geometries.forEach(g=>g.dispose());}}
 // Wheel assemblies share steering/camber pivots; only rotating members enter spin.
 for(const axle of ['front','rear'])for(const side of [-1,1]){
 const id=`${axle}-${side<0?'left':'right'}`,center=new THREE.Vector3(side*(axle==='front'?.735:.7025),.33,axle==='front'?-1.50:1.55);
 const steering=new THREE.Group(),tilt=new THREE.Group(),spin=new THREE.Group();steering.position.copy(center);group.add(steering);steering.add(tilt);tilt.add(spin);
 for(const prefix of ['tire','rim','disc','hub','upright','caliper','duct','bearing','bell','bridge','arm']){
 const partId=`${prefix}-${id}`,g=parts.get(partId)!;const rotates=['tire','rim','disc','hub','bell'].includes(prefix);
 (rotates?spin:tilt).add(g);g.position.sub(center);g.userData.base=g.position.clone();wheelParts.add(partId);
 }
 wheels.push({front:axle==='front',side,steering,tilt,spin,profile:profiles.get(id)!,camber:NaN});
 }
 // Sprung body moves relative to road-supported wheel pivots; no tire or damper dynamics.
 const body=new THREE.Group();body.name='derived-sprung-body';group.add(body);
 for(const [id,g] of parts)if(!wheelParts.has(id))body.add(g);
 const attitude:CarRig['attitude']=(sample)=>{
 body.position.y=sample?-sample.heaveMM/1000:0;
 body.rotation.set(sample?sample.pitchDeg*Math.PI/180:0,0,sample?sample.rollDeg*Math.PI/180:0);
 };
 let currentSetup:Setup;
 const drive:CarRig['drive']=(distance,steer)=>{for(const w of wheels){
 w.spin.rotation.x=-distance/.33;
 w.steering.rotation.y=(w.front?steer+w.side*(currentSetup?.toe??0)*Math.PI/180:0);
 }};
 const update:CarRig['update']=(s,e,sel,hover,hidden,isolate,transparent,dt)=>{
 const selectedIds=typeof sel==='string'?new Set(sel?[sel]:[]):sel,isolateIds=typeof isolate==='string'?new Set(isolate?[isolate]:[]):isolate;
 attitude();currentSetup=s;for(const w of wheels){const a=w.side*s.camber*Math.PI/180;w.tilt.rotation.z=a;if(w.camber!==a){w.camber=a;w.steering.position.y=Math.max(...w.profile.map(p=>p.x*Math.cos(a)+Math.abs(p.y*Math.sin(a))));}}drive(0,0);
 for(const [id,g] of parts){const b=(g.userData.base as THREE.Vector3).clone(),off=g.userData.explode as THREE.Vector3;b.addScaledVector(off,e);if(!wheelParts.has(id))b.y+=(s.rideHeight-35)/1000;g.position.lerp(b,1-Math.exp(-dt*12));g.visible=!hidden.has(id)&&(!isolateIds||isolateIds.has(id));
 if(id==='front-flap')g.rotation.x=-s.frontWing*Math.PI/180;
 if(id==='rear-flap')g.rotation.x=-s.rearWing*Math.PI/180;

 g.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;const selected=selectedIds.has(id),over=id===hover;m.emissive.setHex(selected?0xff4f14:over?0x59432b:0);m.emissiveIntensity=selected?.28:over?.3:0;m.transparent=ghost||transparent;m.opacity=ghost?.38:transparent&&!selected?.23:1;m.depthWrite=!ghost&&!(transparent&&!selected);}});
 }
 };
 if(parts.size!==PARTS.length)throw new Error('Component catalog and geometry mismatch');
 return {group,parts,update,drive,attitude};
}
