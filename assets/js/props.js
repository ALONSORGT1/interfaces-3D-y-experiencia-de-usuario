import * as THREE from 'three';
import { RAPIER, hasSpace } from './physics.js';

const cube = new THREE.BoxGeometry(1,1,1);
const sphere = new THREE.SphereGeometry(1,20,14);
const cylinder = new THREE.CylinderGeometry(1,1,1,12);
const leaf = new THREE.ConeGeometry(1,1,5);
const materials = new Map();
function material(color) {
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.7}));
  return materials.get(color);
}
function part(group,geometry,size,position,color) {
  const mesh=new THREE.Mesh(geometry,material(color));mesh.scale.set(...size);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
const box=(g,s,p,c)=>part(g,cube,s,p,c);
export function ballMesh(radius=.32) {
  const g=new THREE.Group();part(g,sphere,[radius,radius,radius],[0,0,0],'#c87869');
  for(const [x,z] of [[-.07,-.05],[.06,-.05],[0,.08]])part(g,sphere,[.035,.014,.035],[x,radius*.95,z],'#5e453d');
  return g;
}

export class Props {
  constructor(view,physics) {this.view=view;this.physics=physics;this.items=[];this.byCollider=new Map();this.bonuses=[];this.balls=[];this.serial=0;}
  add(type,mesh,position,colliders,options={}) {
    const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(...position).setLinearDamping(options.damping??.25).setAngularDamping(.35).setCcdEnabled(true);
    const body=this.physics.world.createRigidBody(desc);
    const item={id:++this.serial,type,mesh,body,colliders:[],initial:{x:position[0],y:position[1],z:position[2]},scored:false,...options};
    for(const colliderDesc of colliders){
      const col=this.physics.world.createCollider(colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
      item.colliders.push(col);this.byCollider.set(col.handle,item);
    }
    mesh.position.set(...position);this.view.scene.add(mesh);this.items.push(item);return item;
  }
  reset() {
    for(const item of [...this.items])this.remove(item);
    for(const bonus of this.bonuses)this.view.scene.remove(bonus.mesh);
    this.bonuses=[];this.balls=[];this.serial=0;
    for(const [tower,x,z,color] of [[0,-5,-3,'#dcb482'],[1,0,-4.3,'#97b8a1'],[2,5,-2.5,'#dba59a']]){
      for(let row=0;row<3;row++)for(let column=0;column<2;column++){
        const g=new THREE.Group();box(g,[.92,.68,.72],[0,0,0],color);
        for(const y of [-.17,.16]){box(g,[.83,.27,.04],[0,y,.375],color);box(g,[.22,.025,.055],[0,y+.025,.412],'#486457');box(g,[.16,.065,.01],[.23,y,.401],'#f6efd9');}
        const item=this.add('target',g,[x+(column-.5)*.98,.35+row*.70,z],[RAPIER.ColliderDesc.cuboid(.46,.34,.36).setDensity(3).setFriction(.6).setRestitution(.04)],{tower});
      }
    }
    for(const [x,z] of [[-2,1.2],[2.7,-.4],[-6,-5.2],[4,-5.6],[7.8,4.2]])this.chair(x,z);
    this.cart(3.25,2.4);this.cart(-7,5.3);
    this.plant(-8.4,-3.5);this.plant(7.5,-1);this.plant(1.9,-6.8);
    this.coffee(8.3,1.32+.5,-6.6);
    // Settle the freshly stacked objects before establishing scoring baselines.
    for(let n=0;n<100;n++)this.physics.world.step(this.physics.events);
    this.physics.events.drainCollisionEvents(()=>{});
    for(const item of this.items)item.initial={...item.body.translation()};
    this.sync();
    for(const p of [[-8,.4,5],[7,.4,6],[-3,.4,-1]])this.spawnBonus(p);
  }
  chair(x,z){
    const g=new THREE.Group();box(g,[.76,.17,.72],[0,.12,0],'#50786c');box(g,[.73,.72,.13],[0,.54,.3],'#50786c');box(g,[.12,.48,.12],[0,-.22,0],'#36594d');
    box(g,[.85,.07,.12],[0,-.46,0],'#36594d');box(g,[.12,.07,.85],[0,-.46,0],'#36594d');
    for(const [dx,dz] of [[-.38,0],[.38,0],[0,-.38],[0,.38]])part(g,sphere,[.09,.09,.09],[dx,-.49,dz],'#294638');
    return this.add('chair',g,[x,.6,z],[RAPIER.ColliderDesc.cuboid(.38,.085,.36).setTranslation(0,.12,0).setDensity(7),RAPIER.ColliderDesc.cuboid(.365,.36,.065).setTranslation(0,.54,.3).setDensity(4),RAPIER.ColliderDesc.cuboid(.43,.07,.43).setTranslation(0,-.46,0).setDensity(8)],{damping:.5});
  }
  cart(x,z){
    const g=new THREE.Group();box(g,[1.2,.12,.85],[0,-.16,0],'#bc9573');box(g,[.055,.75,.055],[-.52,.25,-.34],'#496754');box(g,[.055,.75,.055],[.52,.25,-.34],'#496754');box(g,[1.1,.06,.06],[0,.63,-.34],'#496754');
    for(const dx of [-.47,.47])for(const dz of [-.3,.3]){const w=part(g,cylinder,[.12,.08,.12],[dx,-.32,dz],'#385244');w.rotation.z=Math.PI/2;}
    box(g,[.65,.48,.52],[.05,.14,0],'#e0c285');box(g,[.5,.06,.36],[.05,.40,0],'#f7edcf');
    return this.add('cart',g,[x,.45,z],[RAPIER.ColliderDesc.cuboid(.6,.12,.43).setTranslation(0,-.16,0).setDensity(6),RAPIER.ColliderDesc.cuboid(.325,.24,.26).setTranslation(.05,.14,0).setDensity(2),RAPIER.ColliderDesc.cuboid(.56,.45,.045).setTranslation(0,.2,-.34).setDensity(1)],{damping:.12});
  }
  plant(x,z){
    const g=new THREE.Group();part(g,cylinder,[.28,.46,.28],[0,-.08,0],'#c78165');part(g,cylinder,[.245,.04,.245],[0,.16,0],'#4d5940');box(g,[.04,.7,.04],[0,.48,0],'#4e6e46');
    for(let i=0;i<7;i++){const angle=i*2.4;const l=part(g,leaf,[.18,.65,.09],[Math.sin(angle)*.2,.55+(i%3)*.13,Math.cos(angle)*.2],i%2?'#648657':'#8eaa72');l.rotation.set(Math.sin(angle)*.6,angle,Math.cos(angle)*.65);}
    return this.add('plant',g,[x,.34,z],[RAPIER.ColliderDesc.cylinder(.23,.28).setTranslation(0,-.08,0).setDensity(6),RAPIER.ColliderDesc.cuboid(.25,.4,.25).setTranslation(0,.53,0).setDensity(.15)],{protected:true});
  }
  coffee(x,y,z){
    const g=new THREE.Group();box(g,[.62,.85,.52],[0,0,0],'#3b5b50');box(g,[.5,.36,.04],[0,.17,.28],'#e1cda4');box(g,[.39,.1,.37],[0,-.39,.3],'#254337');part(g,cylinder,[.13,.2,.13],[0,-.21,.28],'#f3e9ce');box(g,[.14,.06,.03],[.15,.27,.32],'#d39278');
    return this.add('coffee',g,[x,y,z],[RAPIER.ColliderDesc.cuboid(.31,.425,.32).setDensity(5)],{protected:true});
  }
  spawnBall(position,velocity,shotId){
    if(!hasSpace(this.physics.world,position,.33))return null;
    const item=this.add('ball',ballMesh(),[position.x,position.y,position.z],[RAPIER.ColliderDesc.ball(.32).setMass(3.2).setFriction(.48).setRestitution(.45)],{damping:.16,shotId,bounced:false,age:0});
    item.body.setLinvel(velocity,true);item.body.setAngvel({x:-velocity.z/.32,y:0,z:velocity.x/.32},true);this.balls.push(item);return item;
  }
  spawnBonus(preferred){
    const candidates=[preferred,[-8,.4,6],[7,.4,6],[-3,.4,0],[3,.4,5],[-5,.4,3],[0,.4,2],[6,.4,-4]];
    const p=candidates.find(c=>c&&hasSpace(this.physics.world,{x:c[0],y:c[1],z:c[2]},.3)&&!this.bonuses.some(b=>Math.hypot(b.position.x-c[0],b.position.z-c[2])<.8));
    if(!p)return null;
    const g=new THREE.Group();box(g,[.44,.07,.58],[0,0,0],'#e8d179');box(g,[.27,.008,.04],[0,.04,-.12],'#8f824f');box(g,[.27,.008,.04],[0,.04,0],'#8f824f');box(g,[.18,.008,.04],[-.045,.04,.12],'#8f824f');
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.37,.018,6,24),material('#d7b764'));ring.rotation.x=Math.PI/2;ring.position.y=-.2;g.add(ring);g.position.set(...p);this.view.scene.add(g);
    const bonus={mesh:g,position:new THREE.Vector3(...p)};this.bonuses.push(bonus);return bonus;
  }
  collect(bonus){this.view.scene.remove(bonus.mesh);bonus.mesh.children.find(c=>c.geometry?.type==='TorusGeometry')?.geometry.dispose();this.bonuses.splice(this.bonuses.indexOf(bonus),1);}
  remove(item){
    for(const c of item.colliders)this.byCollider.delete(c.handle);
    this.physics.world.removeRigidBody(item.body);this.view.scene.remove(item.mesh);
    this.items=this.items.filter(i=>i!==item);this.balls=this.balls.filter(i=>i!==item);
  }
  sync(){for(const item of this.items){item.mesh.position.copy(item.body.translation());item.mesh.quaternion.copy(item.body.rotation());}}
  update(dt,time){
    for(const b of this.bonuses){b.mesh.position.y=b.position.y+Math.sin(time*2.5+b.position.x)*.08;b.mesh.rotation.y=time*.7;}
    for(const b of this.balls)b.age+=dt;
    this.sync();
  }
}
