// The spirit board in passthrough. A board on your real table, a wooden
// planchette under your hand. It never shows the letter it wants. The
// controllers buzz harder and faster the closer you drift to it, and a sharp
// pulse marks the letter when you reach it. Hands without controllers get a
// trembling planchette instead. Whispers circle your head. Something pale
// stands at the side of your eye and is gone when you turn.

import * as THREE from "three";
import { woodTextures, woodMaterial } from "./skin.js";

const BOARD = { w: 0.5, d: 0.33, t: 0.014 };
const LETTER_ROW_1 = "ABCDEFGHIJKLM";
const LETTER_ROW_2 = "NOPQRSTUVWXYZ";
const DIGITS = "1234567890";
const ASK_DEAD = [
  "Is anyone here",
  "Who are you",
  "What do you want",
  "Where are you",
  "Are you alone",
  "What happened to you",
];
const ASK_DEVICE = ["Do you remember me", "Where are you now", "Are you angry with me", "Is it cold"];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// Paint the board face. Returns the texture and the board space position of
// every key, in meters from the board centre (x across, z toward the viewer).
function paintBoard() {
  const W = 1536;
  const H = Math.round((W * BOARD.d) / BOARD.w);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const u = x / W;
      const v = y / H;
      const ring = Math.sin(v * 140 + Math.sin(u * 4.1 + v * 3) * 3 + Math.sin(u * 13) * 0.6) * 0.5 + 0.5;
      const grain = Math.pow(ring, 3) * 0.2 + (Math.random() - 0.5) * 0.05;
      const i = (y * W + x) * 4;
      img.data[i] = 150 - grain * 70;
      img.data[i + 1] = 108 - grain * 52;
      img.data[i + 2] = 66 - grain * 34;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const wear = g.createRadialGradient(W / 2, H * 0.55, H * 0.05, W / 2, H * 0.55, H * 0.6);
  wear.addColorStop(0, "rgba(205,170,120,0.18)");
  wear.addColorStop(1, "rgba(205,170,120,0)");
  g.fillStyle = wear;
  g.fillRect(0, 0, W, H);
  const edge = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  edge.addColorStop(0, "rgba(25,15,6,0)");
  edge.addColorStop(1, "rgba(25,15,6,0.55)");
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);

  const keys = {};
  const size = Math.round(H * 0.085);
  g.fillStyle = "rgba(28,17,9,0.88)";
  g.strokeStyle = "rgba(28,17,9,0.8)";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const toBoard = (x, y) => ({ x: (x / W - 0.5) * BOARD.w, z: (y / H - 0.5) * BOARD.d });
  const arc = (letters, cy, radius, spread) => {
    const n = letters.length;
    letters.split("").forEach((ch, i) => {
      const a = -spread / 2 + (spread * i) / (n - 1);
      const x = W / 2 + Math.sin(a) * radius;
      const y = cy - Math.cos(a) * radius + radius;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.font = "600 " + size + "px Georgia, serif";
      g.fillText(ch, 0, 0);
      g.restore();
      keys[ch] = toBoard(x, y);
    });
  };
  arc(LETTER_ROW_1, H * 0.27, W * 1.05, 0.82);
  arc(LETTER_ROW_2, H * 0.45, W * 1.05, 0.78);
  DIGITS.split("").forEach((ch, i) => {
    const x = W * 0.22 + (W * 0.56 * i) / 9;
    const y = H * 0.66;
    g.font = "600 " + Math.round(size * 0.82) + "px Georgia, serif";
    g.fillText(ch, x, y);
    keys[ch] = toBoard(x, y);
  });
  g.font = "600 " + Math.round(size * 0.78) + "px Georgia, serif";
  g.fillText("YES", W * 0.21, H * 0.11);
  g.fillText("NO", W * 0.79, H * 0.11);
  keys.YES = toBoard(W * 0.21, H * 0.11);
  keys.NO = toBoard(W * 0.79, H * 0.11);
  g.font = "600 " + Math.round(size * 0.82) + "px Georgia, serif";
  g.fillText("GOOD  BYE", W / 2, H * 0.86);
  keys["GOOD BYE"] = toBoard(W / 2, H * 0.86);
  g.lineWidth = 3;
  g.strokeRect(W * 0.03, H * 0.04, W * 0.94, H * 0.92);
  g.beginPath();
  g.moveTo(W * 0.32, H * 0.78);
  g.lineTo(W * 0.68, H * 0.78);
  g.stroke();
  // Sun and moon.
  const s = size * 0.9;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(W * 0.08, H * 0.12, s * 0.42, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(W * 0.08 + Math.cos(a) * s * 0.55, H * 0.12 + Math.sin(a) * s * 0.55);
    g.lineTo(W * 0.08 + Math.cos(a) * s * 0.85, H * 0.12 + Math.sin(a) * s * 0.85);
    g.stroke();
  }
  g.beginPath();
  g.arc(W * 0.92, H * 0.12, s * 0.5, Math.PI * 0.35, Math.PI * 1.65, false);
  g.arc(W * 0.92 + s * 0.24, H * 0.12, s * 0.4, Math.PI * 1.55, Math.PI * 0.45, true);
  g.closePath();
  g.fill();

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, keys };
}

