import RAPIER from "@dimforge/rapier3d-compat";

export { RAPIER };
export const STEP = 1 / 60;
export async function createPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP;
  world.numSolverIterations = 8;
  const events = new RAPIER.EventQueue(true);
  const response = await fetch("./assets/models/office-colliders.json");
  if (!response.ok)
    throw new Error(`No se cargaron las colisiones: ${response.status}`);
  const bounds = await response.json();
  const walls = new Set();
  const invisibleBounds = new Set();
  for (const item of bounds) {
    const { position: p, size: s } = item;
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(...p),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(s[0] / 2, s[1] / 2, s[2] / 2)
        .setFriction(0.65)
        .setRestitution(0.2),
      body,
    );
    if (/wall|limit|sill/i.test(item.name)) walls.add(collider.handle);
    if (/limit/i.test(item.name)) invisibleBounds.add(collider.handle);
  }
  return { world, events, walls, invisibleBounds, bounds };
}

export function hasSpace(world, position, radius, excludeBody) {
  if (
    Math.abs(position.x) > 9.6 - radius ||
    Math.abs(position.z) > 8.6 - radius ||
    position.y < radius
  )
    return false;
  world.updateSceneQueries();
  return !world.intersectionWithShape(
    position,
    { x: 0, y: 0, z: 0, w: 1 },
    new RAPIER.Ball(radius),
    undefined,
    undefined,
    undefined,
    excludeBody,
  );
}
