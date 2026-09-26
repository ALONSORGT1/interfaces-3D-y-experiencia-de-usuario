import { createScene } from './scene.js';
import { createPhysics, STEP } from './physics.js';
import { Input } from './input.js';
import { Character } from './character.js';
async function boot(){
  const [view,physics]=await Promise.all([createScene(document.querySelector('#scene')),createPhysics()]);
  const input=new Input(view.renderer.domElement,{throw:()=>character.throw(),interact:()=>{},pause:()=>{},blur:()=>{}});
  const character=new Character(view,physics,input);
  document.querySelector('#app').dataset.mode='intro';document.querySelector('#load-status').textContent='Oficina lista. Tu jefe no está mirando.';
  document.querySelector('#start-label').textContent='Entrar a la oficina';document.querySelector('#start-button').disabled=false;
  document.querySelector('#start-button').onclick=()=>{
    for(const id of ['intro','intro-footer','scene-caption','scene-stamp'])document.getElementById(id).hidden=true;
    document.querySelector('#hud').hidden=false;document.querySelector('#app').dataset.mode='playing';input.enabled=true;view.playCamera();character.updateCamera(0,true);view.renderer.domElement.focus();
  };
  let last=performance.now(),accumulator=0;
  view.renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(input.enabled){accumulator+=dt;while(accumulator>=STEP){character.step(STEP);physics.world.step(physics.events);character.sync();accumulator-=STEP;}character.updateCamera(dt);}
    else character.mixer.update(dt);
    view.renderer.render(view.scene,view.camera);
  });
}
boot().catch(error=>{console.error(error);document.querySelector('#load-status').textContent='No se pudo cargar la oficina. Comprueba tu conexión y recarga.';});