function planchetteMesh(wood) {
  const s = 0.034;
  const shape = new THREE.Shape();
  shape.moveTo(0, s * 1.15);
  shape.bezierCurveTo(s * 0.55, s * 0.55, s * 1.05, s * 0.05, s * 0.95, -s * 0.55);
  shape.bezierCurveTo(s * 0.85, -s * 1.05, s * 0.25, -s * 1.05, 0, -s * 0.72);
  shape.bezierCurveTo(-s * 0.25, -s * 1.05, -s * 0.85, -s * 1.05, -s * 0.95, -s * 0.55);
  shape.bezierCurveTo(-s * 1.05, s * 0.05, -s * 0.55, s * 0.55, 0, s * 1.15);
  const hole = new THREE.Path();
  hole.absarc(0, 0, s * 0.36, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, wood);
  body.position.y = 0.006;
  body.castShadow = true;
  group.add(body);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.36, s * 0.36, 0.002, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1 })
  );
  glass.position.y = 0.012;
  group.add(glass);
  // Felt feet.
  for (const [x, z] of [[0, -s * 0.8], [-s * 0.6, s * 0.55], [s * 0.6, s * 0.55]]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.006, 8), new THREE.MeshStandardMaterial({ color: 0x2a1d14 }));
    foot.position.set(x, 0.003, z);
    group.add(foot);
  }
  return group;
}

function pedestalTable(wood) {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 48), wood);
  top.position.y = 0.72;
  top.castShadow = top.receiveShadow = true;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 16), wood);
  leg.position.y = 0.355;
  leg.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.025, 32), wood);
  foot.position.y = 0.012;
  group.add(top, leg, foot);
  group.userData.top = 0.735;
  return group;
}

