// Moves Thing through the real room. Runs on floors and tabletops, climbs the
// sides of furniture and door frames, jumps up, drops down, and leaps onto the
// viewer's shoulder. The animator handles the fingers. This handles the body.

import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const tmpMatrix = new THREE.Matrix4();
const tmpX = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

function orientation(up, forward) {
  const f = forward.clone().addScaledVector(up, -forward.dot(up));
  if (f.lengthSq() < 1e-6) f.set(0, 0, 1).addScaledVector(up, -up.z);
  f.normalize();
  tmpX.crossVectors(up, f).normalize();
  tmpMatrix.makeBasis(tmpX, up, f);
  return new THREE.Quaternion().setFromRotationMatrix(tmpMatrix);
}

export class ThingMover {
  constructor(thing, animator, room, audio) {
    this.thing = thing;
    this.anim = animator;
    this.room = room;
    this.audio = audio;
    this.position = new THREE.Vector3();
    this.up = UP.clone();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.segments = [];
    this.segment = null;
    this.speed = 0;
    this.paused = false;
    this.onArrive = null;
    this.shoulder = null;
    this.restPose = "walk";
    this.footsteps = null;
    this.visible = false;
    thing.root.visible = false;
  }

  attachAudio() {
    if (this.footsteps || !this.audio.ctx) return;
    this.footsteps = this.audio.source("nails-tap", { loop: true, refDistance: 0.5 });
    if (this.footsteps) this.footsteps.start();
  }

  place(position, yaw = 0) {
    this.position.copy(position);
    this.up.copy(UP);
    this.forward.set(Math.sin(yaw), 0, Math.cos(yaw));
    this.segments = [];
    this.segment = null;
    this.shoulder = null;
    this.speed = 0;
    this.thing.root.position.copy(position);
    this.thing.root.quaternion.copy(orientation(this.up, this.forward));
    this.thing.root.visible = true;
    this.visible = true;
    this.attachAudio();
  }

  hide() {
    this.thing.root.visible = false;
    this.visible = false;
    this.segments = [];
    this.segment = null;
    this.shoulder = null;
    if (this.footsteps) this.footsteps.setGain(0);
  }

  get moving() {
    return Boolean(this.segment) || this.segments.length > 0;
  }

  face(target) {
    const dir = target.clone().sub(this.position).setY(0);
    if (dir.lengthSq() > 1e-4) this.forward.copy(dir.normalize());
  }

  stop() {
    this.segments = [];
    this.segment = null;
    this.onArrive = null;
  }

  // Plan a route to a target point. options.speed sets the run speed.
  goTo(target, options = {}) {
    this.shoulder = null;
    const speed = options.speed || 1.4;
    const from = this.position.clone();
    const room = this.room;
    const fromSurface = room.surfaceAt(from);
    const toSurface = options.surface || room.surfaceAt(target);
    const segs = [];
    let cursor = from.clone();
    if (fromSurface && fromSurface !== toSurface) {
      const edge = room.edgeOf(fromSurface, target);
      segs.push({ type: "run", to: edge.top, speed });
      segs.push({ type: "hop", to: edge.floor, height: 0.12, duration: 0.42 + (fromSurface.y - room.floorY) * 0.2 });
      cursor = edge.floor.clone();
    }
    if (options.climbWall) {
      const base = target.clone();
      base.y = room.floorY;
      base.addScaledVector(options.climbWall.normal.clone().setY(0).normalize(), 0.02);
      segs.push({ type: "run", to: base, speed });
      segs.push({ type: "climb", to: target.clone(), normal: options.climbWall.normal.clone().setY(0).normalize(), speed: 0.7 });
    } else if (toSurface && toSurface !== fromSurface) {
      const edge = room.edgeOf(toSurface, cursor);
      segs.push({ type: "run", to: edge.floor, speed });
      const height = toSurface.y - room.floorY;
      if (height < 0.55) {
        segs.push({ type: "hop", to: edge.top, height: height + 0.12, duration: 0.5 });
      } else {
        const wallBottom = edge.floor.clone().addScaledVector(edge.outward, -0.04);
        const wallTop = wallBottom.clone();
        wallTop.y = toSurface.y - 0.03;
        segs.push({ type: "climb", to: wallTop, normal: edge.outward.clone(), speed: 0.8 });
        segs.push({ type: "mantle", to: edge.top, duration: 0.35 });
      }
      segs.push({ type: "run", to: target.clone(), speed });
    } else {
      segs.push({ type: "run", to: target.clone(), speed });
    }
    this.segments = segs;
    this.segment = null;
    this.onArrive = options.onArrive || null;
    this.restPose = options.pose || "walk";
  }

