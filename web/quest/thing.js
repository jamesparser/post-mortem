// Thing. An original procedural model and rig of a severed right hand,
// plus a procedural animator that walks him on his fingertips.
//
// Local axes for the hand: fingers point along +Z, the back of the hand faces +Y,
// the thumb sits on the minus X side. Units are meters.

import * as THREE from "three";
import {
  dorsalTextures,
  palmarTextures,
  fingerTextures,
  stumpTextures,
  skinMaterial,
  nailMaterial,
  makeRandom,
} from "./skin.js";

const PALM = { halfWidth: 0.041, halfThick: 0.0135, halfLength: 0.047 };

// Each digit: base position on the palm, rest yaw, segment lengths, radii.
const DIGITS = [
  { name: "thumb", base: [-0.035, -0.006, -0.006], yaw: -0.62, roll: 0.45, lengths: [0.034, 0.03, 0.026], radius: [0.0105, 0.0098, 0.0092], restReach: 0.042, phase: 0.25 },
  { name: "index", base: [-0.027, 0.002, 0.044], yaw: -0.1, roll: 0, lengths: [0.041, 0.025, 0.021], radius: [0.0087, 0.0078, 0.0071], restReach: 0.052, phase: 0.0 },
  { name: "middle", base: [-0.009, 0.003, 0.048], yaw: -0.02, roll: 0, lengths: [0.046, 0.029, 0.022], radius: [0.0089, 0.008, 0.0072], restReach: 0.058, phase: 0.5 },
  { name: "ring", base: [0.009, 0.002, 0.045], yaw: 0.06, roll: 0, lengths: [0.043, 0.027, 0.021], radius: [0.0084, 0.0076, 0.0068], restReach: 0.054, phase: 0.0 },
  { name: "little", base: [0.026, 0.0, 0.038], yaw: 0.17, roll: 0, lengths: [0.033, 0.02, 0.018], radius: [0.0074, 0.0067, 0.0062], restReach: 0.044, phase: 0.5 },
];

// A tube along +Y from 0 to length with full hemispherical caps. Neighbouring
// segments share a joint centre and a radius, so the caps overlap as one
// smooth knuckle at any bend angle.
function segmentProfile(length, r0, r1, isTip) {
  const pts = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(a) * r0), -Math.cos(a) * r0));
  }
  const steps = 18;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const waist = -Math.sin(Math.PI * t) * 0.07;
    const pad = isTip ? Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.04 * t : 0;
    const r = (r0 + (r1 - r0) * t) * (1 + waist + pad);
    pts.push(new THREE.Vector2(r, t * length));
  }
  const capFar = isTip ? r1 * 1.08 : r1;
  for (let i = 0; i <= 10; i += 1) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), length + Math.sin(a) * capFar));
  }
  return pts;
}

function segmentGeometry(length, r0, r1, isTip) {
  const geo = new THREE.LatheGeometry(segmentProfile(length, r0, r1, isTip), 20);
  geo.rotateX(Math.PI / 2);
  // Fingers are wider than they are tall, and flatter on the palm side.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) * 1.1;
    let y = pos.getY(i);
    y = y < 0 ? y * 0.82 : y * 0.92;
    pos.setXYZ(i, x, y, pos.getZ(i));
  }
  geo.computeVertexNormals();
  return geo;
}

