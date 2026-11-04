// Spirits at the edge of vision. Pale, soft, human in proportion. They appear
// beside the board, never on it, and fade if you look toward them.

const Spirits = (() => {
  const layer = document.getElementById("whisper-layer");
  const MIN_GAP = 40000;
  let lastAt = performance.now() - 25000;
  let current = null;

  function figure() {
    const c = document.createElement("canvas");
    const w = 160;
    const h = 380;
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.filter = "blur(3px)";
    const pale = (a) => "rgba(222,216,200," + a + ")";
    // Head, a little bowed.
    let grad = g.createRadialGradient(w * 0.52, h * 0.12, 2, w * 0.52, h * 0.12, w * 0.2);
    grad.addColorStop(0, pale(0.55));
    grad.addColorStop(1, pale(0));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(w * 0.52, h * 0.12, w * 0.12, w * 0.15, 0.1, 0, Math.PI * 2);
    g.fill();
    // Shoulders and a long body that thins out toward the floor.
    grad = g.createLinearGradient(0, h * 0.2, 0, h);
    grad.addColorStop(0, pale(0.4));
    grad.addColorStop(0.55, pale(0.18));
    grad.addColorStop(1, pale(0));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w * 0.42, h * 0.2);
    g.bezierCurveTo(w * 0.12, h * 0.24, w * 0.14, h * 0.4, w * 0.2, h * 0.62);
    g.bezierCurveTo(w * 0.26, h * 0.85, w * 0.34, h * 0.98, w * 0.5, h);
    g.bezierCurveTo(w * 0.66, h * 0.98, w * 0.74, h * 0.85, w * 0.8, h * 0.62);
    g.bezierCurveTo(w * 0.86, h * 0.4, w * 0.88, h * 0.24, w * 0.6, h * 0.2);
    g.closePath();
    g.fill();
    return c;
  }

  function flash(force) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (current || now - lastAt < MIN_GAP) return;
    if (!force && Math.random() < 0.3) return;
    lastAt = now;
    const el = figure();
    el.className = "spirit";
    const side = Math.random() < 0.5 ? "left" : "right";
    el.style[side] = (1 + Math.random() * 5) + "vw";
    el.style.top = (14 + Math.random() * 18) + "vh";
    layer.appendChild(el);
    current = el;
    requestAnimationFrame(() => {
      el.style.opacity = (0.28 + Math.random() * 0.12).toFixed(2);
    });
    const hold = 1000 + Math.random() * 2000;
    setTimeout(() => vanish(el), hold);
    BoardAudio.whisper(side);
  }

  function vanish(el) {
    if (!el || !el.parentNode) return;
    el.style.transition = "opacity 500ms ease";
    el.style.opacity = "0";
    setTimeout(() => {
      el.remove();
      if (current === el) current = null;
    }, 600);
  }

  // Looking toward it, with the pointer, makes it go.
  window.addEventListener("pointermove", (e) => {
    if (!current) return;
    const r = current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 220) vanish(current);
  });

  function schedule() {
    setTimeout(() => {
      flash(true);
      schedule();
    }, 40000 + Math.random() * 50000);
  }
  schedule();

  return { flash };
})();
