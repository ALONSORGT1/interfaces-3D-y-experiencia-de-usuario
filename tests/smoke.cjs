/* Integration tests use real WebGL, real Rapier, UI input, and controlled scenario
   setup through ?test=1. No scoring/collision functions are mocked. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..");
const results = path.join(root, "test-results");
fs.mkdirSync(results, { recursive: true });
const server = spawn(
  process.execPath,
  [path.join(root, "tools", "serve.cjs")],
  {
    env: { ...process.env, PORT: "4174", SITE_PREFIX: "/renuncia-definitiva" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let browser;
const logs = [];
const passed = [];
const pass = (name) => {
  passed.push(name);
  console.log("PASS", name);
};
async function run() {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", (c) => reject(new Error("Server exited " + c)));
  });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => logs.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) logs.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:4174/renuncia-definitiva/?test=1");
  await page.waitForFunction(() => window.__game?.state === "intro");
  await page.screenshot({ path: path.join(results, "01-inicio.png") });
  assert.equal(
    await page.locator("h1").innerText(),
    "Tu último día.\nSu peor lunes.",
  );
  pass(
    "Carga GLB, texturas, CDN e import map desde una subruta de repositorio",
  );
  await page.locator("#start-button").click();
  const snap = () => page.evaluate(() => __game.snapshot());
  const start = async () => {
    await page.evaluate(() => __game.start());
    await page.waitForTimeout(100);
  };
  const place = async (x, z, yaw = 0) => {
    await page.evaluate(
      ({ x, z, yaw }) => {
        const g = __game;
        g.input.clear();
        g.input.yaw = yaw;
        g.character.body.setTranslation({ x, y: 0.98, z }, true);
        g.character.body.setNextKinematicTranslation({ x, y: 0.98, z });
        g.character.vertical = 0;
        g.character.sync();
        g.character.updateCamera(0, true);
      },
      { x, z, yaw },
    );
    await page.waitForTimeout(60);
  };
  await page.waitForTimeout(500);
  assert.equal((await snap()).down, 0);
  assert.equal((await snap()).score, 0);
  assert.equal((await snap()).shots, 8);
  assert.equal(
    await page.evaluate(() =>
      Object.keys(__game.character.animations).sort().join(","),
    ),
    "Idle,Run,Throw,Walk",
  );
  pass("Inicio limpio: 18 objetivos estables, ocho bolas y cuatro clips GLB");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => __game.character.state === "Walk");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  assert.ok((await snap()).position.z < 5.8);
  await page.keyboard.down("Shift");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => __game.character.state === "Run");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Shift");
  await page.waitForFunction(() => __game.character.state === "Idle");
  pass("WASD, movimiento relativo a cámara y animaciones Idle/Walk/Run");
  await page.mouse.move(850, 480);
  await page.mouse.down();
  await page.mouse.move(960, 500, { steps: 5 });
  await page.mouse.up();
  assert.ok(Math.abs(await page.evaluate(() => __game.input.yaw)) > 0.2);
  pass("Órbita con mouse");
  await place(9.2, 5);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyD");
  assert.ok((await snap()).position.x < 9.95);
  await place(-7, 3.4);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(650);
  await page.keyboard.up("KeyW");
  assert.ok((await snap()).position.z > 2.7);
  pass("Personaje bloqueado por límites y escritorio sólido");
  await start();
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => __game.character.state === "Throw");
  await page.waitForFunction(() => __game.down >= 4, { timeout: 10000 });
  await page.waitForTimeout(1000);
  const hit = await snap();
  assert.equal(hit.shots, 7);
  assert.equal(hit.ballReady, false);
  assert.ok(hit.score > 0);
  assert.ok(hit.down >= 4);
  await page.screenshot({ path: path.join(results, "02-derribo.png") });
  pass(
    "Lanzamiento desde teclado causa un derrumbe físico y actualiza HUD/puntuación",
  );
  const beforeReload = hit.shots;
  await place(-2.2, 6.1);
  await page.keyboard.press("KeyE");
  assert.equal((await snap()).ballReady, true);
  assert.equal((await snap()).shots, beforeReload);
  pass("Máquina recarga sin regalar lanzamientos");
  const scoreBefore = (await snap()).score;
  await place(7, 6);
  await page.keyboard.press("KeyE");
  assert.ok((await snap()).score >= scoreBefore + 100);
  pass("Recoger bono añade puntos y elimina el objeto");
  await start();
  await place(3.25, 4);
  const cartStart = await page.evaluate(
    () =>
      __game.props.items.find((i) => i.type === "cart").body.translation().z,
  );
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(500);
  const cartEnd = await page.evaluate(
    () =>
      __game.props.items.find((i) => i.type === "cart").body.translation().z,
  );
  assert.ok(cartEnd < cartStart - 0.15);
  pass("Empujar carrito aplica un impulso físico");
  async function measurePower(power) {
    await start();
    return page.evaluate((power) => {
      const g = __game;
      const slider = document.getElementById("power");
      slider.value = power;
      slider.dispatchEvent(new Event("input"));
      g.throwBall();
      const v = g.props.balls.at(-1).body.linvel();
      return Math.hypot(v.x, v.z);
    }, power);
  }
  const weak = await measurePower(25),
    strong = await measurePower(100);
  assert.ok(strong > weak * 1.8);
  pass("El deslizador cambia la velocidad real de lanzamiento");
  await start();
  await page.evaluate(() => {
    const g = __game;
    g.props.spawnBall(g.ballOrigin(), { x: 0, y: 0, z: 0 }, 99);
  });
  await page.keyboard.press("KeyF");
  assert.equal((await snap()).shots, 8);
  assert.equal((await snap()).ballReady, true);
  pass("Generación bloqueada si el volumen de salida está ocupado");
  await start();
  await page.locator("#pause-button").click();
  const paused = (await snap()).time;
  await page.waitForTimeout(300);
  assert.equal((await snap()).time, paused);
  await page.locator("#resume-button").click();
  await page.waitForTimeout(150);
  assert.ok((await snap()).time > paused);
  pass("Pausa congela física y tiempo; continuar restaura controles");
  await page.locator("#help-button").click();
  assert.equal((await snap()).state, "paused");
  await page.locator('[data-close="help-dialog"]').last().click();
  assert.equal((await snap()).state, "playing");
  pass("Ayuda pausa y reanuda sin perder partida");
  // Controlled high-speed tests advance the real fixed-step simulation, not wall time.
  await start();
  const loss = await page.evaluate(() => {
    const g = __game;
    g.input.yaw = Math.PI;
    for (let n = 0; n < 8; n++) {
      g.ballReady = true;
      g.throwCooldown = 0;
      g.throwBall();
      // Let each physical miss settle and be retired before the next setup.
      for (let k = 0; k < 1860 && g.state === "playing"; k++) g.step();
    }
    for (let k = 0; k < 1600 && g.state === "playing"; k++) g.step();
    return g.snapshot();
  });
  assert.equal(loss.shots, 0);
  assert.equal(loss.state, "lost");
  await page.screenshot({ path: path.join(results, "03-derrota.png") });
  pass(
    "Ocho tiros fallidos producen derrota después de resolver la última bola",
  );
  await page.locator("#restart-button").click();
  const reset = await snap();
  assert.equal(reset.score, 0);
  assert.equal(reset.down, 0);
  assert.equal(reset.shots, 8);
  assert.equal(reset.penalties, 0);
  assert.equal(reset.balls.length, 0);
  assert.equal(reset.bonuses, 3);
  pass("Reinicio completo después de derrota");
  // Set up three shooting positions; gameplay still uses real balls and collision scoring.
  const win = await page.evaluate(() => {
    const g = __game;
    g.power = 100;
    for (const [x, z] of [
      [0, 1],
      [-5, 1],
      [5, 1],
    ]) {
      if (g.state !== "playing") break;
      g.character.body.setTranslation({ x, y: 0.98, z }, true);
      g.character.body.setNextKinematicTranslation({ x, y: 0.98, z });
      g.input.yaw = 0;
      g.ballReady = true;
      g.throwCooldown = 0;
      g.throwBall();
      for (let n = 0; n < 360 && g.state === "playing"; n++) g.step();
    }
    // Pick up existing bonuses through the real interaction if a plant penalty requires it.
    for (const bonus of [...g.props.bonuses]) {
      if (g.state !== "playing") break;
      const p = bonus.position;
      g.character.body.setTranslation({ x: p.x, y: 0.98, z: p.z }, true);
      g.interact();
    }
    return g.snapshot();
  });
  assert.equal(win.down, 18);
  assert.ok(win.score >= 1800);
  assert.equal(win.state, "won");
  await page.screenshot({ path: path.join(results, "04-victoria.png") });
  pass(
    "Tres torres derribadas con bolas reales y puntuación mínima producen victoria",
  );
  await page.locator("#restart-button").click();
  assert.equal((await snap()).score, 0);
  assert.equal((await snap()).shots, 8);
  pass("Reinicio después de victoria");
  await page.evaluate(() => {
    const g = __game;
    g.start();
    for (let n = 0; n < 1500; n++) g.step();
  });
  assert.ok((await snap()).bonuses > 3);
  const valid = await page.evaluate(() =>
    __game.props.bonuses.every(
      (b) =>
        Math.abs(b.position.x) < 9.6 &&
        Math.abs(b.position.z) < 8.6 &&
        b.position.y >= 0.3,
    ),
  );
  assert.ok(valid);
  pass("Bonos generados durante la partida dentro de la zona válida");
  await page.evaluate(() => __game.home());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(results, "05-movil.png") });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  pass("Interfaz sin desbordamiento horizontal a 390 px");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#start-button").click();
  await page.waitForTimeout(3300);
  await page.screenshot({ path: path.join(results, "06-partida.png") });
  assert.deepEqual(logs, []);
  pass("Sin errores de JavaScript, recursos 404 ni errores de consola");
  fs.writeFileSync(
    path.join(results, "report.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        passed,
        errors: logs,
        scenarios: { loss, win },
      },
      null,
      2,
    ),
  );
}
run()
  .catch(async (e) => {
    console.error(e);
    console.error("Browser errors:", logs);
    process.exitCode = 1;
    fs.writeFileSync(
      path.join(results, "failure.txt"),
      String(e) + "\n" + logs.join("\n"),
    );
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill();
  });
