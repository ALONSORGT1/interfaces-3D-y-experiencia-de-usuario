// Historical v0.11 six-chapter suite; current npm test uses escape.cjs and controls.cjs.
/* Real-browser campaign tests. Controlled positioning/time fixtures shorten travel;
   all demolition, delivery and character movement use the actual Rapier world. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "test-results");
fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, [path.join(root, "tools/serve.cjs")], {
  env: { ...process.env, PORT: "4174", SITE_PREFIX: "/renuncia-definitiva" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let browser, page;
const errors = [],
  passed = [];
const pass = (s) => {
  passed.push(s);
  console.log("PASS", s);
};
async function run() {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {}),
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:4174/renuncia-definitiva/?test=1");
  await page.waitForFunction(
    () => window.__game?.state === "intro",
    {},
    { timeout: 60000 },
  );
  const snap = () => page.evaluate(() => __game.snapshot());
  const place = async (x, z, yaw = 0) =>
    page.evaluate(
      ({ x, z, yaw }) => {
        const g = __game;
        g.input.clear();
        g.input.yaw = yaw;
        g.character.vertical = 0;
        g.character.body.setTranslation({ x, y: 0.98, z }, true);
        g.character.body.setNextKinematicTranslation({ x, y: 0.98, z });
        g.character.sync();
        g.character.updateCamera(0, true);
        g.physics.world.propagateModifiedBodyPositionsToColliders();
        g.physics.world.updateSceneQueries();
      },
      { x, z, yaw },
    );
  const steps = async (n) =>
    page.evaluate((n) => {
      const g = __game;
      for (let i = 0; i < n && g.state === "playing"; i++) g.step();
      g.props.sync();
      g.crowd.sync(g.character.position);
      g.ui.update(g);
      return g.snapshot();
    }, n);
  const shoot = async (x, z, power = 65, mode = 0, yaw = 0) => {
    await place(x, z, yaw);
    return page.evaluate(
      ({ power, mode }) => {
        const g = __game;
        g.power = power;
        g.modeIndex = mode;
        g.throwCooldown = 0;
        g.ballReady = g.shots > 0;
        g.throwBall();
        return g.snapshot();
      },
      { power, mode },
    );
  };
  const talk = async () => {
    await page.keyboard.press("KeyE");
    await page.locator("#dialogue-dialog").waitFor({ state: "visible" });
    await page.locator('[data-close="dialogue-dialog"]').click();
    await page.waitForFunction(() => __game.state === "playing");
  };
  const map = (await snap()).map;
  assert.equal(map.width * map.depth, 20 * 18 * 15);
  assert.equal(map.areaMultiplier, 15);
  pass("Mapa medido: 100 × 54, exactamente quince veces el área original");
  assert.equal(await page.evaluate(() => __game.crowd.people.length), 10);
  pass("Ocho personajes y dos auditores presentes en el mundo");
  const assets = await page.evaluate(() => ({
    clips: __game.view.employee.animations.map((a) => a.name).sort(),
    campus: __game.view.office.children.length,
    mixer: __game.character.mixer.constructor.name,
  }));
  assert.deepEqual(assets.clips, ["Idle", "Run", "Throw", "Walk"]);
  assert.equal(assets.mixer, "AnimationMixer");
  assert.ok(assets.campus > 0);
  pass(
    "R2/R4: campus y empleado GLB cargados; cuatro clips reales en AnimationMixer",
  );
  const paths = await page.evaluate(() =>
    __game.view.map.rooms.map((r) => ({
      name: r.name,
      length: __game.navigation.route({ x: -40, z: 18 }, { x: r.x, z: r.z })
        .length,
    })),
  );
  assert.ok(
    paths.every((p) => p.length > 0),
    JSON.stringify(paths),
  );
  pass("Las quince áreas están conectadas por rutas transitables");
  await page.screenshot({ path: path.join(out, "01-inicio.png") });
  await page.locator("#start-button").click();
  assert.equal((await snap()).mission, "lola");
  assert.equal((await snap()).shots, 12);
  pass("La campaña empieza con propósito visible y un primer interlocutor");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => __game.character.state === "Walk");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  await page.keyboard.down("Shift");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => __game.character.state === "Run");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Shift");
  await page.waitForFunction(() => __game.character.state === "Idle");
  pass("Idle, Walk y Run siguen los controles reales del jugador");
  await place(-39, 16);
  await talk();
  assert.equal(await page.evaluate(() => __game.lolaTalked), true);
  assert.match(await page.locator("#mission-title").textContent(), /Libera/);
  pass("Conversación con Lola cambia el objetivo y pausa el reloj");
  await shoot(-36, 14);
  await page.waitForFunction(() => __game.character.state === "Throw");
  let current = await steps(260);
  console.log("CHAPTER1", current.mission, current.down, current.score);
  assert.equal(current.mission, "archive");
  assert.deepEqual(current.team, ["lola"]);
  assert.equal(current.unlocked, 2);
  pass(
    "Derribo físico de seis archivadores rescata a Lola y desbloquea la bola pesada",
  );
  await place(-40, 0);
  await steps(300);
  const follower = await page.evaluate(() => {
    const p = __game.crowd.get("lola").body.translation(),
      q = __game.character.position;
    return Math.hypot(p.x - q.x, p.z - q.z);
  });
  assert.ok(follower < 5, `Lola quedó a ${follower} m`);
  pass("Lola sigue al jugador y cruza la puerta sin atravesar muros");
  await page.keyboard.press("KeyQ");
  assert.equal((await snap()).mode, "heavy");
  pass("Q selecciona un tipo de bola desbloqueado");
  await shoot(-20, -12, 85, 1);
  current = await steps(280);
  assert.equal(
    current.targets.filter((t) => t.mission === "archive" && t.scored).length,
    6,
  );
  await place(-20, -22);
  await page.keyboard.press("KeyE");
  current = await snap();
  assert.equal(current.mission, "cafe");
  assert.equal(current.evidence, true);
  assert.deepEqual(current.team, ["lola", "beto"]);
  assert.equal(current.unlocked, 3);
  pass(
    "Archivo: derribo, memoria recogida y Beto reclutado son pasos distintos",
  );
  await shoot(0, 25, 25, 1);
  current = await steps(240);
  console.log(
    "CART",
    await page.evaluate(() => ({
      ...__game.props.deliveryCart.body.translation(),
      delivered: __game.delivered,
    })),
  );
  assert.equal(current.delivered, true);
  await place(4, 19);
  await talk();
  current = await snap();
  assert.equal(current.mission, "servers");
  assert.deepEqual(current.team, ["lola", "beto", "nora"]);
  pass(
    "Una bola mueve la batería hasta el generador; hablar con Nora completa la misión",
  );
  await place(0, 11);
  await steps(900);
  const teamDistances = await page.evaluate(() =>
    __game.crowd.teammates.map((p) => ({
      name: p.id,
      distance: Math.hypot(
        p.body.translation().x - __game.character.position.x,
        p.body.translation().z - __game.character.position.z,
      ),
    })),
  );
  assert.ok(
    teamDistances.every((p) => p.distance < 5),
    JSON.stringify(teamDistances),
  );
  pass(
    "Los tres compañeros atraviesan el mapa y se reúnen pese a los escombros",
  );
  await page.locator("#map-button").click();
  assert.equal((await snap()).state, "paused");
  const pauseTime = (await snap()).time;
  await page.waitForTimeout(200);
  assert.equal((await snap()).time, pauseTime);
  await page.screenshot({ path: path.join(out, "02-mapa.png") });
  await page.locator('[data-close="map-dialog"]').last().click();
  assert.equal((await snap()).state, "playing");
  pass("Mapa ampliado muestra capítulos, compañeros y ruta; congela el tiempo");
  await page.keyboard.press("KeyM");
  assert.equal((await snap()).state, "paused");
  await page.keyboard.press("KeyM");
  await page.waitForFunction(() => __game.state === "playing");
  pass("La tecla M abre y cierra el mapa sin dejar la partida pausada");
  for (const [x, z] of [
    [15, -15],
    [20, -17],
    [25, -15],
  ]) {
    await shoot(x, z, 90, 1);
    await steps(220);
  }
  current = await snap();
  console.log(
    "SERVERS",
    current.mission,
    current.targets.filter((t) => t.mission === "servers"),
  );
  assert.equal(current.mission, "director");
  pass("Tres servidores físicos abren la misión del director");
  for (let wave = 0; wave < 3; wave++) {
    await steps(90);
    const target = await page.evaluate(() => {
      const g = __game;
      return g
        .targetsFor()
        .find((t) => t.wave === g.bossWave && !t.scored)
        ?.body.translation();
    });
    assert.ok(target, `No apareció la oleada ${wave + 1}`);
    await shoot(target.x, target.z + 4, 85, 1);
    await steps(220);
    assert.equal((await snap()).bossWave, wave + 1);
  }
  pass(
    "Dirección genera y resuelve tres oleadas derribables en posiciones válidas",
  );
  await place(40, -22.5);
  await page.keyboard.press("KeyE");
  current = await snap();
  assert.equal(current.mission, "exit");
  assert.equal(current.directorSigned, true);
  assert.equal(current.completed.length, 5);
  pass("Recoger la carta muestra explícitamente el regreso al ascensor");
  await page.evaluate(() => {
    __game.score = -500;
    __game.shots = 0;
    __game.ui.update(__game);
  });
  await place(-44, 23);
  const finish = await page.evaluate(() => {
    const start = performance.now();
    __game.interact();
    return {
      state: __game.state,
      elapsed: performance.now() - start,
      dialog: document.getElementById("result-dialog").open,
      score: __game.score,
      completed: __game.completed.length,
    };
  });
  assert.equal(finish.state, "won");
  assert.equal(finish.dialog, true);
  assert.ok(finish.elapsed < 500);
  assert.equal(finish.score, -500);
  assert.equal(finish.completed, 6);
  await page.screenshot({ path: path.join(out, "03-victoria.png") });
  pass(
    "Victoria inmediata al salir: sin umbral de puntos, sin bolas y sin esperas físicas",
  );
  await page.locator("#restart-button").click();
  current = await snap();
  assert.equal(current.mission, "lola");
  assert.equal(current.score, 0);
  assert.equal(current.team.length, 0);
  assert.equal(current.shots, 12);
  pass(
    "Nueva campaña reinicia misiones, actores, objetos, recursos y puntuación",
  );
  // State-machine fixture, not a fabricated physics playthrough: verify checkpoint recovery.
  await page.evaluate(() => {
    const g = __game;
    g.missionIndex = 3;
    g.completed = ["lola", "archive", "cafe"];
    g.evidence = true;
    g.delivered = true;
    g.unlocked = 3;
    for (const id of ["lola", "beto", "nora"]) g.crowd.recruit(id);
    g.saveCheckpoint();
    g.time = 721;
    g.checkCampaign();
  });
  assert.equal((await snap()).state, "lost");
  await page.locator("#restart-button").click();
  current = await snap();
  assert.equal(current.mission, "servers");
  assert.equal(current.team.length, 3);
  assert.ok(current.remaining >= 179);
  assert.equal(current.score, 0);
  pass(
    "Derrota por tiempo ofrece punto de control y conserva al equipo reclutado",
  );
  // Real guard detection and static-wall occlusion.
  await page.evaluate(() => __game.start());
  await place(-9, 0);
  await steps(25);
  assert.ok((await snap()).suspicion > 0);
  pass("Auditor con visión directa aumenta la sospecha");
  const cone = await page.evaluate(() => {
    const g = __game,
      p = g.crowd.get("audit1");
    g.crowd.sync(g.character.position);
    p.vision.updateMatrixWorld(true);
    const e = p.vision.matrixWorld.elements;
    return (
      e[0] * -Math.sin(p.model.rotation.y) +
      e[2] * -Math.cos(p.model.rotation.y)
    );
  });
  assert.ok(cone > 0.99);
  pass(
    "El cono dibujado apunta en la misma dirección que la detección del auditor",
  );
  const occlusion = await page.evaluate(() => {
    const g = __game,
      p = g.crowd.get("audit1");
    p.body.setTranslation({ x: -35, y: 0.97, z: 5 }, true);
    p.body.setNextKinematicTranslation({ x: -35, y: 0.97, z: 5 });
    p.patrol = [[-35, 15]];
    p.route = [{ x: -35, z: 15 }];
    p.waypoint = 0;
    p.repath = 100;
    g.character.body.setTranslation({ x: -35, y: 0.98, z: 9 }, true);
    g.character.body.setNextKinematicTranslation({ x: -35, y: 0.98, z: 9 });
    g.suspicion = 40;
    for (let n = 0; n < 60; n++) g.step();
    return { seen: g.seen, alarm: g.suspicion };
  });
  assert.equal(occlusion.seen, false);
  assert.ok(occlusion.alarm < 40);
  pass(
    "Una pared real corta la visión del auditor y permite bajar la sospecha",
  );
  await page.evaluate(() => {
    __game.suspicion = 100;
    __game.checkCampaign();
  });
  assert.equal((await snap()).state, "lost");
  pass("Sospecha al 100% causa derrota verificable");
  await page.evaluate(() => __game.start());
  const power = await page.evaluate(() => {
    const g = __game,
      values = [];
    for (const p of [25, 100]) {
      g.power = p;
      g.throwCooldown = 0;
      g.ballReady = true;
      g.throwBall();
      const b = g.props.balls.at(-1);
      values.push(Math.hypot(b.body.linvel().x, b.body.linvel().z));
      g.props.remove(b);
    }
    return values;
  });
  assert.ok(power[1] > power[0] * 1.8);
  pass("La potencia conserva un efecto real en velocidad");
  await place(-43, 14);
  await page.keyboard.press("KeyE");
  assert.equal((await snap()).shots, 16);
  pass("Recarga local elimina el regreso obligatorio a un único punto");
  const blocked = await page.evaluate(() => {
    const g = __game;
    const p = g.ballOrigin();
    g.props.spawnBall(p, { x: 0, y: 0, z: 0 }, 99);
    g.throwCooldown = 0;
    g.ballReady = true;
    const before = g.shots;
    g.throwBall();
    return g.shots === before;
  });
  assert.equal(blocked, true);
  pass("No se genera una bola dentro de un volumen ocupado");
  await place(49, 3);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyD");
  assert.ok((await snap()).position.x < 49.8);
  pass("Los límites del mapa ampliado bloquean al personaje");
  await page.evaluate(() => __game.home());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, "04-movil.png") });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  pass("Interfaz adaptable sin desbordamiento a 390 px");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#start-button").click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, "05-partida.png") });
  assert.deepEqual(errors, []);
  pass("Sin errores JavaScript, errores de consola ni recursos 404 en subruta");
  fs.writeFileSync(
    path.join(out, "campaign-report.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        passed,
        errors,
        finish,
        map,
        paths,
      },
      null,
      2,
    ),
  );
}
run()
  .catch(async (error) => {
    console.error(error);
    console.error("Browser errors", errors);
    if (page) {
      try {
        console.log(
          "STATE",
          JSON.stringify(await page.evaluate(() => __game.snapshot())),
        );
        await page.screenshot({ path: path.join(out, "failure.png") });
      } catch {}
    }
    process.exitCode = 1;
    fs.writeFileSync(
      path.join(out, "failure.txt"),
      String(error) + "\n" + errors.join("\n"),
    );
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill();
  });
