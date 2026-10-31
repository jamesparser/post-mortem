// Procedural skin, nail, wood, brass, and satin textures. Everything is painted
// into canvases at load time so the Quest app ships no image files.

import * as THREE from "three";

function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable value noise with octaves, returned as a Float32Array of size*size.
function noiseField(size, cells, octaves, seed) {
  const rand = makeRandom(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o += 1) {
    const n = cells << o;
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
    for (let y = 0; y < size; y += 1) {
      const gy = (y / size) * n;
      const y0 = Math.floor(gy) % n;
      const y1 = (y0 + 1) % n;
      const fy = smooth(gy - Math.floor(gy));
      for (let x = 0; x < size; x += 1) {
        const gx = (x / size) * n;
        const x0 = Math.floor(gx) % n;
        const x1 = (x0 + 1) % n;
        const fx = smooth(gx - Math.floor(gx));
        const a = grid[y0 * n + x0] + (grid[y0 * n + x1] - grid[y0 * n + x0]) * fx;
        const b = grid[y1 * n + x0] + (grid[y1 * n + x1] - grid[y1 * n + x0]) * fx;
        out[y * size + x] += (a + (b - a) * fy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i += 1) out[i] /= total;
  return out;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function toTexture(c, srgb) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Paint a base skin tone with mottling and pores into an RGBA buffer.
function paintSkinBase(img, size, seed, tone) {
  const blotch = noiseField(size, 4, 4, seed);
  const pores = noiseField(size, 64, 2, seed + 11);
  const red = noiseField(size, 6, 3, seed + 23);
  for (let i = 0; i < size * size; i += 1) {
    const m = (blotch[i] - 0.5) * 0.16;
    const p = (pores[i] - 0.5) * 0.06;
    const r = Math.max(0, red[i] - 0.55) * 0.5;
    img[i * 4] = clamp255((tone[0] * (1 + m + p) + r * 60));
    img[i * 4 + 1] = clamp255(tone[1] * (1 + m + p) - r * 12);
    img[i * 4 + 2] = clamp255(tone[2] * (1 + m * 1.2 + p) - r * 10);
    img[i * 4 + 3] = 255;
  }
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v));
}

// Draw a wandering curve, used for veins, tendons, and creases.
function wander(ctx, rand, x, y, angle, length, step, jitter) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  let a = angle;
  for (let travelled = 0; travelled < length; travelled += step) {
    a += (rand() - 0.5) * jitter;
    a += (angle - a) * 0.15;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  return { x, y, a };
}

const SKIN_TONE = [184, 148, 130];

// Dorsal palm. The map is a planar projection: u across the hand (thumb at u=0),
// v along the hand (wrist at v=0, knuckles at v=1).
export function dorsalTextures(seed = 7) {
  const size = 512;
  const color = canvas(size);
  const height = canvas(size);
  const cctx = color.getContext("2d");
  const hctx = height.getContext("2d");
  const img = cctx.createImageData(size, size);
  paintSkinBase(img.data, size, seed, SKIN_TONE);
  cctx.putImageData(img, 0, 0);

  const pores = noiseField(size, 96, 1, seed + 3);
  const himg = hctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const v = 120 + (pores[i] - 0.5) * 30;
    himg.data[i * 4] = himg.data[i * 4 + 1] = himg.data[i * 4 + 2] = v;
    himg.data[i * 4 + 3] = 255;
  }
  hctx.putImageData(himg, 0, 0);

  const rand = makeRandom(seed + 101);
  const knuckles = [0.18, 0.4, 0.6, 0.82];

  // Tendons. Broad, soft, raised. From the wrist toward each knuckle.
  for (const k of knuckles) {
    const x0 = (0.42 + (k - 0.5) * 0.35) * size;
    const x1 = k * size;
    hctx.strokeStyle = "rgba(200,200,200,0.55)";
    hctx.lineWidth = size * 0.035;
    hctx.filter = "blur(6px)";
    hctx.beginPath();
    hctx.moveTo(x0, 0);
    hctx.quadraticCurveTo((x0 + x1) / 2 + (rand() - 0.5) * 20, size * 0.5, x1, size * 0.97);
    hctx.stroke();
    cctx.strokeStyle = "rgba(235,205,185,0.18)";
    cctx.lineWidth = size * 0.03;
    cctx.filter = "blur(6px)";
    cctx.beginPath();
    cctx.moveTo(x0, 0);
    cctx.quadraticCurveTo((x0 + x1) / 2, size * 0.5, x1, size * 0.97);
    cctx.stroke();
  }

  // Veins. Branching, bluish, slightly raised, mostly toward the wrist.
  const veinStarts = 3;
  for (let i = 0; i < veinStarts; i += 1) {
    const x = (0.2 + rand() * 0.6) * size;
    const y = size * (0.02 + rand() * 0.1);
    const angle = Math.PI / 2 + (rand() - 0.5) * 0.7;
    drawVein(cctx, hctx, rand, x, y, angle, size * (0.45 + rand() * 0.35), size * 0.012, 2);
  }

  // Knuckle redness and wrinkles.
  for (const k of knuckles) {
    const cx = k * size;
    const cy = size * 0.95;
    const grad = cctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.08);
    grad.addColorStop(0, "rgba(170,90,80,0.28)");
    grad.addColorStop(1, "rgba(170,90,80,0)");
    cctx.filter = "none";
    cctx.fillStyle = grad;
    cctx.fillRect(cx - size * 0.1, cy - size * 0.1, size * 0.2, size * 0.2);
  }

  // Fine wrinkles near the wrist.
  hctx.filter = "blur(1px)";
  cctx.filter = "blur(1px)";
  for (let i = 0; i < 26; i += 1) {
    const y = size * (0.02 + rand() * 0.16);
    const x = rand() * size;
    hctx.strokeStyle = "rgba(60,60,60,0.5)";
    hctx.lineWidth = 1.5;
    wander(hctx, rand, x, y, (rand() - 0.5) * 0.4, size * (0.08 + rand() * 0.12), 4, 0.3);
    cctx.strokeStyle = "rgba(110,70,55,0.12)";
    cctx.lineWidth = 1;
    wander(cctx, rand, x, y, 0, size * 0.1, 4, 0.3);
  }

  // A few age spots and a smear of grime. He has been in the walls.
  cctx.filter = "blur(2px)";
  for (let i = 0; i < 9; i += 1) {
    cctx.fillStyle = "rgba(120,80,55," + (0.08 + rand() * 0.1) + ")";
    cctx.beginPath();
    cctx.arc(rand() * size, rand() * size, 2 + rand() * 5, 0, Math.PI * 2);
    cctx.fill();
  }
  cctx.fillStyle = "rgba(70,55,40,0.07)";
  cctx.filter = "blur(18px)";
  cctx.fillRect(size * 0.55, size * 0.2, size * 0.4, size * 0.3);
  cctx.filter = "none";
  hctx.filter = "none";

  return { map: toTexture(color, true), bump: toTexture(height, false) };
}

