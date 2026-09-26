import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Batch the static GLB by material: a larger map should not mean thousands of draw calls.
function batchGLB(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const key = o.material.uuid;
    if (!groups.has(key))
      groups.set(key, { material: o.material, geometries: [] });
    groups
      .get(key)
      .geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
  });
  const batch = new THREE.Group();
  batch.name = "Campus loaded from GLB / material batches";
  for (const { material, geometries } of groups.values()) {
    const merged = mergeGeometries(geometries, false);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    batch.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  return batch;
}

export async function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3f0e8");
  scene.fog = new THREE.Fog("#f3f0e8", 100, 250);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
  scene.add(new THREE.HemisphereLight(0xfff9e8, 0x718473, 2.2));
  const sun = new THREE.DirectionalLight(0xffedd5, 3);
  sun.position.set(15, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -32,
    right: 32,
    top: 32,
    bottom: -32,
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
  const [campus, employee, map] = await Promise.all([
    loader.loadAsync("./assets/models/campus.glb"),
    loader.loadAsync("./assets/models/employee.glb"),
    fetch("./assets/models/campus.json").then((r) => {
      if (!r.ok) throw new Error("Campus data unavailable");
      return r.json();
    }),
  ]);
  const office = batchGLB(campus.scene);
  scene.add(office);
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
        [room.x, 2.85, z],
        5.3,
        0.4,
        "#f3f0e8",
        "#31594c",
      );
      if (room.z > 0) front.rotation.y = Math.PI;
      const floor = addSign(
        scene,
        room.name,
        [room.x, 0.035, room.z],
        9,
        1.3,
        "#496859",
        room.color,
      );
      floor.rotation.x = -Math.PI / 2;
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
    "SALIDA / EQUIPO",
    [-44, 0.035, 23],
    5,
    2,
    "#f3f0e8",
    "#507a5b",
  );
  exit.rotation.x = -Math.PI / 2;
  let intro = true;
  function heroCamera() {
    intro = true;
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
    scene.fog.near = 65;
    scene.fog.far = 145;
    camera.clearViewOffset();
  }
  function updateLighting(p) {
    if (intro) return;
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
