// Spirits at the edge of vision. Pale, soft, human in proportion, half out of
// frame like something seen from the side of the eye. They sway a little,
// flicker, and are gone if you look toward them.

const Spirits = (() => {
  const layer = document.getElementById("whisper-layer");
  const MIN_GAP = 40000;
  let lastAt = performance.now() - 25000;
  let current = null;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  // Paint a figure: a bowed head with dark hollows for eyes and mouth, hair
  // falling past the shoulders, arms hanging, a long shroud that thins out.
  function figure() {
    const c = document.createElement("canvas");
    const w = 220;
    const h = 560;
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const pale = (a) => "rgba(226,222,210," + a + ")";
    const cx = w * 0.5 + rand(-6, 6);

    g.filter = "blur(5px)";
    // Shroud and body.
    let grad = g.createLinearGradient(0, h * 0.18, 0, h);
    grad.addColorStop(0, pale(0.5));
    grad.addColorStop(0.5, pale(0.22));
    grad.addColorStop(1, pale(0));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx - 26, h * 0.2);
    g.bezierCurveTo(cx - 70, h * 0.23, cx - 74, h * 0.36, cx - 66, h * 0.55);
    g.bezierCurveTo(cx - 58, h * 0.8, cx - 40, h * 0.97, cx, h);
    g.bezierCurveTo(cx + 40, h * 0.97, cx + 58, h * 0.8, cx + 66, h * 0.55);
    g.bezierCurveTo(cx + 74, h * 0.36, cx + 70, h * 0.23, cx + 26, h * 0.2);
    g.closePath();
    g.fill();

    // Arms hanging at the sides.
    g.strokeStyle = pale(0.3);
    g.lineWidth = 14;
    g.lineCap = "round";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + s * 56, h * 0.25);
      g.quadraticCurveTo(cx + s * 70, h * 0.4, cx + s * 60, h * 0.52);
      g.stroke();
    }

    // Head, bowed slightly.
    g.filter = "blur(3px)";
    grad = g.createRadialGradient(cx, h * 0.12, 4, cx, h * 0.12, 42);
    grad.addColorStop(0, pale(0.75));
    grad.addColorStop(1, pale(0));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, h * 0.12, 30, 38, 0.08, 0, Math.PI * 2);
    g.fill();

    // Hair falling past the shoulders.
    g.fillStyle = "rgba(40,36,32,0.35)";
    g.beginPath();
    g.moveTo(cx - 30, h * 0.08);
    g.quadraticCurveTo(cx - 44, h * 0.2, cx - 36, h * 0.3);
    g.lineTo(cx - 22, h * 0.24);
    g.quadraticCurveTo(cx - 26, h * 0.12, cx, h * 0.06);
    g.quadraticCurveTo(cx + 26, h * 0.12, cx + 22, h * 0.24);
    g.lineTo(cx + 36, h * 0.3);
    g.quadraticCurveTo(cx + 44, h * 0.2, cx + 30, h * 0.08);
    g.quadraticCurveTo(cx, h * 0.0, cx - 30, h * 0.08);
    g.fill();

    // The face: hollows, not features.
    g.filter = "blur(2.5px)";
    g.fillStyle = "rgba(20,18,16,0.55)";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 11, h * 0.115, 6, 7.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(20,18,16,0.4)";
    g.beginPath();
    g.ellipse(cx, h * 0.16, 5, 8, 0, 0, Math.PI * 2);
    g.fill();

    // Grain, so it reads as something seen and not drawn.
    g.filter = "none";
    const img = g.getImageData(0, 0, w, h);
    for (let i = 3; i < img.data.length; i += 4) {
      if (img.data[i] > 0) img.data[i] = Math.max(0, img.data[i] * (0.75 + Math.random() * 0.4));
    }
    g.putImageData(img, 0, 0);
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
    // Half out of frame, at the side of the eye.
    el.style[side] = rand(-90, -40) + "px";
    el.style.top = rand(8, 22) + "vh";
    el.style.transform = "scaleX(" + (side === "left" ? 1 : -1) + ")";
    layer.appendChild(el);
    current = el;
    requestAnimationFrame(() => {
      el.style.opacity = rand(0.32, 0.45).toFixed(2);
    });
    // A slight flicker, as if the light cannot decide.
    const flicker = setInterval(() => {
      if (!el.parentNode) return clearInterval(flicker);
      if (Math.random() < 0.25) el.style.opacity = rand(0.18, 0.45).toFixed(2);
    }, 260);
    const hold = rand(1400, 3000);
    setTimeout(() => vanish(el), hold);
    BoardAudio.circle("breath");
  }

  function vanish(el) {
    if (!el || !el.parentNode) return;
    el.style.transition = "opacity 380ms ease";
    el.style.opacity = "0";
    setTimeout(() => {
      el.remove();
      if (current === el) current = null;
    }, 450);
  }

  // Looking toward it, with the pointer, makes it go.
  window.addEventListener("pointermove", (e) => {
    if (!current) return;
    const r = current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 260) vanish(current);
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
