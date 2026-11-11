// A pale figure that stands where the eye can just catch it: 35 to 50 degrees
// off the gaze, about a metre away, inside the Quest field of view. It fades
// in, sways, and is gone the moment you turn to it. Shared by the spirit board
// and by Thing's ambient haunting.

import * as THREE from "three";

export const SPIRIT_LINES = [
  "There is someone standing behind you.",
  "Why did you let me die?",
  "I can see you from here.",
  "Do not turn around. Not yet.",
  "Count the people in the room. Now count again.",
  "Something followed you home.",
  "It is so dark down here.",
  "Your hands are so warm.",
  "Can you hear me breathing?",
  "We never left this house.",
  "Help me. It hurts.",
  "I am right next to you.",
  "Say my name.",
  "You will be joining us soon.",
  "I was here first.",
  "Do not let go of the board.",
  "Turn around. Slowly.",
  "It is cold where you are standing.",
  "We are watching you.",
  "I live under your bed.",
  "I sleep in your closet. You always leave the door open for me.",
  "I like to watch you sleep.",
  "Who were you talking to just now?",
  "Check under the bed. I will wait.",
  "Do not look in the mirror tonight.",
  "There is one more of us than there was a minute ago.",
  "You cannot see me. I can see you.",
  "I have been in the walls since before you moved in.",
  "We hear you at night.",
  "Leave the light on. It will not help.",
  "Come and play with us.",
  "Come down to the basement.",
  "I read every message you deleted.",
  "Your old phone is still listening.",
  "The thing in the drawer is not dead either.",
]

const VOICES = ["aura-2-luna-en", "aura-2-hera-en", "aura-2-ophelia-en", "aura-2-selene-en", "aura-2-pandora-en", "aura-2-helena-en", "aura-2-orpheus-en", "aura-2-pluto-en", "aura-2-draco-en", "aura-2-atlas-en"];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// A shadow figure: a dark smoky body that reads clearly against a bright
// real room, with a pale face and black hollows where the eyes should be.
export function spiritTexture() {
  const w = 256;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const cx = w / 2;
  const dark = (a) => "rgba(14,12,11," + a + ")";
  g.filter = "blur(7px)";
  let grad = g.createLinearGradient(0, h * 0.16, 0, h);
  grad.addColorStop(0, dark(0.92));
  grad.addColorStop(0.6, dark(0.7));
  grad.addColorStop(1, dark(0));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(cx - 34, h * 0.19);
  g.bezierCurveTo(cx - 90, h * 0.22, cx - 92, h * 0.36, cx - 80, h * 0.56);
  g.bezierCurveTo(cx - 70, h * 0.8, cx - 48, h * 0.98, cx, h);
  g.bezierCurveTo(cx + 48, h * 0.98, cx + 70, h * 0.8, cx + 80, h * 0.56);
  g.bezierCurveTo(cx + 92, h * 0.36, cx + 90, h * 0.22, cx + 34, h * 0.19);
  g.fill();
  // Long arms hanging past the hips.
  g.strokeStyle = dark(0.8);
  g.lineWidth = 18;
  g.lineCap = "round";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + s * 70, h * 0.24);
    g.quadraticCurveTo(cx + s * 92, h * 0.42, cx + s * 78, h * 0.62);
    g.stroke();
  }
  // Hair falling around the face.
  g.filter = "blur(4px)";
  g.fillStyle = dark(0.95);
  g.beginPath();
  g.ellipse(cx, h * 0.13, 46, 62, 0, 0, Math.PI * 2);
  g.fill();
  // A pale face, narrow and long, tilted, half hidden by hair.
  g.save();
  g.translate(cx + 3, h * 0.14);
  g.rotate(0.12);
  grad = g.createRadialGradient(0, 0, 3, 0, 0, 30);
  grad.addColorStop(0, "rgba(206,202,192,0.92)");
  grad.addColorStop(1, "rgba(196,192,182,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, 19, 32, 0, 0, Math.PI * 2);
  g.fill();
  // Eyes that are only holes, running down a little, and a long open mouth.
  g.filter = "blur(2px)";
  g.fillStyle = "rgba(0,0,0,0.92)";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * 7.5, -6, 4.5, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(s * 7.5 - 1.2, -2, 2.4, 10 + Math.random() * 6);
  }
  g.beginPath();
  g.ellipse(0, 15, 4, 11, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Strands of hair falling across the face.
  g.filter = "blur(1.5px)";
  g.strokeStyle = "rgba(8,7,6,0.6)";
  for (const off of [-17, -11, 9, 15, 20]) {
    const x = cx + off + (Math.random() - 0.5) * 3;
    g.lineWidth = 1 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(x, h * 0.07);
    g.bezierCurveTo(x + (Math.random() - 0.5) * 10, h * 0.13, x + (Math.random() - 0.5) * 14, h * 0.19, x + (Math.random() - 0.5) * 8, h * 0.24);
    g.stroke();
  }
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
      new THREE.PlaneGeometry(0.62, 1.62),
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
    // Off to one side, well inside the Quest view but not where you are looking.
    const angle = side * THREE.MathUtils.degToRad(rand(25, 40));
    const dir = fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const p = head.clone().addScaledVector(dir, rand(1.3, 1.9));
    // Placed by your head height, so a wrong floor never hides it.
    p.y = head.y - 0.72;
    this.mesh.position.copy(p);
    this.mesh.visible = true;
    this.mesh.material.opacity = 0;
    this.life = rand(4, 7);
    this.seen = false;
    this.nextAt = this.clock + rand(this.minGap, this.maxGap);
    // Not every figure speaks. Most are silent.
    if (Math.random() < 0.35) whisper(this.ctx, null, p);
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
    // Gone the instant you look straight at it.
    if (angle < 0.2 || this.life <= 0) {
      m.opacity = Math.max(0, m.opacity - dt * (angle < 0.2 ? 6 : 2));
      if (m.opacity <= 0.01) this.mesh.visible = false;
    } else {
      m.opacity = Math.min(0.88, m.opacity + dt * 0.9);
      if (Math.random() < 0.04) m.opacity *= 0.4;
      // A slow sway, as if it is breathing.
      this.mesh.position.y += Math.sin(this.clock * 1.3) * 0.0006;
    }
  }
}

