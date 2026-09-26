import * as THREE from "three";
import { RAPIER } from "./physics.js";
import { NPCS } from "./campaign.js";

export class Crowd {
  constructor(view, physics, navigation) {
    this.view = view;
    this.physics = physics;
    this.navigation = navigation;
    this.people = [];
    const definitions = [
      ...NPCS,
      {
        id: "audit1",
        name: "AUDITOR A",
        role: "Seguridad",
        position: [-7, 0],
        color: "#696d79",
        guard: true,
        patrol: [
          [-10, 0],
          [16, 0],
        ],
      },
      {
        id: "audit2",
        name: "AUDITOR B",
        role: "Seguridad",
        position: [34, 0],
        color: "#696d79",
        guard: true,
        patrol: [
          [22, 0],
          [44, 0],
        ],
      },
    ];
    for (const def of definitions) {
      const model = view.employee.scene.clone(true);
      model.position.set(def.position[0], 0, def.position[1]);
      model.rotation.set(0, 0, 0);
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          if (o.name.startsWith("Shirt") || o.name.startsWith("Sleeve"))
            o.material.color.set(def.color);
          if (def.guard && o.name === "Head") o.material.color.set("#a3afb0");
        }
      });
      const mixer = new THREE.AnimationMixer(model),
        actions = Object.fromEntries(
          view.employee.animations.map((clip) => [
            clip.name,
            mixer.clipAction(clip),
          ]),
        );
      actions.Idle.play();
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
          def.position[0],
          0.97,
          def.position[1],
        ),
      );
      const collider = physics.world.createCollider(
        RAPIER.ColliderDesc.capsule(0.65, 0.28),
        body,
      );
      const controller = physics.world.createCharacterController(0.025);
      controller.enableSnapToGround(0.3);
      controller.enableAutostep(0.75, 0.2, true);
      controller.setApplyImpulsesToDynamicBodies(true);
      controller.setCharacterMass(18);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const c = canvas.getContext("2d");
      c.fillStyle = def.guard ? "#a44e43" : "#214b3e";
      c.fillRect(0, 0, 256, 64);
      c.font = "bold 29px Arial";
      c.fillStyle = "#fff4d8";
      c.textAlign = "center";
      c.fillText(def.name, 128, 43);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthTest: false }),
      );
      label.scale.set(1.35, 0.34, 1);
      label.position.y = 2.45;
      model.add(label);
      view.scene.add(model);
      const person = {
        ...def,
        model,
        mixer,
        actions,
        body,
        collider,
        controller,
        label,
        state: "Idle",
        recruited: false,
        route: [],
        waypoint: 0,
        repath: 0,
        patrolIndex: 0,
        vertical: 0,
      };
      if (def.guard) {
        const vision = new THREE.Mesh(
          new THREE.CircleGeometry(7.5, 30, -Math.PI * 0.31, Math.PI * 0.62),
          new THREE.MeshBasicMaterial({
            color: "#b16e4b",
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        vision.rotation.x = -Math.PI / 2;
        vision.position.y = 0.04;
        view.scene.add(vision);
        person.vision = vision;
      }
      this.people.push(person);
    }
  }
  rename(id, name) {
    const p = this.get(id);
    p.name = name;
    const c = p.label.material.map.image.getContext("2d");
    c.fillStyle = "#214b3e";
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = "#fff4d8";
    c.fillText(name.toUpperCase(), 128, 43);
    p.label.material.map.needsUpdate = true;
  }
  reset() {
    for (const p of this.people) {
      p.recruited = false;
      p.collider.setSensor(false);
      p.route = [];
      p.repath = this.people.indexOf(p) * 0.13;
      p.patrolIndex = 0;
      p.vertical = 0;
      p.body.setTranslation(
        { x: p.position[0], y: 0.97, z: p.position[1] },
        true,
      );
      p.body.setNextKinematicTranslation({
        x: p.position[0],
        y: 0.97,
        z: p.position[1],
      });
      p.model.position.set(p.position[0], 0.02, p.position[1]);
      p.model.rotation.y = 0;
      this.animate(p, "Idle");
    }
  }
  get(id) {
    return this.people.find((p) => p.id === id);
  }
  get teammates() {
    return this.people.filter((p) => p.recruited);
  }
  recruit(id) {
    const p = this.get(id);
    if (p) {
      p.recruited = true;
      p.collider.setSensor(true);
      p.controller.setApplyImpulsesToDynamicBodies(false);
      p.repath = this.people.indexOf(p) * 0.13;
    }
  }
  animate(p, state) {
    if (p.state === state) return;
    const next = p.actions[state];
    next.reset().play();
    p.actions[p.state]?.crossFadeTo(next, 0.2, true);
    p.state = state;
  }
  nearest(position, range = 2.6) {
    return this.people
      .filter((p) => !p.guard)
      .map((p) => ({
        p,
        d: Math.hypot(
          position.x - p.body.translation().x,
          position.z - p.body.translation().z,
        ),
      }))
      .filter((a) => a.d < range)
      .sort((a, b) => a.d - b.d)[0]?.p;
  }
  step(dt, game) {
    let seen = false;
    const player = game.character.position;
    for (const p of this.people) {
      const pos = p.body.translation();
      let target = null;
      if (p.recruited) {
        const index = this.teammates.indexOf(p),
          distance = Math.hypot(player.x - pos.x, player.z - pos.z);
        if (!this.waiting && !this.autoWait && distance > 4.5 + index * 1.1)
          target = { x: player.x, z: player.z };
      } else if (p.guard) {
        const patrol = p.patrol[p.patrolIndex];
        target = { x: patrol[0], z: patrol[1] };
        if (Math.hypot(pos.x - target.x, pos.z - target.z) < 1.5)
          p.patrolIndex = (p.patrolIndex + 1) % p.patrol.length;
        if (
          game.noise &&
          game.time - game.noise.time < 5 &&
          Math.hypot(pos.x - game.noise.x, pos.z - game.noise.z) < 18
        )
          target = game.noise;
      } else if (p.id.startsWith("extra")) {
        target = {
          x: p.position[0] + Math.sin(game.time * 0.12 + p.position[0]) * 2,
          z: p.position[1],
        };
      }
      p.repath -= dt;
      if (target && p.repath <= 0) {
        const obstacles = p.recruited
          ? game.props.items
              .filter((i) => i.type !== "ball")
              .map((i) => ({
                ...i.body.translation(),
                radius: i.type === "cart" ? 1.35 : 1.1,
              }))
          : [];
        p.route = this.navigation.route(pos, target, obstacles);
        if (!p.route.length) p.route = this.navigation.route(pos, target);
        p.waypoint = 0;
        p.repath = p.guard ? 1.4 : 1.8;
      }
      let dx = 0,
        dz = 0;
      if (target && p.route.length) {
        while (
          p.waypoint < p.route.length - 1 &&
          Math.hypot(
            p.route[p.waypoint].x - pos.x,
            p.route[p.waypoint].z - pos.z,
          ) < 0.55
        )
          p.waypoint++;
        const next = p.route[p.waypoint];
        dx = next.x - pos.x;
        dz = next.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.35) {
          const speed = p.guard
            ? game.escape?.difficulty.speed || 2.1
            : p.recruited
              ? 6
              : 1.1;
          dx = (dx / d) * speed * dt;
          dz = (dz / d) * speed * dt;
        } else dx = dz = 0;
      }
      p.vertical = p.controller.computedGrounded()
        ? -0.5
        : Math.max(-15, p.vertical - 9.81 * dt);
      p.controller.computeColliderMovement(
        p.collider,
        { x: dx, y: p.vertical * dt, z: dz },
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC |
          (p.recruited ? RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC : 0),
      );
      const move = p.controller.computedMovement();
      p.body.setNextKinematicTranslation({
        x: pos.x + move.x,
        y: pos.y + move.y,
        z: pos.z + move.z,
      });
      const moving = Math.hypot(dx, dz) > 0.001;
      if (moving) p.model.rotation.y = Math.atan2(-dx, -dz);
      this.animate(p, moving ? (p.recruited ? "Run" : "Walk") : "Idle");
      p.mixer.update(dt);
      if (p.guard) {
        p.vision.scale.setScalar((game.escape?.difficulty.sight || 7.5) / 7.5);
        const vx = player.x - pos.x,
          vz = player.z - pos.z,
          dist = Math.hypot(vx, vz),
          dot =
            (-Math.sin(p.model.rotation.y) * vx -
              Math.cos(p.model.rotation.y) * vz) /
            Math.max(0.01, dist);
        if (
          dist < (game.escape?.difficulty.sight || 7.5) &&
          (dot > 0.56 || dist < 1.5)
        ) {
          const origin = { x: pos.x, y: 1.5, z: pos.z },
            direction = {
              x: vx / Math.max(0.01, dist),
              y: 0,
              z: vz / Math.max(0.01, dist),
            };
          const obstruction = this.physics.world.castRay(
            new RAPIER.Ray(origin, direction),
            dist,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC |
              RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
          );
          if (!obstruction) seen = true;
        }
      }
    }
    return seen;
  }
  sync(focus) {
    for (const p of this.people) {
      const pos = p.body.translation();
      p.model.position.set(pos.x, pos.y - 0.95, pos.z);
      const distance = Math.hypot(pos.x - focus.x, pos.z - focus.z);
      p.label.visible = distance < 18;
      p.model.visible = distance < 55;
      if (p.vision) {
        p.vision.position.set(pos.x, 0.045, pos.z);
        p.vision.rotation.z = p.model.rotation.y + Math.PI / 2;
        p.vision.visible = distance < 30;
      }
    }
  }
}
