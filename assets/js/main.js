import { createScene } from "./scene.js";
import { createPhysics } from "./physics.js";
import { Game } from "./game.js";
async function boot() {
  const [view, physics] = await Promise.all([
    createScene(document.querySelector("#scene")),
    createPhysics(),
  ]);
  const game = new Game(view, physics);
  // Explicit development mode for reproducible browser tests; absent in normal play.
  if (new URLSearchParams(location.search).has("test")) window.__game = game;
}
boot().catch((error) => {
  console.error(error);
  document.querySelector("#load-status").textContent =
    "No se pudo cargar la oficina. Comprueba tu conexión y recarga.";
});
