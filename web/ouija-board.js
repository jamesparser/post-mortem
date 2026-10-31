// Board rendering and letter hit zones.
// Draws once to an offscreen buffer, then blits each frame.

const Board = (() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  let buffer = null;
  let bctx = null;
  let W = 0;
  let H = 0;
  let dpr = 1;

  const planchette = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    target: null,
  };

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const centers = {};

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buffer = document.createElement("canvas");
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    bctx = buffer.getContext("2d");
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoard();
    planchette.x = W / 2;
    planchette.y = H * 0.52;
  }

  function drawBoard() {
    const g = bctx;

    const wood = g.createLinearGradient(0, 0, 0, H);
    wood.addColorStop(0, "#4a3524");
    wood.addColorStop(0.5, "#3a2818");
    wood.addColorStop(1, "#241809");
    g.fillStyle = wood;
    g.fillRect(0, 0, W, H);

    for (let i = 0; i < 14; i++) {
      g.strokeStyle = "rgba(255, 220, 170, " + (0.03 + Math.random() * 0.05) + ")";
      g.lineWidth = 1;
      g.beginPath();
      const y = (H / 14) * i + Math.random() * 6;
      g.moveTo(0, y);
      for (let x = 0; x <= W; x += 24) {
        g.lineTo(x, y + Math.sin(x * 0.02 + i) * 2.5);
      }
      g.stroke();
    }

    const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.65)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);

    g.fillStyle = "#d8c69a";
    g.textAlign = "center";
    g.textBaseline = "middle";

    const top = H * 0.16;
    const rowGap = H * 0.105;
    const cols = 13;
    const innerW = W * 0.86;
    const startX = W * 0.07;
    const stepX = innerW / (cols - 1);

    letters.forEach((ch, i) => {
      const row = i < 26 ? 0 : 1;
      const col = i < 26 ? i : i - 26;
      const inRow = row === 0 ? 26 : 10;
      const span = stepX * (inRow - 1);
      const x = W / 2 - span / 2 + stepX * col;
      const y = top + row * rowGap + (row === 0 ? 0 : rowGap * 0.35);
      centers[ch] = { x, y };
      g.font = Math.round(H * 0.052) + "px Georgia, serif";
      g.fillStyle = "rgba(216, 198, 154, 0.82)";
      g.fillText(ch, x, y);
    });

    const by = H * 0.80;
    g.font = Math.round(H * 0.038) + "px Georgia, serif";
    g.fillStyle = "rgba(216, 198, 154, 0.75)";
    g.fillText("YES", W * 0.16, by);
    g.fillText("NO", W * 0.84, by);
    g.fillText("G O O D   B Y E", W / 2, H * 0.92);
    centers["GOOD BYE"] = { x: W / 2, y: H * 0.92 };
    centers["YES"] = { x: W * 0.16, y: by };
    centers["NO"] = { x: W * 0.84, y: by };
  }

  function drawPlanchette() {
    const p = planchette;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 8, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(-24, -20, 24, 20);
    grad.addColorStop(0, "#e8d8b0");
    grad.addColorStop(1, "#b9a074");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 16);
    ctx.lineTo(-22, 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(40, 28, 16, 0.55)";
    ctx.beginPath();
    ctx.arc(0, 2, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGlow(ch) {
    if (!ch || !centers[ch]) return;
    const c = centers[ch];
    const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 26);
    glow.addColorStop(0, "rgba(200, 162, 74, 0.35)");
    glow.addColorStop(1, "rgba(200, 162, 74, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(glowChar) {
    ctx.clearRect(0, 0, W, H);
    if (buffer) ctx.drawImage(buffer, 0, 0, W, H);
    if (glowChar) drawGlow(glowChar);
    drawPlanchette();
  }

  function springTo(target, dt) {
    const p = planchette;
    if (!target) return;
    const k = 120;
    const d = 18;
    const ax = (target.x - p.x) * k - p.vx * d;
    const ay = (target.y - p.y) * k - p.vy * d;
    p.vx += ax * dt;
    p.vy += ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot = Math.sin(performance.now() * 0.0015) * 0.02;
    p.x += (Math.random() - 0.5) * 0.6;
    p.y += (Math.random() - 0.5) * 0.6;
  }

  function jumpTo(x, y) {
    planchette.x = x;
    planchette.y = y;
    planchette.vx = 0;
    planchette.vy = 0;
  }

  window.addEventListener("resize", resize);
  resize();

  return {
    frame,
    springTo,
    jumpTo,
    centers,
    planchette,
    canvas,
    size: () => ({ W, H }),
  };
})();