function nailGeometry(radius, length) {
  const width = radius * 1.45;
  const geo = new THREE.BoxGeometry(width, 0.0011, length, 10, 1, 6);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = x / (width / 2);
    const bend = (u * u) * radius * 0.45;
    // Rounded free edge and a curved cuticle end.
    const zt = (z + length / 2) / length;
    const ends = Math.min(zt / 0.18, (1 - zt) / 0.2, 1);
    const taper = 0.55 + 0.45 * Math.sqrt(Math.max(0, ends));
    pos.setXYZ(i, x * taper, pos.getY(i) - bend, z);
    // Pink nail bed, pale free edge, and a dark line of dirt under the edge.
    let c = [0.86, 0.7, 0.64];
    if (zt > 0.8) c = [0.92, 0.86, 0.78];
    if (zt > 0.93) c = [0.3, 0.24, 0.18];
    if (zt < 0.14) c = [0.9, 0.8, 0.74];
    colors.set(c, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Palm as a tapered superellipsoid with a domed back, knuckle bumps,
// a thenar pad, and planar UVs so the dorsal and palmar maps line up.
function palmGeometry() {
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const { halfWidth, halfThick, halfLength } = PALM;
  const knuckleX = DIGITS.slice(1).map((d) => d.base[0]);
  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // Superellipse squaring.
    const sq = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
    x = sq(x, 0.55);
    z = sq(z, 0.6);
    y = sq(y, 0.85);
    const zt = (z + 1) / 2;
    const widthScale = 0.78 + 0.22 * zt;
    let px = x * halfWidth * widthScale;
    let pz = z * halfLength;
    let py = y * halfThick;
    if (py > 0) {
      py += (1 - x * x) * 0.004;
      for (const kx of knuckleX) {
        const d = Math.hypot(px - kx, pz - halfLength * 0.92);
        py += Math.exp(-(d * d) / (0.0075 * 0.0075)) * 0.0035;
      }
    } else {
      // Thenar pad near the thumb and the hypothenar pad on the other side.
      const thenar = Math.exp(-(Math.pow(px + 0.024, 2) + Math.pow(pz + 0.012, 2)) / (0.018 * 0.018));
      const hypo = Math.exp(-(Math.pow(px - 0.026, 2) + Math.pow(pz + 0.01, 2)) / (0.016 * 0.016));
      py -= thenar * 0.006 + hypo * 0.003;
    }
    pos.setXYZ(i, px, py, pz);
    uv.setXY(i, px / (halfWidth * 2) + 0.5, pz / (halfLength * 2) + 0.5);
  }
  geo.computeVertexNormals();
  // Split triangles into dorsal and palmar groups by centroid height.
  const index = geo.index.array;
  const dorsal = [];
  const palmar = [];
  for (let t = 0; t < index.length; t += 3) {
    const cy = (pos.getY(index[t]) + pos.getY(index[t + 1]) + pos.getY(index[t + 2])) / 3;
    (cy >= 0 ? dorsal : palmar).push(index[t], index[t + 1], index[t + 2]);
  }
  geo.setIndex([...dorsal, ...palmar]);
  geo.clearGroups();
  geo.addGroup(0, dorsal.length, 0);
  geo.addGroup(dorsal.length, palmar.length, 1);
  return geo;
}

// Wrist stump. A short elliptical tube that ends in a healed, rounded cap.
function wristGeometry() {
  const pts = [];
  const length = 0.034;
  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    pts.push(new THREE.Vector2(0.0275 * (1 - 0.06 * t), t * length));
  }
  for (let i = 1; i <= 10; i += 1) {
    const a = (i / 10) * (Math.PI / 2);
    const pucker = 1 - 0.12 * Math.sin(a * 2);
    pts.push(new THREE.Vector2(Math.cos(a) * 0.0259 * pucker, length + Math.sin(a) * 0.012));
  }
  pts[pts.length - 1].x = 0.0001;
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setXYZ(i, pos.getX(i) * 1.15, pos.getY(i) * 0.62, pos.getZ(i));
  }
  geo.computeVertexNormals();
  return geo;
}

export function createThing() {
  const dorsal = skinMaterial(dorsalTextures());
  const palmar = skinMaterial(palmarTextures(), { roughness: 0.62, bumpScale: 0.7 });
  const fingerMat = skinMaterial(fingerTextures(), { bumpScale: 0.7 });
  const stumpMat = skinMaterial(stumpTextures(), { roughness: 0.45, clearcoat: 0.25 });
  const nailMat = nailMaterial();

  const root = new THREE.Group();
  root.name = "thing";
  const body = new THREE.Group();
  root.add(body);

  const palm = new THREE.Mesh(palmGeometry(), [dorsal, palmar]);
  palm.castShadow = true;
  body.add(palm);

  const wrist = new THREE.Mesh(wristGeometry(), stumpMat);
  wrist.position.set(0.001, -0.001, -PALM.halfLength * 0.55);
  wrist.castShadow = true;
  body.add(wrist);

  const digits = DIGITS.map((spec) => {
    const base = new THREE.Group();
    base.position.fromArray(spec.base);
    base.rotation.order = "YXZ";
    base.rotation.y = spec.yaw;
    base.rotation.z = spec.roll;
    body.add(base);
    const joints = [];
    let parent = base;
    spec.lengths.forEach((length, k) => {
      const joint = new THREE.Group();
      joint.rotation.order = "YXZ";
      if (k > 0) joint.position.z = spec.lengths[k - 1];
      parent.add(joint);
      const r0 = spec.radius[k];
      const r1 = spec.radius[k + 1] ?? spec.radius[k] * 0.9;
      const isTip = k === spec.lengths.length - 1;
      const mesh = new THREE.Mesh(segmentGeometry(length, r0, r1, isTip), fingerMat);
      mesh.castShadow = true;
      joint.add(mesh);
      if (isTip) {
        const nail = new THREE.Mesh(nailGeometry(r1, length * 0.58), nailMat);
        nail.position.set(0, r1 * 0.9, length * 0.8);
        nail.castShadow = false;
        joint.add(nail);
      }
      joints.push(joint);
      parent = joint;
    });
    return { spec, base, joints, flex: [0, 0, 0], spread: 0 };
  });

  return { root, body, palm, digits };
}

