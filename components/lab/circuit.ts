import * as THREE from 'three';
import {TRACK} from '@/lib/sim/track';
export function roadGeometry(extra:number,lift:number){const positions:number[]=[],indices:number[]=[],uv:number[]=[];TRACK.forEach((p,i)=>{const q=TRACK[(i+1)%TRACK.length],a=Math.atan2(q.z-p.z,q.x-p.x)+Math.PI/2;for(const side of [-1,1]){const w=(side<0?p.left:p.right)+extra;positions.push(p.x+Math.cos(a)*w*side,p.y+lift,p.z+Math.sin(a)*w*side);uv.push(side<0?0:1,p.s/12);}const j=i*2,k=((i+1)%TRACK.length)*2;indices.push(j,j+1,k,j+1,k+1,k);});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
export function createCircuit(){const group=new THREE.Group();
 const material=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.94});
 const mesh=(geometry:THREE.BufferGeometry,color:number)=>{const m=new THREE.Mesh(geometry,material(color));m.receiveShadow=true;group.add(m);return m;};
 const groundHeight=(x:number,z:number)=>{let best=Infinity,height=0;for(let i=0;i<TRACK.length;i+=3){const p=TRACK[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;height=p.y;}}for(let i=0;i<TRACK.length;i+=3){const p=TRACK[i];if((p.x-x)**2+(p.z-z)**2<45**2)height=Math.min(height,p.y);}return height-2.2;};
 const terrainGeometry=new THREE.PlaneGeometry(2800,2000,180,130);terrainGeometry.rotateX(-Math.PI/2);const groundPositions=terrainGeometry.getAttribute('position');for(let i=0;i<groundPositions.count;i++)groundPositions.setY(i,groundHeight(groundPositions.getX(i),groundPositions.getZ(i)));terrainGeometry.computeVertexNormals();mesh(terrainGeometry,0x526549);
 const grass=mesh(roadGeometry(22,-.16),0x5b6c4d);grass.material.side=THREE.DoubleSide;
 const gravel=mesh(roadGeometry(8,-.09),0x95967d);gravel.material.side=THREE.DoubleSide;
 const asphalt=mesh(roadGeometry(0,0),0x45484a);asphalt.material.side=THREE.DoubleSide;
 // Original deterministic asphalt microtexture, no external image dependencies.
 const bytes=new Uint8Array(128*128*4);let seed=403;for(let i=0;i<bytes.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=120+seed%30;bytes.set([v,v,v,255],i);}const texture=new THREE.DataTexture(bytes,128,128);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,1);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;texture.needsUpdate=true;asphalt.material.bumpMap=texture;asphalt.material.bumpScale=.008;
 for(const side of [-1,1]){const points=TRACK.map((p,i)=>{const q=TRACK[(i+1)%TRACK.length],a=Math.atan2(q.z-p.z,q.x-p.x)+Math.PI/2,w=(side<0?p.left:p.right)-.12;return new THREE.Vector3(p.x+Math.cos(a)*w*side,p.y+.025,p.z+Math.sin(a)*w*side);});points.push(points[0]);group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xe2dfc9})));}
 const dummy=new THREE.Object3D();const curbs=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.10,4.5),material(0xffffff),TRACK.length*2);let ci=0;
 const barriers=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.65,9),material(0x9fa6a3),Math.ceil(TRACK.length/2)*2);let bi=0;
 TRACK.forEach((p,i)=>{const q=TRACK[(i+1)%TRACK.length],heading=Math.atan2(q.x-p.x,q.z-p.z);for(const side of [-1,1]){const w=(side<0?p.right:p.left);if(p.k>.007){dummy.position.set(p.x+Math.cos(heading)*(w+.5)*side,p.y+.025,p.z-Math.sin(heading)*(w+.5)*side);dummy.rotation.set(0,heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();curbs.setMatrixAt(ci,dummy.matrix);curbs.setColorAt(ci,new THREE.Color(i%2?0xe7e3d7:0x9c2430));ci++;}if(i%2===0){dummy.position.set(p.x+Math.cos(heading)*(w+9)*side,p.y+.4,p.z-Math.sin(heading)*(w+9)*side);dummy.rotation.set(0,heading,0);dummy.updateMatrix();barriers.setMatrixAt(bi++,dummy.matrix);}}});curbs.count=ci;barriers.count=bi;group.add(curbs,barriers);
 // Simple catch fencing follows the derived road envelope, rather than random scenery.
 const fencePosts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.055,3,5),material(0x7f8986),Math.ceil(TRACK.length/4)*2);let fi=0;const fenceRails:number[]=[];
 for(let i=0;i<TRACK.length;i+=4){const p=TRACK[i],q=TRACK[(i+1)%TRACK.length],h=Math.atan2(q.x-p.x,q.z-p.z);for(const side of [-1,1]){const width=(side<0?p.right:p.left)+10,d=new THREE.Vector3(p.x+Math.cos(h)*width*side,p.y,p.z-Math.sin(h)*width*side);dummy.position.set(d.x,d.y+1.5,d.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();fencePosts.setMatrixAt(fi++,dummy.matrix);const next=TRACK[(i+4)%TRACK.length],r=TRACK[(i+5)%TRACK.length],nh=Math.atan2(r.x-next.x,r.z-next.z),nw=(side<0?next.right:next.left)+10;for(const y of [1,2,3])fenceRails.push(d.x,d.y+y,d.z,next.x+Math.cos(nh)*nw*side,next.y+y,next.z-Math.sin(nh)*nw*side);}}fencePosts.count=fi;group.add(fencePosts,new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(fenceRails,3)),new THREE.LineBasicMaterial({color:0x89928d,transparent:true,opacity:.5})));
 // Bridge piers kept outside the lower road envelope. Deck follows the actual upper path.
 const upper=TRACK[984],next=TRACK[985],heading=Math.atan2(next.x-upper.x,next.z-upper.z);
 const bridge=new THREE.Group();bridge.position.set(upper.x,upper.y-.45,upper.z);bridge.rotation.y=heading;
 const deck=new THREE.Mesh(new THREE.BoxGeometry(13,.7,42),material(0x898d86));bridge.add(deck);
 // Supports sit beyond both roads' full drivable envelopes at the crossover.
 for(const x of [-10,10])for(const z of [-18,18]){const pier=new THREE.Mesh(new THREE.BoxGeometry(1.2,7,1.2),material(0x989b91));pier.position.set(x,-3.8,z);pier.userData.bridgeSupport=true;bridge.add(pier);}group.add(bridge);
 const start=TRACK[0],second=TRACK[1],yaw=Math.atan2(second.x-start.x,second.z-start.z);const paddock=new THREE.Group();paddock.position.set(start.x,start.y,start.z);paddock.rotation.y=yaw;
 const building=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;paddock.add(m);return m;};
 building(18,11,160,28,5.5,-30,0xb0b5b1);building(21,.7,166,28,11.3,-30,0xeeeeea);building(.2,3,150,18.8,8,-30,0x344854);building(9,.06,240,12,.02,-15,0x555957);
 for(let i=0;i<14;i++)building(.15,3.4,6.2,18.8,2.3,-101+i*11,0x303a41);
 for(let row=0;row<7;row++)building(3,1,140,-23-row*2,1+row,-10,row%2?0x647b82:0x913b40);building(22,.4,145,-29,11,-10,0xd4d4c5);
 for(let i=0;i<12;i++)building(1,.008,1,-5.5+i,.006,0,i%2?0xeeeeee:0x151515);
 group.add(paddock);
 // Recognizable but schematic wheel landmark. Location is approximate.
 const wheel=new THREE.Group();wheel.position.copy(paddock.localToWorld(new THREE.Vector3(-125,36,150)));wheel.rotation.y=yaw;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(26,.55,8,64),material(0xe8e4d6));wheel.add(rim);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const spoke=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,52,5),material(0xb9bcb4));spoke.rotation.z=a;wheel.add(spoke);const pod=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.8,2.2),material(i%2?0xa73b39:0xe0c15a));pod.position.set(Math.cos(a)*26,Math.sin(a)*26,0);wheel.add(pod);}group.add(wheel);
 // Instanced vegetation excludes a generous envelope around every road segment.
 const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(4,15,7),material(0x3b5940),450);let count=0;
 for(let i=0;i<1800&&count<450;i++){seed=(seed*1664525+1013904223)>>>0;const x=(seed/4294967296-.5)*2400;seed=(seed*1664525+1013904223)>>>0;const z=(seed/4294967296-.5)*1700;if(TRACK.some(p=>(p.x-x)**2+(p.z-z)**2<50**2))continue;dummy.position.set(x,groundHeight(x,z)+7.5,z);dummy.rotation.set(0,i,0);dummy.scale.setScalar(.7+(i%7)/10);dummy.updateMatrix();trees.setMatrixAt(count++,dummy.matrix);}trees.count=count;group.add(trees);
 const points=TRACK.map(p=>new THREE.Vector3(p.x,p.y+.06,p.z));points.push(points[0]);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xff7148}));group.add(line);return {group,line};
}
