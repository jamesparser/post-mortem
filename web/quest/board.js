// The spirit board in passthrough. A board on your real table, a wooden
// planchette under your hand. It never shows the letter it wants. The
// controllers buzz harder and faster the closer you drift to it, and a sharp
// pulse marks the letter when you reach it. Hands without controllers get a
// trembling planchette instead. Whispers circle your head. Something pale
// stands at the side of your eye and is gone when you turn.

import * as THREE from "three";
import { woodTextures, woodMaterial } from "./skin.js";
import { Ghost, whisper } from "./ghost.js";

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
    this.table = null;
    this.held = false;
    this.busy = false;
    this.turn = 0;
    this.maxTurns = 2 + Math.floor(Math.random() * 3);
    this.history = [];
    this.nextAmbience = performance.now() + 5000;
    this.whisperers = [];
    this.locked = false;
  }

  enter() {
    const { scene, camera, mover, audio, caption, room } = this.ctx;
    mover.hide();
    audio.bed("storm-bed", 0.05, 3);
    scene.add(this.root);
    this.ghost = new Ghost(this.ctx, { firstDelay: 22, minGap: 35, maxGap: 55 });
    this.placeOnTable(camera, room);
    this.ctx.movable = this.root;
    this.ctx.movableReach = 0.45;
    // Pinching is for the planchette here. Controllers carry the board with the grip button.
    this.ctx.movableHands = false;
    const device = this.departed();
    if (this.kind === "device" && !device) this.kind = "dead";
    this.device = device;
    caption.show((this.kind === "device" ? "It is " + device + ". " : "") + "The board is open.", 5, true);
    this.handsHint();
    setTimeout(() => this.round(), 4000);
  }

  exit() {
    this.ctx.scene.remove(this.root);
    if (this.ghost) this.ghost.dispose();
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
      this.root.position.set(base.x, room.floorY + this.table.userData.top + BOARD.t / 2, base.z);
      // The table travels with the board when the visitor moves it.
      this.table.position.set(0, -(this.table.userData.top + BOARD.t / 2), 0);
      this.root.add(this.table);
    }
    // Long side toward the viewer, letters upright for them.
    const to = head.clone().sub(this.root.position).setY(0);
    this.root.rotation.y = Math.atan2(to.x, to.z);
  }

  // Wait until both hands (or both controllers) are gripping the planchette.
  handsHint() {
    this.ctx.setHint("The spirit board", [
      "Both hands on the planchette: pinch it with both hands, or touch it with both controllers and hold both triggers.",
      "Carry the board: point at it and hold a grip button. Thumbstick up or down raises it.",
      "When it says so, ask your question out loud.",
    ]);
  }

  async waitForHands(message) {
    this.handsHint();
    let nag = 0;
    while (!this.held && !this.closed) {
      if (performance.now() > nag) {
        this.ctx.caption.show(message || "Both hands on the planchette.", 5, true);
        nag = performance.now() + 9000;
      }
      await this.sleep(120);
    }
  }

  async round() {
    if (this.closed || this.busy || this.locked) return;
    this.busy = true;
    const { caption, audio } = this.ctx;
    await this.waitForHands("Both hands on the planchette. Pinch it, or hold the triggers.");
    if (this.closed) return;
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
      const data = await res.json();
      words = data.words || "NO";
      this.source = data.source;
    } catch (err) {
      words = "NOT NOW";
    }
    await this.sleep(900);
    this.ctx.setHint("It is answering", [
      "Keep both hands on the planchette.",
      "Slide it slowly. The controllers buzz harder as you get closer to the right letter, and hum steadily when you are on it. Hold it there.",
    ]);
    const spelled = await this.spell(words);
    this.history.push({ q: question, a: spelled });
    caption.show("You asked: " + question + ".   It answered: " + spelled, 6, true);
    // Then it says it, from behind you.
    await whisper(this.ctx, String(words).toLowerCase());
    if (Math.random() < 0.6) this.showSpirit();
    if (this.kind === "device" && this.turn >= this.maxTurns) {
      await this.sleep(1500);
      await this.goTo("GOOD BYE");
      caption.show("GOOD BYE", 4, true);
      this.locked = true;
      this.ctx.setHint("It has gone", ["Open the menu to try the other board, or bury something else."]);
      await this.sleep(4500);
      caption.show("It has gone. The board will not move for it again.", 6, true);
      this.busy = false;
      return;
    }
    this.busy = false;
    await this.sleep(2500);
    this.round();
  }

  // Ask out loud. The headset microphone records a few seconds and the server
  // turns it into text with Deepgram. If nothing is heard twice, the board
  // answers a question nobody asked, which is worse.
  async listen() {
    const { caption } = this.ctx;
    const list = this.kind === "device" ? ASK_DEVICE : ASK_DEAD;
    const fallback = list[(this.history.length + Math.floor(Math.random() * 2)) % list.length];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      caption.show(attempt ? "It did not hear you. Ask again, louder." : "Ask it a question. Out loud. Now.", 0, true);
      this.listening = true;
      this.ctx.setHint("Ask it now", ["Speak your question out loud. It is listening for five seconds.", "Keep both hands on the planchette."]);
      const text = await this.recordQuestion(5200);
      this.listening = false;
      if (text) {
        caption.show("You asked: " + text, 3, true);
        await this.sleep(1800);
        return text;
      }
    }
    caption.show("It answers a question you did not ask.", 3, true);
    await this.sleep(2200);
    return fallback;
  }

  async recordQuestion(ms) {
    let stream = this.ctx.mic;
    try {
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        this.ctx.mic = stream;
      }
    } catch (err) {
      return "";
    }
    if (!window.MediaRecorder) return "";
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
    const chunks = [];
    const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start();
    await this.sleep(ms);
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
    if (blob.size < 2000) return "";
    try {
      const res = await fetch("/api/listen", { method: "POST", headers: { "Content-Type": blob.type.split(";")[0] }, body: blob });
      const data = await res.json();
      return String(data.text || "").trim();
    } catch (err) {
      return "";
    }
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
    return shown.replace(/\s+/g, " ").trim();
  }

  // Reach a key. The visitor's hands move the planchette. It pulls them toward
  // the letter, a few centimetres ahead of their hands, and the controllers
  // buzz faster and harder as they close in. It never moves without them.
  // Find a key by feel. The controllers buzz harder and faster the closer
  // the planchette window gets to the letter it wants, and hum steadily when
  // you are right over it. Hold it there a moment and the letter is taken.
  async goTo(key) {
    const k = this.keys[key];
    if (!k) return;
    this.guide = k;
    let nextPulse = 0;
    let nag = performance.now() + 4000;
    let overSince = 0;
    const OVER = key.length > 1 ? 0.045 : 0.022;
    while (!this.closed) {
      await this.sleep(30);
      const d = Math.hypot(k.x - this.p.x, k.z - this.p.z);
      const now = performance.now();
      if (this.held) {
        nag = now + 6000;
        if (d < OVER) {
          if (!overSince) overSince = now;
          if (now > nextPulse) {
            this.ctx.haptics(1, 90);
            nextPulse = now + 90;
          }
          this.tremble = 1;
          if (now - overSince > 600) break;
          continue;
        }
        overSince = 0;
        const near = Math.max(0, 1 - d / 0.35);
        const strength = near * near;
        if (now > nextPulse) {
          if (near > 0.05) this.ctx.haptics(0.05 + strength * 0.8, 30 + strength * 50);
          nextPulse = now + 700 - strength * 600;
        }
        this.tremble = strength * 0.6;
      } else {
        overSince = 0;
        this.tremble = 0;
        if (now > nag) {
          this.ctx.caption.show("Keep both hands on it.", 3, true);
          nag = now + 6000;
        }
      }
    }
    this.guide = null;
    this.tremble = 0;
    this.ctx.haptics(1, 160);
    this.ctx.audio.oneShot("thud", this.planchette.getWorldPosition(new THREE.Vector3()), 0.12, 2.4);
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

  // A figure at the edge of sight, inside the field of view.
  showSpirit() {
    if (this.ghost) this.ghost.show();
  }

  update(dt) {
    if (this.closed) return;
    const { camera, reachPoints } = this.ctx;
    // Both hands, or both controllers, gripping the planchette.
    const pw = this.planchette.getWorldPosition(new THREE.Vector3());
    const touches = this.ctx.touchPoints();
    const gripping = touches.filter((t) => t.pressed && t.point.distanceTo(pw) < 0.12);
    const needed = Math.min(2, touches.length || 2);
    if (gripping.length >= needed) {
      const center = gripping.reduce((acc, t) => acc.add(t.point), new THREE.Vector3()).divideScalar(gripping.length);
      const local = this.board.worldToLocal(center);
      if (!this.held) this.grabOffset = { x: this.p.x - local.x, z: this.p.z - local.z };
      this.held = true;
      this.handsLocal = local;
      this.lastTouch = performance.now();
    } else if (this.held && performance.now() - (this.lastTouch || 0) > 400) {
      this.held = false;
    }

    // It only moves where your hands take it. No pull: you find the letter
    // by feel alone.
    if (this.held && this.handsLocal) {
      const goal = { x: this.handsLocal.x + this.grabOffset.x, z: this.handsLocal.z + this.grabOffset.z };
      const k = 45;
      const damp = 9;
      this.p.vx += ((goal.x - this.p.x) * k - this.p.vx * damp) * dt;
      this.p.vz += ((goal.z - this.p.z) * k - this.p.vz * damp) * dt;
      this.p.x += this.p.vx * dt;
      this.p.z += this.p.vz * dt;
    } else {
      this.p.vx *= 0.8;
      this.p.vz *= 0.8;
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
      this.nextAmbience = performance.now() + rand(7000, 14000);
      const roll = Math.random();
      // Never talk over the visitor while the microphone is open.
      if (roll < 0.4 && !this.listening) whisper(this.ctx);
      else if (roll < 0.65) this.circleWhisper();
      else if (roll < 0.85) this.ctx.audio.oneShot("footsteps-wood", this.aroundHead(rand(2.4, 3.9), rand(2.5, 4)), 0.6);
      else this.ctx.audio.oneShot("breath", this.aroundHead(Math.PI, 0.25), 0.6);
    }

    if (this.ghost) this.ghost.update(dt);
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
