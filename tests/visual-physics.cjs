/* Physical regressions: actual controllers and rigid bodies; teleport fixtures position each case. */
const { chromium } = require("playwright"),
  { spawn } = require("node:child_process"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const server = spawn(process.execPath, ["tools/serve.cjs"], {
  env: { ...process.env, PORT: "4177" },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
const passed = [],
  errors = [];
(async () => {
  await new Promise((r, j) => {
    server.stdout.once("data", r);
    server.once("error", j);
  });
  browser = await chromium.launch(
    process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {},
  );
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(new URL("?test=1", process.env.TEST_URL || "http://127.0.0.1:4177/").href);
  await p.waitForFunction(() => window.__game, { timeout: 60000 });
  await p.click("#start-button");
  await p.evaluate(() => {
    const g = __game;
    g.view.renderer.setAnimationLoop(null);
    window.place = (x, z, y = 0.98) => {
      g.input.clear();
      g.input.yaw = 0;
      g.character.vertical = 0;
      g.character.body.setTranslation({ x, y, z }, true);
      g.character.body.setNextKinematicTranslation({ x, y, z });
      g.physics.world.propagateModifiedBodyPositionsToColliders();
      g.physics.world.updateSceneQueries();
    };
    window.step = (n) => {
      for (let i = 0; i < n; i++) {
        g.character.step(1 / 60);
        g.physics.world.step(g.physics.events);
        g.character.sync();
      }
      return { ...g.character.position };
    };
  });
  const materials = await p.evaluate(() => {
    const g = __game,
      s = g.view.surfaces;
    let repeats = false;
    g.view.office.traverse((o) => {
      if (o.isMesh) {
        const uv = o.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++)
          if (Math.abs(uv.getX(i)) > 2) repeats = true;
      }
    });
    return {
      count: Object.values(s.maps).flatMap(Object.values).length,
      repeats,
      metal: s.materials.get("metal").metalness,
      glass: s.materials.get("glass").transparent,
      bytes: g.view.renderer.info.memory.textures,
    };
  });
  assert.equal(materials.count, 12);
  assert(materials.repeats && materials.glass && materials.metal > 0.8);
  passed.push(
    "12 mapas PBR compartidos, UVs métricas repetidas, metal y vidrio diferenciados",
  );
  const coverage = await p.evaluate(() => {
    const g = __game;
    return g.view.map.solidManifest
      .filter(
        (a) =>
          !g.physics.bounds.some((b) =>
            [0, 1, 2].every(
              (i) =>
                Math.abs(a.position[i] - b.position[i]) + a.size[i] / 2 <=
                b.size[i] / 2 + 0.025,
            ),
          ),
      )
      .map((a) => a.name);
  });
  assert.deepEqual(coverage, []);
  passed.push(
    "Cada volumen sólido declarado en el GLB queda cubierto por un collider o una envolvente compuesta",
  );
  const ceiling = await p.evaluate(() => {
    const g = __game, view = g.view;
    const playing = view.ceiling.visible;
    view.heroCamera();
    const cutaway = !view.ceiling.visible;
    view.playCamera();
    place(-33, -3);
    g.input.pitch = 1.02;
    g.input.distance = 11;
    g.character.updateCamera(0, true);
    const cameraY = view.camera.position.y;
    const pulse = view.surfaces.materials.get("pulse0");
    view.updateLighting({x:-40,z:0}, 0);
    const on = pulse.emissiveIntensity;
    view.updateLighting({x:-40,z:0}, 2.5);
    const off = pulse.emissiveIntensity;
    view.updateLighting({x:-40,z:0}, 6);
    const restored = pulse.emissiveIntensity;
    const ball = g.props.spawnBall({x:-33,y:5,z:-3}, {x:0,y:35,z:0}, 990);
    let highest = 0;
    for (let i=0;i<60;i++) {
      g.physics.world.step(g.physics.events);
      highest = Math.max(highest, ball.body.translation().y);
    }
    g.props.remove(ball);
    g.input.pitch = 0.43;
    g.input.distance = 7.7;
    return {playing,cutaway,cameraY,on,off,restored,highest,
      height:view.map.ceilingHeight, fixtures:view.map.fixtures.length};
  });
  assert(ceiling.playing && ceiling.cutaway);
  assert.equal(ceiling.height, 7.2);
  assert.equal(ceiling.fixtures, 25);
  assert(ceiling.cameraY < 7.1 && ceiling.cameraY > 5, JSON.stringify(ceiling));
  assert(ceiling.highest < 7 && ceiling.highest > 6.5, JSON.stringify(ceiling));
  assert(ceiling.on === 3 && ceiling.off === 0 && ceiling.restored === 3);
  await p.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await p.evaluate(() => {
    __game.view.updateLighting({x:-40,z:0}, 2.5);
    return __game.view.surfaces.materials.get("pulse0").emissiveIntensity;
  }), 3);
  await p.emulateMedia({ reducedMotion: "no-preference" });
  passed.push("Techo a 7.2 m: cámara y bola rápida no lo atraviesan; 25 lámparas, ciclo lento y movimiento reducido verificados");
  const cases = [
    {
      name: "muro opaco",
      x: -35,
      z: -3,
      key: "KeyW",
      axis: "z",
      limit: -6.38,
      side: 1,
    },
    {
      name: "mampara de vidrio",
      x: -34,
      z: -12,
      key: "KeyD",
      axis: "x",
      limit: -31.21,
      side: -1,
    },
    {
      name: "escritorio",
      x: -34,
      z: 18,
      key: "KeyS",
      axis: "z",
      limit: 21.04,
      side: -1,
    },
    {
      name: "mesa de colaboración",
      x: 3,
      z: 19,
      key: "KeyS",
      axis: "z",
      limit: 21.04,
      side: -1,
    },
    {
      name: "sofá",
      x: -31.5,
      z: -15,
      key: "KeyA",
      axis: "x",
      limit: -32.16,
      side: 1,
    },
    {
      name: "maceta cilíndrica",
      x: -44,
      z: 20,
      key: "KeyA",
      axis: "x",
      limit: -46.27,
      side: 1,
    },
  ];
  const contacts = [];
  for (const test of cases)
    for (const running of [false, true]) {
      const result = await p.evaluate(
        ({ t, running }) => {
          place(t.x, t.z);
          step(8);
          __game.input.keys.add(t.key);
          if (running) __game.input.keys.add("ShiftLeft");
          let closest = Infinity;
          let end;
          for (let i = 0; i < 240; i++) {
            end = step(1);
            if (t.name === "maceta cilíndrica")
              closest = Math.min(closest, Math.hypot(end.x + 47, end.z - 20));
          }
          __game.input.clear();
          const ys = [];
          for (let i = 0; i < 90; i++) ys.push(step(1).y);
          return { end, closest, jitter: Math.max(...ys) - Math.min(...ys) };
        },
        { t: test, running },
      );
      assert(
        test.name === "maceta cilíndrica"
          ? result.closest > 0.69
          : test.side * (result.end[test.axis] - test.limit) > -0.04,
        JSON.stringify({ test, running, result }),
      );
      assert(result.jitter < 0.015, JSON.stringify(result));
      contacts.push({ name: test.name, running, ...result });
    }
  passed.push(
    "12 recorridos caminando/corriendo contra paredes, vidrio, escritorio, mesa, sofá y maceta; sin atravesarlos ni vibración vertical",
  );
  const jump = await p.evaluate(() => {
    const g = __game;
    place(0, 0);
    step(20);
    g.input.jumpRequested = true;
    let peak = 0,
      low = 10;
    for (let i = 0; i < 180; i++) {
      const p = step(1);
      peak = Math.max(peak, p.y);
      low = Math.min(low, p.y);
    }
    return { peak, low, end: g.character.position.y };
  });
  assert(
    jump.peak > 1.8 && jump.low > 0.93 && Math.abs(jump.end - 0.975) < 0.03,
    JSON.stringify(jump),
  );
  passed.push("Salto J, gravedad y aterrizaje estable sobre el piso");
  const platform = await p.evaluate(() => {
    place(2.1, 22, 3.3);
    const end = step(240);
    return end;
  });
  assert(platform.y > 1.98 && platform.y < 2.12, JSON.stringify(platform));
  passed.push(
    "El jugador aterriza sobre una mesa sólida sin hundirse ni atravesarla",
  );
  const doors = await p.evaluate(() => {
    const g = __game;
    g.view.setElevatorOpen(false);
    place(-44, 20);
    step(8);
    g.input.keys.add("KeyS");
    const closed = step(180).z;
    g.input.clear();
    g.view.setElevatorOpen(true);
    place(-44, 20);
    step(8);
    g.input.keys.add("KeyS");
    const open = step(40).z;
    g.input.clear();
    return { closed, open };
  });
  assert(doors.closed < 22.35 && doors.open > 22.4, JSON.stringify(doors));
  passed.push(
    "El ascensor bloquea con las puertas cerradas y permite entrar al abrirse",
  );
  const fall = await p.evaluate(() => {
    const g = __game;
    place(-40, 0);
    const ball = g.props.spawnBall(
      { x: 3, y: 6, z: -2 }, // Clear of the new suspended corridor fixture.
      { x: 0, y: 0, z: 0 },
      991,
    );
    let lowest = 10;
    for (let i = 0; i < 300; i++) {
      g.physics.world.step(g.physics.events);
      lowest = Math.min(lowest, ball.body.translation().y);
    }
    const settled = ball.body.translation().y;
    g.props.remove(ball);
    const fast = g.props.spawnBall(
      { x: -35, y: 0.5, z: -3 },
      { x: 0, y: 0, z: -35 },
      992,
    );
    let minZ = 10;
    for (let i = 0; i < 120; i++) {
      g.physics.world.step(g.physics.events);
      minZ = Math.min(minZ, fast.body.translation().z);
    }
    g.props.remove(fast);
    return { lowest, settled, minZ };
  });
  assert(
    fall.lowest > 0.26 && fall.settled > 0.3 && fall.settled < 0.35,
    JSON.stringify(fall),
  );
  assert(fall.minZ > -6.5, JSON.stringify(fall));
  passed.push(
    "Bola con gravedad se asienta sobre el suelo; proyectil rápido no atraviesa la pared",
  );
  const routes = await p.evaluate(() => {
    const g = __game;
    return g.view.map.rooms
      .filter(
        (r) =>
          !g.navigation.route({ x: -40, z: 18 }, { x: r.x, z: r.z }).length,
      )
      .map((r) => r.name);
  });
  assert.deepEqual(routes, []);
  passed.push(
    "Las quince zonas siguen conectadas tras añadir mobiliario y mamparas",
  );
  await p.evaluate(() => {
    const g = __game;
    g.start();
    place(-40, 18);
    g.character.updateCamera(0, true);
    g.props.sync();
    g.crowd.sync(g.character.position);
    g.view.updateLighting(g.character.position);
    g.view.renderer.render(g.view.scene, g.view.camera);
  });
  await p.screenshot({ path: "test-results/visual-office.png" });
  await p.evaluate(() => {
    const g = __game;
    place(-34, -19);
    g.input.yaw = Math.PI;
    g.toggleCamera();
    g.view.updateLighting(g.character.position);
    g.view.renderer.render(g.view.scene, g.view.camera);
  });
  await p.screenshot({ path: "test-results/visual-lounge.png" });
  await p.evaluate(() => {
    const g = __game;
    place(-40, 12);
    g.input.yaw = 0;
    g.input.pitch = -0.25;
    g.character.updateCamera(0, true);
    g.view.updateLighting(g.character.position, 6);
    g.view.renderer.render(g.view.scene, g.view.camera);
  });
  await p.screenshot({ path: "test-results/visual-ceiling.png" });
  const perf = await p.evaluate(async () => {
    const g = __game,
      frameTimes = [];
    g.input.clear();
    g.state = "playing";
    let last = performance.now();
    for (let i = 0; i < 180; i++) {
      await new Promise(requestAnimationFrame);
      const now = performance.now();
      frameTimes.push(now - last);
      last = now;
      g.frame(now);
    }
    frameTimes.sort((a, b) => a - b);
    return {
      medianFrameMs: frameTimes[90],
      p95FrameMs: frameTimes[171],
      calls: g.view.renderer.info.render.calls,
      triangles: g.view.renderer.info.render.triangles,
      textures: g.view.renderer.info.memory.textures,
    };
  });
  assert.deepEqual(errors, []);
  passed.push(
    "Sin errores JavaScript o WebGL; muestra de tiempos de cuadro registrada",
  );
  fs.writeFileSync(
    "test-results/visual-physics-report.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        url: p.url(),
        passed,
        contacts,
        ceiling,
        jump,
        platform,
        doors,
        fall,
        performance: perf,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed, performance: perf }, null, 2));
  await browser.close();
  server.kill();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.kill();
  process.exit(1);
});
