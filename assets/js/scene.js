import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function createScene(container) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f3f0e8');scene.fog=new THREE.Fog('#f3f0e8',48,90);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.domElement.tabIndex=0;container.appendChild(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,110);
  scene.add(new THREE.HemisphereLight(0xfff9e8,0x718473,2.6));const sun=new THREE.DirectionalLight(0xffedd5,3.1);sun.position.set(8,19,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:55});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#f3f0e8',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
  const loader=new GLTFLoader();const [office,employee]=await Promise.all([loader.loadAsync('./assets/models/office.glb'),loader.loadAsync('./assets/models/employee.glb')]);
  for(const model of [office.scene,employee.scene])model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(office.scene);
  addSign(scene,'PENDIENTES',[1.8,3,-8.92],3.4,.48,'#284d46','#e3e4cb');addSign(scene,'BOLAS / 08',[-3.8,2.15,6.49],1.2,.35,'#ddf568','#284d46');addSign(scene,'ÚLTIMO TURNO',[-3.8,1.88,6.49],1.15,.18,'#f3f0e8','#284d46');addSign(scene,'CAFÉ = PAZ',[8.05,2.7,-8.91],2.1,.42,'#284d46','#e3e4cb');
  for(const [text,x,z] of [['01 / URGENTE',-5,-1.8],['02 / PARA AYER',0,-3.1],['03 / PRIORIDAD',5,-1.2]]){const p=addSign(scene,text,[x,.012,z],2.4,.35,'#4c6a55','#c5d0b9');p.rotation.x=-Math.PI/2;}
  for(const x of [-5,0,5]){const strip=new THREE.Mesh(new THREE.PlaneGeometry(.07,5.5),new THREE.MeshBasicMaterial({color:'#f6e5a5',transparent:true,opacity:.65}));strip.rotation.x=-Math.PI/2;strip.position.set(x,.013,2);scene.add(strip);}
  let intro=true;
  function heroCamera(){intro=true;camera.position.set(24,25,31);camera.lookAt(0,0,0);camera.setViewOffset(innerWidth,innerHeight,-innerWidth*(innerWidth>760?.22:.24),-innerHeight*.015,innerWidth,innerHeight);}
  function playCamera(){intro=false;camera.clearViewOffset();}
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(intro)heroCamera();}
  heroCamera();window.addEventListener('resize',resize);
  return {scene,camera,renderer,office:office.scene,employee,heroCamera,playCamera};
}
export function addSign(scene,text,position,width,height,ink='#173f36',background='#f3f0e8'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.max(64,Math.round(768*height/width));const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=ink;ctx.font=`700 ${Math.floor(canvas.height*.57)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.92);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));mesh.position.set(...position);scene.add(mesh);return mesh;
}