  // Leap from wherever he is to a point near the viewer's shoulder.
  leapToShoulder(camera, onLand) {
    this.stop();
    const head = camera.getWorldPosition(new THREE.Vector3());
    const dest = this.shoulderPoint(camera, head);
    this.segment = {
      type: "leap",
      from: this.position.clone(),
      to: dest,
      height: Math.max(0.25, dest.y - this.position.y + 0.25),
      duration: 0.55,
      t: 0,
      done: () => {
        this.shoulder = { camera, time: 0 };
        if (onLand) onLand();
      },
    };
    this.anim.setMode("leap");
  }

  // Right shoulder, outside the line of the eyes and well clear of the hands.
  shoulderPoint(camera, head) {
    const q = camera.getWorldQuaternion(tmpQuat);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    return head.clone().addScaledVector(right, 0.19).addScaledVector(fwd, -0.02).add(new THREE.Vector3(0, -0.26, 0));
  }

  dropFromShoulder(target) {
    this.shoulder = null;
    this.segment = {
      type: "leap",
      from: this.position.clone(),
      to: target.clone(),
      height: 0.15,
      duration: 0.5,
      t: 0,
      done: () => {
        this.audio.oneShot("thud", this.position, 0.35);
      },
    };
    this.anim.setMode("leap");
  }

  update(dt) {
    if (!this.visible) return;
    if (this.shoulder) {
      this.updateShoulder(dt);
      this.apply(dt, 0);
      return;
    }
    if (!this.segment && this.segments.length && !this.paused) {
      this.segment = { ...this.segments.shift(), from: this.position.clone(), t: 0 };
    }
    let groundSpeed = 0;
    if (this.segment && !this.paused) {
      groundSpeed = this.step(this.segment, dt);
    } else {
      this.speed = 0;
    }
    if (!this.segment && !this.segments.length && this.onArrive) {
      const cb = this.onArrive;
      this.onArrive = null;
      cb();
    }
    this.apply(dt, groundSpeed);
  }