function drawVein(cctx, hctx, rand, x, y, angle, length, width, depth) {
  const steps = Math.floor(length / 6);
  let a = angle;
  const points = [[x, y]];
  for (let i = 0; i < steps; i += 1) {
    a += (rand() - 0.5) * 0.35;
    a += (angle - a) * 0.1;
    x += Math.cos(a) * 6;
    y += Math.sin(a) * 6;
    points.push([x, y]);
  }
  const stroke = (ctx, style, w, blur) => {
    ctx.filter = "blur(" + blur + "px)";
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const p of points) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  };
  stroke(cctx, "rgba(95,110,130,0.10)", width * 1.6, 5);
  stroke(cctx, "rgba(85,100,125,0.07)", width * 0.8, 2.5);
  stroke(hctx, "rgba(225,225,225,0.6)", width * 1.1, 3);
  if (depth > 0) {
    const branches = 1 + Math.floor(rand() * 2);
    for (let b = 0; b < branches; b += 1) {
      const p = points[Math.floor(points.length * (0.3 + rand() * 0.5))];
      if (!p) continue;
      drawVein(cctx, hctx, rand, p[0], p[1], angle + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.4), length * 0.45, width * 0.7, depth - 1);
    }
  }
}

// Palmar side. Pinker, with the three main creases.
export function palmarTextures(seed = 9) {
  const size = 512;
  const color = canvas(size);
  const height = canvas(size);
  const cctx = color.getContext("2d");
  const hctx = height.getContext("2d");
  const img = cctx.createImageData(size, size);
  paintSkinBase(img.data, size, seed, [196, 150, 134]);
  cctx.putImageData(img, 0, 0);
  const fine = noiseField(size, 128, 1, seed + 5);
  const himg = hctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const v = 128 + (fine[i] - 0.5) * 40;
    himg.data[i * 4] = himg.data[i * 4 + 1] = himg.data[i * 4 + 2] = v;
    himg.data[i * 4 + 3] = 255;
  }
  hctx.putImageData(himg, 0, 0);
  const rand = makeRandom(seed + 77);
  const crease = (pts) => {
    for (const [ctx, style, w, blur] of [
      [cctx, "rgba(120,60,55,0.35)", 3, 1],
      [hctx, "rgba(20,20,20,0.8)", 4, 1.5],
    ]) {
      ctx.filter = "blur(" + blur + "px)";
      ctx.strokeStyle = style;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0] * size, pts[1] * size);
      ctx.bezierCurveTo(pts[2] * size, pts[3] * size, pts[4] * size, pts[5] * size, pts[6] * size, pts[7] * size);
      ctx.stroke();
    }
  };
  crease([0.95, 0.78, 0.7, 0.72, 0.45, 0.8, 0.25, 0.9]);
  crease([0.08, 0.7, 0.3, 0.6, 0.6, 0.62, 0.9, 0.5]);
  crease([0.1, 0.62, 0.3, 0.45, 0.32, 0.2, 0.42, 0.04]);
  for (let i = 0; i < 40; i += 1) {
    hctx.strokeStyle = "rgba(60,60,60,0.4)";
    hctx.lineWidth = 1;
    wander(hctx, rand, rand() * size, rand() * size, rand() * Math.PI, size * 0.06, 3, 0.6);
  }
  cctx.filter = "none";
  hctx.filter = "none";
  return { map: toTexture(color, true), bump: toTexture(height, false) };
}

