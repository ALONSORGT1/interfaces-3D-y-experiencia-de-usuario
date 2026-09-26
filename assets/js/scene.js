import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { officeMaterials, projectUV } from "./office-materials.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Batch the static GLB by material: a larger map should not mean thousands of draw calls.
function batchGLB(root, surfaces) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = surfaces.materials.get(o.material.name) || o.material;
    if (/Sofa.*(seat|back|arm)/i.test(o.name))
      o.material = surfaces.prop(
        "#" + o.material.color.getHexString(),
        "fabric",
      );
    const pos = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const key = `${o.material.uuid}/${Math.floor(pos.x / 20)}/${Math.floor(pos.z / 20)}`;
    if (!groups.has(key))
      groups.set(key, { material: o.material, geometries: [] });
    let geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (
      /Sofa.*(seat|back|arm)|Desk.top|Shared.table|Lounge.table.top/i.test(
        o.name,
      )
    ) {
      geometry.dispose();
      const position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      o.matrixWorld.decompose(position, rotation, scale);
      geometry = new RoundedBoxGeometry(
        scale.x,
        scale.y,
        scale.z,
        2,
        Math.min(scale.x, scale.y, scale.z) * 0.2,
      )
        .applyQuaternion(rotation)
        .translate(position.x, position.y, position.z);
    }
    if (geometry.index) {
      const indexed = geometry;
      geometry = indexed.toNonIndexed();
      indexed.dispose();
    }
    groups
      .get(key)
      .geometries.push(projectUV(geometry, o.material.userData.uvMeters || 1));
  });
  const batch = new THREE.Group();
  batch.name = "Campus loaded from GLB / material batches";
  for (const { material, geometries } of groups.values()) {
    const merged = mergeGeometries(geometries, false);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    batch.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  return batch;
}

// Keep animated bone/group nodes intact; only combine rigid pieces inside each node.
function batchActor(root) {
  const nodes = [];
  root.traverse((o) => {
    if (!o.isMesh) nodes.push(o);
  });
  for (const node of nodes) {
    const groups = new Map();
    for (const child of [...node.children])
      if (child.isMesh) {
        child.updateMatrix();
        if (!groups.has(child.material)) groups.set(child.material, []);
        groups.get(child.material).push(child);
      }
    for (const [mat, children] of groups) {
      if (children.length < 2) continue;
      const pieces = children.map((child) =>
        child.geometry.clone().applyMatrix4(child.matrix),
      );
      const merged = new THREE.Mesh(mergeGeometries(pieces, false), mat);
      pieces.forEach((g) => g.dispose());
      merged.name =
        children.find((c) => c.name === "Head")?.name || children[0].name;
      children.forEach((child) => node.remove(child));
      node.add(merged);
    }
  }
}

