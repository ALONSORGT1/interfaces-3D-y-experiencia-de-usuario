/* Browser verification of randomized escapes. Position/time fixtures accelerate travel.
   Real Rapier projectiles and impulses solve demolition and cart tasks. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const server = spawn(process.execPath, ["tools/serve.cjs"], {
  env: { ...process.env, PORT: "4175", SITE_PREFIX: "/renuncia-definitiva" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
const ready = new Promise((resolve, reject) => {
  server.stdout.once("data", resolve);
  server.once("error", reject);
});
const results = [];
let browser;
const errors = [];
const pass = (s) => {
  results.push(s);
  console.log("PASS", s);
};
(async () => {
  await ready;
  browser = await chromium.launch({
    ...(process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  await page.goto("http://127.0.0.1:4175/renuncia-definitiva/?test=1");
  await page.waitForFunction(() => window.__game, { timeout: 60000 });
  await page.screenshot({ path: "test-results/random-intro.png" });
  await page.click("#start-button");
  await page.evaluate(() => {
    __game.view.renderer.setAnimationLoop(null);
  });
  const plans = await page.evaluate(async () => {
    const { MISSION_BANK, makePlan } = await import(
      "./assets/js/mission-bank.js"
    );
    return {
      count: MISSION_BANK.length,
      unique: new Set(MISSION_BANK.map((t) => t.id)).size,
      plans: Array.from({ length: 1000 }, (_, i) => makePlan(i)),
    };
  });
  assert.equal(plans.count, 57);
  assert.equal(plans.unique, 57);
  for (const p of plans.plans) {
    assert.equal(new Set(p.names).size, 3);
    for (const t of p.tasks)
      assert(t.length >= 3 && t.length <= 4 && new Set(t).size === t.length);
  }
  assert(new Set(plans.plans.map((p) => JSON.stringify(p.tasks))).size > 990);
  pass(
    "57 encargos únicos; 1000 semillas con 3–4 tareas por persona, sin repeticiones y nombres distintos",
  );
  const base = await page.evaluate(() => ({
    clips: Object.keys(__game.character.animations),
    mixer: __game.character.mixer.constructor.name,
    meshes: __game.view.office.children.length,
  }));
  assert.deepEqual(base.clips.sort(), ["Idle", "Run", "Throw", "Walk"]);
  assert(base.meshes > 0);
  pass("GLB real y cuatro clips de AnimationMixer conservados");
  await page.evaluate(() => {
    window.place = (x, z, yaw = 0) => {
      const g = __game;
      g.input.clear();
      g.input.yaw = yaw;
      const p = { x, y: 0.98, z };
      g.character.body.setTranslation(p, true);
      g.character.body.setNextKinematicTranslation(p);
      g.character.vertical = 0;
      g.character.sync();
      g.physics.world.propagateModifiedBodyPositionsToColliders();
      g.physics.world.updateSceneQueries();
    };
    window.steps = (n) => {
      for (let i = 0; i < n && __game.state === "playing"; i++) __game.step();
    };
  });
  const solve = async () =>
    page.evaluate(async () => {
      const g = __game,
        r = g.escape,
        t = r.task,
        start = r.taskIndex,
        stage = r.stage;
      g.suspicion = 0;
      g.time = 0;
      g.state = "playing";
      g.input.enabled = true;
      const advance = () => r.taskIndex !== start || r.stage !== stage;
      if (["hit", "precision"].includes(t.kind)) {
        for (let shot = 0; shot < 10 && !advance(); shot++) {
          const alive = r.targets.find((x) => !x.scored);
          if (!alive) break;
          const p = alive.body.translation();
          const origin =
            t.kind === "precision" ? r.shotPoint : { x: p.x, z: p.z + 5 };
          place(origin.x, origin.z, Math.atan2(origin.x - p.x, origin.z - p.z));
          g.throwCooldown = 0;
          g.ballReady = true;
          g.shots = 16;
          g.power = 80;
          g.throwBall();
          steps(130);
        }
      } else if (t.kind === "delivery") {
        for (let i = 0; i < 80 && !advance(); i++) {
          const p = r.cart.body.translation(),
            dx = r.target.x - p.x,
            dz = r.target.z - p.z,
            d = Math.hypot(dx, dz);
          place(
            p.x - (dx / d) * 1.3,
            p.z - (dz / d) * 1.3,
            Math.atan2(-dx, -dz),
          );
          g.pushCooldown = 0;
          g.interact();
          steps(20);
        }
      } else if (t.kind === "hold") {
        place(r.points[0].x, r.points[0].z);
        g.input.keys.add("KeyE");
        steps(Math.ceil(r.difficulty.hold * 60) + 2);
        g.input.clear();
      } else {
        for (let i = 0; i < r.required && !advance(); i++) {
          const p = r.points[i];
          place(p.x, p.z);
          g.seen = false;
          g.interact();
        }
      }
      return {
        ok: advance(),
        id: t.id,
        kind: t.kind,
        level: r.level,
        position: { ...g.character.position },
        cart: r.cart?.body.isValid() ? r.cart.body.translation() : null,
        status: g.missionStatus(),
      };
    });
  // Every authored task on every difficulty, with actual spatial interaction and physics.
  for (const level of ["relaxed", "normal", "expert"]) {
    for (let id = 1; id <= 57; id++) {
      for (let loc = 0; loc < (id > 38 ? 3 : 2); loc++) {
        await page.evaluate(
          async ({ level, id, loc }) => {
            const g = __game,
              { DIFFICULTIES } = await import("./assets/js/mission-bank.js"),
              r = g.escape;
            r.level = level;
            r.difficulty = DIFFICULTIES[level];
            r.stage = Math.floor((id - 1) / 19);
            r.taskIndex = 0;
            const rooms = [
              [
                [-40, 13, "Recepción"],
                [-40, -15, "Archivo muerto"],
              ],
              [
                [-20, -15, "Archivo"],
                [-20, 14, "Creatividad"],
              ],
              [
                [0, 14, "Cafetería"],
                [20, 14, "Logística"],
                [20, -15, "Sistemas"],
              ],
            ];
            r.plan.locations = rooms.map((options) => options[0]);
            r.plan.locations[r.stage] = rooms[r.stage][loc];
            r.plan.tasks[r.stage] = [
              `encargo-${String(id).padStart(2, "0")}`,
              "encargo-01",
            ];
            for (const b of [...g.props.balls]) g.props.remove(b);
            g.state = "playing";
            g.input.enabled = true;
            g.time = 0;
            r.activate(false);
          },
          { level, id, loc },
        );
        const result = await solve();
        assert(result.ok, JSON.stringify(result));
      }
    }
    pass(
      `Los 57 encargos se completan en todas sus ubicaciones (${level}), incluidos tiros físicos y carritos`,
    );
  }

  const edgeCases = await page.evaluate(async () => {
    const g = __game,
      r = g.escape,
      { DIFFICULTIES } = await import("./assets/js/mission-bank.js");
    const setup = (id) => {
      r.stage = 0;
      r.taskIndex = 0;
      r.plan.tasks[0] = [id, "encargo-01"];
      r.level = "normal";
      r.difficulty = DIFFICULTIES.normal;
      r.activate(false);
      g.state = "playing";
      g.input.enabled = true;
      g.time = 0;
      g.suspicion = 0;
    };
    setup("encargo-03");
    place(r.points[0].x, r.points[0].z);
    g.interact();
    place(r.points[2].x, r.points[2].z);
    g.interact();
    const wrong = r.progress === 0;
    setup("encargo-04");
    place(r.points[0].x, r.points[0].z);
    g.input.keys.add("KeyE");
    steps(30);
    g.input.clear();
    steps(1);
    const release = r.hold === 0;
    setup("encargo-06");
    place(r.points[0].x, r.points[0].z);
    g.seen = false;
    g.interact();
    g.seen = true;
    r.step(1 / 60);
    const caught = r.progress === 0;
    setup("encargo-07");
    place(-40, 24);
    const shots = g.shots;
    g.throwCooldown = 0;
    g.throwBall();
    const precision = g.shots === shots && !r.validShot;
    setup("encargo-05");
    const wait = g.crowd.autoWait;
    setup("encargo-02");
    const guard = g.crowd.get("audit1");
    guard.body.setTranslation({ x: 8, y: 0.98, z: 0 }, true);
    guard.body.setNextKinematicTranslation({ x: 8, y: 0.98, z: 0 });
    guard.model.rotation.y = -Math.PI / 2;
    guard.route = [];
    guard.repath = 999;
    place(16, 0);
    g.physics.world.updateSceneQueries();
    r.difficulty = DIFFICULTIES.relaxed;
    const easy = g.crowd.step(0, g);
    r.difficulty = DIFFICULTIES.expert;
    const hard = g.crowd.step(0, g);
    return { wrong, release, caught, precision, wait, easy, hard };
  });
  assert(
    edgeCases.wrong &&
      edgeCases.release &&
      edgeCases.caught &&
      edgeCases.precision &&
      edgeCases.wait,
    JSON.stringify(edgeCases),
  );
  assert.equal(edgeCases.easy, false);
  assert.equal(edgeCases.hard, true);
  pass(
    "Secuencia errónea, terminal interrumpido, sigilo descubierto, tiro fuera de marca y espera automática comprobados; la dificultad cambia la detección real",
  );

  // A real generated escape, complete through the public interaction path.
  await page.evaluate(() => {
    __game.start();
    __game.view.renderer.setAnimationLoop(null);
  });
  const original = await page.evaluate(() =>
    JSON.stringify(__game.escape.plan),
  );
  for (let i = 0; i < 12; i++) {
    if (await page.evaluate(() => !__game.escape.task)) break;
    const r = await solve();
    assert(r.ok, JSON.stringify(r));
  }
  assert.equal(await page.evaluate(() => __game.crowd.teammates.length), 3);
  await page.evaluate(() => {
    const g = __game;
    g.score = -500;
    g.shots = 0;
    place(-44, 22);
    g.interact();
  });
  assert.equal(await page.evaluate(() => __game.state), "won");
  pass(
    "Escape aleatorio completo: tres rescates y victoria inmediata sin puntos ni bolas",
  );
  await page.screenshot({ path: "test-results/random-win.png" });
  await page.evaluate(() => {
    __game.start();
    __game.view.renderer.setAnimationLoop(null);
  });
  assert.notEqual(
    await page.evaluate(() => JSON.stringify(__game.escape.plan)),
    original,
  );
  pass("Otra fuga genera una historia, encargos y nombres nuevos");
  await page.evaluate(() => {
    const g = __game;
    g.suspicion = 100;
    g.checkCampaign();
  });
  assert.equal(await page.evaluate(() => __game.state), "lost");
  const saved = await page.evaluate(() =>
    JSON.stringify(__game.checkpoint.escape),
  );
  await page.evaluate(() => __game.start(true));
  assert.equal(
    await page.evaluate(() => JSON.stringify(__game.escape.checkpoint())),
    saved,
  );
  pass("Derrota y reintento mantienen la combinación y el encargo guardado");
  await page.evaluate(() => {
    __game.toggleCamera();
    __game.character.updateCamera(0, true);
  });
  assert.equal(await page.evaluate(() => __game.snapshot().camera), "first");
  assert.equal(
    await page.evaluate(() => __game.character.model.visible),
    false,
  );
  await page.screenshot({ path: "test-results/random-first-person.png" });
  await page.evaluate(() => __game.toggleCamera());
  assert.equal(await page.evaluate(() => __game.snapshot().camera), "third");
  pass("V alterna primera y tercera persona sin reiniciar la partida");
  await page.evaluate(() => {
    __game.crowd.recruit("lola");
    __game.toggleTeam();
  });
  assert.equal(await page.evaluate(() => __game.crowd.waiting), true);
  assert.equal(
    await page.evaluate(() => __game.crowd.get("lola").collider.isSensor()),
    true,
  );
  pass("Compañeros sin colisión física; orden esperar/seguir operativa");
  await page.evaluate(() => {
    __game.ui.update(__game);
    __game.character.updateCamera(0, true);
    __game.view.renderer.render(__game.view.scene, __game.view.camera);
  });
  await page.screenshot({ path: "test-results/random-game.png" });
  assert(await page.locator("#objective-banner").isVisible());
  assert(await page.locator("#camera-button").isVisible());
  pass("Objetivo y botones de cámara/equipo visibles durante la partida");
  await page.evaluate(() => {
    place(-44, 19, Math.PI);
    __game.view.setElevatorOpen(true);
    __game.character.updateCamera(0, true);
    __game.view.renderer.render(__game.view.scene, __game.view.camera);
  });
  await page.screenshot({ path: "test-results/elevator.png" });
  // Sample render/physics frame cost on this machine; does not claim universal FPS.
  const perf = await page.evaluate(() => {
    const g = __game,
      times = [];
    g.state = "playing";
    g.input.enabled = true;
    for (let i = 0; i < 180; i++) {
      const a = performance.now();
      g.step();
      g.props.update(1 / 60, g.time, g.character.position);
      g.crowd.sync(g.character.position);
      g.view.renderer.render(g.view.scene, g.view.camera);
      times.push(performance.now() - a);
    }
    times.sort((a, b) => a - b);
    return {
      median: times[90],
      p95: times[171],
      drawCalls: g.view.renderer.info.render.calls,
    };
  });
  console.log("PERF", perf);
  pass(
    "Muestra de rendimiento registrada (CPU de actualización/render, no FPS garantizados)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    __game.home();
    __game.view.renderer.render(__game.view.scene, __game.view.camera);
  });
  await page.screenshot({ path: "test-results/random-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  pass("Inicio sin desbordamiento horizontal a 390 px");
  assert.deepEqual(errors, []);
  pass("Sin errores JavaScript ni recursos HTTP fallidos");
  fs.writeFileSync(
    "test-results/escape-report.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed: results,
        taskDifficultyLocationCases: 399,
        performance: perf,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  server.kill();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.kill();
  process.exit(1);
});