// A spoken line from just behind one ear: a real voice, slowed, low and wet
// with reverb. Falls back to the synthesized whispers if the voice is offline.
// Where a voice comes from, and how it moves. Some stay put behind one ear,
// some pass behind your head from one ear to the other, some circle you all
// the way round, and some come from a figure you can see. HRTF does the rest.
function voicePath(head, fwd, near) {
  const around = (angle, radius, dy = 0) =>
    head.clone().addScaledVector(fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle), radius).add(new THREE.Vector3(0, dy, 0));
  if (near) return [head.clone().lerp(near, 0.4)];
  const roll = Math.random();
  const side = Math.random() < 0.5 ? 1 : -1;
  if (roll < 0.3) {
    // Fixed, close behind one ear.
    return [around(Math.PI + side * rand(0.4, 1.0), 0.35)];
  }
  if (roll < 0.65) {
    // From beside one ear, behind the head, to the other ear.
    const pts = [];
    for (let i = 0; i <= 6; i += 1) pts.push(around(side * (Math.PI / 2 + (Math.PI * i) / 6), 0.45, -0.05));
    return pts;
  }
  if (roll < 0.85) {
    // All the way round.
    const pts = [];
    const start = Math.PI + rand(-0.5, 0.5);
    for (let i = 0; i <= 10; i += 1) pts.push(around(start + side * ((Math.PI * 2 * i) / 10), 0.6));
    return pts;
  }
  // Starts across the room behind you and comes right up to your ear.
  return [around(Math.PI + side * 0.6, 3), around(Math.PI + side * 0.9, 1.4), around(side * (Math.PI / 2 + 0.3), 0.25)];
}

// Random lines are rationed: at least this long between them. Answers from
// the board are always spoken.
const LINE_GAP = 40000;
let lastLine = -LINE_GAP;

export async function whisper(ctx, text, near) {
  const { audio, camera } = ctx;
  const now = performance.now();
  if (!text) {
    if (now - lastLine < LINE_GAP) return false;
    lastLine = now;
  }
  const line = text || SPIRIT_LINES[Math.floor(Math.random() * SPIRIT_LINES.length)];
  const head = camera.getWorldPosition(new THREE.Vector3());
  const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const path = voicePath(head, fwd, near);
  const ok = await audio.speech(line, path[0], {
    voice: VOICES[Math.floor(Math.random() * VOICES.length)],
    rate: rand(0.7, 0.84),
    demon: Math.random() < 0.45,
    path,
  });
  if (!ok) audio.oneShot("whispers", path[0], 0.8);
  return ok;
}