// Fingers. Lathe UV: u wraps around (dorsal at u=0.5), v runs base to tip.
export function fingerTextures(seed = 13) {
  const w = 256;
  const h = 256;
  const color = canvas(w);
  const height = canvas(w);
  const cctx = color.getContext("2d");
  const hctx = height.getContext("2d");
  const img = cctx.createImageData(w, h);
  paintSkinBase(img.data, w, seed, SKIN_TONE);
  cctx.putImageData(img, 0, 0);
  hctx.fillStyle = "rgb(128,128,128)";
  hctx.fillRect(0, 0, w, h);
  const rand = makeRandom(seed + 9);

  // Dorsal knuckle wrinkles near the base of each segment.
  for (let i = 0; i < 9; i += 1) {
    const y = h * (0.06 + i * 0.022 + rand() * 0.01);
    const span = w * (0.12 + rand() * 0.08);
    for (const [ctx, style, lw] of [
      [hctx, "rgba(70,70,70,0.45)", 1.5],
      [cctx, "rgba(120,75,65,0.1)", 1],
    ]) {
      ctx.filter = "blur(0.8px)";
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - span, y + (rand() - 0.5) * 3);
      ctx.quadraticCurveTo(w * 0.5, y - 4 - rand() * 3, w * 0.5 + span, y + (rand() - 0.5) * 3);
      ctx.stroke();
    }
  }
  // Knuckle redness.
  const grad = cctx.createRadialGradient(w * 0.5, h * 0.1, 2, w * 0.5, h * 0.1, w * 0.22);
  grad.addColorStop(0, "rgba(175,95,85,0.3)");
  grad.addColorStop(1, "rgba(175,95,85,0)");
  cctx.filter = "none";
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, w, h * 0.4);

  // Palmar flexion creases near the far end of each segment.
  for (let i = 0; i < 2; i += 1) {
    const y = h * (0.9 + i * 0.03);
    for (const [ctx, style, lw] of [
      [hctx, "rgba(20,20,20,0.85)", 2.5],
      [cctx, "rgba(130,65,60,0.3)", 2],
    ]) {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * 0.22, y + 1);
      ctx.moveTo(w * 0.78, y);
      ctx.lineTo(w, y + 1);
      ctx.stroke();
    }
  }
  // Grime in the creases.
  cctx.fillStyle = "rgba(60,45,35,0.08)";
  cctx.filter = "blur(4px)";
  cctx.fillRect(0, h * 0.85, w, h * 0.15);
  cctx.filter = "none";
  hctx.filter = "none";
  return { map: toTexture(color, true), bump: toTexture(height, false) };
}

