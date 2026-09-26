import RAPIER from "@dimforge/rapier3d-compat";

export { RAPIER };
export const STEP = 1 / 60;
export function hasBoxSpace(world, position, halfExtents) {
  if (
    Math.abs(position.x) + halfExtents.x > 49.8 ||
    Math.abs(position.z) + halfExtents.z > 26.8 ||
    position.y - halfExtents.y < 0
  )
    return false;
  world.updateSceneQueries();
  return !world.intersectionWithShape(
    position,
    { x: 0, y: 0, z: 0, w: 1 },
    new RAPIER.Cuboid(halfExtents.x, halfExtents.y, halfExtents.z),
  );
}
export async function createPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP;
  world.numSolverIterations = 8;
  world.integrationParameters.maxCcdSubsteps = 4;
  world.integrationParameters.normalizedPredictionDistance = 0.08;
  world.integrationParameters.contact_natural_frequency = 60;
  const events = new RAPIER.EventQueue(true);
  const response = await fetch("./assets/models/campus-colliders.json");
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
      (item.shape === "cylinder"
        ? RAPIER.ColliderDesc.cylinder(s[1] / 2, s[0] / 2)
        : RAPIER.ColliderDesc.cuboid(s[0] / 2, s[1] / 2, s[2] / 2)
      )
        .setFriction(0.65)
        .setRestitution(0.2),
      body,
    );
    if (/wall|limit|boundary|divider|front|partition|window/i.test(item.name))
      walls.add(collider.handle);
    if (/limit/i.test(item.name)) invisibleBounds.add(collider.handle);
  }
  let elevatorBody = null;
  function setElevatorLocked(locked) {
    if (locked && !elevatorBody) {
      elevatorBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(-44, 1.55, 22.65),
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(1.9, 1.5, 0.06).setFriction(0.5),
        elevatorBody,
      );
    } else if (!locked && elevatorBody) {
      world.removeRigidBody(elevatorBody);
      elevatorBody = null;
    }
    world.updateSceneQueries();
  }
  return { world, events, walls, invisibleBounds, bounds, setElevatorLocked };
}

export function hasSpace(world, position, radius, excludeBody) {
  if (
    Math.abs(position.x) > 49.8 - radius ||
    Math.abs(position.z) > 26.8 - radius ||
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
