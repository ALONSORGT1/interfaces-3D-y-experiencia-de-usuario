const $=id=>document.getElementById(id);
export class UI {
  constructor(){this.toastTime=0;this.comboTime=0;this.previousScore=null;}
  bind(game){
    $('start-button').onclick=()=>game.start();
    $('throw-button').onclick=()=>{game.throwBall();game.view.renderer.domElement.focus();};
    $('power').oninput=e=>{game.power=Number(e.target.value);$('power-value').textContent=`${game.power}%`;};
    $('restart-button').onclick=()=>game.start();$('restart-pause').onclick=()=>game.start();
    $('home-button').onclick=()=>game.home();$('resume-button').onclick=()=>game.resume();$('pause-button').onclick=()=>game.pause();
    $('help-button').onclick=()=>{game.pause(false);$('help-dialog').showModal();};
    document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
    $('help-dialog').addEventListener('close',()=>{if(game.state==='paused'&&!$('pause-dialog').open)game.resume();});
    $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();game.resume();});
    $('result-dialog').addEventListener('cancel',e=>e.preventDefault());
    $('sound').onclick=()=>{const enabled=game.audio.toggle();$('sound-label').textContent=enabled?'ON':'OFF';$('sound').setAttribute('aria-label',enabled?'Desactivar sonido':'Activar sonido');};
  }
  ready(){
    $('start-button').disabled=false;$('start-label').textContent='Presentar mi renuncia';
    $('load-status').textContent='Sin juntas. Sin correos. Sin vuelta atrás.';
  }
  state(state){
    $('app').dataset.mode=state;
    const intro=state==='intro';
    for(const id of ['intro','intro-footer','scene-caption','scene-stamp'])$(id).hidden=!intro;
    $('hud').hidden=intro;$('pause-button').hidden=intro||state==='won'||state==='lost';
  }
  closeDialogs(){for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();}
  reset(){this.toastTime=0;this.comboTime=0;this.previousScore=null;$('toast').classList.remove('visible');$('combo').hidden=true;}
  update(game){
    const value=game.score.toLocaleString('en-US',{minimumIntegerDigits:4,useGrouping:false});
    $('score').textContent=value;$('targets').textContent=game.down;$('shots').textContent=game.shots;$('progress').style.width=`${game.down/18*100}%`;
    if(this.previousScore!==game.score){$('score').classList.remove('score-pop');void $('score').offsetWidth;$('score').classList.add('score-pop');this.previousScore=game.score;}
    const ready=game.ballReady;
    $('ball-label').textContent=ready?'BOLA LISTA':game.shots?'SIN BOLA':'ÚLTIMO LANZAMIENTO';
    $('ball-detail').textContent=ready?'Haz que cuente.':game.shots?'Recarga en la máquina.':game.finalChoice?'Decide cómo terminar.':'Deja que ruede.';
    $('throw-button').disabled=!ready||game.state!=='playing'||game.throwCooldown>0;
    $('objective-hint').textContent=game.finalChoice?'Pulsa E para terminar o recoge bonos.':game.down===18&&game.score<1800?'Recoge bonos para alcanzar 1,800.':!ready&&game.shots?'Máquina rosa: acércate y pulsa E.':'Un derrumbe en cadena suma más.';
    const prompt=game.interactionPrompt();$('interaction').hidden=!prompt;$('interaction-label').textContent=prompt||'';
  }
  toast(message,penalty=false){$('toast').textContent=message;$('toast').classList.toggle('penalty',penalty);$('toast').classList.add('visible');this.toastTime=3.2;}
  combo(count){$('combo-count').textContent=`×${count}`;$('combo').hidden=false;this.comboTime=2.5;}
  tick(dt){if(this.toastTime>0&&(this.toastTime-=dt)<=0)$('toast').classList.remove('visible');if(this.comboTime>0&&(this.comboTime-=dt)<=0)$('combo').hidden=true;}
  result(game,won,reason){
    $('result-eyebrow').textContent=won?'CARTA ENTREGADA · MISIÓN CUMPLIDA':'RR. HH. QUIERE HABLAR CONTIGO';
    $('result-title').innerHTML=won?'Renuncia<br>aceptada.':'Quedaron<br>pendientes.';
    $('result-copy').textContent=won?'Dejaste todo por el suelo y tu dignidad bastante arriba. Tu último turno ha terminado.':reason;
    $('result-score').textContent=game.score.toLocaleString('en-US');
    $('result-stats').textContent=`${game.down} de 18 pendientes · ${8-game.shots} lanzamientos · ${game.penalties} daños colaterales`;
    $('result-dialog').showModal();
  }
}
