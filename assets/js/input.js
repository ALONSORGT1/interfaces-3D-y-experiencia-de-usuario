export class Input {
  constructor(canvas, actions) {
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0.43;
    this.distance = 7.7;
    this.enabled = false;
    this.drag = null;
    this.canvas = canvas;
    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input,textarea,select")) return;
      if (["KeyP", "Escape"].includes(e.code)) {
        if (!e.repeat) actions.pause();
        return;
      }
      if (!this.enabled) return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (
        !e.repeat &&
        ["KeyF", "Space"].includes(e.code) &&
        !e.target.matches("button")
      )
        actions.throw();
      if (!e.repeat && e.code === "KeyE") actions.interact();
      if (!e.repeat && e.code === "KeyQ") actions.mode?.();
      if (!e.repeat && e.code === "KeyM") actions.map?.();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.clear();
      actions.blur();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clear();
        actions.blur();
      }
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.enabled || !this.drag) return;
      this.yaw -= (e.clientX - this.drag.x) * 0.005;
      this.pitch = Math.max(
        0.18,
        Math.min(1.02, this.pitch + (e.clientY - this.drag.y) * 0.004),
      );
      this.drag = { x: e.clientX, y: e.clientY };
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(event, () => {
        this.drag = null;
      });
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.distance = Math.max(
          3.2,
          Math.min(11, this.distance + e.deltaY * 0.008),
        );
      },
      { passive: false },
    );
  }
  clear() {
    this.keys.clear();
    this.drag = null;
  }
  reset() {
    this.clear();
    this.yaw = 0;
    this.pitch = 0.43;
    this.distance = 7.7;
  }
  has(...keys) {
    return this.enabled && keys.some((key) => this.keys.has(key));
  }
}
