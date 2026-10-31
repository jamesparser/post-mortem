// In headset interface. A printed card menu, floating captions, a brass wrist
// button, and pointer rays. Everything is drawn into canvases so it reads
// like paper and ink, not like a screen.

import * as THREE from "three";

const INK = "#e8e0cf";
const DIM = "#9c927f";
const GOLD = "#c8a24a";
const PAPER = "rgba(18,15,12,0.92)";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, sans-serif";

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// A menu card with a title and a list of buttons.
export class MenuPanel {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 768;
    this.canvas.height = 896;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.42, 0.49);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false }));
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
    this.items = [];
    this.hover = -1;
    this.title = "";
    this.subtitle = "";
  }

  setItems(title, subtitle, items) {
    this.title = title;
    this.subtitle = subtitle;
    this.items = items;
    this.draw();
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = PAPER;
    roundRect(ctx, 8, 8, width - 16, height - 16, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,162,74,0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, 22, 22, width - 44, height - 44, 18);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = DIM;
    ctx.font = "500 22px " + SANS;
    ctx.fillText("POST  MORTEM", width / 2, 78);
    ctx.fillStyle = INK;
    ctx.font = "44px " + SERIF;
    ctx.fillText(this.title, width / 2, 140);
    if (this.subtitle) {
      ctx.fillStyle = DIM;
      ctx.font = "italic 26px " + SERIF;
      const lines = wrapLines(ctx, this.subtitle, width - 140);
      lines.forEach((l, i) => ctx.fillText(l, width / 2, 186 + i * 32));
    }
    const top = 270;
    const rowH = 96;
    this.rows = this.items.map((item, i) => {
      const y = top + i * rowH;
      const hovered = i === this.hover;
      ctx.fillStyle = hovered ? "rgba(200,162,74,0.18)" : "rgba(255,255,255,0.03)";
      roundRect(ctx, 70, y, width - 140, rowH - 18, 14);
      ctx.fill();
      ctx.strokeStyle = hovered ? GOLD : "rgba(200,162,74,0.25)";
      ctx.stroke();
      ctx.fillStyle = hovered ? GOLD : INK;
      ctx.font = "34px " + SERIF;
      ctx.fillText(item.label, width / 2, y + 44);
      if (item.note) {
        ctx.fillStyle = DIM;
        ctx.font = "20px " + SANS;
        ctx.fillText(item.note, width / 2, y + 68);
      }
      return { y0: y / height, y1: (y + rowH - 18) / height, x0: 70 / width, x1: (width - 70) / width };
    });
    this.texture.needsUpdate = true;
  }

  // Returns the item index under a uv point, or minus one.
  pick(uv) {
    if (!uv || !this.rows) return -1;
    const y = 1 - uv.y;
    return this.rows.findIndex((r) => uv.x > r.x0 && uv.x < r.x1 && y > r.y0 && y < r.y1);
  }

  setHover(i) {
    if (i === this.hover) return;
    this.hover = i;
    this.draw();
  }

  showAt(camera) {
    const pos = camera.getWorldPosition(new THREE.Vector3());
    const dir = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    this.mesh.position.copy(pos).addScaledVector(dir, 0.65);
    this.mesh.position.y = pos.y - 0.12;
    this.mesh.lookAt(pos.x, this.mesh.position.y + 0.05, pos.z);
    this.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
    this.setHover(-1);
  }
}

// A single line of text that floats in front of the viewer and follows lazily.
export class Caption {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 256;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.2),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, opacity: 0 })
    );
    this.mesh.renderOrder = 21;
    this.target = 0;
    this.until = 0;
    this.anchor = new THREE.Vector3();
  }

  show(text, seconds = 4, small) {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, 1024, 256);
    ctx.textAlign = "center";
    ctx.font = (small ? "40px " : "54px ") + SERIF;
    const lines = wrapLines(ctx, text, 940);
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = INK;
    const lh = small ? 50 : 64;
    const start = 128 - ((lines.length - 1) * lh) / 2 + 18;
    lines.forEach((l, i) => ctx.fillText(l, 512, start + i * lh));
    this.texture.needsUpdate = true;
    this.target = 1;
    this.until = seconds > 0 ? performance.now() + seconds * 1000 : Infinity;
  }

  hide() {
    this.target = 0;
  }

  update(camera, dt) {
    if (performance.now() > this.until) this.target = 0;
    const m = this.mesh.material;
    m.opacity += (this.target - m.opacity) * Math.min(1, dt * 4);
    this.mesh.visible = m.opacity > 0.01;
    const pos = camera.getWorldPosition(new THREE.Vector3());
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const goal = pos.clone().addScaledVector(dir, 1.3).add(new THREE.Vector3(0, -0.18, 0));
    if (this.anchor.distanceTo(goal) > 0.35 || !this.placed) {
      this.anchor.copy(goal);
      this.placed = true;
    }
    this.mesh.position.lerp(this.anchor, Math.min(1, dt * 3));
    this.mesh.lookAt(pos);
  }
}

// A printed program for the burial. Paper, black ink, words appear as spoken.
export class Program {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 640;
    this.canvas.height = 900;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.42),
      new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.9, side: THREE.DoubleSide, transparent: true })
    );
    this.mesh.castShadow = true;
  }

  draw(name, text, fraction = 1) {
    const ctx = this.canvas.getContext("2d");
    const { width, height } = this.canvas;
    ctx.fillStyle = "#e9e2d2";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);
    ctx.textAlign = "center";
    ctx.fillStyle = "#4a4136";
    ctx.font = "18px " + SANS;
    ctx.fillText("IN LOVING MEMORY OF", width / 2, 84);
    ctx.fillStyle = "#1c1814";
    ctx.font = "38px " + SERIF;
    wrapLines(ctx, name, width - 120).slice(0, 2).forEach((l, i) => ctx.fillText(l, width / 2, 136 + i * 42));
    ctx.font = "italic 22px " + SERIF;
    ctx.fillStyle = "#4a4136";
    ctx.fillText("Ashes to ashes", width / 2, 230);
    ctx.textAlign = "left";
    ctx.fillStyle = "#1c1814";
    ctx.font = "25px " + SERIF;
    const words = text.split(/\s+/);
    const shown = words.slice(0, Math.ceil(words.length * fraction)).join(" ");
    wrapLines(ctx, shown, width - 120).forEach((l, i) => ctx.fillText(l, 60, 290 + i * 33));
    this.texture.needsUpdate = true;
  }
}

// A brass button on the left wrist. Point at it and press to open the menu.
export class WristButton {
  constructor() {
    const geo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 32);
    geo.rotateX(Math.PI / 2);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0xb08d4a, metalness: 1, roughness: 0.35, emissive: 0x2a1e08 })
    );
    this.mesh.visible = false;
  }

  // Follow a tracked object: the left wrist joint or the left controller grip.
  follow(object, isHand) {
    if (!object || !object.visible) {
      this.mesh.visible = false;
      return;
    }
    object.updateMatrixWorld(true);
    const m = object.matrixWorld;
    const offset = isHand ? new THREE.Vector3(0, 0.035, 0.03) : new THREE.Vector3(0, 0.03, 0.07);
    this.mesh.position.copy(offset.applyMatrix4(m));
    this.mesh.quaternion.setFromRotationMatrix(m);
    this.mesh.visible = true;
  }
}

export function makeRay() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8e0cf, transparent: true, opacity: 0.35 }));
  line.visible = false;
  return line;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
