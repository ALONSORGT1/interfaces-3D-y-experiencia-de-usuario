import * as THREE from "three";
import { RAPIER } from "./physics.js";

export class Character {
  constructor(view, physics, input) {
    this.view = view;
    this.physics = physics;
    this.input = input;
    this.model = view.employee.scene;
    view.scene.add(this.model);
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        -40,
        0.97,
        18,
      ),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.65, 0.3).setFriction(0.2),
      this.body,
    );
    this.controller = physics.world.createCharacterController(0.025);
    this.controller.enableSnapToGround(0.2);
    this.controller.enableAutostep(0.18, 0.25, false);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(35);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = Object.fromEntries(
      view.employee.animations.map((clip) => [
        clip.name,
        this.mixer.clipAction(clip),
      ]),
    );
    this.animations.Throw.setLoop(THREE.LoopOnce, 1);
    this.state = "";
    this.vertical = 0;
    this.throwTime = 0;
    this.animate("Idle");
    this.sync();
    this.cameraPosition = new THREE.Vector3();
    this.look = new THREE.Vector3();
  }
  reset() {
    this.body.setTranslation({ x: -40, y: 0.98, z: 18 }, true);
    this.body.setNextKinematicTranslation({ x: -40, y: 0.98, z: 18 });
    this.model.rotation.set(0, 0, 0);
    this.vertical = 0;
    this.throwTime = 0;
    this.mixer.stopAllAction();
    this.state = "";
    this.animate("Idle");
    this.sync();
  }
  get position() {
    return this.body.translation();
  }
  get forward() {
    return new THREE.Vector3(
      -Math.sin(this.input.yaw),
      0,
      -Math.cos(this.input.yaw),
    );
  }
  animate(name) {
    if (this.state === name) return;
    const previous = this.animations[this.state],
      next = this.animations[name];
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous) previous.crossFadeTo(next, 0.14, true);
    this.state = name;
  }
  throw() {
    this.throwTime = 0.65;
    this.model.rotation.y = this.input.yaw;
    this.animate("Throw");
  }
  step(dt) {
    const i = this.input;
    const x =
      Number(i.has("KeyD", "ArrowRight")) - Number(i.has("KeyA", "ArrowLeft"));
    const z =
      Number(i.has("KeyW", "ArrowUp")) - Number(i.has("KeyS", "ArrowDown"));
    const dir = new THREE.Vector3(
      x * Math.cos(i.yaw) - z * Math.sin(i.yaw),
      0,
      -x * Math.sin(i.yaw) - z * Math.cos(i.yaw),
    );
    const moving = dir.lengthSq() > 0;
    dir.normalize();
    const running = i.has("ShiftLeft", "ShiftRight");
    const speed = running ? 7.2 : 4.2;
    const grounded = this.controller.computedGrounded();
    if (i.jumpRequested && grounded) this.vertical = 4.8;
    else
      this.vertical =
        grounded && this.vertical <= 0
          ? -0.5
          : Math.max(-20, this.vertical - 9.81 * dt);
    i.jumpRequested = false;
    this.controller.computeColliderMovement(
      this.collider,
      {
        x: dir.x * speed * dt,
        y: this.vertical * dt,
        z: dir.z * speed * dt,
      },
      RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
    );
    const d = this.controller.computedMovement(),
      p = this.position;
    if (this.vertical > 0 && d.y < this.vertical * dt - 0.002)
      this.vertical = 0;
    this.body.setNextKinematicTranslation({
      x: p.x + d.x,
      y: p.y + d.y,
      z: p.z + d.z,
    });
    this.throwTime = Math.max(0, this.throwTime - dt);
    if (!this.throwTime) {
      if (moving) {
        const angle = Math.atan2(-dir.x, -dir.z);
        const difference = Math.atan2(
          Math.sin(angle - this.model.rotation.y),
          Math.cos(angle - this.model.rotation.y),
        );
        this.model.rotation.y += difference * Math.min(1, dt * 15);
      }
      this.animate(moving ? (running ? "Run" : "Walk") : "Idle");
    }
    this.mixer.update(dt);
  }
  sync() {
    const p = this.position;
    this.model.position.set(p.x, p.y - 0.95, p.z);
  }
  updateCamera(dt, instant = false) {
    const { yaw, pitch, distance } = this.input,
      p = this.position;
    if (this.input.firstPerson) {
      this.view.camera.position.set(p.x, p.y + 0.7, p.z);
      this.view.camera.lookAt(
        p.x - Math.sin(yaw) * Math.cos(pitch),
        p.y + 0.7 - Math.sin(pitch),
        p.z - Math.cos(yaw) * Math.cos(pitch),
      );
      this.model.visible = false;
      return;
    }
    const target = new THREE.Vector3(p.x, p.y + 0.55, p.z);
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    const ray = new RAPIER.Ray(target, offset);
    const hit = this.physics.world.castRay(
      ray,
      distance,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC |
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
      undefined,
      this.collider,
      this.body,
      (col) => !this.physics.invisibleBounds.has(col.handle),
    );
    const length = hit ? Math.max(1.1, hit.timeOfImpact - 0.2) : distance;
    const desired = target.clone().addScaledVector(offset, length);
    if (instant) this.view.camera.position.copy(desired);
    else this.view.camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
    this.view.camera.lookAt(
      target
        .clone()
        .addScaledVector(this.forward, 2.6)
        .add(new THREE.Vector3(0, -0.2, 0)),
    );
    // Fade the employee only when the camera is forced very close by a wall.
    this.model.visible = length > 1.35;
  }
}
