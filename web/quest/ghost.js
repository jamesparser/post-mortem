// A pale figure that stands where the eye can just catch it: 35 to 50 degrees
// off the gaze, about a metre away, inside the Quest field of view. It fades
// in, sways, and is gone the moment you turn to it. Shared by the spirit board
// and by Thing's ambient haunting.

import * as THREE from "three";

export const SPIRIT_LINES = [
  "Behind you.",
  "It is cold here.",
  "Do not turn around.",
  "We can see you.",
  "Stay with us.",
  "Who is that beside you?",
  "You left the door open.",
  "Let me in.",
];

const VOICES = ["aura-2-luna-en", "aura-2-hera-en", "aura-2-orpheus-en"];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function spiritTexture() {
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

export class Ghost {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.firstDelay = options.firstDelay ?? 25;
    this.minGap = options.minGap ?? 35;
    this.maxGap = options.maxGap ?? 60;
    this.clock = 0;
    this.nextAt = this.firstDelay + rand(-4, 5);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 1.6),
      new THREE.MeshBasicMaterial({ map: spiritTexture(), transparent: true, opacity: 0, depthWrite: false })
    );
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
    ctx.scene.add(this.mesh);
  }

  dispose() {
    this.ctx.scene.remove(this.mesh);
  }

  // Force one now (still respecting a short gap).
  show() {
    if (this.mesh.visible) return false;
    const { camera, room } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const side = Math.random() < 0.5 ? 1 : -1;
    const angle = side * THREE.MathUtils.degToRad(rand(35, 50));
    const dir = fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const p = head.clone().addScaledVector(dir, rand(1.0, 1.4));
    const floor = room && Number.isFinite(room.floorY) ? room.floorY : head.y - 1.6;
    p.y = floor + 0.8;
    this.mesh.position.copy(p);
    this.mesh.visible = true;
    this.mesh.material.opacity = 0;
    this.life = rand(2.5, 4.5);
    this.seen = false;
    this.nextAt = this.clock + rand(this.minGap, this.maxGap);
    whisper(this.ctx, null, p);
    return true;
  }

  update(dt) {
    this.clock += dt;
    if (!this.mesh.visible) {
      if (this.clock > this.nextAt) this.show();
      return;
    }
    const { camera } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const p = this.mesh.position;
    this.mesh.lookAt(head.x, p.y, head.z);
    const look = camera.getWorldDirection(new THREE.Vector3());
    const angle = look.angleTo(p.clone().sub(head).normalize());
    this.life -= dt;
    const m = this.mesh.material;
    if (angle < 0.3 || this.life <= 0) {
      m.opacity = Math.max(0, m.opacity - dt * 3);
      if (m.opacity <= 0.01) this.mesh.visible = false;
    } else {
      m.opacity = Math.min(0.55, m.opacity + dt * 0.7) * (0.85 + Math.random() * 0.15);
    }
  }
}

// A spoken line from just behind one ear: a real voice, slowed, low and wet
// with reverb. Falls back to the synthesized whispers if the voice is offline.
export async function whisper(ctx, text, near) {
  const { audio, camera } = ctx;
  const line = text || SPIRIT_LINES[Math.floor(Math.random() * SPIRIT_LINES.length)];
  const head = camera.getWorldPosition(new THREE.Vector3());
  const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const at = near
    ? head.clone().lerp(near, 0.35)
    : head.clone().addScaledVector(fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + rand(-0.9, 0.9)), 0.35);
  const ok = await audio.speech(line, at, { voice: VOICES[Math.floor(Math.random() * VOICES.length)] });
  if (!ok) audio.oneShot("whispers", at, 0.8);
  return ok;
}
