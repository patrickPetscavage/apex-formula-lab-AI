'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {referenceTrack,bounds,type CircuitId} from '@/lib/sim/track';
import {type GhostResult} from '@/lib/racePrediction';
import {ghostPath,sampleGhostMotion} from '@/lib/ghostMotion';
import {realisticCircuit} from './realisticCircuit';
import {rendererStyle,studioEnvironment,circuitLights,type RenderQuality} from './sceneStyle';
import {batchReplayRig} from './replayRig';
import {createSF26} from './sf26Car';
import {SF26_DEFAULT} from '@/lib/sim/sf26Model';
import landmarks from '@/lib/sim/data/suzuka-landmarks.json';
type Props={circuitId:CircuitId;ghosts:GhostResult[];getTime:()=>number;camera:string;follow:string;quality:RenderQuality;racingLine:boolean};
export default function PredictionReplay(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;const [error,setError]=useState('');
 useEffect(()=>{const el=host.current;if(!el)return;let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({antialias:props.quality!=='economy',powerPreference:'high-performance'});}catch{setError('WebGL is unavailable. Choose Lightweight map above to keep using replay.');return;}
 setError('');rendererStyle(renderer,props.quality);renderer.setSize(el.clientWidth,el.clientHeight);renderer.domElement.setAttribute('aria-label','Illustrative predicted ghost replay');el.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),environment=studioEnvironment(scene,renderer,true),sun=circuitLights(scene,props.quality),path=referenceTrack(props.circuitId),b=bounds(path),total=path.reduce((s,p)=>s+p.ds,0),world=realisticCircuit({id:props.circuitId,track:path,bounds:b,quality:props.quality,landmarks:props.circuitId==='suzuka'?landmarks:undefined});scene.add(world.group);world.line.visible=false;const racing=ghostPath(props.circuitId),linePoints=racing.nodes.map(n=>new THREE.Vector3(n.x,n.y+.055,n.z));linePoints.push(linePoints[0]);const lineOverlay=new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineBasicMaterial({color:0x63e3cf,transparent:true,opacity:.8,depthWrite:false}));scene.add(lineOverlay);scene.traverse(o=>{if((o as THREE.Object3D&{isSky?:boolean}).isSky)o.scale.setScalar(30000);});const horizonGround=new THREE.Mesh(new THREE.PlaneGeometry(26000,26000),new THREE.MeshStandardMaterial({color:0x586c3e,roughness:1}));horizonGround.rotation.x=-Math.PI/2;horizonGround.position.set(b.minX+b.width/2,Math.min(...path.map(p=>p.y))-50,b.minZ+b.height/2);scene.add(horizonGround);
 const camera=new THREE.PerspectiveCamera(45,el.clientWidth/Math.max(el.clientHeight,1),.1,50000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.495;controls.minDistance=2;controls.maxDistance=14000;
 // Reference geometry only. No physics model is run or implied by predicted lap times.
 const rigs=props.ghosts.map(ghost=>{const rig=createSF26();rig.update(SF26_DEFAULT,0,'','',new Set(),null,false,1);rig.group.traverse(o=>{if(o instanceof THREE.Mesh)for(const mat of Array.isArray(o.material)?o.material:[o.material]){const m=mat as THREE.MeshStandardMaterial;if(m.color&&m.color.r>.25&&m.color.r>m.color.g*2.5)m.color.set(ghost.setting.color);}});batchReplayRig(rig.group);scene.add(rig.group);return {ghost,rig};});
 let frame=0,active=true,last=performance.now(),lastMode='',lastFollow='',previousTime=-1;
 const resize=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();lastMode='';});resize.observe(el);
 const lost=(e:Event)=>{e.preventDefault();setError('Graphics context lost. Choose Lightweight map above; the model and results are retained.');};renderer.domElement.addEventListener('webglcontextlost',lost);
 const tick=()=>{if(!active)return;const p=latest.current,now=performance.now(),dt=Math.min(.1,(now-last)/1000),time=p.getTime(),changed=p.camera!==lastMode||p.follow!==lastFollow,seek=Math.abs(time-previousTime)>Math.max(2,dt*128);lineOverlay.visible=p.racingLine;last=now;previousTime=time;
  let followed:ReturnType<typeof sampleGhostMotion>|null=null;
  for(const {ghost,rig} of rigs){const sample=sampleGhostMotion(ghost,time,p.circuitId),point=sample;rig.group.position.set(point.x,point.y,point.z);rig.group.rotation.set(point.frame.pitch,point.frame.yaw,0,'YXZ');rig.drive(sample.wheelDistance,sample.steer);if(ghost.setting.id===p.follow||!followed)followed=point;}
  if(changed){lastMode=p.camera;lastFollow=p.follow;controls.enabled=p.camera==='orbit'||p.camera==='overview';camera.fov=p.camera==='onboard'?64:45;camera.updateProjectionMatrix();if(controls.enabled){const centre=new THREE.Vector3(b.minX+b.width/2,path[0].y,b.minZ+b.height/2),height=Math.max(b.width/camera.aspect,b.height)*1.55;controls.target.copy(centre);camera.position.copy(centre).add(new THREE.Vector3(0,height,p.camera==='orbit'?height*.4:1));}}
  if(followed){const point=followed,base=new THREE.Vector3(point.x,point.y,point.z),direction=new THREE.Vector3(point.frame.forward.x,Math.tan(point.frame.pitch),point.frame.forward.z).normalize();sun.position.copy(base).add(new THREE.Vector3(-100,160,-100));sun.target.position.copy(base);
   if(!controls.enabled){const onboard=p.camera==='onboard',desired=base.clone().addScaledVector(direction,onboard?-.15:-11).add(new THREE.Vector3(0,onboard?.76:3.4,0));if(p.camera==='trackside'){const station=path[Math.floor(point.index/60)*60],q=path[(Math.floor(point.index/60)*60+1)%path.length],dx=q.x-station.x,dz=q.z-station.z,length=Math.hypot(dx,dz);const trackside=new THREE.Vector3(station.x-dz/length*26,station.y+3.5,station.z+dx/length*26);if(changed||seek)camera.position.copy(trackside);else camera.position.lerp(trackside,1-Math.exp(-dt*4));camera.lookAt(base.clone().add(new THREE.Vector3(0,.7,0)));}else{camera.position.copy(desired);camera.lookAt(base.clone().addScaledVector(direction,onboard?35:10).add(new THREE.Vector3(0,.7,0)));}}
  }if(controls.enabled)controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(tick);
 };tick();
 return()=>{active=false;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[props.circuitId,props.ghosts,props.quality]);
 return <div ref={host} style={{width:'100%',height:'100%'}}>{error&&<div className="workflow-replay-error" role="alert">{error}</div>}</div>;
}