export async function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3f0e8");
  scene.fog = new THREE.Fog("#f3f0e8", 100, 250);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(
    43,
    innerWidth / innerHeight,
    0.1,
    350,
  );
  scene.add(new THREE.HemisphereLight(0xe7f2ff, 0x667077, 1.05));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  scene.environment = pmrem.fromScene(environment, 0.04).texture;
  scene.environmentIntensity = 0.4;
  environment.dispose();
  pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xfff4e5, 2.1);
  sun.position.set(15, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 2;
  Object.assign(sun.shadow.camera, {
    left: -22,
    right: 22,
    top: 22,
    bottom: -22,
    near: 1,
    far: 90,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: "#f3f0e8", roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.75;
  ground.receiveShadow = true;
  scene.add(ground);
  const loader = new GLTFLoader();
  const [campus, employee, map, surfaces] = await Promise.all([
    loader.loadAsync("./assets/models/campus.glb"),
    loader.loadAsync("./assets/models/employee.glb"),
    fetch("./assets/models/campus.json").then((r) => {
      if (!r.ok) throw new Error("Campus data unavailable");
      return r.json();
    }),
    officeMaterials(renderer),
  ]);
  const office = batchGLB(campus.scene, surfaces);
  scene.add(office);
  batchActor(employee.scene);
  employee.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  for (const room of map.rooms) {
    const z = room.z < 0 ? -6.62 : room.z > 0 ? 6.62 : 0;
    if (room.z !== 0) {
      const front = addSign(
        scene,
        room.name,
        [room.x, 3.22, z],
        5.3,
        0.4,
        "#f3f0e8",
        "#31594c",
      );
      if (room.z > 0) front.rotation.y = Math.PI;
    }
  }
  for (const [x, z] of map.dispensers)
    addSign(
      scene,
      "RECARGA / E",
      [x, 1.93, z + 0.27],
      1.13,
      0.3,
      "#ddf568",
      "#264f44",
    );
  const exit = addSign(
    scene,
    "ASCENSOR · PLANTA 01",
    [-44, 3.6, 22.45],
    4,
    0.6,
    "#f3f0e8",
    "#507a5b",
  );
  exit.rotation.y = Math.PI;
  const elevatorDoors = [];
  for (const side of [-1, 1]) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 3, 0.08),
      surfaces.materials.get("metal"),
    );
    door.position.set(-44 + side * 0.95, 1.55, 22.65);
    scene.add(door);
    elevatorDoors.push(door);
  }
  const elevatorStatus = addSign(
    scene,
    "BLOQUEADO · RESCATA AL EQUIPO",
    [-44, 2.8, 22.54],
    3.6,
    0.36,
    "#f1cc87",
    "#264f44",
  );
  elevatorStatus.rotation.y = Math.PI;
  function setElevatorOpen(open) {
    elevatorDoors.forEach(
      (door, i) =>
        (door.position.x = -44 + (i ? 1 : -1) * (open ? 1.86 : 0.95)),
    );
    elevatorDoors.forEach((door) => (door.scale.x = open ? 0.06 : 1));
    elevatorStatus.visible = !open;
    elevatorHook?.(!open);
  }
  // Only two nearby practical lights run at once; no extra shadow maps.
  const practicalLights = Array.from({ length: 2 }, () => {
    const light = new THREE.PointLight(0xfff5df, 18, 15, 2);
    scene.add(light);
    return light;
  });
  let lightingTimer = 0;
  const lightPositions = map.rooms
    .filter((r) => r.z !== 0)
    .flatMap((r) =>
      [-4, 4].map((dx) => new THREE.Vector3(r.x + dx, 3.45, r.z)),
    );
  let elevatorHook = null;
  function bindElevatorPhysics(callback) {
    elevatorHook = callback;
    callback(elevatorStatus.visible);
  }
  let intro = true;
  function heroCamera() {
    intro = true;
    practicalLights.forEach((l) => (l.intensity = 0));
    scene.fog.near = 240;
    scene.fog.far = 350;
    camera.position.set(89, 97, 119);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      -innerWidth * (innerWidth > 760 ? 0.22 : 0.2),
      -innerHeight * 0.025,
      innerWidth,
      innerHeight,
    );
    sun.position.set(10, 70, 35);
    sun.target.position.set(0, 0, 0);
  }
  function playCamera() {
    intro = false;
    lightingTimer = 19;
    practicalLights.forEach((l) => (l.intensity = 18));
    scene.fog.near = 65;
    scene.fog.far = 145;
    camera.clearViewOffset();
  }
  function updateLighting(p) {
    if (intro) return;
    if (++lightingTimer % 20 === 0) {
      const nearest = [...lightPositions]
        .sort(
          (a, b) =>
            (a.x - p.x) ** 2 +
            (a.z - p.z) ** 2 -
            ((b.x - p.x) ** 2 + (b.z - p.z) ** 2),
        )
        .slice(0, 2);
      practicalLights.forEach((l, i) => l.position.copy(nearest[i]));
    }
    sun.position.set(p.x + 15, 40, p.z + 20);
    sun.target.position.set(p.x, 0, p.z);
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (intro) heroCamera();
  }
  heroCamera();
  window.addEventListener("resize", resize);
  return {
    scene,
    camera,
    renderer,
    office,
    employee,
    map,
    heroCamera,
    playCamera,
    updateLighting,
    setElevatorOpen,
    bindElevatorPhysics,
    surfaces,
  };
}

export function addSign(
  scene,
  text,
  position,
  width,
  height,
  ink = "#173f36",
  background = "#f3f0e8",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.max(64, Math.round((768 * height) / width));
  const c = canvas.getContext("2d");
  c.fillStyle = background;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = ink;
  c.font = `700 ${Math.floor(canvas.height * 0.55)}px Arial`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.93);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}
