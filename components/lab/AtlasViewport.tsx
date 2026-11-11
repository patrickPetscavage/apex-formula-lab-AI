'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {atlasTrack,type AtlasCircuit} from '@/lib/circuitAtlas';
import {bounds} from '@/lib/sim/track';
import {sampleMotion} from '@/lib/sim/motion';
import type {Lap} from '@/lib/sim/physics';
import type {Setup} from '@/lib/sim/setup';
import {roadFrame} from '@/lib/geospatial';
import {createCar,type CarRig} from './car';
import {createSF26} from './sf26Car';
import {realisticCircuit} from './realisticCircuit';
import {rendererStyle,studioEnvironment,circuitLights,type RenderQuality} from './sceneStyle';
export type AtlasGhost={id:string;name:string;color:string;setup:Setup;lap:Lap};
type Props={circuit:AtlasCircuit;ghosts:AtlasGhost[];vehicleId:'f2004'|'sf26';getTime:()=>number;camera:string;follow:string;quality:RenderQuality;revision:number};
export default function AtlasViewport(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const [error,setError]=useState(''),[metrics,setMetrics]=useState({frame:0,p95:0,draws:0,triangles:0,textures:0,geometries:0});
 useEffect(()=>{const el=host.current;if(!el)return;let renderer:THREE.WebGLRenderer;setError('');try{renderer=new THREE.WebGLRenderer({antialias:props.quality!=='economy',powerPreference:'high-performance'});}catch{setError('WebGL is unavailable. Circuit geography, sources and numerical simulation remain available below.');return;}
 rendererStyle(renderer,props.quality);renderer.setSize(el.clientWidth,el.clientHeight);renderer.domElement.setAttribute('aria-label','2026 circuit and physics ghost replay');el.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),environment=studioEnvironment(scene,renderer,true),sun=circuitLights(scene,props.quality),path=atlasTrack(props.circuit),b=bounds(path),world=realisticCircuit({id:props.circuit.id,track:path,bounds:b,atlas:props.circuit,quality:props.quality});scene.add(world.group);world.line.visible=false;
 const camera=new THREE.PerspectiveCamera(45,el.clientWidth/Math.max(1,el.clientHeight),.1,24000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.495;controls.minDistance=2;controls.maxDistance=12000;
 const rigs=new Map<string,CarRig>();let ghostSet=props.ghosts,active=true,frame=0,last=performance.now(),sampleAt=last,revision=-1,mode='',previousTime=-1,follow='',samples:number[]=[];
 const createRigs=()=>{for(const rig of rigs.values()){scene.remove(rig.group);disposeTree(rig.group);}rigs.clear();for(const ghost of latest.current.ghosts){const rig=latest.current.vehicleId==='sf26'?createSF26():createCar();rig.update(ghost.setup,0,'','',new Set(),null,false,1);rig.group.traverse(o=>{if(o instanceof THREE.Mesh){const mat=o.material as THREE.MeshPhysicalMaterial;if(mat.color.r>.25&&mat.color.r>mat.color.g*2.5)mat.color.set(ghost.color);}});scene.add(rig.group);rigs.set(ghost.id,rig);}ghostSet=latest.current.ghosts;};createRigs();
 const resize=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();revision=-1;});resize.observe(el);
 const lost=(e:Event)=>{e.preventDefault();setError('Graphics context lost. Change quality or reload to restore the scene; your numerical snapshots are retained.');};renderer.domElement.addEventListener('webglcontextlost',lost);
 const tick=()=>{if(!active)return;const now=performance.now(),rawDelta=(now-last)/1000,dt=Math.min(.1,rawDelta),p=latest.current,time=p.getTime(),changed=p.revision!==revision||p.camera!==mode||p.follow!==follow,seek=Math.abs(time-previousTime)>1;last=now;previousTime=time;
 if(ghostSet!==p.ghosts)createRigs();
 let followed:ReturnType<typeof sampleMotion>|null=null;
 for(const ghost of p.ghosts){const s=sampleMotion(ghost.lap,Math.min(time,ghost.lap.lapTime)),rig=rigs.get(ghost.id)!;rig.drive(s.s,s.steer);rig.group.position.set(s.x,s.y,s.z);rig.group.rotation.set(s.pitch,s.heading+Math.PI,0,'YXZ');if(ghost.id===p.follow||!followed)followed=s;}
 if(changed){revision=p.revision;mode=p.camera;follow=p.follow;controls.enabled=!p.ghosts.length||p.camera==='orbit'||p.camera==='overview';if(controls.enabled){const centre=new THREE.Vector3(b.minX+b.width/2,path[0].y,b.minZ+b.height/2),height=Math.max(b.width/camera.aspect,b.height)*1.45;camera.position.copy(centre).add(new THREE.Vector3(0,height,p.camera==='orbit'?height*.45:1));controls.target.copy(centre);}camera.fov=p.camera==='onboard'?64:45;camera.updateProjectionMatrix();}
 if(followed&&!controls.enabled){const s=followed,d=new THREE.Vector3(Math.sin(s.heading)*Math.cos(s.pitch),Math.sin(s.pitch),Math.cos(s.heading)*Math.cos(s.pitch)),base=new THREE.Vector3(s.x,s.y,s.z),onboard=p.camera==='onboard',desired=base.clone().addScaledVector(d,onboard?-.15:-11).add(new THREE.Vector3(0,onboard?.76:3.3,0));
  if(p.camera==='trackside'){const index=Math.floor(s.i/90)*90,q=path[(index+50)%path.length],r=path[(index+51)%path.length],f=roadFrame(q,r);desired.set(q.x+f.right.x*28,q.y+3.5,q.z+f.right.z*28);camera.position.copy(desired);camera.lookAt(base.clone().add(new THREE.Vector3(0,.5,0)));}
  else{if(changed||seek||onboard)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(base.clone().addScaledVector(d,onboard?35:10).add(new THREE.Vector3(0,.7,0)));}
  sun.position.copy(base).add(new THREE.Vector3(-120,230,-180));sun.target.position.copy(base);
 }else controls.update();
 renderer.render(scene,camera);if(rawDelta<1)samples.push(rawDelta*1000);if(now-sampleAt>1200&&samples.length){const ordered=[...samples].sort((a,b)=>a-b);setMetrics({frame:samples.reduce((a,b)=>a+b,0)/samples.length,p95:ordered[Math.floor(ordered.length*.95)],draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries});samples=[];sampleAt=now;}frame=requestAnimationFrame(tick);};tick();
 return()=>{active=false;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);disposeTree(scene);environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[props.circuit,props.quality,props.vehicleId]);
 return <div className="atlas-viewport" ref={host}>{error&&<div className="viewport-error" role="alert">{error}</div>}<output className="atlas-render-stats" aria-label="Live scene performance">{metrics.frame.toFixed(1)} ms average · {metrics.p95.toFixed(1)} ms p95 · {metrics.draws} draws · {(metrics.triangles/1000).toFixed(0)}k triangles · {metrics.textures} textures / {metrics.geometries} geometries</output></div>;
}
function disposeTree(root:THREE.Object3D){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