// Healed stump. Pinker, shinier, puckered toward the centre.
export function stumpTextures(seed = 21) {
  const size = 256;
  const color = canvas(size);
  const height = canvas(size);
  const cctx = color.getContext("2d");
  const hctx = height.getContext("2d");
  const img = cctx.createImageData(size, size);
  paintSkinBase(img.data, size, seed, SKIN_TONE);
  cctx.putImageData(img, 0, 0);
  hctx.fillStyle = "rgb(128,128,128)";
  hctx.fillRect(0, 0, size, size);
  const rand = makeRandom(seed);
  // Lathe v runs along the wrist. The cap occupies the high v rows.
  const g = cctx.createLinearGradient(0, size * 0.72, 0, size);
  g.addColorStop(0, "rgba(185,115,108,0)");
  g.addColorStop(1, "rgba(185,115,108,0.45)");
  cctx.fillStyle = g;
  cctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i += 1) {
    const x = rand() * size;
    hctx.strokeStyle = "rgba(40,40,40,0.6)";
    hctx.lineWidth = 1 + rand() * 1.5;
    hctx.beginPath();
    hctx.moveTo(x, size * (0.86 + rand() * 0.05));
    hctx.lineTo(x + (rand() - 0.5) * 6, size);
    hctx.stroke();
  }
  return { map: toTexture(color, true), bump: toTexture(height, false) };
}

export function skinMaterial(textures, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: options.bumpScale ?? 1.4,
    roughness: options.roughness ?? 0.58,
    metalness: 0,
    sheen: 0.6,
    sheenColor: new THREE.Color(0.9, 0.45, 0.38),
    sheenRoughness: 0.75,
    clearcoat: options.clearcoat ?? 0.08,
    clearcoatRoughness: 0.5,
    vertexColors: Boolean(options.vertexColors),
  });
}

export function nailMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe2c3b4,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    vertexColors: true,
  });
}

export function woodTextures(seed = 31) {
  const w = 512;
  const color = canvas(w);
  const height = canvas(w);
  const cctx = color.getContext("2d");
  const hctx = height.getContext("2d");
  const field = noiseField(w, 3, 3, seed);
  const fine = noiseField(w, 64, 2, seed + 1);
  const img = cctx.createImageData(w, w);
  const himg = hctx.createImageData(w, w);
  for (let y = 0; y < w; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const ring = Math.sin((x / w) * 60 + field[i] * 18) * 0.5 + 0.5;
      const grain = Math.pow(ring, 3) * 0.35 + (fine[i] - 0.5) * 0.12;
      const r = 92 - grain * 55;
      const g = 56 - grain * 36;
      const b = 34 - grain * 22;
      img.data[i * 4] = clamp255(r);
      img.data[i * 4 + 1] = clamp255(g);
      img.data[i * 4 + 2] = clamp255(b);
      img.data[i * 4 + 3] = 255;
      const hv = 128 - grain * 80;
      himg.data[i * 4] = himg.data[i * 4 + 1] = himg.data[i * 4 + 2] = hv;
      himg.data[i * 4 + 3] = 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  hctx.putImageData(himg, 0, 0);
  return { map: toTexture(color, true), bump: toTexture(height, false) };
}

export function woodMaterial(textures) {
  return new THREE.MeshPhysicalMaterial({
    map: textures.map,
    bumpMap: textures.bump,
    bumpScale: 0.6,
    roughness: 0.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
  });
}

export function brassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xb08d4a,
    metalness: 1,
    roughness: 0.32,
  });
}

export function satinMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe9e2d4,
    roughness: 0.55,
    sheen: 1,
    sheenColor: new THREE.Color(1, 0.97, 0.9),
    sheenRoughness: 0.35,
    side: THREE.DoubleSide,
  });
}

export { makeRandom };
