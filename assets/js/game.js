import * as THREE from "three";
import { Escape } from "./escape.js";
import { STEP, RAPIER } from "./physics.js";
import { Input } from "./input.js";
import { Character } from "./character.js";
import { Props, ballMesh } from "./props.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Navigation } from "./navigation.js";
import { Crowd } from "./crowd.js";
import { CAMPAIGN, BALL_MODES } from "./campaign.js";

const distance = (p, q) => Math.hypot(p.x - (q.x ?? q[0]), p.z - (q.z ?? q[1]));
const length = (v) => Math.hypot(v.x, v.y, v.z);
export const CAMPAIGN_SECONDS = 720;

export class Game {
  constructor(view, physics) {
    this.view = view;
    this.physics = physics;
    view.bindElevatorPhysics(physics.setElevatorLocked);
    this.ui = new UI();
    this.audio = new Audio();
    this.state = "intro";
    this.power = 65;
    this.input = new Input(view.renderer.domElement, {
      throw: () => this.throwBall(),
      interact: () => this.interact(),
      pause: () => this.togglePause(),
      blur: () => this.pause(),
      mode: () => this.cycleMode(),
      map: () => this.openMap(),
      camera: () => this.toggleCamera(),
      team: () => this.toggleTeam(),
    });
    this.character = new Character(view, physics, this.input);
    this.navigation = new Navigation(physics.bounds);
    // Clone animated glTF actors before attaching the player's held ball.
    this.crowd = new Crowd(view, physics, this.navigation);
    this.props = new Props(view, physics);
    this.heldBall = ballMesh(0.25);
    this.heldBall.children[0].material =
      this.heldBall.children[0].material.clone();
    this.heldBall.position.set(0, -0.58, -0.06);
    this.character.model.getObjectByName("RightArm").add(this.heldBall);
    this.aim = new THREE.Group();
    this.trail = new THREE.Group();
    view.scene.add(this.aim, this.trail);
    const dotGeometry = new THREE.SphereGeometry(0.04, 6, 4),
      dotMaterial = new THREE.MeshBasicMaterial({ color: "#496a51" });
    for (let n = 0; n < 28; n++)
      this.aim.add(new THREE.Mesh(dotGeometry, dotMaterial));
    const crumbGeometry = new THREE.RingGeometry(0.1, 0.18, 12),
      crumbMaterial = new THREE.MeshBasicMaterial({
        color: "#c08f45",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      });
    for (let n = 0; n < 45; n++) {
      const dot = new THREE.Mesh(crumbGeometry, crumbMaterial);
      dot.rotation.x = -Math.PI / 2;
      this.trail.add(dot);
    }
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.82, 40),
      new THREE.MeshBasicMaterial({
        color: "#d6b461",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.marker.add(ring);
    this.diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25),
      new THREE.MeshStandardMaterial({
        color: "#dfb654",
        emissive: "#6b4a13",
        emissiveIntensity: 0.25,
      }),
    );
    this.diamond.position.y = 2.5;
    this.marker.add(this.diamond);
    view.scene.add(this.marker);
    this.deliveryPad = new THREE.Mesh(
      new THREE.RingGeometry(1.85, 2.15, 48),
      new THREE.MeshBasicMaterial({ color: "#d8b653", side: THREE.DoubleSide }),
    );
    this.deliveryPad.rotation.x = -Math.PI / 2;
    this.deliveryPad.position.set(0, 0.045, 15);
    view.scene.add(this.deliveryPad);
    this.ui.bind(this);
    this.reset();
    this.home(false);
    this.ui.ready();
    this.last = performance.now();
    this.accumulator = 0;
    view.renderer.setAnimationLoop((now) => this.frame(now));
  }
  get mission() {
    return this.chapters[this.missionIndex];
  }
  get chapters() {
    return this.escape?.chapters || CAMPAIGN;
  }
  toggleCamera() {
    if (this.state !== "playing") return;
    this.input.firstPerson = !this.input.firstPerson;
    this.input.pitch = this.input.firstPerson ? 0 : 0.43;
    this.view.camera.fov = this.input.firstPerson ? 70 : 43;
    this.view.camera.updateProjectionMatrix();
    this.character.updateCamera(0, true);
    this.ui.update(this);
  }
  toggleTeam() {
    if (this.state !== "playing") return;
    this.crowd.waiting = !this.crowd.waiting;
    this.ui.toast(
      this.crowd.waiting
        ? "El equipo espera aquí. H para llamarlo."
        : "El equipo vuelve a seguirte.",
    );
    this.ui.update(this);
  }
  get mode() {
    return BALL_MODES[this.modeIndex];
  }
  get remaining() {
    return Math.max(0, CAMPAIGN_SECONDS - this.time);
  }
  targetsFor(id = this.mission.id) {
    return this.props.items.filter(
      (i) => i.type === "target" && i.mission === id,
    );
  }
  reset(savedEscape = null) {
    this.escape?.dispose();
    this.escape = null;
    this.crowd.waiting = false;
    this.crowd.autoWait = false;
    this.score = 0;
    this.down = 0;
    this.shots = 12;
    this.totalThrows = 0;
    this.penalties = 0;
    this.ballReady = true;
    this.time = 0;
    this.shotSerial = 0;
    this.shot = null;
    this.throwCooldown = 0;
    this.pushCooldown = 0;
    this.suspicion = 0;
    this.seen = false;
    this.noise = null;
    this.chain = 0;
    this.lastFall = -100;
    this.missionIndex = 0;
    this.completed = [];
    this.lolaTalked = false;
    this.evidence = false;
    this.delivered = false;
    this.deliveryHold = 0;
    this.bossWave = 0;
    this.wavePending = false;
    this.waveDelay = 0;
    this.directorSigned = false;
    this.modeIndex = 0;
    this.unlocked = 1;
    this.route = [];
    this.navTimer = 0;
    this.uiTimer = 0;
    this.nextBonus = 40;
    this.bonusSpawns = 0;
    this.auditWarning = -100;
    this.checkpoint = null;
    this.input.reset();
    this.props.reset();
    this.character.reset();
    this.crowd.reset();
    this.ui.reset();
    this.heldBall.visible = true;
    this.heldBall.children[0].material.color.set(BALL_MODES[0].color);
    this.deliveryPad.material.color.set("#d8b653");
    this.accumulator = 0;
    this.escape = new Escape(this, savedEscape);
    this.saveCheckpoint();
  }
  saveCheckpoint() {
    this.checkpoint = {
      escape: this.escape?.checkpoint(),
      stage: this.missionIndex,
      score: this.score,
      penalties: this.penalties,
      team: this.crowd.teammates.map((p) => p.id),
      unlocked: this.unlocked,
      remaining: this.remaining,
    };
  }
  restoreCheckpoint(saved) {
    if (!saved) return;
    if (saved.escape) {
      this.score = saved.score;
      this.penalties = saved.penalties;
      this.unlocked = saved.unlocked;
      this.time = CAMPAIGN_SECONDS - Math.max(180, saved.remaining);
      this.completed = this.chapters.slice(0, saved.stage).map((m) => m.id);
      for (const id of saved.team) this.crowd.recruit(id);
      const q = this.mission.point;
      const pos = { x: q[0], y: 0.98, z: q[1] < 0 ? -9 : 9 };
      this.character.body.setTranslation(pos, true);
      this.character.body.setNextKinematicTranslation(pos);
      this.character.sync();
      this.checkpoint = saved;
      return;
    }
  }
  start(fromCheckpoint = false) {
    const saved = fromCheckpoint ? this.checkpoint : null;
    this.state = "intro";
    this.ui.closeDialogs();
    this.reset(saved?.escape);
    if (saved) this.restoreCheckpoint(saved);
    this.state = "playing";
    this.input.enabled = true;
    this.ui.state(this.state);
    this.view.playCamera();
    this.view.camera.fov = this.input.firstPerson ? 70 : 43;
    this.view.camera.updateProjectionMatrix();
    this.character.updateCamera(0, true);
    this.view.renderer.domElement.focus();
    this.ui.update(this);
    this.refreshRoute();
    this.ui.radio(
      "OPERACIÓN SALIDA",
      saved
        ? "Retomamos el último encargo. Tu equipo sigue contigo."
        : `${this.escape.plan.story.opening} ${this.escape.plan.names[0]}: ${this.escape.task.story}`,
      10,
    );
  }
  home(reset = true) {
    this.state = "intro";
    this.ui.closeDialogs();
    this.input.enabled = false;
    if (reset) this.reset();
    this.character.model.visible = true;
    this.aim.visible = false;
    this.trail.visible = false;
    this.marker.visible = false;
    this.props.items.forEach((i) => (i.mesh.visible = true));
    this.crowd.people.forEach((p) => {
      p.model.visible = true;
      p.label.visible = false;
      if (p.vision) p.vision.visible = false;
    });
    this.ui.state("intro");
    this.view.camera.fov = 43;
    this.view.camera.updateProjectionMatrix();
    this.view.heroCamera();
  }
  pause(showDialog = true) {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.enabled = false;
    this.input.clear();
    this.ui.state(this.state);
    if (showDialog) document.getElementById("pause-dialog").showModal();
  }
  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.ui.closeDialogs();
    this.input.enabled = true;
    this.input.clear();
    this.ui.state(this.state);
    this.last = performance.now();
    this.view.renderer.domElement.focus();
  }
  togglePause() {
    for (const id of ["help-dialog", "map-dialog", "dialogue-dialog"])
      if (document.getElementById(id).open) {
        document.getElementById(id).close();
        return;
      }
    if (this.state === "paused") this.resume();
    else this.pause();
  }
  openMap() {
    if (this.state === "playing") {
      this.pause(false);
      this.ui.drawMap(this, true);
      document.getElementById("map-dialog").showModal();
    } else if (document.getElementById("map-dialog").open)
      document.getElementById("map-dialog").close();
  }
  cycleMode() {
    if (this.state !== "playing") return;
    if (this.unlocked === 1) {
      this.ui.toast(
        "Rescata a tu primer compañero para desbloquear la bola pesada.",
      );
      return;
    }
    this.modeIndex = (this.modeIndex + 1) % this.unlocked;
    this.heldBall.children[0].material.color.set(this.mode.color);
    this.ui.toast(`${this.mode.name}: ${this.mode.description}`);
    this.ui.update(this);
  }
  ballOrigin() {
    const p = this.character.position,
      f = this.character.forward;
    return { x: p.x + f.x * 0.98, y: p.y - 0.49, z: p.z + f.z * 0.98 };
  }
  throwBall() {
    if (this.state !== "playing" || this.throwCooldown > 0) return;
    if (!this.escape?.canThrow()) return;
    if (!this.ballReady || this.shots <= 0) {
      this.ui.toast(
        "Sin bolas. Sigue la ruta a una máquina y pulsa E para recargar.",
      );
      this.refreshRoute();
      return;
    }
    const f = this.character.forward,
      speed = (8 + this.power * 0.17) * this.mode.speed;
    const ball = this.props.spawnBall(
      this.ballOrigin(),
      { x: f.x * speed, y: 0.6, z: f.z * speed },
      ++this.shotSerial,
      this.mode,
    );
    if (!ball) {
      this.ui.toast("No hay espacio para lanzar. Sepárate del obstáculo.");
      return;
    }
    if (this.escape?.task?.kind === "precision") this.escape.validShot = true;
    this.shots--;
    this.totalThrows++;
    this.ballReady = false;
    this.heldBall.visible = false;
    this.throwCooldown = this.mode.id === "heavy" ? 1.25 : 0.9;
    this.shot = { id: this.shotSerial, start: this.time, rebate: false };
    this.chain = 0;
    this.lastFall = -100;
    this.character.throw();
    this.audio.play("throw");
    const p = this.character.position;
    this.noise = { x: p.x + f.x * 10, z: p.z + f.z * 10, time: this.time };
    this.ui.update(this);
  }
  nearestDispenser() {
    const p = this.character.position;
    return [...this.view.map.dispensers].sort(
      (a, b) => distance(p, a) - distance(p, b),
    )[0];
  }
  missionStatus() {
    return (
      this.escape?.status() || {
        title: "Preparando la fuga",
        detail: "",
        count: 0,
        total: 1,
      }
    );
  }
  objective() {
    return this.escape?.objective() || { x: -40, z: 13, label: "Preparando" };
  }

  nearby() {
    const special = this.escape?.nearby();
    if (special) return special;
    const p = this.character.position;
    const friend = this.crowd.nearest(p);
    const refill = this.view.map.dispensers.find((q) => distance(p, q) < 2.2);
    if (refill && this.shots < 16) return { type: "reload" };
    const bonus = this.props.bonuses.find(
      (b) => distance(p, b.position) < 1.25,
    );
    if (bonus) return { type: "bonus", item: bonus };
    const f = this.character.forward;
    let best = null,
      d = 1.8;
    for (const item of this.props.items.filter(
      (i) => ["chair", "cart"].includes(i.type) && !i.locked,
    )) {
      const q = item.body.translation(),
        dist = distance(p, q);
      if (dist < d && (q.x - p.x) * f.x + (q.z - p.z) * f.z > -0.25) {
        best = item;
        d = dist;
      }
    }
    if (best) return { type: "push", item: best };
    if (friend) return { type: "talk", item: friend };
    return null;
  }
  interactionPrompt() {
    if (this.state !== "playing") return null;
    const n = this.nearby();
    if (n?.type === "escape") return n.label;
    return n
      ? {
          exit: "Salir con el equipo",
          evidence: "Guardar las pruebas",
          signature: "Recoger carta firmada",
          reload: "Recargar hasta 16 bolas",
          bonus: "Recoger bono · +100 y 2 bolas",
          push: n.item?.delivery ? "Empujar batería" : "Empujar mueble",
          talk: `Hablar con ${n.item?.name ?? ""}`,
        }[n.type]
      : null;
  }
  interact() {
    if (this.state !== "playing") return;
    const near = this.nearby();
    if (!near) return;
    if (near.type === "escape") {
      this.escape.interact(near);
      this.ui.update(this);
      return;
    }
    if (near.type === "talk") {
      this.talk(near.item);
      return;
    }
    if (near.type === "reload") {
      this.shots = 16;
      this.ballReady = this.throwCooldown <= 0;
      this.heldBall.visible = this.ballReady;
      this.audio.play("bonus");
      this.ui.toast("16 bolas listas. Q cambia el tipo de bola.");
      this.refreshRoute();
    }
    if (near.type === "bonus") {
      this.props.collect(near.item);
      this.score += 100;
      this.shots = Math.min(16, this.shots + 2);
      this.audio.play("bonus");
      this.ui.toast("Bono encontrado: +100 puntos y 2 bolas.");
    }
    if (near.type === "push" && this.pushCooldown <= 0) {
      const f = this.character.forward;
      near.item.body.applyImpulse({ x: f.x * 6, y: 0.1, z: f.z * 6 }, true);
      this.pushCooldown = 0.4;
      this.character.throw();
      this.audio.play("impact");
    }
    this.ui.update(this);
  }
  talk(person) {
    this.pause(false);
    const current = this.escape.plan.names[this.escape.stage];
    this.ui.dialogue(
      person,
      person.recruited
        ? "Te sigo a distancia. Si necesitas espacio, pulsa H para que esperemos."
        : person.name === current
          ? this.escape.task.story
          : "El objetivo de arriba te dice a quién ayudar ahora. Nos iremos todos juntos.",
      () => {},
    );
  }

  collisions() {
    this.physics.events.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      const first = this.props.byCollider.get(a),
        second = this.props.byCollider.get(b);
      for (const [ball, otherHandle, other] of [
        [first, b, second],
        [second, a, first],
      ])
        if (ball?.type === "ball") {
          if (this.physics.walls.has(otherHandle)) ball.bounced = true;
          if (other && length(ball.body.linvel()) > 1)
            this.audio.play("impact");
        }
    });
  }
  scoring() {
    for (const item of this.props.items) {
      if (item.scored || (!item.protected && item.type !== "target")) continue;
      const p = item.body.translation(),
        q = item.body.rotation(),
        up = 1 - 2 * (q.x * q.x + q.z * q.z),
        moved = Math.hypot(p.x - item.initial.x, p.z - item.initial.z);
      if (
        !(
          up < 0.72 ||
          p.y < item.initial.y - 0.32 ||
          moved > (item.protected ? 0.7 : 0.85)
        )
      )
        continue;
      if (
        item.escapeTask &&
        this.escape.task?.kind === "precision" &&
        !this.escape.validShot
      ) {
        item.body.setTranslation(item.initial, true);
        item.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        continue;
      }
      item.scored = true;
      if (item.protected) {
        this.score -= 150;
        this.penalties++;
        this.suspicion = Math.min(100, this.suspicion + 7);
        this.audio.play("penalty");
        this.ui.toast(
          item.type === "coffee"
            ? "La cafetera era inocente. −150"
            : "Cuida las plantas. −150",
          true,
        );
        continue;
      }
      this.down++;
      this.chain = this.time - this.lastFall < 1.8 ? this.chain + 1 : 1;
      this.lastFall = this.time;
      this.score += 100 + (this.chain > 1 ? 25 : 0);
      if (this.chain > 1) this.ui.combo(this.chain);
      this.audio.play("impact");
      if (
        this.shot &&
        !this.shot.rebate &&
        this.props.balls.some((b) => b.shotId === this.shot.id && b.bounced)
      ) {
        this.score += 50;
        this.shot.rebate = true;
        this.ui.toast("¡Rebote con consecuencias! +50");
      }
    }
  }
  checkCampaign() {
    if (this.state !== "playing") return;
    this.escape.step(STEP);
    if (this.suspicion >= 100)
      this.finish(
        false,
        "Los auditores te descubrieron. Ocúltate tras las paredes o distraelos lanzando una bola.",
      );
    else if (this.remaining <= 0)
      this.finish(
        false,
        "Se terminaron los doce minutos. Reintenta desde el último encargo.",
      );
    else if (this.character.position.y < -4)
      this.finish(false, "Vuelve al último punto de control.");
  }
  finish(won, reason = "") {
    if (this.state !== "playing") return;
    if (won && !this.completed.includes("exit")) this.completed.push("exit");
    this.state = won ? "won" : "lost";
    this.input.enabled = false;
    this.input.clear();
    this.aim.visible = false;
    this.trail.visible = false;
    this.marker.visible = false;
    this.ui.state(this.state);
    this.ui.update(this);
    this.ui.result(this, won, reason);
    this.audio.play(won ? "win" : "lose");
  }
  refreshRoute() {
    if (!this.mission) return;
    const target = this.objective();
    this.route = this.navigation.route(this.character.position, target);
    this.navTimer = 0.7;
  }
  step() {
    this.time += STEP;
    this.throwCooldown = Math.max(0, this.throwCooldown - STEP);
    this.pushCooldown = Math.max(0, this.pushCooldown - STEP);
    if (this.throwCooldown === 0 && this.shots > 0) {
      this.ballReady = true;
      this.heldBall.visible = true;
    }
    for (const ball of this.props.balls) ball.age += STEP;
    this.character.step(STEP);
    this.seen = this.crowd.step(STEP, this);
    this.physics.world.step(this.physics.events);
    this.character.sync();
    this.collisions();
    this.scoring();
    this.suspicion = THREE.MathUtils.clamp(
      this.suspicion +
        (this.seen
          ? this.escape.difficulty.suspicion
          : -this.escape.difficulty.recovery) *
          STEP,
      0,
      100,
    );
    if (this.seen && this.time - this.auditWarning > 7) {
      this.auditWarning = this.time;
      this.ui.radio(
        this.escape.plan.names[0],
        "¡Un auditor nos está viendo! Rompe su línea de visión o distraelo con una bola.",
        5,
      );
    }
    this.checkCampaign();
    if (this.time > this.nextBonus && this.bonusSpawns < 6) {
      const p = this.character.position;
      this.props.spawnBonus([p.x + 2, 0.4, p.z + 2]);
      this.bonusSpawns++;
      this.nextBonus += 40;
    }
    for (const ball of [...this.props.balls])
      if (ball.body.translation().y < -3 || ball.age > 18)
        this.props.remove(ball);
  }
  updateGuides() {
    const playing = this.state === "playing";
    this.aim.visible = playing && this.ballReady;
    this.trail.visible = playing;
    this.marker.visible = playing;
    if (!playing) return;
    const p = this.ballOrigin(),
      f = this.character.forward,
      max = 3 + this.power * 0.055;
    const hit = this.physics.world.castRay(
        new RAPIER.Ray(p, f),
        max,
        true,
        undefined,
        undefined,
        this.character.collider,
        this.character.body,
      ),
      range = hit ? Math.max(0.1, hit.timeOfImpact) : max;
    this.aim.children.forEach((dot, n) => {
      const d = n * 0.3;
      dot.visible = d < range;
      dot.position.set(p.x + f.x * d, 0.06, p.z + f.z * d);
    });
    const target = this.objective();
    this.marker.position.set(target.x, 0.06, target.z);
    this.diamond.position.y = 2.5 + Math.sin(this.time * 3) * 0.15;
    this.diamond.rotation.y = this.time;
    this.trail.children.forEach((dot, n) => {
      const point = this.route[n];
      dot.visible = !!point;
      if (point) dot.position.set(point.x, 0.055, point.z);
    });
  }
  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    if (this.state === "playing") {
      this.accumulator += dt;
      let substeps = 0;
      while (
        this.accumulator >= STEP &&
        this.state === "playing" &&
        substeps++ < 3
      ) {
        this.step();
        this.accumulator -= STEP;
      }
      this.accumulator = Math.min(this.accumulator, STEP);
      this.props.update(dt, this.time, this.character.position);
      this.crowd.sync(this.character.position);
      this.character.updateCamera(dt);
      this.view.updateLighting(this.character.position, this.time);
      this.navTimer -= dt;
      if (this.navTimer <= 0) this.refreshRoute();
      this.updateGuides();
      this.ui.tick(dt);
      this.uiTimer -= dt;
      if (this.uiTimer <= 0) {
        this.ui.update(this);
        this.uiTimer = 0.15;
      }
    } else if (this.state === "intro") {
      this.character.mixer.update(dt);
      this.crowd.people.forEach((p) => p.mixer.update(dt));
      this.props.update(0, now / 1000);
    }
    this.view.renderer.render(this.view.scene, this.view.camera);
  }
  snapshot() {
    return {
      escape: this.escape?.checkpoint(),
      camera: this.input.firstPerson ? "first" : "third",
      state: this.state,
      mission: this.mission.id,
      chapter: this.missionIndex + 1,
      completed: [...this.completed],
      score: this.score,
      down: this.down,
      shots: this.shots,
      totalThrows: this.totalThrows,
      ballReady: this.ballReady,
      power: this.power,
      mode: this.mode.id,
      unlocked: this.unlocked,
      team: this.crowd.teammates.map((p) => p.id),
      animation: this.character.state,
      position: { ...this.character.position },
      time: this.time,
      remaining: this.remaining,
      suspicion: this.suspicion,
      evidence: this.evidence,
      delivered: this.delivered,
      bossWave: this.bossWave,
      directorSigned: this.directorSigned,
      targets: this.props.items
        .filter((i) => i.type === "target")
        .map((i) => ({
          id: i.id,
          mission: i.mission,
          wave: i.wave,
          scored: i.scored,
          position: { ...i.body.translation() },
        })),
      balls: this.props.balls.map((i) => ({
        id: i.id,
        position: { ...i.body.translation() },
        velocity: { ...i.body.linvel() },
      })),
      bonuses: this.props.bonuses.length,
      penalties: this.penalties,
      map: {
        width: this.view.map.width,
        depth: this.view.map.depth,
        areaMultiplier: this.view.map.areaMultiplier,
      },
    };
  }
}