// Solve the two-link chain (proximal, then middle plus distal) in the
// digit's sagittal plane. forward and down are measured from the digit base.
function solveTwoLink(forward, down, a, b) {
  const d = Math.min(Math.hypot(forward, down), a + b - 1e-4);
  const cosKnee = (a * a + b * b - d * d) / (2 * a * b);
  const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosKnee)));
  const toTarget = Math.atan2(down, forward);
  const cosInner = (a * a + d * d - b * b) / (2 * a * d);
  const inner = Math.acos(Math.max(-1, Math.min(1, cosInner)));
  // Flex at the base is down positive. A bent knee lifts the base angle.
  return { hip: toTarget - inner, knee };
}

// Animator. Call setMode with a pose name and setSpeed with ground speed.
export class ThingAnimator {
  constructor(thing, seed = 3) {
    this.thing = thing;
    this.rand = makeRandom(seed);
    this.mode = "walk";
    this.speed = 0;
    this.phase = 0;
    this.time = 0;
    this.blend = 1;
    this.bodyHeight = 0.05;
    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.twitchTimer = 2;
    this.twitchDigit = -1;
    this.twitchAmount = 0;
    this.breath = 0;
    this.tapTimer = 3;
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  update(dt) {
    this.time += dt;
    const targets = this.computeTargets(dt);
    const rate = 1 - Math.exp(-dt * (this.mode === "squirm" ? 30 : 18));
    const body = this.thing.body;
    this.bodyHeight += (targets.height - this.bodyHeight) * rate;
    this.bodyPitch += (targets.pitch - this.bodyPitch) * rate;
    this.bodyRoll += (targets.roll - this.bodyRoll) * rate;
    body.position.set(targets.offsetX || 0, this.bodyHeight, targets.offsetZ || 0);
    body.rotation.set(this.bodyPitch, targets.yaw || 0, this.bodyRoll, "YXZ");
    const breathe = 1 + Math.sin(this.time * 1.6) * 0.012;
    this.thing.palm.scale.set(1, breathe, 1);
    this.thing.digits.forEach((digit, i) => {
      const t = targets.digits[i];
      for (let k = 0; k < 3; k += 1) {
        digit.flex[k] += (t.flex[k] - digit.flex[k]) * rate;
        digit.joints[k].rotation.x = digit.flex[k];
      }
      digit.spread += ((t.spread || 0) - digit.spread) * rate;
      digit.joints[0].rotation.y = digit.spread;
    });
  }

  computeTargets(dt) {
    switch (this.mode) {
      case "flat":
        return this.poseFlat();
      case "wave":
        return this.poseWave();
      case "squirm":
        return this.poseSquirm();
      case "grip":
        return this.poseGrip();
      case "hang":
        return this.poseHang();
      case "still":
        return this.poseStill(dt);
      case "leap":
        return this.poseLeap();
      default:
        return this.poseWalk(dt);
    }
  }

  // Walking on fingertips. Diagonal pairs move together, like a trot.
  poseWalk(dt) {
    const speed = Math.max(0, this.speed);
    const freq = speed > 0.01 ? Math.min(9, 3 + speed * 6) : 0;
    this.phase = (this.phase + freq * dt) % 1;
    const stride = speed > 0.01 ? Math.min(0.045, (speed / Math.max(freq, 0.1)) * 0.6) : 0;
    const height = 0.047 + Math.sin(this.phase * Math.PI * 4) * 0.003 * Math.min(1, speed);
    const digits = this.thing.digits.map((digit) => {
      const spec = digit.spec;
      const p = (this.phase + spec.phase) % 1;
      const duty = 0.62;
      let offset = 0;
      let lift = 0;
      if (stride > 0) {
        if (p < duty) {
          offset = stride / 2 - (p / duty) * stride;
        } else {
          const s = (p - duty) / (1 - duty);
          offset = -stride / 2 + s * stride;
          lift = Math.sin(s * Math.PI) * 0.016;
        }
      }
      return this.reach(digit, spec.restReach + offset, height + spec.base[1] - lift - spec.radius[2] * 0.8);
    });
    // Idle life: an index finger that taps while he listens.
    if (speed < 0.01) {
      this.tapTimer -= dt;
      if (this.tapTimer < 0.25 && this.tapTimer > 0) {
        const tap = Math.sin((0.25 - this.tapTimer) / 0.25 * Math.PI);
        digits[1].flex[0] -= tap * 0.35;
      }
      if (this.tapTimer < 0) this.tapTimer = 2 + this.rand() * 4;
    }
    return { height, pitch: -0.06, roll: Math.sin(this.phase * Math.PI * 2) * 0.03 * Math.min(1, speed), digits };
  }

  reach(digit, forward, down) {
    const [a, b1, b2] = digit.spec.lengths;
    const dip = 0.25;
    const b = b1 + b2 * Math.cos(dip) * 0.95;
    const { hip, knee } = solveTwoLink(forward, down, a, b);
    return { flex: [hip, knee, dip * 0.4], spread: 0 };
  }

  // Hiding still. Small life only: a slow breath and a rare twitch.
  poseStill(dt) {
    const base = this.poseWalk(0);
    base.height = 0.044;
    this.twitchTimer -= dt;
    if (this.twitchTimer < 0) {
      this.twitchDigit = Math.floor(this.rand() * 5);
      this.twitchAmount = 0.25 + this.rand() * 0.25;
      this.twitchTimer = 2.5 + this.rand() * 5;
    }
    if (this.twitchDigit >= 0) {
      base.digits[this.twitchDigit].flex[1] += this.twitchAmount;
      this.twitchAmount *= Math.exp(-dt * 6);
    }
    base.roll = Math.sin(this.time * 0.5) * 0.02;
    return base;
  }

  // Blending in. Palm down on the surface, fingers loose, like a dropped glove.
  poseFlat() {
    const digits = this.thing.digits.map((d, i) => ({
      flex: i === 0 ? [0.2, 0.15, 0.1] : [0.08 + i * 0.02, 0.18, 0.08],
      spread: (i - 2) * 0.05,
    }));
    return { height: PALM.halfThick + 0.002, pitch: 0.02, roll: 0.05, digits };
  }

  // Standing on the wrist stump, fingers up, waving hello.
  poseWave() {
    const wave = Math.sin(this.time * 7) * 0.22;
    const digits = this.thing.digits.map((d, i) => ({
      flex: i === 0 ? [0.1, 0.1, 0.05] : [-0.1, 0.06 + Math.max(0, wave) * 0.4, 0.04],
      spread: (i - 2) * 0.1,
    }));
    return { height: 0.085, pitch: -1.35, roll: 0, yaw: wave, offsetZ: -0.02, digits };
  }

  poseSquirm() {
    const t = this.time;
    const digits = this.thing.digits.map((d, i) => ({
      flex: [
        0.5 + Math.sin(t * 17 + i * 1.7) * 0.7,
        0.6 + Math.sin(t * 23 + i * 2.3) * 0.6,
        0.4 + Math.sin(t * 19 + i) * 0.4,
      ],
      spread: Math.sin(t * 11 + i) * 0.2,
    }));
    return { height: 0.04, pitch: Math.sin(t * 13) * 0.3, roll: Math.sin(t * 9) * 0.4, digits };
  }

  // Clinging to a shoulder. Fingers curled tight.
  poseGrip() {
    const t = this.time;
    const digits = this.thing.digits.map((d, i) => ({
      flex: [0.9 + Math.sin(t * 3 + i) * 0.05, 1.1, 0.6],
      spread: (i - 2) * 0.04,
    }));
    return { height: 0.03, pitch: 0.1, roll: 0, digits };
  }

  // Hanging from an edge by hooked fingers. The root sits on the edge.
  poseHang() {
    const t = this.time;
    const digits = this.thing.digits.map((d, i) => ({
      flex: i === 0 ? [0.4, 0.4, 0.2] : [0.25, 1.45, 1.0],
      spread: (i - 2) * 0.03,
    }));
    return { height: -0.085, pitch: -1.5 + Math.sin(t * 0.9) * 0.03, roll: Math.sin(t * 0.7) * 0.03, yaw: Math.PI, offsetZ: 0.02, digits };
  }

  // Mid air. Fingers thrown forward, ready to grab.
  poseLeap() {
    const digits = this.thing.digits.map((d, i) => ({
      flex: i === 0 ? [0.1, 0.2, 0.1] : [-0.25, 0.3, 0.2],
      spread: (i - 2) * 0.14,
    }));
    return { height: 0.03, pitch: -0.25, roll: 0, digits };
  }
}

export { PALM };
