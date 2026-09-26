import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { projectUV } from "./office-materials.js";
const uvGeometryCache = new Map();
import { RAPIER, hasSpace, hasBoxSpace } from "./physics.js";

const cube = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 20, 14);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const leaf = new THREE.ConeGeometry(1, 1, 5);
const materials = new Map();
function material(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
  return materials.get(color);
}
function part(group, geometry, size, position, color) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
const box = (g, s, p, c) => part(g, cube, s, p, c);
export function ballMesh(radius = 0.32, color = "#c87869") {
  const g = new THREE.Group();
  part(g, sphere, [radius, radius, radius], [0, 0, 0], color);
  for (const [x, z] of [
    [-0.07, -0.05],
    [0.06, -0.05],
    [0, 0.08],
  ])
    part(g, sphere, [0.035, 0.014, 0.035], [x, radius * 0.95, z], "#5e453d");
  return g;
}

export class Props {
  constructor(view, physics) {
    this.view = view;
    this.physics = physics;
    this.items = [];
    this.byCollider = new Map();
    this.bonuses = [];
    this.balls = [];
    this.serial = 0;
  }
  add(type, mesh, position, colliders, options = {}) {
    if (this.view.surfaces && ["target", "cart", "chair"].includes(type))
      mesh.traverse((o) => {
        if (!o.isMesh) return;
        const color = "#" + o.material.color.getHexString();
        const isMetal = ["#486457", "#36594d", "#496754", "#385244"].includes(
          color,
        );
        const surface =
          type === "cart" && color === "#bc9573"
            ? "oak"
            : type === "chair" && color === "#50786c"
              ? "fabric"
              : "plaster";
        o.material = isMetal
          ? this.view.surfaces.materials.get("metal")
          : this.view.surfaces.prop(color, surface);
        const key = `${o.geometry.uuid}/${o.scale.toArray().join(",")}/${surface}`;
        if (!uvGeometryCache.has(key)) {
          const scaled = o.geometry
            .clone()
            .scale(o.scale.x, o.scale.y, o.scale.z);
          projectUV(scaled, o.material.userData.uvMeters);
          const geo = o.geometry.clone();
          geo.setAttribute("uv", scaled.attributes.uv);
          scaled.dispose();
          uvGeometryCache.set(key, geo);
        }
        o.geometry = uvGeometryCache.get(key);
      });
    // A rigid chair/cart moves as one object: batch its decorative pieces by material.
    if (["target", "cart", "chair"].includes(type)) {
      mesh.updateMatrixWorld(true);
      const groups = new Map();
      mesh.traverse((o) => {
        if (o.isMesh) {
          if (!groups.has(o.material)) groups.set(o.material, []);
          groups
            .get(o.material)
            .push(o.geometry.clone().applyMatrix4(o.matrixWorld));
        }
      });
      mesh.clear();
      for (const [mat, parts] of groups) {
        const merged = mergeGeometries(parts, false);
        parts.forEach((g) => g.dispose());
        const part = new THREE.Mesh(merged, mat);
        part.userData.ownedGeometry = true;
        part.castShadow = part.receiveShadow = true;
        mesh.add(part);
      }
    }
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(...position)
      .setLinearDamping(options.damping ?? 0.25)
      .setAngularDamping(0.35)
      .setCcdEnabled(type === "ball");
    const body = this.physics.world.createRigidBody(desc);
    const item = {
      id: ++this.serial,
      type,
      mesh,
      body,
      colliders: [],
      initial: { x: position[0], y: position[1], z: position[2] },
      scored: false,
      ...options,
    };
    for (const colliderDesc of colliders) {
      const col = this.physics.world.createCollider(
        colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
      );
      item.colliders.push(col);
      this.byCollider.set(col.handle, item);
    }
    mesh.position.set(...position);
    this.view.scene.add(mesh);
    this.items.push(item);
    return item;
  }
  reset() {
    for (const item of [...this.items]) this.remove(item);
    for (const bonus of [...this.bonuses]) this.collect(bonus);
    this.bonuses = [];
    this.balls = [];
    this.serial = 0;
    this.tower("lola", -36, 10, "#d8af7c", 3, 2);
    this.tower("archive", -20, -17, "#91b5a1", 3, 2);
    for (const [x, z] of [
      [15, -19],
      [20, -22],
      [25, -19],
    ])
      this.server(x, z);
    for (const [x, z] of [
      [-35, 21],
      [-35, 17],
      [-25, -19],
      [-15, -19],
      [-5, -19],
      [5, -19],
      [-22, 18],
      [5, 23],
      [16, -17],
      [25, -17],
      [36, 20],
      [44, 20],
    ])
      this.chair(x, z);
    this.deliveryCart = this.cart(0, 22);
    this.deliveryCart.delivery = true;
    this.deliveryCart.mesh.children.forEach((o) => {
      if (o.isMesh && o.material.color.getHexString() === "bc9573")
        o.material = material("#ddbd60");
    });
    this.cart(23, 18);
    this.cart(-42, -20);
    for (const [x, z] of [
      [-47, 8],
      [-30, 4],
      [-10, 4],
      [10, 4],
      [30, 4],
      [47, 8],
      [35, 20],
      [45, 15],
      [-15, 22],
    ])
      this.plant(x, z);
    this.coffee(3, 1.6, 22);
    // Settle the freshly stacked objects before establishing scoring baselines.
    for (let n = 0; n < 100; n++) this.physics.world.step(this.physics.events);
    this.physics.events.drainCollisionEvents(() => {});
    for (const item of this.items)
      item.initial = { ...item.body.translation() };
    this.sync();
    for (const p of [
      [-38, 0.4, 20],
      [-22, 0.4, -12],
      [2, 0.4, 10],
      [22, 0.4, -10],
      [40, 0.4, 14],
    ])
      this.spawnBonus(p);
  }
  tower(mission, x, z, color, rows = 3, columns = 2, wave = 0) {
    const created = [];
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const g = new THREE.Group();
        box(g, [0.92, 0.68, 0.72], [0, 0, 0], color);
        for (const y of [-0.17, 0.16]) {
          box(g, [0.83, 0.27, 0.04], [0, y, 0.375], color);
          box(g, [0.22, 0.025, 0.055], [0, y + 0.025, 0.412], "#486457");
          box(g, [0.16, 0.065, 0.01], [0.23, y, 0.401], "#f6efd9");
        }
        created.push(
          this.add(
            "target",
            g,
            [x + (col - (columns - 1) / 2) * 0.98, 0.35 + row * 0.7, z],
            [
              RAPIER.ColliderDesc.cuboid(0.46, 0.34, 0.36)
                .setDensity(3)
                .setFriction(0.6)
                .setRestitution(0.04),
            ],
            { mission, wave },
          ),
        );
      }
    return created;
  }
  server(x, z) {
    const g = new THREE.Group();
    box(g, [0.9, 1.7, 0.75], [0, 0, 0], "#4b6877");
    for (let y = -0.6; y <= 0.6; y += 0.3) {
      box(g, [0.72, 0.15, 0.03], [0, y, 0.395], "#263d43");
      box(g, [0.08, 0.045, 0.025], [0.25, y, 0.42], "#bedd8a");
    }
    return this.add(
      "target",
      g,
      [x, 0.86, z],
      [
        RAPIER.ColliderDesc.cuboid(0.45, 0.85, 0.38)
          .setDensity(2)
          .setFriction(0.5),
      ],
      { mission: "servers", wave: 0 },
    );
  }
  spawnWave(wave) {
    const anchors = [
      [37, -18],
      [43, -18],
      [40, -21],
    ];
    const anchor = anchors[wave];
    if (!anchor) return [];
    const candidates = [
      anchor,
      [anchor[0], anchor[1] + 2],
      [anchor[0] - 2, anchor[1] + 2],
      [anchor[0] + 2, anchor[1] + 2],
    ];
    // Validate the full height of the new tower, not just its base.
    const p = candidates.find(([x, z]) =>
      hasBoxSpace(
        this.physics.world,
        { x, y: 1.05, z },
        { x: 0.47, y: 1.04, z: 0.37 },
      ),
    );
    if (!p) return [];
    return this.tower("director", p[0], p[1], "#cfae70", 3, 1, wave);
  }
  chair(x, z) {
    const g = new THREE.Group();
    box(g, [0.76, 0.17, 0.72], [0, 0.12, 0], "#50786c");
    box(g, [0.73, 0.72, 0.13], [0, 0.54, 0.3], "#50786c");
    box(g, [0.12, 0.48, 0.12], [0, -0.22, 0], "#36594d");
    box(g, [0.85, 0.07, 0.12], [0, -0.46, 0], "#36594d");
    box(g, [0.12, 0.07, 0.85], [0, -0.46, 0], "#36594d");
    for (const [dx, dz] of [
      [-0.38, 0],
      [0.38, 0],
      [0, -0.38],
      [0, 0.38],
    ])
      part(g, sphere, [0.09, 0.09, 0.09], [dx, -0.49, dz], "#294638");
    return this.add(
      "chair",
      g,
      [x, 0.6, z],
      [
        RAPIER.ColliderDesc.cuboid(0.38, 0.085, 0.36)
          .setTranslation(0, 0.12, 0)
          .setDensity(7),
        RAPIER.ColliderDesc.cuboid(0.365, 0.36, 0.065)
          .setTranslation(0, 0.54, 0.3)
          .setDensity(4),
        RAPIER.ColliderDesc.cuboid(0.43, 0.07, 0.43)
          .setTranslation(0, -0.46, 0)
          .setDensity(8),
      ],
      { damping: 0.5 },
    );
  }
  cart(x, z) {
    const g = new THREE.Group();
    box(g, [1.2, 0.12, 0.85], [0, -0.16, 0], "#bc9573");
    box(g, [0.055, 0.75, 0.055], [-0.52, 0.25, -0.34], "#496754");
    box(g, [0.055, 0.75, 0.055], [0.52, 0.25, -0.34], "#496754");
    box(g, [1.1, 0.06, 0.06], [0, 0.63, -0.34], "#496754");
    for (const dx of [-0.47, 0.47])
      for (const dz of [-0.3, 0.3]) {
        const w = part(
          g,
          cylinder,
          [0.12, 0.08, 0.12],
          [dx, -0.32, dz],
          "#385244",
        );
        w.rotation.z = Math.PI / 2;
      }
    box(g, [0.65, 0.48, 0.52], [0.05, 0.14, 0], "#e0c285");
    box(g, [0.5, 0.06, 0.36], [0.05, 0.4, 0], "#f7edcf");
    return this.add(
      "cart",
      g,
      [x, 0.45, z],
      [
        RAPIER.ColliderDesc.cuboid(0.6, 0.12, 0.43)
          .setTranslation(0, -0.16, 0)
          .setDensity(6),
        RAPIER.ColliderDesc.cuboid(0.325, 0.24, 0.26)
          .setTranslation(0.05, 0.14, 0)
          .setDensity(2),
        RAPIER.ColliderDesc.cuboid(0.56, 0.45, 0.045)
          .setTranslation(0, 0.2, -0.34)
          .setDensity(1),
      ],
      { damping: 0.12 },
    );
  }
  plant(x, z) {
    const g = new THREE.Group();
    part(g, cylinder, [0.28, 0.46, 0.28], [0, -0.08, 0], "#c78165");
    part(g, cylinder, [0.245, 0.04, 0.245], [0, 0.16, 0], "#4d5940");
    box(g, [0.04, 0.7, 0.04], [0, 0.48, 0], "#4e6e46");
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      const l = part(
        g,
        leaf,
        [0.18, 0.65, 0.09],
        [Math.sin(angle) * 0.2, 0.55 + (i % 3) * 0.13, Math.cos(angle) * 0.2],
        i % 2 ? "#648657" : "#8eaa72",
      );
      l.rotation.set(Math.sin(angle) * 0.6, angle, Math.cos(angle) * 0.65);
    }
    return this.add(
      "plant",
      g,
      [x, 0.34, z],
      [
        RAPIER.ColliderDesc.cylinder(0.23, 0.28)
          .setTranslation(0, -0.08, 0)
          .setDensity(6),
        RAPIER.ColliderDesc.cuboid(0.25, 0.4, 0.25)
          .setTranslation(0, 0.53, 0)
          .setDensity(0.15),
      ],
      { protected: true },
    );
  }
  coffee(x, y, z) {
    const g = new THREE.Group();
    box(g, [0.62, 0.85, 0.52], [0, 0, 0], "#3b5b50");
    box(g, [0.5, 0.36, 0.04], [0, 0.17, 0.28], "#e1cda4");
    box(g, [0.39, 0.1, 0.37], [0, -0.39, 0.3], "#254337");
    part(g, cylinder, [0.13, 0.2, 0.13], [0, -0.21, 0.28], "#f3e9ce");
    box(g, [0.14, 0.06, 0.03], [0.15, 0.27, 0.32], "#d39278");
    return this.add(
      "coffee",
      g,
      [x, y, z],
      [RAPIER.ColliderDesc.cuboid(0.31, 0.425, 0.32).setDensity(5)],
      { protected: true },
    );
  }
  spawnBall(
    position,
    velocity,
    shotId,
    mode = { mass: 3.2, restitution: 0.38, color: "#c87869" },
  ) {
    if (!hasSpace(this.physics.world, position, 0.33)) return null;
    const item = this.add(
      "ball",
      ballMesh(0.32, mode.color),
      [position.x, position.y, position.z],
      [
        RAPIER.ColliderDesc.ball(0.32)
          .setMass(mode.mass)
          .setFriction(0.48)
          .setRestitution(mode.restitution),
      ],
      { damping: 0.16, shotId, bounced: false, age: 0 },
    );
    item.body.setLinvel(velocity, true);
    item.body.setAngvel(
      { x: -velocity.z / 0.32, y: 0, z: velocity.x / 0.32 },
      true,
    );
    this.balls.push(item);
    return item;
  }
  spawnBonus(preferred) {
    const candidates = [
      preferred,
      [-38, 0.4, 20],
      [-22, 0.4, -12],
      [2, 0.4, 10],
      [22, 0.4, -10],
      [40, 0.4, 14],
      [-18, 0.4, 3],
      [-5, 0.4, 2],
      [14, 0.4, 2],
      [-32, 0.4, -16],
    ];
    const p = candidates.find(
      (c) =>
        c &&
        hasSpace(this.physics.world, { x: c[0], y: c[1], z: c[2] }, 0.3) &&
        !this.bonuses.some(
          (b) => Math.hypot(b.position.x - c[0], b.position.z - c[2]) < 0.8,
        ),
    );
    if (!p) return null;
    const g = new THREE.Group();
    box(g, [0.44, 0.07, 0.58], [0, 0, 0], "#e8d179");
    box(g, [0.27, 0.008, 0.04], [0, 0.04, -0.12], "#8f824f");
    box(g, [0.27, 0.008, 0.04], [0, 0.04, 0], "#8f824f");
    box(g, [0.18, 0.008, 0.04], [-0.045, 0.04, 0.12], "#8f824f");
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.37, 0.018, 6, 24),
      material("#d7b764"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.2;
    g.add(ring);
    g.position.set(...p);
    this.view.scene.add(g);
    const bonus = { mesh: g, position: new THREE.Vector3(...p) };
    this.bonuses.push(bonus);
    return bonus;
  }
  collect(bonus) {
    this.view.scene.remove(bonus.mesh);
    bonus.mesh.children
      .find((c) => c.geometry?.type === "TorusGeometry")
      ?.geometry.dispose();
    this.bonuses.splice(this.bonuses.indexOf(bonus), 1);
  }
  remove(item) {
    for (const c of item.colliders) this.byCollider.delete(c.handle);
    this.physics.world.removeRigidBody(item.body);
    this.view.scene.remove(item.mesh);
    item.mesh.traverse((o) => {
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    this.items = this.items.filter((i) => i !== item);
    this.balls = this.balls.filter((i) => i !== item);
  }
  sync() {
    for (const item of this.items) {
      item.mesh.position.copy(item.body.translation());
      item.mesh.quaternion.copy(item.body.rotation());
    }
  }
  update(dt, time, focus = null) {
    for (const b of this.bonuses) {
      b.mesh.position.y =
        b.position.y + Math.sin(time * 2.5 + b.position.x) * 0.08;
      b.mesh.rotation.y = time * 0.7;
    }
    this.sync();
    if (focus)
      for (const item of this.items) {
        const p = item.body.translation();
        item.mesh.visible = Math.hypot(p.x - focus.x, p.z - focus.z) < 48;
      }
  }
}
