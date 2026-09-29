import * as THREE from "three";

// One GPU texture per map. UVs carry physical scale, so instances share materials.
export async function officeMaterials(renderer) {
  const loader = new THREE.TextureLoader(),
    maps = {};
  await Promise.all(
    ["oak", "plaster", "concrete", "fabric"].map(async (name) => {
      const textures = await Promise.all(
        ["color", "normal", "roughness"].map(async (kind) => {
          const t = await loader.loadAsync(
            `./assets/textures/pbr/${name}-${kind}.webp`,
          );
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(1, 1);
          t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          t.colorSpace =
            kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          return t;
        }),
      );
      maps[name] = {
        map: textures[0],
        normalMap: textures[1],
        roughnessMap: textures[2],
      };
    }),
  );
  const materials = new Map();
  function make(name, color, surface = "plaster", options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      ...maps[surface],
      roughness: 0.85,
      metalness: 0,
      ...options,
    });
    material.name = name;
    material.normalScale.setScalar(
      surface === "plaster"
        ? 0.07
        : surface === "fabric"
          ? 0.25
          : surface === "concrete"
            ? 0.15
            : 0.3,
    );
    material.userData.uvMeters =
      surface === "oak"
        ? 1.7
        : surface === "fabric"
          ? 0.8
          : surface === "concrete"
            ? 3
            : 2;
    materials.set(name, material);
    return material;
  }
  make("wall", "#eef1ef");
  make("ceiling", "#d8dde1", "plaster", { roughness: 0.95 });
  make("ceilingTrim", "#66757d", "plaster", { metalness: 0.35, roughness: 0.55 });
  make("white", "#f8fafb");
  make("desk", "#edf1f3", "plaster", { roughness: 0.45 });
  make("blue", "#2773cf");
  make("mint", "#3a9d83");
  make("gold", "#edb72f");
  make("coral", "#d95d50");
  make("pink", "#cb6474");
  make("cream", "#e6dac4");
  make("wood", "#e2c5a1", "oak", { roughness: 0.65 });
  make("hall", "#d9dfe1", "concrete", { roughness: 0.73 });
  make("carpet", "#b3c1c8", "fabric", { roughness: 1 });
  make("carpetBlue", "#59778d", "fabric", { roughness: 1 });
  make("carpetCoral", "#bc8f88", "fabric", { roughness: 1 });
  make("carpetGreen", "#7f9c90", "fabric", { roughness: 1 });
  make("trim", "#38474f", "plaster", { metalness: 0.7, roughness: 0.32 });
  make("dark", "#182d3a", "plaster", { metalness: 0.4, roughness: 0.38 });
  make("metal", "#a5b4c1", "plaster", { metalness: 0.9, roughness: 0.28 });
  make("screen", "#295973", "plaster", {
    emissive: "#2c7cbe",
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  make("light", "#fff5db", "plaster", {
    emissive: "#fff0d0",
    emissiveIntensity: 3,
    roughness: 0.5,
  });
  // Only three independent emissive materials; all other fixtures share the steady one.
  for (let i = 0; i < 3; i++) {
    const material = materials.get("light").clone();
    material.name = `pulse${i}`;
    materials.set(material.name, material);
  }
  const glass = new THREE.MeshPhysicalMaterial({
    name: "glass",
    color: "#b7d6e2",
    metalness: 0.05,
    roughness: 0.14,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.FrontSide,
    envMapIntensity: 1.2,
  });
  glass.forceSinglePass = true;
  glass.userData.uvMeters = 1;
  materials.set("glass", glass);
  const cache = new Map();
  function prop(color, surface = "plaster") {
    const key = `prop/${surface}/${color}`;
    if (!cache.has(key))
      cache.set(
        key,
        make(key, color, surface, {
          roughness: surface === "fabric" ? 0.95 : 0.58,
          metalness: surface === "plaster" ? 0.12 : 0,
        }),
      );
    return cache.get(key);
  }
  return { materials, maps, prop };
}

export function projectUV(geometry, meters = 1) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      nx = Math.abs(n.getX(i)),
      ny = Math.abs(n.getY(i)),
      nz = Math.abs(n.getZ(i));
    // Axis-aligned surfaces use world metres, never a stretched 0..1 box face.
    const a = ny > nx && ny > nz ? x : nx > nz ? z : x,
      b = ny > nx && ny > nz ? z : y;
    uv[i * 2] = a / meters;
    uv[i * 2 + 1] = b / meters;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}