// A figure for the side of the eye. Same language as the web board.
function spiritTexture() {
  const w = 256;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const pale = (a) => "rgba(226,222,210," + a + ")";
  const cx = w / 2;
  g.filter = "blur(6px)";
  let grad = g.createLinearGradient(0, h * 0.18, 0, h);
  grad.addColorStop(0, pale(0.55));
  grad.addColorStop(0.55, pale(0.22));
  grad.addColorStop(1, pale(0));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(cx - 30, h * 0.2);
  g.bezierCurveTo(cx - 82, h * 0.23, cx - 86, h * 0.36, cx - 76, h * 0.55);
  g.bezierCurveTo(cx - 66, h * 0.8, cx - 46, h * 0.97, cx, h);
  g.bezierCurveTo(cx + 46, h * 0.97, cx + 66, h * 0.8, cx + 76, h * 0.55);
  g.bezierCurveTo(cx + 86, h * 0.36, cx + 82, h * 0.23, cx + 30, h * 0.2);
  g.fill();
  g.filter = "blur(4px)";
  grad = g.createRadialGradient(cx, h * 0.12, 4, cx, h * 0.12, 48);
  grad.addColorStop(0, pale(0.8));
  grad.addColorStop(1, pale(0));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(cx, h * 0.12, 34, 44, 0.08, 0, Math.PI * 2);
  g.fill();
  g.filter = "blur(3px)";
  g.fillStyle = "rgba(20,18,16,0.55)";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * 13, h * 0.115, 7, 9, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(cx, h * 0.165, 6, 9, 0, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class SpiritBoardMode {
  constructor(ctx, kind, onDone) {
    this.ctx = ctx;
    this.kind = kind === "device" ? "device" : "dead";
    this.onDone = onDone;
    const wood = woodMaterial(woodTextures(53));
    const { texture, keys } = paintBoard();
    this.keys = keys;
    this.root = new THREE.Group();
    const sides = wood;
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 });
    this.board = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.t, BOARD.d), [sides, sides, face, sides, sides, sides]);
    this.board.castShadow = true;
    this.board.receiveShadow = true;
    this.root.add(this.board);
    this.planchette = planchetteMesh(wood);
    this.board.add(this.planchette);
    this.p = { x: 0, z: 0.06, vx: 0, vz: 0 };
    this.target = { x: 0, z: 0.06 };
    this.glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.022, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = BOARD.t / 2 + 0.001;
    this.board.add(this.glow);
    this.spirit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 1.55),
      new THREE.MeshBasicMaterial({ map: spiritTexture(), transparent: true, opacity: 0, depthWrite: false })
    );
    this.spirit.visible = false;
    this.root.add(this.spirit);
    this.table = null;
    this.held = false;
    this.busy = false;
    this.turn = 0;
    this.maxTurns = 2 + Math.floor(Math.random() * 3);
    this.history = [];
    this.lastSpirit = performance.now() - 25000;
    this.nextAmbience = performance.now() + 6000;
    this.whisperers = [];
    this.locked = false;
  }

  enter() {
    const { scene, camera, mover, audio, caption, room } = this.ctx;
    mover.hide();
    audio.bed("storm-bed", 0.05, 3);
    scene.add(this.root);
    this.placeOnTable(camera, room);
    const device = this.departed();
    if (this.kind === "device" && !device) this.kind = "dead";
    this.device = device;
    caption.show(
      this.kind === "device"
        ? "It is " + device + ". Rest your hand on the planchette."
        : "Rest your hand on the planchette. Then ask, out loud.",
      6,
      true
    );
    setTimeout(() => this.round(), 6500);
  }

  exit() {
    this.ctx.scene.remove(this.root);
    if (this.table) this.ctx.scene.remove(this.table);
    this.whisperers.forEach((w) => w.src.stop());
    this.whisperers = [];
    this.ctx.audio.bed("storm-bed", 0.12, 3);
    this.closed = true;
  }

  departed() {
    const f = this.ctx.funeral;
    if (f && f.name) return f.name;
    try {
      return localStorage.getItem("pm-last-buried") || "";
    } catch (err) {
      return "";
    }
  }

  // On the nearest real table within reach, or on a small pedestal table.
  placeOnTable(camera, room) {
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    let best = null;
    for (const s of room.surfaces()) {
      const h = s.y - room.floorY;
      if (h < 0.5 || h > 1.15) continue;
      const edge = room.edgeOf(s, head);
      const spot = edge.top.clone().addScaledVector(edge.outward, -0.16);
      const dist = Math.hypot(spot.x - head.x, spot.z - head.z);
      if (dist > 1.6) continue;
      if (!best || dist < best.dist) best = { spot, dist, y: s.y };
    }
    if (best) {
      // Scanned tabletops are a centimetre or two noisy. Sit on small feet above it.
      this.root.position.set(best.spot.x, best.y + BOARD.t / 2 + 0.018, best.spot.z);
    } else {
      const wood = woodMaterial(woodTextures(61));
      this.table = pedestalTable(wood);
      const base = head.clone().addScaledVector(fwd, 0.55);
      this.table.position.set(base.x, room.floorY, base.z);
      this.ctx.scene.add(this.table);
      this.root.position.set(base.x, room.floorY + this.table.userData.top + BOARD.t / 2, base.z);
    }
    // Long side toward the viewer, letters upright for them.
    const to = head.clone().sub(this.root.position).setY(0);
    this.root.rotation.y = Math.atan2(to.x, to.z);
  }

  async round() {
    if (this.closed || this.busy || this.locked) return;
    this.busy = true;
    const { caption, audio } = this.ctx;
    const question = await this.listen();
    if (this.closed) return;
    audio.oneShot("groans", this.aroundHead(Math.PI, 3), 0.2, 0.8);
    const body = { question, mode: this.kind, history: this.history.slice(-4) };
    if (this.kind === "device") {
      this.turn += 1;
      body.deviceName = this.device;
      body.turn = this.turn;
      body.final = this.turn >= this.maxTurns;
    }
    let words = "NO";
    try {
      const res = await fetch("/api/spirit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      words = (await res.json()).words || "NO";
    } catch (err) {
      words = "NOT NOW";
    }
    await this.sleep(1200);
    const spelled = await this.spell(words);
    this.history.push({ q: question, a: spelled });
    if (Math.random() < 0.5) this.showSpirit();
    if (this.kind === "device" && this.turn >= this.maxTurns) {
      await this.sleep(1500);
      await this.goTo("GOOD BYE", true);
      caption.show("GOOD BYE", 4, true);
      this.locked = true;
      await this.sleep(4500);
      caption.show("It has gone. The board will not move for it again.", 6, true);
      this.busy = false;
      return;
    }
    this.target = { x: 0, z: 0.06 };
    this.busy = false;
    await this.sleep(3500);
    this.round();
  }

  // Ask out loud where the browser can listen. Otherwise the board answers a
  // question nobody asked, which is worse.
  listen() {
    const { caption } = this.ctx;
    const list = this.kind === "device" ? ASK_DEVICE : ASK_DEAD;
    const fallback = list[(this.history.length + Math.floor(Math.random() * 2)) % list.length];
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      caption.show("It answers a question you did not ask.", 3, true);
      return this.sleep(2500).then(() => fallback);
    }
    caption.show("Ask it. Out loud.", 5, true);
    return new Promise((resolve) => {
      let heard = "";
      const rec = new SR();
      rec.lang = "en-US";
      rec.onresult = (e) => {
        heard = e.results[0][0].transcript;
      };
      rec.onend = () => resolve(heard.trim() || fallback);
      rec.onerror = () => resolve(fallback);
      try {
        rec.start();
        setTimeout(() => {
          try { rec.stop(); } catch (err) { /* already stopped */ }
        }, 6000);
      } catch (err) {
        resolve(fallback);
      }
    });
  }

  async spell(words) {
    const { caption } = this.ctx;
    const parts = words.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    let shown = "";
    for (let w = 0; w < parts.length; w += 1) {
      const word = parts[w];
      const whole = parts.length === 1 && (word === "YES" || word === "NO");
      const keys = whole ? [word] : word === "GOODBYE" ? ["GOOD BYE"] : word.split("");
      for (const key of keys) {
        await this.goTo(key);
        shown += key.length > 1 ? key : key + " ";
        caption.show(shown.trim(), 0, true);
        await this.sleep(rand(350, 900));
      }
      shown += "  ";
      await this.sleep(rand(900, 1500));
    }
    setTimeout(() => this.ctx.caption.hide(), 2500);
    return shown.replace(/\s+/g, " ").trim();
  }

  // Reach a key. With a hand on the planchette the visitor moves it and feels
  // for the letter. Otherwise it moves on its own.
  async goTo(key, slow) {
    const k = this.keys[key];
    if (!k) return;
    const start = performance.now();
    this.guide = k;
    this.target = this.held ? null : { x: k.x, z: k.z };
    this.slow = Boolean(slow);
    let nextPulse = 0;
    while (performance.now() - start < 12000 && !this.closed) {
      await this.sleep(30);
      const d = Math.hypot(k.x - this.p.x, k.z - this.p.z);
      if (d < 0.012) break;
      if (this.held) {
        this.target = null;
        const near = Math.max(0, 1 - d / 0.3);
        const now = performance.now();
        if (now > nextPulse) {
          this.ctx.haptics(0.06 + near * 0.7, 40 + near * 40);
          nextPulse = now + 650 - near * 560;
        }
        this.tremble = near;
      } else {
        this.target = { x: k.x, z: k.z };
        this.tremble = 0;
      }
      // Lost and left alone for too long: it takes over.
      if (performance.now() - start > 9000) this.held = false;
    }
    this.guide = null;
    this.tremble = 0;
    this.ctx.haptics(this.held ? 1 : 0.25, this.held ? 110 : 40);
    this.ctx.audio.oneShot("thud", this.planchette.getWorldPosition(new THREE.Vector3()), 0.08, 2.4);
    this.glow.position.x = k.x;
    this.glow.position.z = k.z;
    this.glow.material.opacity = 0.55;
  }

  aroundHead(angle, radius) {
    const { camera } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    return head.addScaledVector(dir, radius);
  }

  // A whisper that starts behind one ear and travels around the head.
  circleWhisper(name) {
    const { audio } = this.ctx;
    const src = audio.source(name || "whispers", { loop: true, refDistance: 0.25 });
    if (!src) return;
    src.start();
    src.setGain(0.5, 0.4);
    this.whisperers.push({
      src,
      t: 0,
      dur: rand(3.5, 6),
      start: Math.PI + rand(-0.6, 0.6),
      sweep: (Math.random() < 0.5 ? 1 : -1) * rand(3.5, 5.5),
      radius: rand(0.3, 0.6),
    });
  }

  // At the side of the eye, between 70 and 110 degrees off the gaze.
  showSpirit() {
    const now = performance.now();
    if (now - this.lastSpirit < 40000 || this.spirit.visible) return;
    this.lastSpirit = now;
    const { camera, room } = this.ctx;
    const side = Math.random() < 0.5 ? 1 : -1;
    const p = this.aroundHead(side * rand(1.2, 1.9), rand(1.3, 2));
    this.root.worldToLocal(p);
    this.spirit.position.set(p.x, room.floorY - this.root.position.y + 0.8, p.z);
    this.spirit.visible = true;
    this.spirit.material.opacity = 0;
    this.spiritLife = rand(2, 4);
    this.circleWhisper("breath");
  }

  update(dt) {
    if (this.closed) return;
    const { camera, reachPoints } = this.ctx;
    // Is a hand or a controller resting on the planchette?
    const pw = this.planchette.getWorldPosition(new THREE.Vector3());
    const points = reachPoints();
    let touch = null;
    let best = 0.07;
    for (const q of points) {
      const d = q.distanceTo(pw);
      if (d < best) {
        best = d;
        touch = q;
      }
    }
    if (touch) {
      this.held = true;
      this.heldPoint = touch;
      this.lastTouch = performance.now();
    } else if (this.held && performance.now() - (this.lastTouch || 0) > 600) {
      this.held = false;
    }

    // Move the planchette: follow the hand, or glide on its own.
    let goal = this.target;
    if (this.held && this.heldPoint) {
      const local = this.board.worldToLocal(this.heldPoint.clone());
      goal = { x: local.x, z: local.z };
      // It leans toward the letter it wants. Barely.
      if (this.guide) {
        goal.x += (this.guide.x - goal.x) * 0.06;
        goal.z += (this.guide.z - goal.z) * 0.06;
      }
    }
    if (goal) {
      const k = this.slow ? 20 : 45;
      const damp = this.slow ? 7 : 9;
      this.p.vx += ((goal.x - this.p.x) * k - this.p.vx * damp) * dt;
      this.p.vz += ((goal.z - this.p.z) * k - this.p.vz * damp) * dt;
      this.p.x += this.p.vx * dt;
      this.p.z += this.p.vz * dt;
    }
    this.p.x = Math.max(-BOARD.w / 2 + 0.03, Math.min(BOARD.w / 2 - 0.03, this.p.x));
    this.p.z = Math.max(-BOARD.d / 2 + 0.03, Math.min(BOARD.d / 2 - 0.03, this.p.z));
    const shake = (this.tremble || 0) * 0.0025;
    this.planchette.position.set(this.p.x + (Math.random() - 0.5) * shake, BOARD.t / 2, this.p.z + (Math.random() - 0.5) * shake);
    this.planchette.rotation.y = Math.max(-0.3, Math.min(0.3, -this.p.vx * 2));
    this.glow.material.opacity *= 0.97;

    // Whispers that travel around the head.
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    for (const w of this.whisperers) {
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      const dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), w.start + w.sweep * k);
      w.src.setPosition(head.clone().addScaledVector(dir, w.radius).add(new THREE.Vector3(0, -0.05, 0)));
      if (k >= 1 && !w.done) {
        w.done = true;
        w.src.setGain(0, 0.3);
        setTimeout(() => w.src.stop(), 1200);
      }
    }
    this.whisperers = this.whisperers.filter((w) => w.t < w.dur + 2);

    // Ambient presence: sounds behind and around, now and then.
    if (performance.now() > this.nextAmbience) {
      this.nextAmbience = performance.now() + rand(9000, 20000);
      const roll = Math.random();
      if (roll < 0.45) this.circleWhisper();
      else if (roll < 0.7) this.ctx.audio.oneShot("footsteps-wood", this.aroundHead(rand(2.4, 3.9), rand(2.5, 4)), 0.35);
      else if (roll < 0.85) this.ctx.audio.oneShot("breath", this.aroundHead(Math.PI, 0.25), 0.3);
      else this.showSpirit();
    }

    // The spirit fades in at the side and is gone if you turn to it.
    if (this.spirit.visible) {
      const sw = this.spirit.getWorldPosition(new THREE.Vector3());
      this.spirit.lookAt(head.x, sw.y, head.z);
      const look = camera.getWorldDirection(new THREE.Vector3());
      const to = sw.clone().sub(head).normalize();
      const angle = look.angleTo(to);
      this.spiritLife -= dt;
      const m = this.spirit.material;
      if (angle < 0.6 || this.spiritLife <= 0) {
        m.opacity = Math.max(0, m.opacity - dt * 2.5);
        if (m.opacity <= 0.01) this.spirit.visible = false;
      } else {
        m.opacity = Math.min(0.42, m.opacity + dt * 0.6) * (0.85 + Math.random() * 0.15);
      }
    }
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
