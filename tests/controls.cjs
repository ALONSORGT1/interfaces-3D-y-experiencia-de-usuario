const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const server = spawn(process.execPath, ["tools/serve.cjs"], {
  env: { ...process.env, PORT: "4176" },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const ready = new Promise((resolve, reject) => {
  server.stdout.once("data", resolve);
  server.once("error", reject);
});
let browser;
const passed = [];
(async () => {
  await ready;
  browser = await chromium.launch(
    process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {},
  );
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(new URL("?test=1", process.env.TEST_URL || "http://127.0.0.1:4176/").href);
  await page.waitForFunction(() => window.__game, { timeout: 60000 });
  await page.click("#start-button");
  await page.evaluate(() => {
    const g = __game;
    g.view.renderer.setAnimationLoop(null);
    g.escape.plan.tasks[0][0] = "encargo-01";
    g.escape.activate(false);
    g.character.body.setTranslation({ x: -40, y: 0.98, z: 0 }, true);
    g.character.body.setNextKinematicTranslation({ x: -40, y: 0.98, z: 0 });
  });
  await page.keyboard.down("w");
  await page.evaluate(() => __game.step());
  assert.equal(await page.evaluate(() => __game.character.state), "Walk");
  await page.keyboard.down("Shift");
  await page.evaluate(() => __game.step());
  assert.equal(await page.evaluate(() => __game.character.state), "Run");
  await page.keyboard.up("Shift");
  await page.keyboard.up("w");
  await page.evaluate(() => __game.step());
  assert.equal(await page.evaluate(() => __game.character.state), "Idle");
  await page.keyboard.press("f");
  assert.equal(await page.evaluate(() => __game.character.state), "Throw");
  passed.push("Teclado real activa Idle, Walk, Run y Throw");
  await page.keyboard.press("v");
  assert.equal(await page.evaluate(() => __game.input.firstPerson), true);
  await page.keyboard.press("v");
  assert.equal(await page.evaluate(() => __game.input.firstPerson), false);
  await page.keyboard.press("h");
  assert.equal(await page.evaluate(() => __game.crowd.waiting), true);
  await page.keyboard.press("h");
  assert.equal(await page.evaluate(() => __game.crowd.waiting), false);
  await page.keyboard.press("m");
  assert.equal(await page.evaluate(() => __game.state), "paused");
  await page.keyboard.press("m");
  await page.waitForFunction(() => __game.state === "playing");
  assert.equal(await page.evaluate(() => __game.state), "playing");
  passed.push("Teclas V, H y M alternan cámara, equipo y mapa correctamente");
  const collision = await page.evaluate(() => {
    const g = __game;
    g.crowd.recruit("lola");
    g.crowd.waiting = true;
    const npc = g.crowd.get("lola");
    npc.body.setTranslation({ x: -40, y: 0.98, z: -1 }, true);
    npc.body.setNextKinematicTranslation({ x: -40, y: 0.98, z: -1 });
    g.input.keys.add("KeyW");
    for (let i = 0; i < 60; i++) g.step();
    g.input.clear();
    return g.character.position.z;
  });
  assert(collision < -3.5);
  passed.push(
    "El jugador atraviesa la posición de un compañero sin quedar bloqueado",
  );
  const spawnCheck = await page.evaluate(async () => {
    const g = __game,
      r = g.escape,
      { RAPIER } = await import("./assets/js/physics.js"),
      [x, z] = r.plan.locations[0];
    r.activate(false);
    r.clear();
    const body = g.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, 3, z),
    );
    g.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(8, 3, 8), body);
    r.activate(false);
    const blocked = r.pending && r.targets.length === 0;
    g.physics.world.removeRigidBody(body);
    r.step(2);
    return {
      blocked,
      resumed: !r.pending && r.targets.length === r.difficulty.targets,
    };
  });
  assert(spawnCheck.blocked && spawnCheck.resumed);
  passed.push(
    "Si toda la zona está ocupada no aparece la pila; se reintenta al despejarse",
  );
  await page.evaluate(() => {
    __game.start();
    __game.ui.update(__game);
    __game.view.renderer.render(__game.view.scene, __game.view.camera);
  });
  await page.screenshot({ path: "test-results/final-game.png" });
  await page.evaluate(() => {
    __game.openMap();
  });
  await page.screenshot({ path: "test-results/final-map.png" });
  fs.writeFileSync(
    "test-results/controls-report.json",
    JSON.stringify({ date: new Date().toISOString(), url: page.url(), passed }, null, 2),
  );
  console.log(passed);
  await browser.close();
  server.kill();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.kill();
  process.exit(1);
});
