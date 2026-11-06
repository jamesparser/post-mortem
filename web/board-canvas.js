// The spirit board. Painted once into an offscreen canvas: aged wood, worn
// varnish, letters in ink that has faded unevenly. The planchette is a wooden
// heart with a glass window that magnifies the letter beneath it.

const Board = (() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  let buffer = null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let light = 1;

  const planchette = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, shiver: 0, hands: false };
  const centers = {};
  let lit = {};

  function rand(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Small value noise for grain and wear.
  function noiseGrid(cols, rows, r) {
    const g = [];
    for (let i = 0; i < cols * rows; i += 1) g.push(r());
    return (x, y) => {
      const gx = Math.max(0, Math.min(cols - 1.001, x * (cols - 1)));
      const gy = Math.max(0, Math.min(rows - 1.001, y * (rows - 1)));
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = g[y0 * cols + x0];
      const b = g[y0 * cols + x0 + 1];
      const c = g[(y0 + 1) * cols + x0];
      const d = g[(y0 + 1) * cols + x0 + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buffer = document.createElement("canvas");
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const b = buffer.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoard(b);
    const home = homePoint();
    planchette.x = home.x;
    planchette.y = home.y;
    planchette.vx = 0;
    planchette.vy = 0;
  }

  function homePoint() {
    return { x: W / 2, y: H * 0.66 };
  }

  function drawWood(g) {
    const r = rand(1031);
    const big = noiseGrid(6, 4, r);
    const img = g.createImageData(Math.round(W * dpr), Math.round(H * dpr));
    const iw = img.width;
    const ih = img.height;
    for (let y = 0; y < ih; y += 1) {
      for (let x = 0; x < iw; x += 1) {
        const u = x / iw;
        const v = y / ih;
        const warp = big(u, v) * 14;
        const ring = Math.sin(v * 150 + warp + Math.sin(u * 2.3) * 2) * 0.5 + 0.5;
        const tone = (big(v, u) - 0.5) * 0.12;
        const grain = Math.pow(ring, 3) * 0.2 + tone + (Math.random() - 0.5) * 0.05;
        // Honey oak, darkened by age.
        const i = (y * iw + x) * 4;
        img.data[i] = 150 - grain * 70;
        img.data[i + 1] = 108 - grain * 52;
        img.data[i + 2] = 66 - grain * 34;
        img.data[i + 3] = 255;
      }
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.putImageData(img, 0, 0);
    g.restore();

    // Worn varnish: a lighter, duller patch where hands have slid for decades.
    const wear = g.createRadialGradient(W / 2, H * 0.55, H * 0.05, W / 2, H * 0.55, H * 0.55);
    wear.addColorStop(0, "rgba(205,170,120,0.18)");
    wear.addColorStop(1, "rgba(205,170,120,0)");
    g.fillStyle = wear;
    g.fillRect(0, 0, W, H);

    // Scratches and small dents.
    for (let i = 0; i < 60; i += 1) {
      g.strokeStyle = "rgba(40,24,12," + (0.05 + r() * 0.12) + ")";
      g.lineWidth = 0.5 + r() * 0.8;
      g.beginPath();
      const x = r() * W;
      const y = r() * H;
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 8);
      g.stroke();
    }

    // Darker, oilier edges and a bevel.
    const edge = g.createLinearGradient(0, 0, 0, H);
    edge.addColorStop(0, "rgba(30,18,8,0.45)");
    edge.addColorStop(0.12, "rgba(30,18,8,0)");
    edge.addColorStop(0.88, "rgba(30,18,8,0)");
    edge.addColorStop(1, "rgba(30,18,8,0.55)");
    g.fillStyle = edge;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,230,190,0.12)";
    g.lineWidth = 2;
    g.strokeRect(4, 4, W - 8, H - 8);
    g.strokeStyle = "rgba(20,12,6,0.6)";
    g.lineWidth = 1;
    g.strokeRect(9, 9, W - 18, H - 18);
  }

  // Ink that has faded unevenly: draw, then rub parts of it away.
  function inked(g, draw) {
    const layer = document.createElement("canvas");
    layer.width = buffer.width;
    layer.height = buffer.height;
    const l = layer.getContext("2d");
    l.setTransform(dpr, 0, 0, dpr, 0, 0);
    l.fillStyle = "rgba(28,17,9,0.9)";
    l.strokeStyle = "rgba(28,17,9,0.85)";
    draw(l);
    const r = rand(77);
    const fade = noiseGrid(9, 6, r);
    l.globalCompositeOperation = "destination-out";
    for (let y = 0; y < H; y += 6) {
      for (let x = 0; x < W; x += 6) {
        const f = fade(x / W, y / H);
        const a = Math.max(0, f - 0.42) * 0.9 + Math.random() * 0.08;
        if (a > 0.02) {
          l.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")";
          l.fillRect(x, y, 6, 6);
        }
      }
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(layer, 0, 0);
    g.restore();
  }

  function arcRow(g, letters, cy, radius, spread, size) {
    const n = letters.length;
    letters.forEach((ch, i) => {
      const a = -spread / 2 + (spread * i) / (n - 1);
      const x = W / 2 + Math.sin(a) * radius;
      const y = cy - Math.cos(a) * radius + radius;
      centers[ch] = { x, y };
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.font = "600 " + size + "px Georgia, 'Times New Roman', serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ch, 0, 0);
      g.restore();
    });
  }

  function drawSun(g, x, y, s) {
    g.beginPath();
    g.arc(x, y, s * 0.42, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, s * 0.05);
    g.stroke();
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55);
      g.lineTo(x + Math.cos(a) * s * (i % 2 ? 0.75 : 0.9), y + Math.sin(a) * s * (i % 2 ? 0.75 : 0.9));
      g.stroke();
    }
  }

  function drawMoon(g, x, y, s) {
    g.beginPath();
    g.arc(x, y, s * 0.6, Math.PI * 0.35, Math.PI * 1.65, false);
    g.arc(x + s * 0.28, y, s * 0.48, Math.PI * 1.55, Math.PI * 0.45, true);
    g.closePath();
    g.fill();
  }

  function drawBoard(g) {
    drawWood(g);
    const size = Math.max(14, Math.round(H * 0.085));
    inked(g, (l) => {
      arcRow(l, "ABCDEFGHIJKLM".split(""), H * 0.27, W * 1.05, 0.82, size);
      arcRow(l, "NOPQRSTUVWXYZ".split(""), H * 0.45, W * 1.05, 0.78, size);
      const digits = "1234567890".split("");
      digits.forEach((ch, i) => {
        const x = W * 0.22 + (W * 0.56 * i) / (digits.length - 1);
        const y = H * 0.66;
        centers[ch] = { x, y };
        l.font = "600 " + Math.round(size * 0.82) + "px Georgia, serif";
        l.textAlign = "center";
        l.textBaseline = "middle";
        l.fillText(ch, x, y);
      });
      l.font = "600 " + Math.round(size * 0.78) + "px Georgia, serif";
      l.textAlign = "center";
      l.fillText("YES", W * 0.21, H * 0.11);
      l.fillText("NO", W * 0.79, H * 0.11);
      centers.YES = { x: W * 0.21, y: H * 0.11 };
      centers.NO = { x: W * 0.79, y: H * 0.11 };
      l.font = "600 " + Math.round(size * 0.82) + "px Georgia, serif";
      l.fillText("GOOD  BYE", W / 2, H * 0.86);
      centers["GOOD BYE"] = { x: W / 2, y: H * 0.86 };
      drawSun(l, W * 0.06 + size * 0.4, H * 0.12, size * 0.9);
      drawMoon(l, W * 0.94 - size * 0.4, H * 0.12, size * 0.8);
      // A thin engraved border and a divider over GOOD BYE.
      l.lineWidth = 1;
      l.strokeRect(W * 0.03, H * 0.04, W * 0.94, H * 0.92);
      l.beginPath();
      l.moveTo(W * 0.32, H * 0.78);
      l.lineTo(W * 0.68, H * 0.78);
      l.stroke();
    });
  }

  function heartPath(c, s) {
    c.beginPath();
    c.moveTo(0, -s * 1.15);
    c.bezierCurveTo(s * 0.55, -s * 0.55, s * 1.05, -s * 0.05, s * 0.95, s * 0.55);
    c.bezierCurveTo(s * 0.85, s * 1.05, s * 0.25, s * 1.05, 0, s * 0.72);
    c.bezierCurveTo(-s * 0.25, s * 1.05, -s * 0.85, s * 1.05, -s * 0.95, s * 0.55);
    c.bezierCurveTo(-s * 1.05, -s * 0.05, -s * 0.55, -s * 0.55, 0, -s * 1.15);
    c.closePath();
  }

  // The window is at (0,0). The pointed tip faces up, the lobes down.
  function drawPlanchette() {
    const p = planchette;
    const s = Math.max(22, Math.min(W, H * 1.6) * 0.055);
    const jx = p.shiver ? (Math.random() - 0.5) * p.shiver : 0;
    const jy = p.shiver ? (Math.random() - 0.5) * p.shiver : 0;
    ctx.save();
    ctx.translate(p.x + jx, p.y + jy);
    ctx.rotate(p.rot);

    // Shadow lifted slightly off the board on felt feet.
    ctx.save();
    ctx.translate(s * 0.12, s * 0.22);
    heartPath(ctx, s);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.filter = "blur(4px)";
    ctx.fill();
    ctx.restore();
    ctx.filter = "none";

    // Wood body.
    heartPath(ctx, s);
    const wood = ctx.createLinearGradient(-s, -s, s, s);
    wood.addColorStop(0, "#8d6740");
    wood.addColorStop(0.5, "#6e4d2c");
    wood.addColorStop(1, "#4b321b");
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,225,180,0.25)";
    ctx.stroke();

    // Glass window. It magnifies the board beneath it.
    const r = s * 0.36;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(-p.rot);
    const zoom = 1.35;
    ctx.drawImage(
      buffer,
      (p.x - r / zoom) * dpr,
      (p.y - r / zoom) * dpr,
      ((r * 2) / zoom) * dpr,
      ((r * 2) / zoom) * dpr,
      -r,
      -r,
      r * 2,
      r * 2
    );
    const glass = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
    glass.addColorStop(0, "rgba(255,255,255,0.28)");
    glass.addColorStop(0.4, "rgba(255,255,255,0.04)");
    glass.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = glass;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(40,26,12,0.9)";
    ctx.stroke();

    // Fingertips resting on the planchette.
    if (p.hands) {
      ctx.fillStyle = "rgba(225,200,180,0.32)";
      for (const [fx, fy] of [[-s * 0.5, s * 0.45], [s * 0.5, s * 0.45]]) {
        ctx.beginPath();
        ctx.ellipse(fx, fy, s * 0.17, s * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawLit() {
    for (const ch of Object.keys(lit)) {
      const c = centers[ch];
      const a = lit[ch];
      if (!c || a <= 0.01) continue;
      const g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, 30);
      g.addColorStop(0, "rgba(255,214,150," + (0.22 * a).toFixed(3) + ")");
      g.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(c.x - 30, c.y - 30, 60, 60);
      lit[ch] = a * 0.985;
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (buffer) ctx.drawImage(buffer, 0, 0, W, H);
    drawLit();
    // A single warm light from above. The edges fall into darkness.
    const lamp = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.1, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    lamp.addColorStop(0, "rgba(0,0,0,0)");
    lamp.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, W, H);
    drawPlanchette();
    if (light < 1) {
      ctx.fillStyle = "rgba(0,0,0," + (1 - light).toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Critically damped spring, a little under damped so it overshoots.
  function step(target, dt) {
    const p = planchette;
    if (!target) return 0;
    const k = 55;
    const d = 9.5;
    p.vx += ((target.x - p.x) * k - p.vx * d) * dt;
    p.vy += ((target.y - p.y) * k - p.vy * d) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const speed = Math.hypot(p.vx, p.vy);
    // It leans into the direction it travels.
    const lean = Math.max(-0.25, Math.min(0.25, p.vx * 0.0009));
    p.rot += (lean - p.rot) * Math.min(1, dt * 6);
    return speed;
  }

  function light_(v) {
    light = v;
  }

  function mark(ch) {
    lit[ch] = 1;
  }

  window.addEventListener("resize", resize);
  resize();

  return {
    canvas,
    centers,
    planchette,
    frame,
    step,
    mark,
    homePoint,
    setLight: light_,
    size: () => ({ W, H }),
    reset: () => {
      lit = {};
      light = 1;
    },
  };
})();
