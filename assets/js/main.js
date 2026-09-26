import { createScene } from './scene.js';
async function boot(){
  const view=await createScene(document.querySelector('#scene'));
  document.querySelector('#app').dataset.mode='intro';document.querySelector('#load-status').textContent='v0.2 · Oficina original cargada desde GLB.';
  view.renderer.setAnimationLoop(()=>view.renderer.render(view.scene,view.camera));
}
boot().catch(error=>{console.error(error);document.querySelector('#load-status').textContent='No se pudo cargar la oficina. Comprueba tu conexión y recarga.';});
