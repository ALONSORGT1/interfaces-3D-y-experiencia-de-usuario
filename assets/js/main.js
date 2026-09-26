async function boot() {
  const [{ createScene }, { createPhysics }, { Game }] = await Promise.all([
    import("./scene.js"),
    import("./physics.js"),
    import("./game.js"),
  ]);
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
  document.querySelector("#app").dataset.mode = "intro";
  document.querySelector("#load-status").textContent =
    "No se pudo cargar la oficina. Revisa tu conexión y que WebGL esté habilitado.";
  document.querySelector("#start-label").textContent = "Volver a intentar";
  const button = document.querySelector("#start-button");
  button.disabled = false;
  button.onclick = () => location.reload();
});
