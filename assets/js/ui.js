import { CAMPAIGN } from "./campaign.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor() {
    this.toastTime = 0;
    this.comboTime = 0;
    this.radioTime = 0;
    this.previousScore = null;
    this.dialogueAction = null;
  }
  bind(game) {
    this.game = game;
    $("camera-button").onclick = () => game.toggleCamera();
    $("team-button").onclick = () => game.toggleTeam();
    $("start-button").onclick = () => game.start();
    $("throw-button").onclick = () => {
      game.throwBall();
      game.view.renderer.domElement.focus();
    };
    $("power").oninput = (e) => {
      game.power = Number(e.target.value);
      $("power-value").textContent = `${game.power}%`;
    };
    $("mode-button").onclick = () => {
      game.cycleMode();
      game.view.renderer.domElement.focus();
    };
    $("restart-button").onclick = () => game.start(game.state === "lost");
    $("restart-pause").onclick = () => game.start();
    $("home-button").onclick = () => game.home();
    $("resume-button").onclick = () => game.resume();
    $("pause-button").onclick = () => game.pause();
    $("help-button").onclick = () => {
      game.pause(false);
      $("help-dialog").showModal();
    };
    $("map-button").onclick = () => game.openMap();
    $("minimap-button").onclick = () => game.openMap();
    document
      .querySelectorAll("[data-close]")
      .forEach(
        (button) => (button.onclick = () => $(button.dataset.close).close()),
      );
    for (const id of ["help-dialog", "map-dialog"])
      $(id).addEventListener("close", () => {
        if (game.state === "paused" && !document.querySelector("dialog[open]"))
          game.resume();
      });
    $("dialogue-dialog").addEventListener("close", () => {
      const action = this.dialogueAction;
      this.dialogueAction = null;
      if (game.state === "paused") game.resume();
      action?.();
    });
    $("pause-dialog").addEventListener("cancel", (e) => {
      e.preventDefault();
      game.resume();
    });
    $("result-dialog").addEventListener("cancel", (e) => e.preventDefault());
    $("sound").onclick = () => {
      const enabled = game.audio.toggle();
      $("sound-label").textContent = enabled ? "ON" : "OFF";
      $("sound").setAttribute(
        "aria-label",
        enabled ? "Desactivar sonido" : "Activar sonido",
      );
    };
  }
  ready() {
    $("start-button").disabled = false;
    $("start-label").textContent = "Empezar la fuga";
    $("load-status").textContent =
      "Una campaña. Tres compañeros. Ni una hora extra más.";
  }
  state(state) {
    $("app").dataset.mode = state;
    const intro = state === "intro";
    for (const id of ["intro", "intro-footer", "scene-caption", "scene-stamp"])
      $(id).hidden = !intro;
    $("hud").hidden = intro;
    $("pause-button").hidden = intro || state === "won" || state === "lost";
    $("map-button").hidden = intro;
  }
  closeDialogs() {
    this.dialogueAction = null;
    for (const d of document.querySelectorAll("dialog[open]")) d.close();
  }
  reset() {
    this.toastTime = 0;
    this.comboTime = 0;
    this.radioTime = 0;
    this.previousScore = null;
    $("toast").classList.remove("visible");
    $("combo").hidden = true;
    $("radio").hidden = true;
  }
  update(game) {
    const status = game.missionStatus();
    const run = game.escape;
    $("active-step").textContent = run?.task
      ? `${run.difficulty.name} · RESCATA A ${run.plan.names[run.stage].toUpperCase()} · ENCARGO ${run.taskIndex + 1}/${run.plan.tasks[run.stage].length}`
      : "EQUIPO COMPLETO · ÚLTIMO PASO";
    for (const [id, value] of [
      ["active-title", status.title],
      ["active-action", status.detail],
    ])
      if ($(id).textContent !== value) $(id).textContent = value;
    $("camera-button").textContent = game.input.firstPerson
      ? "V · Tercera persona"
      : "V · Primera persona";
    $("crosshair").hidden = !game.input.firstPerson;
    $("team-button").textContent = game.crowd.waiting
      ? "H · Síganme"
      : game.crowd.autoWait
        ? "Equipo esperando · maniobra libre"
        : "H · Esperar aquí";
    $("score").textContent = game.score.toLocaleString("en-US");
    $("chapter").textContent =
      `${game.missionIndex + 1} / ${game.chapters.length}`;
    const seconds = Math.ceil(game.remaining);
    $("clock").textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("clock").classList.toggle("urgent", seconds < 90);
    $("mission-kicker").textContent =
      `${game.escape.plan.story.title.toUpperCase()} · ${game.mission.zone.toUpperCase()}`;
    $("mission-title").textContent = status.title;
    $("mission-detail").textContent = game.escape?.task?.story || status.detail;
    $("progress").style.width = `${(status.count / status.total) * 100}%`;
    $("mission-count").textContent = `${status.count} / ${status.total}`;
    const target = game.objective(),
      p = game.character.position,
      distance = Math.round(Math.hypot(p.x - target.x, p.z - target.z));
    $("objective-distance").textContent = `${distance} m`;
    $("objective-hint").textContent = target.reload
      ? "Sin bolas: la ruta te lleva a recargar."
      : game.route.length
        ? "Sigue las marcas doradas y el minimapa."
        : "El objetivo está cerca. Busca el rombo dorado.";
    for (const id of ["lola", "beto", "nora"]) {
      const person = game.crowd.get(id),
        active = person.recruited;
      $(`team-${id}`).firstChild.textContent = person.name[0];
      $(`team-${id}`).querySelector("small").textContent = person.name;
      $(`team-${id}`).classList.toggle("joined", active);
      $(`team-${id}`).title = active
        ? `${person.name} te acompaña`
        : `Encuentra a ${person.name}`;
    }
    $("team-count").textContent = `${game.crowd.teammates.length}/3`;
    $("ball-label").textContent = `${game.shots} BOLAS`;
    $("ball-detail").textContent =
      game.shots === 0
        ? "Máquina cercana: E"
        : game.throwCooldown > 0
          ? "Preparando la siguiente…"
          : "Recarga automática en mano.";
    $("mode-label").textContent = game.mode.name;
    $("mode-button").title = game.mode.description;
    $("throw-button").disabled =
      !game.ballReady || game.state !== "playing" || game.throwCooldown > 0;
    $("alarm-value").textContent = `${Math.round(game.suspicion)}%`;
    $("alarm-fill").style.width = `${game.suspicion}%`;
    $("alarm-panel").classList.toggle("detected", game.seen);
    $("alarm-label").textContent = game.seen ? "TE ESTÁN VIENDO" : "SOSPECHA";
    const prompt = game.interactionPrompt();
    $("interaction").hidden = !prompt;
    $("interaction-label").textContent = prompt || "";
    const room = game.view.map.rooms.find(
      (r) =>
        Math.abs(p.x - r.x) < r.width / 2 && Math.abs(p.z - r.z) < r.depth / 2,
    );
    $("current-zone").textContent = room?.name || "PASILLO ENTRE DEPARTAMENTOS";
    this.drawMap(game, false);
  }
  toast(message, penalty = false) {
    $("toast").textContent = message;
    $("toast").classList.toggle("penalty", penalty);
    $("toast").classList.add("visible");
    this.toastTime = 4;
  }
  combo(count) {
    $("combo-count").textContent = `×${count}`;
    $("combo").hidden = false;
    this.comboTime = 2.3;
  }
  radio(speaker, text, duration = 8) {
    $("radio-name").textContent = speaker;
    $("radio-copy").textContent = text;
    $("radio").hidden = false;
    this.radioTime = duration;
  }
  tick(dt) {
    if (this.toastTime > 0 && (this.toastTime -= dt) <= 0)
      $("toast").classList.remove("visible");
    if (this.comboTime > 0 && (this.comboTime -= dt) <= 0)
      $("combo").hidden = true;
    if (this.radioTime > 0 && (this.radioTime -= dt) <= 0)
      $("radio").hidden = true;
  }
  dialogue(person, text, action) {
    $("dialogue-name").textContent = person.name;
    $("dialogue-role").textContent = person.role;
    $("dialogue-copy").textContent = text;
    $("dialogue-portrait").textContent = person.name[0];
    $("dialogue-portrait").style.background = person.color;
    this.dialogueAction = action;
    $("dialogue-dialog").showModal();
  }
  drawMap(game, large) {
    const canvas = $(large ? "full-map" : "minimap"),
      c = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      pad = large ? 24 : 7,
      sx = (w - pad * 2) / 100,
      sz = (h - pad * 2) / 54;
    const xy = (p) => ({ x: pad + (p.x + 50) * sx, y: pad + (p.z + 27) * sz });
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#f3f0e8";
    c.fillRect(0, 0, w, h);
    for (const r of game.view.map.rooms) {
      const p = xy({ x: r.x - r.width / 2, z: r.z - r.depth / 2 });
      c.fillStyle = r.color;
      c.fillRect(p.x, p.y, r.width * sx, r.depth * sz);
      c.strokeStyle = "#93a291";
      c.lineWidth = 0.5;
      c.strokeRect(p.x, p.y, r.width * sx, r.depth * sz);
      if (large) {
        c.fillStyle = "#315445";
        c.font = "600 9px Arial";
        c.textAlign = "center";
        c.fillText(
          r.name,
          p.x + (r.width * sx) / 2,
          p.y + 11,
          r.width * sx - 4,
        );
      }
    }
    c.strokeStyle = "#bc8841";
    c.lineWidth = large ? 3 : 1.5;
    c.setLineDash([4, 3]);
    c.beginPath();
    game.route.forEach((p, i) => {
      const q = xy(p);
      if (i === 0) c.moveTo(q.x, q.y);
      else c.lineTo(q.x, q.y);
    });
    c.stroke();
    c.setLineDash([]);
    for (const p of game.view.map.dispensers) {
      const q = xy({ x: p[0], z: p[1] });
      c.fillStyle = "#c28676";
      c.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    for (const npc of game.crowd.people) {
      const q = xy(npc.body.translation());
      c.fillStyle = npc.guard
        ? "#aa5447"
        : npc.recruited
          ? "#456f9c"
          : "#6d846e";
      c.beginPath();
      c.arc(q.x, q.y, large ? 3 : 2, 0, Math.PI * 2);
      c.fill();
    }
    const objective = xy(game.objective());
    c.fillStyle = "#c5932f";
    c.save();
    c.translate(objective.x, objective.y);
    c.rotate(Math.PI / 4);
    c.fillRect(-3, -3, 6, 6);
    c.restore();
    const p = xy(game.character.position);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(-game.input.yaw);
    c.fillStyle = "#173f36";
    c.strokeStyle = "#fff";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(-4, 4);
    c.lineTo(4, 4);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    if (large) {
      $("map-objective").textContent =
        `${game.missionIndex + 1}/${game.chapters.length} · ${game.missionStatus().title}`;
      $("chapter-list").innerHTML = game.chapters
        .map(
          (m, i) =>
            `<li class="${i < game.missionIndex ? "done" : i === game.missionIndex ? "current" : ""}"><span>${i < game.missionIndex ? "✓" : i + 1}</span><div><b>${m.name}</b><small>${m.zone}</small></div></li>`,
        )
        .join("");
    }
  }
  result(game, won, reason) {
    $("result-eyebrow").textContent = won
      ? "MISIÓN CUMPLIDA · NADIE SE QUEDÓ ATRÁS"
      : "LA SALIDA TENDRÁ QUE ESPERAR";
    $("result-title").innerHTML = won
      ? "Nos fuimos.<br>Todos."
      : "Una pausa.<br>No el final.";
    $("result-copy").textContent = won
      ? `${game.escape.plan.names.join(", ")} salen contigo. ${game.escape.plan.story.ending}`
      : reason;
    const medal =
      game.score >= 4200 ? "ORO" : game.score >= 3000 ? "PLATA" : "BRONCE";
    $("result-score").textContent = game.score.toLocaleString("en-US");
    $("result-stats").textContent = won
      ? `${medal} · ${game.crowd.teammates.length} compañeros · ${game.totalThrows} lanzamientos`
      : `Rescate ${game.missionIndex + 1}/${game.chapters.length} · El punto de control conserva tu equipo`;
    $("restart-label").textContent = won
      ? "Otra fuga"
      : "Reintentar este encargo";
    $("result-dialog").showModal();
  }
}