  step(seg, dt) {
    if (seg.type === "run") {
      const to = seg.to;
      const delta = to.clone().sub(this.position);
      const flat = delta.clone().setY(0);
      const dist = flat.length();
      // Rat like: accelerate hard, keep bursts uneven, brake late.
      seg.burst = (seg.burst || 0) + dt;
      const surge = 0.75 + 0.25 * Math.sin(seg.burst * 9 + seg.from.x * 7);
      const target = Math.min(seg.speed * surge, dist * 4 + 0.15);
      this.speed += (target - this.speed) * Math.min(1, dt * 10);
      if (dist < 0.015) {
        this.position.x = to.x;
        this.position.z = to.z;
        this.position.y = to.y;
        this.segment = null;
        return 0;
      }
      const move = Math.min(dist, this.speed * dt);
      this.position.addScaledVector(flat.normalize(), move);
      this.position.y += (to.y - this.position.y) * Math.min(1, dt * 12);
      this.up.lerp(UP, Math.min(1, dt * 10)).normalize();
      this.forward.lerp(flat, Math.min(1, dt * 14)).normalize();
      this.anim.setMode("walk");
      return this.speed;
    }
    if (seg.type === "climb") {
      const dy = seg.to.y - this.position.y;
      const dir = Math.sign(dy) || 1;
      this.up.lerp(seg.normal, Math.min(1, dt * 12)).normalize();
      this.forward.lerp(new THREE.Vector3(0, dir, 0), Math.min(1, dt * 12)).normalize();
      const move = Math.min(Math.abs(dy), seg.speed * dt);
      this.position.y += move * dir;
      this.position.x += (seg.to.x - this.position.x) * Math.min(1, dt * 8);
      this.position.z += (seg.to.z - this.position.z) * Math.min(1, dt * 8);
      this.anim.setMode("walk");
      if (Math.abs(dy) < 0.01) {
        this.segment = null;
        if (this.restPose === "hang") this.position.copy(seg.to);
      }
      return seg.speed;
    }
    if (seg.type === "hop" || seg.type === "mantle") {
      seg.t += dt / (seg.duration || 0.4);
      const t = Math.min(1, seg.t);
      const height = seg.height ?? 0.08;
      this.position.lerpVectors(seg.from, seg.to, t);
      this.position.y += Math.sin(t * Math.PI) * height;
      const flat = seg.to.clone().sub(seg.from).setY(0);
      if (flat.lengthSq() > 1e-4) this.forward.lerp(flat.normalize(), Math.min(1, dt * 12)).normalize();
      this.up.lerp(UP, Math.min(1, dt * 12)).normalize();
      this.anim.setMode(t < 0.85 ? "leap" : "walk");
      if (t >= 1) {
        this.segment = null;
        if (seg.type === "hop") this.audio.oneShot("thud", this.position, 0.25, 1.2);
      }
      return 0;
    }
    if (seg.type === "leap") {
      seg.t += dt / seg.duration;
      const t = Math.min(1, seg.t);
      this.position.lerpVectors(seg.from, seg.to, t);
      this.position.y += Math.sin(t * Math.PI) * seg.height;
      const flat = seg.to.clone().sub(seg.from).setY(0);
      if (flat.lengthSq() > 1e-4) this.forward.lerp(flat.normalize(), Math.min(1, dt * 12)).normalize();
      if (t >= 1) {
        this.segment = null;
        this.up.copy(UP);
        if (seg.done) seg.done();
      }
      return 0;
    }
    this.segment = null;
    return 0;
  }

  updateShoulder(dt) {
    const camera = this.shoulder.camera;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const goal = this.shoulderPoint(camera, head);
    this.position.lerp(goal, Math.min(1, dt * 14));
    const q = camera.getWorldQuaternion(tmpQuat);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).setY(0).normalize();
    // Clinging to the side of the neck, fingers forward over the collarbone.
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    this.up.lerp(right.clone().multiplyScalar(0.4).add(UP).normalize(), Math.min(1, dt * 10)).normalize();
    this.forward.lerp(fwd.clone().add(right.clone().multiplyScalar(-0.6)).normalize(), Math.min(1, dt * 10)).normalize();
    this.shoulder.time += dt;
    this.anim.setMode("grip");
  }

  apply(dt, groundSpeed) {
    const root = this.thing.root;
    root.position.copy(this.position);
    const goal = orientation(this.up, this.forward);
    root.quaternion.slerp(goal, Math.min(1, dt * 16));
    if (!this.segment && !this.segments.length && !this.shoulder) {
      this.anim.setMode(this.restPose);
    }
    this.anim.setSpeed(groundSpeed);
    this.anim.update(dt);
    if (this.footsteps) {
      this.footsteps.setPosition(this.position);
      const level = Math.min(1, groundSpeed / 1.6) * 0.55;
      this.footsteps.setGain(level, 0.05);
      this.footsteps.setRate(0.85 + Math.min(1, groundSpeed / 2) * 0.4);
    }
  }
}
