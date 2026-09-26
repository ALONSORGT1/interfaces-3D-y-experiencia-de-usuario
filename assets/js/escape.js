import * as THREE from "three";
import { hasBoxSpace } from "./physics.js";
import { DIFFICULTIES, MISSION_BANK, makePlan } from "./mission-bank.js";
const ids = ["lola", "beto", "nora"];
const centers = [
  [-40, 13],
  [-20, -15],
  [0, 14],
];
const zones = ["Recepción", "Archivo", "Cafetería"];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class Escape {
  constructor(game, saved = null) {
    this.g = game;
    this.plan =
      saved?.plan || makePlan(crypto.getRandomValues(new Uint32Array(1))[0]);
    this.level = saved?.level || document.getElementById("difficulty").value;
    this.difficulty = DIFFICULTIES[this.level];
    this.stage = saved?.stage || 0;
    this.taskIndex = saved?.taskIndex || 0;
    this.chapters = this.plan.names.map((n, i) => ({
      id: ids[i],
      name: `Rescatar a ${n}`,
      zone: this.plan.locations[i][2],
      point: this.plan.locations[i].slice(0, 2),
      kind: "rescue",
      brief: `Ayuda a ${n} con ${this.plan.tasks[i].length} encargos breves.`,
      reward: `${n} se une al equipo`,
    }));
    this.chapters.push({
      id: "exit",
      name: "Todos al ascensor",
      zone: "Recepción",
      point: [-44, 23],
      kind: "exit",
      brief:
        "Las tres personas están listas. Pulsa E frente a la cabina para salir.",
      reward: "Libertad",
    });
    game.missionIndex = this.stage;
    game.view.setElevatorOpen(false);
    this.visuals = new THREE.Group();
    game.view.scene.add(this.visuals);
    for (const [i, id] of ids.entries()) {
      game.crowd.rename(id, this.plan.names[i]);
      const person = game.crowd.get(id),
        [x, z] = this.plan.locations[i],
        pos = { x: x - 3, y: 0.98, z: z + 3 };
      person.body.setTranslation(pos, true);
      person.body.setNextKinematicTranslation(pos);
      person.model.position.set(pos.x, 0.03, pos.z);
    }
    for (const item of [...game.props.items])
      if (item.type === "target") game.props.remove(item);
    this.activate(false);
  }
  get task() {
    return this.stage < 3
      ? MISSION_BANK.find(
          (m) => m.id === this.plan.tasks[this.stage][this.taskIndex],
        )
      : null;
  }
  checkpoint() {
    return {
      plan: this.plan,
      level: this.level,
      stage: this.stage,
      taskIndex: this.taskIndex,
    };
  }
  dispose() {
    this.clear();
    this.g.view.scene.remove(this.visuals);
  }
  clear() {
    for (const item of [...this.g.props.items])
      if (item.escapeTask) this.g.props.remove(item);
    this.visuals.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
      if (o.isSprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    this.visuals.clear();
  }
  sign(text, x, z, color = "#214b3e") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext("2d");
    c.fillStyle = color;
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = "#fff9df";
    c.font = "bold 38px Arial";
    c.textAlign = "center";
    c.fillText(text, 256, 79, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: true }),
    );
    sprite.position.set(x, 2.4, z);
    sprite.scale.set(1.9, 0.475, 1);
    this.visuals.add(sprite);
    return sprite;
  }
  marker(p, n, kind) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.07, 6, 16),
      new THREE.MeshBasicMaterial({
        color: kind === "stealth" ? "#ab83cc" : "#dfb649",
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.09, p.z);
    this.visuals.add(ring);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, kind === "hold" ? 0.9 : 0.35, 0.4),
      new THREE.MeshStandardMaterial({
        color: "#d8be72",
        emissive: "#493916",
        roughness: 0.6,
      }),
    );
    mesh.position.set(p.x, kind === "hold" ? 0.65 : 0.8, p.z);
    this.visuals.add(mesh);
    const detail = new THREE.Mesh(
      new THREE.BoxGeometry(0.43, 0.2, 0.025),
      new THREE.MeshStandardMaterial({
        color: kind === "hold" ? "#264f44" : "#fff4d8",
      }),
    );
    detail.position.set(0, 0.02, 0.215);
    mesh.add(detail);
    if (kind === "hold") {
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.4, 0.07),
        new THREE.MeshStandardMaterial({
          color: "#305c51",
          emissive: "#183d30",
        }),
      );
      screen.position.set(0, 0.6, 0);
      mesh.add(screen);
    }
    p.mesh = mesh;
    p.ring = ring;
    p.label = this.sign(
      `${n} · ${kind === "hold" ? "MANTÉN E" : "PULSA E"}`,
      p.x,
      p.z,
    );
  }
  activate(announce = true) {
    const g = this.g;
    this.clear();
    for (const ball of [...g.props.balls]) g.props.remove(ball);
    this.pending = false;
    this.retry = 1;
    this.progress = 0;
    this.hold = 0;
    this.validShot = false;
    this.lastReset = -10;
    g.missionIndex = this.stage;
    g.deliveryPad.visible = false;
    g.crowd.autoWait = false;
    if (!this.task) {
      g.view.setElevatorOpen?.(true);
      g.refreshRoute();
      return;
    }
    const task = this.task,
      [x, z] = this.plan.locations[this.stage],
      v = task.variant;
    this.points =
      task.kind === "stealth"
        ? [
            { x: this.stage === 2 ? 30 : -6, z: 2 },
            { x: this.stage === 2 ? 36 : 2, z: -2 },
          ]
        : [
            { x: x - 2 + v, z: z - 1 },
            { x: x + 2, z: z + 1 },
            { x: x - 1, z: z + 3 },
          ];
    this.required =
      task.kind === "collect"
        ? this.level === "expert"
          ? 3
          : 2
        : task.kind === "sequence"
          ? 3
          : task.kind === "stealth"
            ? 2
            : 1;
    if (["hit", "precision"].includes(task.kind)) {
      const halfY = this.difficulty.targets * 0.35 - 0.01;
      const candidates = [2, 0, -2, 4, -4].map((dx) => ({
        x: x + dx,
        z: z - 2,
      }));
      const free = candidates.find((p) =>
        hasBoxSpace(
          g.physics.world,
          { x: p.x, y: halfY + 0.02, z: p.z },
          { x: 0.47, y: halfY, z: 0.37 },
        ),
      );
      if (!free) {
        this.pending = true;
        this.targets = [];
        return;
      }
      const tx = free.x,
        tz = free.z;
      this.targets = g.props.tower(
        "escape",
        tx,
        tz,
        "#d4ac5d",
        this.difficulty.targets,
        1,
      );
      this.targets.forEach((t) => (t.escapeTask = true));
      this.target = { x: tx, z: tz };
      this.shotPoint = { x: tx, z: tz + this.difficulty.precision + 1 };
      this.sign(
        task.kind === "precision" ? "BLANCO · DESDE AZUL" : "DERRIBA · F",
        tx,
        tz,
      );
      if (task.kind === "precision") {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1.1, 24),
          new THREE.MeshBasicMaterial({
            color: "#588fc5",
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(this.shotPoint.x, 0.055, this.shotPoint.z);
        this.visuals.add(ring);
        this.sign(
          "LANZA DESDE AQUÍ",
          this.shotPoint.x,
          this.shotPoint.z,
          "#356387",
        );
      }
    } else if (task.kind === "delivery") {
      const free = [0, -2, 2, 4]
        .map((dx) => ({ x: x + dx, z: z + 3 }))
        .find((p) =>
          hasBoxSpace(
            g.physics.world,
            { x: p.x, y: 0.8, z: p.z },
            { x: 0.62, y: 0.78, z: 0.46 },
          ),
        );
      if (!free) {
        this.pending = true;
        return;
      }
      const cart = g.props.cart(free.x, free.z);
      cart.escapeTask = true;
      cart.delivery = true;
      this.cart = cart;
      this.target = { x, z: z - 2 };
      g.deliveryPad.position.set(x, 0.045, z - 2);
      g.deliveryPad.scale.setScalar(this.difficulty.radius / 2);
      g.deliveryPad.visible = true;
      this.sign("ENTREGA AQUÍ", x, z - 2);
      this.sign("CARRITO · EMPUJA E", x, z + 3);
    } else
      this.points
        .slice(0, this.required)
        .forEach((p, i) => this.marker(p, i + 1, task.kind));
    g.navTimer = 0;
    g.shots = Math.max(g.shots, 8);
    g.crowd.autoWait = task.kind === "delivery";
    if (announce) g.ui.radio(this.plan.names[this.stage], task.story, 9);
  }
  objective() {
    const t = this.task,
      g = this.g;
    if (this.pending) {
      const [x, z] = this.plan.locations[this.stage];
      return { x, z, label: "Despeja el centro de la sala" };
    }
    if (!t) return { x: -44, z: 23, label: "ASCENSOR · E para salir" };
    if (["hit", "precision"].includes(t.kind)) {
      if (!g.shots) {
        const p = g.nearestDispenser();
        return { x: p[0], z: p[1], label: "Recarga · E", reload: true };
      }
      return {
        ...(t.kind === "precision" ? this.shotPoint : this.target),
        label: this.status().title,
      };
    }
    if (t.kind === "delivery") {
      const p = this.cart.body.translation();
      return {
        ...(dist(g.character.position, p) > 4 ? p : this.target),
        label: "Empuja el carrito · E",
      };
    }
    return {
      ...(this.points.find((p) => p.mesh?.visible) || this.points[0]),
      label: this.status().title,
    };
  }
  status() {
    const t = this.task;
    if (this.pending)
      return {
        title: "Despeja el centro de la sala",
        detail:
          "Apártate y mueve los muebles del centro. El encargo aparecerá cuando haya espacio seguro.",
        count: 0,
        total: 1,
      };
    if (!t)
      return {
        title: "Salgan juntos por el ascensor",
        detail:
          "E frente a la cabina abierta. La puntuación no bloquea la salida.",
        count: 3,
        total: 3,
      };
    const instructions = {
      hit: `F: derriba ${this.difficulty.targets} archivadores dorados. Ajusta la potencia abajo.`,
      precision: `Sitúate en el círculo AZUL y lanza con F contra la pila dorada.`,
      delivery: `Ponte detrás del carrito y pulsa E varias veces hacia el círculo AMARILLO. H permite esperar al equipo.`,
      collect: `Recoge ${this.required} objetos marcados: acércate y pulsa E.`,
      sequence: `Pulsa E junto a las estaciones en orden: 1 → 2 → 3. Equivocarte reinicia la secuencia.`,
      hold: `Mantén E junto al terminal durante ${this.difficulty.hold} segundos. Alejarte o soltar reinicia el progreso.`,
      stealth: `Pulsa E en los ${this.required} controles sin ser visto. Si te descubren, repite los controles.`,
    };
    const count = ["hit", "precision"].includes(t.kind)
      ? this.targets.filter((t) => t.scored).length
      : t.kind === "hold"
        ? Math.min(this.hold, this.difficulty.hold)
        : this.progress;
    const total = ["hit", "precision"].includes(t.kind)
      ? this.targets.length
      : t.kind === "hold"
        ? this.difficulty.hold
        : this.required;
    return { title: t.name, detail: instructions[t.kind], count, total };
  }
  nearby() {
    if (this.pending) return null;
    if (!this.task)
      return dist(this.g.character.position, { x: -44, z: 23 }) < 2.8
        ? { type: "escape", label: "Entrar al ascensor y salir juntos" }
        : null;
    if (["hit", "precision", "delivery"].includes(this.task.kind)) return null;
    const i = this.points
      .slice(0, this.required)
      .findIndex(
        (p) => dist(this.g.character.position, p) < 1.9 && p.mesh.visible,
      );
    return i >= 0
      ? {
          type: "escape",
          index: i,
          label:
            this.task.kind === "hold"
              ? "Mantén E · Trabajar en el terminal"
              : `E · Estación ${i + 1}`,
        }
      : null;
  }
  interact(near) {
    if (!this.task) {
      if (this.g.crowd.teammates.length === 3) this.g.finish(true);
      return;
    }
    const t = this.task;
    if (t.kind === "hold") return;
    if (t.kind === "stealth" && this.g.seen) {
      this.g.ui.toast("Te están viendo. Ocúltate detrás de una pared.");
      return;
    }
    if (t.kind === "sequence" && near.index !== this.progress) {
      this.resetStations();
      this.g.ui.toast("Orden incorrecto. Empieza por la estación 1.");
      return;
    }
    const p = this.points[near.index];
    if (!p?.mesh.visible) return;
    p.mesh.visible = p.ring.visible = p.label.visible = false;
    this.progress++;
    if (this.progress >= this.required) this.complete();
    else this.g.refreshRoute();
  }
  resetStations() {
    this.progress = 0;
    for (const p of this.points)
      if (p.mesh) p.mesh.visible = p.ring.visible = p.label.visible = true;
  }
  canThrow() {
    if (this.pending) return false;
    if (this.task?.kind !== "precision") return true;
    if (dist(this.g.character.position, this.shotPoint) > 1.5) {
      this.g.ui.toast("Prueba de precisión: dispara desde el círculo azul.");
      return false;
    }
    return true;
  }
  step(dt) {
    const g = this.g,
      t = this.task;
    if (!t) return;
    if (this.pending) {
      this.retry -= dt;
      if (this.retry <= 0) this.activate(false);
      return;
    }
    if (["hit", "precision"].includes(t.kind)) {
      if (t.kind === "precision" && !this.validShot)
        for (const item of this.targets)
          if (item.scored) {
            item.scored = false;
            item.body.setTranslation(item.initial, true);
            item.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
            item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }
      if (this.targets.every((t) => t.scored)) this.complete();
    } else if (t.kind === "delivery") {
      this.hold =
        dist(this.cart.body.translation(), this.target) < this.difficulty.radius
          ? this.hold + dt
          : 0;
      if (this.hold > 0.4) this.complete();
    } else if (t.kind === "hold") {
      this.hold =
        dist(g.character.position, this.points[0]) < 1.9 && g.input.has("KeyE")
          ? this.hold + dt
          : 0;
      if (this.hold >= this.difficulty.hold) this.complete();
    } else if (t.kind === "stealth" && g.seen && this.progress) {
      this.resetStations();
      g.ui.toast(
        "Te descubrieron: repite los controles, sin perder el rescate.",
      );
    }
  }
  complete() {
    const g = this.g,
      old = this.task;
    g.score += 200;
    this.taskIndex++;
    g.ui.toast(`✓ ${old.name} · Encargo completado`);
    g.audio.play("bonus");
    if (this.taskIndex === this.plan.tasks[this.stage].length) {
      g.crowd.recruit(ids[this.stage]);
      g.completed.push(ids[this.stage]);
      this.stage++;
      this.taskIndex = 0;
      g.unlocked = Math.min(3, this.stage + 1);
      g.suspicion = Math.max(0, g.suspicion - 20);
    }
    this.activate();
    g.saveCheckpoint();
    g.refreshRoute();
    g.ui.update(g);
    if (this.stage === 3)
      g.ui.radio(
        "EQUIPO",
        "Tenemos todo. ¡Al ascensor de recepción! E para salir juntos.",
        12,
      );
  }
}
