import * as THREE from "three";
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
    return CAMPAIGN[this.missionIndex];
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
  reset() {
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
    this.character.reset();
    this.crowd.reset();
    this.props.reset();
    this.character.reset();
    this.crowd.reset();
    this.ui.reset();
    this.heldBall.visible = true;
    this.heldBall.children[0].material.color.set(BALL_MODES[0].color);
    this.deliveryPad.material.color.set("#d8b653");
    this.accumulator = 0;
    this.saveCheckpoint();
  }
  saveCheckpoint() {
    this.checkpoint = {
      stage: this.missionIndex,
      score: this.score,
      penalties: this.penalties,
      team: this.crowd.teammates.map((p) => p.id),
      unlocked: this.unlocked,
      remaining: this.remaining,
    };
  }
  restoreCheckpoint(saved) {
    if (!saved || saved.stage === 0) return;
    this.missionIndex = saved.stage;
    this.completed = CAMPAIGN.slice(0, saved.stage).map((m) => m.id);
    this.score = saved.score;
    this.penalties = saved.penalties;
    this.unlocked = saved.unlocked;
    this.time = CAMPAIGN_SECONDS - Math.max(180, saved.remaining);
    this.lolaTalked = true;
    this.evidence = saved.stage > 1;
    this.delivered = saved.stage > 2;
    this.directorSigned = saved.stage > 4;
    for (const id of saved.team) this.crowd.recruit(id);
    for (const item of [...this.props.items])
      if (item.type === "target" && this.completed.includes(item.mission))
        this.props.remove(item);
    const start = this.mission.point;
    const pos = { x: start[0], y: 0.98, z: start[1] < 0 ? -9 : 9 };
    this.character.body.setTranslation(pos, true);
    this.character.body.setNextKinematicTranslation(pos);
    this.character.sync();
    this.crowd.teammates.forEach((p, i) => {
      const position = { x: pos.x + (i - 1) * 1.1, y: 0.98, z: pos.z + 1.6 };
      p.body.setTranslation(position, true);
      p.body.setNextKinematicTranslation(position);
    });
    if (this.mission.kind === "boss") this.wavePending = true;
    this.checkpoint = saved;
  }
  start(fromCheckpoint = false) {
    const saved = fromCheckpoint ? this.checkpoint : null;
    this.state = "intro";
    this.ui.closeDialogs();
    this.reset();
    if (saved) this.restoreCheckpoint(saved);
    this.state = "playing";
    this.input.enabled = true;
    this.ui.state(this.state);
    this.view.playCamera();
    this.character.updateCamera(0, true);
    this.view.renderer.domElement.focus();
    this.ui.update(this);
    this.refreshRoute();
    this.ui.radio(
      "OPERACIÓN SALIDA",
      saved
        ? "Volvemos al inicio del capítulo. Tu equipo sigue contigo."
        : "18:00. El director ha bloqueado la salida para otra noche de trabajo. Habla con Lola: esta vez salen todos.",
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
      this.ui.toast("Ayuda a Lola y Beto para desbloquear nuevas bolas.");
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
    const m = this.mission,
      targets = this.targetsFor(),
      n = targets.filter((i) => i.scored).length;
    if (m.id === "lola")
      return !this.lolaTalked
        ? {
            title: "Habla con Lola",
            detail: "Está junto a la barricada de recepción.",
            count: 0,
            total: 1,
          }
        : {
            title: "Libera el paso de Lola",
            detail: `Derriba los archivadores: ${n}/6.`,
            count: n,
            total: 6,
          };
    if (m.id === "archive")
      return n < 6
        ? {
            title: "Abre el archivo de Beto",
            detail: `Derriba los archivadores: ${n}/6.`,
            count: n,
            total: 6,
          }
        : {
            title: "Recoge la memoria USB",
            detail: "Acércate al fondo del archivo y pulsa E.",
            count: 0,
            total: 1,
          };
    if (m.id === "cafe")
      return !this.delivered
        ? {
            title: "Lleva la batería al generador",
            detail:
              "Empuja el carrito amarillo al círculo. Puedes usar una bola pesada.",
            count: 0,
            total: 1,
          }
        : {
            title: "Habla con Nora",
            detail: "El generador ya funciona. Nora está junto a la mesa.",
            count: 0,
            total: 1,
          };
    if (m.id === "servers")
      return {
        title: "Apaga los tres servidores",
        detail: `Tumba las torres azules: ${n}/3.`,
        count: n,
        total: 3,
      };
    if (m.id === "director")
      return this.bossWave < 3
        ? {
            title: `Burocracia: oleada ${this.bossWave + 1}/3`,
            detail: "Derriba la pila dorada. Llegarán nuevas órdenes.",
            count: targets.filter((i) => i.wave === this.bossWave && i.scored)
              .length,
            total: 3,
          }
        : {
            title: "Recoge la carta firmada",
            detail: "Acércate al escritorio del director y pulsa E.",
            count: 0,
            total: 1,
          };
    return {
      title: "Salgan juntos",
      detail: "Llega al ascensor de recepción y pulsa E. ¡Ya está todo!",
      count: 0,
      total: 1,
    };
  }
  objective() {
    const needsBall =
      (["lola", "archive", "servers"].includes(this.mission.id) &&
        this.targetsFor().some((t) => !t.scored) &&
        (this.mission.id !== "lola" || this.lolaTalked)) ||
      (this.mission.id === "director" && this.bossWave < 3);
    if (this.shots === 0 && needsBall) {
      const q = this.nearestDispenser();
      return { x: q[0], z: q[1], label: "Recargar / E", reload: true };
    }
    const m = this.mission;
    let point = m.point,
      label = this.missionStatus().title;
    if (m.id === "lola" && !this.lolaTalked) {
      const p = this.crowd.get("lola").body.translation();
      point = [p.x, p.z];
    }
    if (m.id === "archive" && this.targetsFor().every((t) => t.scored))
      point = [-20, -22];
    if (m.id === "cafe") {
      if (this.delivered) {
        const p = this.crowd.get("nora").body.translation();
        point = [p.x, p.z];
      } else {
        const p = this.props.deliveryCart.body.translation();
        point = distance(this.character.position, p) > 4 ? [p.x, p.z] : [0, 15];
      }
    }
    if (m.id === "servers") {
      const alive = this.targetsFor()
        .filter((t) => !t.scored)
        .sort(
          (a, b) =>
            distance(this.character.position, a.body.translation()) -
            distance(this.character.position, b.body.translation()),
        );
      if (alive.length) {
        const p = alive[0].body.translation();
        point = [p.x, p.z];
      }
    }
    if (m.id === "director") {
      if (this.bossWave >= 3) point = [40, -22.5];
      else {
        const alive = this.targetsFor().find(
          (t) => t.wave === this.bossWave && !t.scored,
        );
        if (alive) {
          const p = alive.body.translation();
          point = [p.x, p.z];
        }
      }
    }
    return { x: point[0], z: point[1], label };
  }
  nearby() {
    const p = this.character.position,
      m = this.mission;
    if (m.id === "exit" && distance(p, this.view.map.exit) < 2.7)
      return { type: "exit" };
    if (
      m.id === "archive" &&
      this.targetsFor().every((t) => t.scored) &&
      distance(p, [-20, -22]) < 2.2
    )
      return { type: "evidence" };
    if (
      m.id === "director" &&
      this.bossWave >= 3 &&
      distance(p, [40, -22.5]) < 2.3
    )
      return { type: "signature" };
    const friend = this.crowd.nearest(p);
    if (
      friend &&
      ((friend.id === "lola" && !this.lolaTalked) ||
        (friend.id === "nora" && m.id === "cafe" && this.delivered))
    )
      return { type: "talk", item: friend };
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
    if (near.type === "exit") {
      if (
        this.crowd.teammates.length === 3 &&
        this.evidence &&
        this.delivered &&
        this.directorSigned
      )
        this.finish(true);
      else
        this.ui.toast(
          "Aún falta completar la misión del equipo. Revisa el mapa.",
        );
      return;
    }
    if (near.type === "talk") {
      this.talk(near.item);
      return;
    }
    if (near.type === "evidence") {
      this.evidence = true;
      this.crowd.recruit("beto");
      this.unlocked = 3;
      this.advance();
    }
    if (near.type === "signature") {
      this.directorSigned = true;
      this.advance();
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
    const p = this.character.position,
      q = person.body.translation();
    person.model.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    this.pause(false);
    let line = person.line;
    if (person.recruited)
      line =
        person.id === "lola"
          ? "Vamos bien. La ruta dorada lleva al siguiente objetivo. Nadie se queda atrás."
          : person.id === "beto"
            ? "Las pruebas están a salvo. Recuerda: la puntuación da una medalla, pero no bloquea nuestra salida."
            : "Yo vigilo el generador. Tú ocúpate de la carta y mantén a los auditores lejos.";
    if (person.id === "nora" && this.delivered)
      line =
        "¡Funciona! Ya podemos desactivar los servidores. Me voy con ustedes: ni una hora extra más.";
    this.ui.dialogue(person, line, () => {
      if (person.id === "lola" && !this.lolaTalked) {
        this.lolaTalked = true;
        this.ui.radio(
          "LOLA",
          "Mi paso está bloqueado. Tumba esos seis archivos y te sigo.",
        );
      }
      if (
        person.id === "nora" &&
        this.mission.id === "cafe" &&
        this.delivered
      ) {
        this.crowd.recruit("nora");
        this.advance();
      }
      this.refreshRoute();
      this.ui.update(this);
    });
  }
  advance() {
    if (this.state !== "playing" && this.state !== "paused") return;
    const previous = this.mission;
    this.completed.push(previous.id);
    this.score += 200;
    this.shots = Math.min(16, this.shots + 4);
    this.ui.toast(`CAPÍTULO COMPLETO · ${previous.reward}`);
    this.audio.play("bonus");
    this.missionIndex++;
    this.navTimer = 0;
    this.suspicion = Math.max(0, this.suspicion - 20);
    if (this.mission.kind === "boss") {
      this.wavePending = true;
      this.waveDelay = 0.6;
    }
    this.saveCheckpoint();
    this.ui.radio(
      this.mission.npc
        ? this.crowd.get(this.mission.npc)?.name || "EQUIPO"
        : "EQUIPO",
      this.mission.brief,
      9,
    );
    this.refreshRoute();
    this.ui.update(this);
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
    const id = this.mission.id,
      targets = this.targetsFor();
    if (
      id === "lola" &&
      this.lolaTalked &&
      targets.length === 6 &&
      targets.every((t) => t.scored)
    ) {
      this.crowd.recruit("lola");
      this.unlocked = 2;
      this.advance();
      return;
    }
    if (id === "cafe" && !this.delivered) {
      const cart = this.props.deliveryCart,
        p = cart.body.translation();
      this.deliveryHold =
        distance(p, [0, 15]) < 2 && p.y < 1.1 ? this.deliveryHold + STEP : 0;
      if (this.deliveryHold > 0.25) {
        this.delivered = true;
        cart.locked = true;
        cart.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        cart.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        cart.body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
        this.deliveryPad.material.color.set("#7eac71");
        this.ui.radio(
          "NORA",
          "¡Batería conectada! Ven a hablar conmigo; me voy con ustedes.",
        );
        this.refreshRoute();
      }
    }
    if (
      id === "servers" &&
      targets.length === 3 &&
      targets.every((t) => t.scored)
    ) {
      this.advance();
      return;
    }
    if (id === "director" && this.bossWave < 3) {
      const current = targets.filter((t) => t.wave === this.bossWave);
      if (current.length === 3 && current.every((t) => t.scored)) {
        this.bossWave++;
        this.wavePending = this.bossWave < 3;
        this.waveDelay = 1.2;
        this.ui.radio(
          "EL DIRECTOR",
          this.bossWave < 3
            ? "Eso era solo el primer correo. Aquí tienen otros pendientes."
            : "Está bien, está bien. La carta está en mi escritorio.",
        );
        this.refreshRoute();
      }
      if (this.wavePending) {
        this.waveDelay -= STEP;
        if (this.waveDelay <= 0) {
          const spawned = this.props.spawnWave(this.bossWave);
          this.wavePending = spawned.length === 0;
          this.waveDelay = 1;
          if (spawned.length) this.refreshRoute();
        }
      }
    }
    if (this.suspicion >= 100) {
      this.finish(
        false,
        "Los auditores activaron el cierre del edificio. Usa las paredes para ocultarte y las bolas para distraerlos.",
      );
      return;
    }
    if (this.remaining <= 0) {
      this.finish(
        false,
        "Llegó el turno nocturno. Se acabaron los doce minutos para salir.",
      );
      return;
    }
    if (this.character.position.y < -4)
      this.finish(
        false,
        "Te saliste del área segura del corporativo. Vuelve al último capítulo.",
      );
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
      this.suspicion + (this.seen ? 13 : -3.5) * STEP,
      0,
      100,
    );
    if (this.seen && this.time - this.auditWarning > 7) {
      this.auditWarning = this.time;
      this.ui.radio(
        "LOLA",
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
      while (this.accumulator >= STEP && this.state === "playing") {
        this.step();
        this.accumulator -= STEP;
      }
      this.props.update(dt, this.time, this.character.position);
      this.crowd.sync(this.character.position);
      this.character.updateCamera(dt);
      this.view.updateLighting(this.character.position);
      this.navTimer -= dt;
      if (this.navTimer <= 0) this.refreshRoute();
      this.updateGuides();
      this.ui.tick(dt);
      this.uiTimer -= dt;
      if (this.uiTimer <= 0) {
        this.ui.update(this);
        this.uiTimer = 0.08;
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
