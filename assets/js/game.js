import * as THREE from 'three';
import { STEP, RAPIER } from './physics.js';
import { Input } from './input.js';
import { Character } from './character.js';
import { Props, ballMesh } from './props.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

const DISPENSER=new THREE.Vector3(-3.8,0,6.1);
const length=v=>Math.hypot(v.x,v.y,v.z);
export class Game {
  constructor(view,physics){
    this.view=view;this.physics=physics;this.ui=new UI();this.audio=new Audio();this.state='intro';this.power=65;
    this.input=new Input(view.renderer.domElement,{throw:()=>this.throwBall(),interact:()=>this.interact(),pause:()=>this.togglePause(),blur:()=>this.pause()});
    this.character=new Character(view,physics,this.input);this.props=new Props(view,physics);
    this.heldBall=ballMesh(.25);this.heldBall.position.set(0,-.58,-.06);this.character.model.getObjectByName('RightArm').add(this.heldBall);
    this.aim=new THREE.Group();view.scene.add(this.aim);
    const dotGeometry=new THREE.SphereGeometry(.035,6,4),dotMaterial=new THREE.MeshBasicMaterial({color:'#496a51'});
    for(let n=0;n<22;n++){const dot=new THREE.Mesh(dotGeometry,dotMaterial);this.aim.add(dot);}
    this.ui.bind(this);this.reset();this.home(false);this.ui.ready();
    this.last=performance.now();this.accumulator=0;view.renderer.setAnimationLoop(now=>this.frame(now));
  }
  reset(){
    this.score=0;this.down=0;this.shots=8;this.penalties=0;this.ballReady=true;this.time=0;this.shotSerial=0;this.shot=null;this.throwCooldown=0;this.pushCooldown=0;this.finalChoice=false;this.settleTime=0;this.nextBonus=24;this.bonusSpawns=0;this.chain=0;this.lastFall=-100;this.completedTowers=new Set();
    this.input.reset();this.character.reset();this.props.reset();this.character.reset();this.ui.reset();this.heldBall.visible=true;this.accumulator=0;
  }
  start(){
    this.state='intro';this.ui.closeDialogs();this.reset();this.state='playing';this.input.enabled=true;this.ui.state(this.state);this.view.playCamera();this.character.updateCamera(0,true);this.view.renderer.domElement.focus();this.ui.update(this);this.ui.toast('Derriba 18 pendientes. La primera bola va por cuenta de la empresa.');
  }
  home(reset=true){
    this.state='intro';this.ui.closeDialogs();this.input.enabled=false;if(reset)this.reset();this.character.model.visible=true;this.aim.visible=false;this.ui.state('intro');this.view.heroCamera();
  }
  pause(showDialog=true){
    if(this.state!=='playing')return;this.state='paused';this.input.enabled=false;this.input.clear();this.ui.state(this.state);if(showDialog)document.getElementById('pause-dialog').showModal();
  }
  resume(){
    if(this.state!=='paused')return;this.state='playing';this.ui.closeDialogs();this.input.enabled=true;this.input.clear();this.ui.state(this.state);this.last=performance.now();this.view.renderer.domElement.focus();
  }
  togglePause(){
    if(document.getElementById('help-dialog').open){document.getElementById('help-dialog').close();return;}
    if(this.state==='paused')this.resume();else this.pause();
  }
  ballOrigin(){const p=this.character.position,f=this.character.forward;return {x:p.x+f.x*.92,y:.48,z:p.z+f.z*.92};}
  throwBall(){
    if(this.state!=='playing'||this.throwCooldown>0)return;
    if(!this.ballReady||this.shots<=0){this.ui.toast('Recarga junto a la máquina rosa con E.');return;}
    const f=this.character.forward,speed=8+this.power*.17;
    const ball=this.props.spawnBall(this.ballOrigin(),{x:f.x*speed,y:.6,z:f.z*speed},this.shotSerial+1);
    if(!ball){this.ui.toast('No hay espacio para lanzar. Aléjate del obstáculo.');return;}
    this.shotSerial++;this.shots--;this.ballReady=false;this.heldBall.visible=false;this.throwCooldown=.8;this.finalChoice=false;this.settleTime=0;
    this.shot={id:this.shotSerial,start:this.time,rebate:false};this.character.throw();this.audio.play('throw');
    this.chain=0;this.lastFall=-100;this.ui.toast(this.shots?'Bola fuera. Recarga en la máquina rosa.':'Última bola. Espera al derrumbe.');this.ui.update(this);
  }
  nearby(){
    const p=this.character.position;
    const bonus=this.props.bonuses.find(b=>Math.hypot(b.position.x-p.x,b.position.z-p.z)<1.2);
    if(bonus)return {type:'bonus',item:bonus};
    if(this.shots>0&&!this.ballReady&&Math.hypot(p.x-DISPENSER.x,p.z-DISPENSER.z)<2.25)return {type:'reload'};
    const f=this.character.forward;
    let best=null,distance=1.65;
    for(const item of this.props.items.filter(i=>['chair','cart'].includes(i.type))){const q=item.body.translation(),dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);if(d<distance&&dx*f.x+dz*f.z>-.2){distance=d;best=item;}}
    if(best)return {type:'push',item:best};
    return this.finalChoice?{type:'finish'}:null;
  }
  interactionPrompt(){
    if(this.state!=='playing')return null;
    return ({bonus:'Recoger bono · +100',reload:'Recargar bola',push:'Empujar mueble',finish:'Terminar turno'})[this.nearby()?.type]||null;
  }
  interact(){
    if(this.state!=='playing')return;
    const nearby=this.nearby();if(!nearby)return;
    if(nearby.type==='bonus'){this.props.collect(nearby.item);this.score+=100;this.audio.play('bonus');this.ui.toast('Bono de productividad: +100. Por fin uno útil.');this.checkResult();}
    if(nearby.type==='reload'&&this.throwCooldown<=0){this.ballReady=true;this.heldBall.visible=true;this.audio.play('bonus');this.ui.toast('Bola entregada. Busca otro ángulo.');}
    if(nearby.type==='push'&&this.pushCooldown<=0){const f=this.character.forward;nearby.item.body.applyImpulse({x:f.x*9,y:.3,z:f.z*9},true);this.pushCooldown=.4;this.character.throw();this.audio.play('impact');}
    if(nearby.type==='finish')this.finish(false,'Se agotaron tus ocho lanzamientos. Aún quedan pendientes o puntos por conseguir.');
    this.ui.update(this);
  }
  collisions(){
    this.physics.events.drainCollisionEvents((a,b,started)=>{
      if(!started)return;
      const first=this.props.byCollider.get(a),second=this.props.byCollider.get(b);
      for(const [ball,otherHandle,other] of [[first,b,second],[second,a,first]])if(ball?.type==='ball'){
        if(this.physics.walls.has(otherHandle))ball.bounced=true;
        if(other&&length(ball.body.linvel())>1)this.audio.play('impact');
      }
    });
  }
  scoring(){
    for(const item of this.props.items){
      if(item.scored||(!item.protected&&item.type!=='target'))continue;
      const p=item.body.translation(),q=item.body.rotation(),up=1-2*(q.x*q.x+q.z*q.z);
      const moved=Math.hypot(p.x-item.initial.x,p.z-item.initial.z);
      const fallen=up<.72||p.y<item.initial.y-.32||moved>(item.protected?.7:.85);
      if(!fallen)continue;
      item.scored=true;
      if(item.protected){this.score-=150;this.penalties++;this.audio.play('penalty');this.ui.toast(item.type==='coffee'?'La cafetera no tenía la culpa. −150':'Una planta menos. Una queja más. −150',true);continue;}
      this.down++;this.chain=this.time-this.lastFall<1.8?this.chain+1:1;this.lastFall=this.time;
      const chainBonus=this.chain>1?25:0;this.score+=100+chainBonus;
      if(this.chain>1)this.ui.combo(this.chain);
      this.audio.play('impact');
      if(this.shot&&!this.shot.rebate&&this.props.balls.some(b=>b.shotId===this.shot.id&&b.bounced)){
        this.score+=50;this.shot.rebate=true;this.ui.toast('Rebote con consecuencias. +50');
      }
      if(!this.completedTowers.has(item.tower)&&this.props.items.filter(i=>i.type==='target'&&i.tower===item.tower).every(i=>i.scored)){
        this.completedTowers.add(item.tower);this.ui.toast(`Torre ${item.tower+1} archivada. En el suelo.`);this.props.spawnBonus([item.initial.x,.4,item.initial.z+1.6]);
      }
    }
  }
  checkResult(){
    if(this.state!=='playing')return;
    if(this.down===18&&this.score>=1800){this.finish(true);return;}
    if(this.character.position.y < -4){this.finish(false,'Te saliste del área de trabajo. Esta renuncia necesita otro intento.');return;}
    // Do not cut off the final rolling ball or a delayed collapse. Only settle once motion stays low.
    if(this.shots===0&&this.shot&&this.time-this.shot.start>3){
      const moving=this.props.items.some(i=>length(i.body.linvel())>.18||length(i.body.angvel())>.25);
      this.settleTime=moving?0:this.settleTime+STEP;
      if(this.settleTime>1.5||this.time-this.shot.start>24){
        if(this.down<18){this.finish(false,`Se acabaron las bolas y quedaron ${18-this.down} pendientes en pie. Prueba otra potencia o utiliza los carritos.`);return;}
        if(!this.finalChoice){
          const available=this.props.bonuses.length*100;
          if(this.score+available<1800){this.finish(false,'Derribaste las torres, pero los daños colaterales dejaron tu puntuación por debajo de 1,800.');return;}
          this.finalChoice=true;this.ui.toast('Torres derribadas. Recoge los bonos que faltan o pulsa E para terminar.');
        }
      }
    }
  }
  finish(won,reason=''){
    if(this.state!=='playing')return;this.state=won?'won':'lost';this.input.enabled=false;this.input.clear();this.ui.state(this.state);this.aim.visible=false;this.ui.update(this);this.ui.result(this,won,reason);this.audio.play(won?'win':'lose');
  }
  step(){
    this.time+=STEP;this.throwCooldown=Math.max(0,this.throwCooldown-STEP);this.pushCooldown=Math.max(0,this.pushCooldown-STEP);
    this.character.step(STEP);this.physics.world.step(this.physics.events);this.character.sync();this.collisions();this.scoring();this.checkResult();
    if(this.time>this.nextBonus&&this.bonusSpawns<3&&this.props.bonuses.length<6){this.props.spawnBonus();this.bonusSpawns++;this.nextBonus+=24;}
    for(const ball of [...this.props.balls])if(ball.body.translation().y < -3||(ball.age>28&&length(ball.body.linvel())<.1))this.props.remove(ball);
  }
  updateAim(){
    this.aim.visible=this.state==='playing'&&this.ballReady;if(!this.aim.visible)return;
    const p=this.ballOrigin(),f=this.character.forward;
    const max=3+this.power*.055;
    const hit=this.physics.world.castRay(new RAPIER.Ray(p,f),max,true,undefined,undefined,this.character.collider,this.character.body);
    const distance=hit?Math.max(.1,hit.timeOfImpact):max;
    this.aim.children.forEach((dot,n)=>{const d=n*.34;dot.visible=d<distance;dot.position.set(p.x+f.x*d,.04,p.z+f.z*d);});
  }
  frame(now){
    const dt=Math.min((now-this.last)/1000,.1);this.last=now;
    if(this.state==='playing'){
      this.accumulator+=dt;
      while(this.accumulator>=STEP&&this.state==='playing'){this.step();this.accumulator-=STEP;}
      this.props.update(dt,this.time);this.character.updateCamera(dt);this.updateAim();this.ui.tick(dt);this.ui.update(this);
    }else if(this.state==='intro'){this.character.mixer.update(dt);this.props.update(0,now/1000);}
    this.view.renderer.render(this.view.scene,this.view.camera);
  }
  snapshot(){return {state:this.state,score:this.score,down:this.down,shots:this.shots,ballReady:this.ballReady,power:this.power,animation:this.character.state,position:{...this.character.position},targets:this.props.items.filter(i=>i.type==='target').map(i=>({id:i.id,scored:i.scored,position:{...i.body.translation()}})),balls:this.props.balls.map(i=>({id:i.id,position:{...i.body.translation()},velocity:{...i.body.linvel()}})),bonuses:this.props.bonuses.length,penalties:this.penalties,time:this.time};}
}
