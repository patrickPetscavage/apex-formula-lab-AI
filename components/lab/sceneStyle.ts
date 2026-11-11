import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export type RenderQuality='economy'|'balanced'|'high';
export function rendererStyle(renderer:THREE.WebGLRenderer,quality:RenderQuality){renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality==='high'?1.75:quality==='economy'?1:1.25));renderer.shadowMap.enabled=quality!=='economy';renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
export function studioEnvironment(scene:THREE.Scene,renderer:THREE.WebGLRenderer,outdoor:boolean){
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=outdoor?.75:1.0;
 if(outdoor){const sky=new Sky();sky.scale.setScalar(9000);sky.material.uniforms.turbidity.value=4;sky.material.uniforms.rayleigh.value=1.3;sky.material.uniforms.mieCoefficient.value=.005;sky.material.uniforms.mieDirectionalG.value=.8;sky.material.uniforms.sunPosition.value.set(.35,.6,-.65);scene.add(sky);scene.fog=new THREE.FogExp2(0xc4d7e1,.000075);}else scene.background=new THREE.Color(0x12191f);
 return environment;
}
export function circuitLights(scene:THREE.Scene,quality:RenderQuality){const sun=new THREE.DirectionalLight(0xfff2df,3.2);sun.position.set(-120,230,-180);sun.castShadow=quality!=='economy';sun.shadow.mapSize.setScalar(quality==='high'?2048:1024);sun.shadow.camera.left=-36;sun.shadow.camera.right=36;sun.shadow.camera.top=36;sun.shadow.camera.bottom=-36;sun.shadow.camera.near=1;sun.shadow.camera.far=650;sun.shadow.bias=-.00006;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(sun,sun.target,new THREE.HemisphereLight(0xb8dbf3,0x666347,1.15));return sun;}
/** Original tileable textures; no third-party photographic imagery. */
export function surfaceTexture(kind:'asphalt'|'grass'|'gravel'|'concrete'){
 const bytes=new Uint8Array(128*128*4);let seed=kind==='asphalt'?404:981;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed>>>24)/255,macro=.5+.5*Math.sin(x*.17)*Math.cos(y*.12),v=kind==='asphalt'?115+noise*38+macro*6:kind==='grass'?100+noise*60+macro*25:150+noise*55;const i=(y*128+x)*4;bytes.set([v,v,v,255],i);}
 const texture=new THREE.DataTexture(bytes,128,128);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.needsUpdate=true;return texture;
}
