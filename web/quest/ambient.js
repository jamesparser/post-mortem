// Ambient haunting. The default mode. Thing lives in the house: darts along
// skirting boards, stops to listen, hides under tables, climbs onto furniture,
// freezes when watched, bolts when you look away, and if you stand still long
// enough he comes for your shoulder.

import * as THREE from "three";
import { Ghost } from "./ghost.js";

const LOOK_ANGLE = 0.26;
const SCARE_COOLDOWN = 75;
const GROAN_MIN = 70;

function head0(camera) {
  return camera.getWorldPosition(new THREE.Vector3());
}

export class AmbientMode {
  constructor(ctx) {
    this.ctx = ctx;
    this.rand = Math.random;
    this.state = "idle";
    this.timer = 0;
    this.lookedFor = 0;
    this.unlookedFor = 0;
    this.lastScare = -SCARE_COOLDOWN + 30;
    this.clock = 0;
    this.nextGroan = 40 + Math.random() * 40;
    this.headHistory = [];
  }

  enter() {
    const { mover, room, camera, audio } = this.ctx;
    audio.bed("storm-bed", 0.12, 4);
    // He starts where you can see him: on the floor a little ahead and to one
    // side. Look away and he is gone.
    const spawn = this.pointInView(1.6);
    mover.place(spawn, Math.atan2(head0(camera).x - spawn.x, head0(camera).z - spawn.z));
    this.state = "listen";
    this.timer = 4;
    this.ctx.audio.oneShot("scuffle", spawn, 0.5);
    this.ctx.caption.show("Something is on the floor in front of you.", 4, true);
    if (this.ctx.report) setTimeout(() => this.ctx.report("ambient-spawn", { spawn: [spawn.x, spawn.y, spawn.z].map((n) => +n.toFixed(2)) }), 1500);
    this.ctx.setHint("Thing is loose", [
      "He freezes when you look at him and moves when you look away.",
      "Stand still too long and he comes for your shoulder.",
      "Hide and seek, the burial and the spirit board are in the menu.",
    ]);
    room.setStart(camera.getWorldPosition(new THREE.Vector3()));
    // Thing is not the only one in the house.
    this.ghost = new Ghost(this.ctx, { firstDelay: 30, minGap: 45, maxGap: 80 });
  }

  exit() {
    this.ctx.mover.stop();
    if (this.ghost) this.ghost.dispose();
  }

  pointInView(distance) {
    const { room, camera } = this.ctx;
    const head = head0(camera);
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    for (let i = 0; i < 30; i += 1) {
      const a = (Math.random() - 0.5) * 0.9;
      const dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const p = head.clone().addScaledVector(dir, distance * (0.6 + Math.random() * 0.5));
      p.y = room.floorY;
      if (room.insideRoom(p, 0.2) && !room.insideFurniture(p) && !room.insideSolid(p.clone().setY(p.y + 0.03))) return p;
    }
    // Nothing clear ahead: the nearest clear floor anywhere in the room.
    let best = null;
    for (let i = 0; i < 60; i += 1) {
      const p = room.randomFloorPoint(Math.random, head, 2.5);
      if (!room.insideRoom(p, 0.2)) continue;
      const d = p.distanceTo(head.clone().addScaledVector(fwd, distance));
      if (!best || d < best.d) best = { p, d };
    }
    return best ? best.p : room.randomFloorPoint(Math.random);
  }

  // A floor point behind the viewer, so he is never seen arriving.
  pointOutOfView(distance) {
    const { room, camera } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    for (let i = 0; i < 25; i += 1) {
      const a = Math.PI * (0.6 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1);
      const dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const p = head.clone().addScaledVector(dir, distance * (0.7 + Math.random() * 0.6));
      p.y = room.floorY;
      if (room.insideRoom(p, 0.2) && !room.insideFurniture(p) && !room.insideSolid(p.clone().setY(p.y + 0.03))) return p;
    }
    return room.randomFloorPoint(Math.random, head, distance);
  }

  isLookedAt() {
    const { camera, mover } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    const to = mover.position.clone().add(new THREE.Vector3(0, 0.04, 0)).sub(head);
    const dist = to.length();
    if (dist > 7) return false;
    return fwd.angleTo(to) < LOOK_ANGLE + 0.05 / Math.max(dist, 0.3);
  }

  viewerStillFor() {
    const { camera } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const now = this.clock;
    this.headHistory.push({ t: now, p: head });
    while (this.headHistory.length && now - this.headHistory[0].t > 12) this.headHistory.shift();
    let still = 0;
    for (let i = this.headHistory.length - 1; i >= 0; i -= 1) {
      if (this.headHistory[i].p.distanceTo(head) > 0.18) break;
      still = now - this.headHistory[i].t;
    }
    return still;
  }

  update(dt) {
    if (this.ghost) this.ghost.update(dt);
    const { mover, room, camera, audio } = this.ctx;
    this.clock += dt;
    this.timer -= dt;
    const looked = mover.visible && this.isLookedAt();
    this.lookedFor = looked ? this.lookedFor + dt : 0;
    this.unlookedFor = looked ? 0 : this.unlookedFor + dt;
    const still = this.viewerStillFor();
    const head = camera.getWorldPosition(new THREE.Vector3());
    const distance = Math.hypot(mover.position.x - head.x, mover.position.z - head.z);

    if (this.clock > this.nextGroan) {
      this.nextGroan = this.clock + GROAN_MIN + Math.random() * 60;
      const p = this.pointOutOfView(5);
      p.y += 1.2;
      audio.oneShot("groans", p, 0.25, 0.9 + Math.random() * 0.15);
    }

    switch (this.state) {
      case "listen":
        if (looked && this.lookedFor > 0.05) return this.freeze();
        if (this.timer > 0) return;
        return this.chooseNext(still, distance);
      case "move":
        if (looked && this.lookedFor > 0.12) return this.freeze();
        if (!mover.moving) {
          this.state = "listen";
          this.timer = 0.6 + Math.random() * 2.4;
        }
        return;
      case "hiding":
        if (this.timer > 0) return;
        this.state = "listen";
        this.timer = 0.5;
        return;
      case "frozen":
        mover.paused = true;
        if (this.unlookedFor > 0.35 + Math.random() * 0.1) {
          mover.paused = false;
          return this.bolt();
        }
        return;
      case "creep":
        if (looked) return this.freeze();
        if (still < 4) {
          this.state = "listen";
          this.timer = 1;
          mover.stop();
          return;
        }
        if (distance < 1.2) return this.leap();
        if (!mover.moving) this.creepStep();
        return;
      case "shoulder":
        if (this.timer <= 0) {
          const p = this.pointOutOfView(1.4);
          mover.dropFromShoulder(p);
          this.state = "dropping";
          this.timer = 0.6;
        }
        return;
      case "dropping":
        if (this.timer <= 0) this.bolt();
        return;
      case "leaping":
        return;
      default:
        this.state = "listen";
        this.timer = 1;
    }
  }

  chooseNext(still, distance) {
    const { mover, room } = this.ctx;
    const canScare = this.clock - this.lastScare > SCARE_COOLDOWN;
    if (canScare && still > 8 && distance < 5) {
      this.state = "creep";
      return this.creepStep();
    }
    const roll = Math.random();
    if (roll < 0.18) {
      const spot = room.hideSpot("under", Math.random);
      if (spot) return this.travel(spot.position, { speed: 1.8, pose: "still" }, () => this.hideFor(4 + Math.random() * 8));
    }
    if (roll < 0.36) {
      const surfaces = room.surfaces();
      if (surfaces.length) {
        const s = surfaces[Math.floor(Math.random() * surfaces.length)];
        const p = room.pointOnSurface(s, Math.random, 0.1);
        return this.travel(p, { speed: 1.4, surface: s, pose: "walk" }, () => this.hideFor(5 + Math.random() * 7));
      }
    }
    const target = Math.random() < 0.6 ? room.skirtingPoint(Math.random) : room.randomFloorPoint(Math.random, mover.position, 2.5);
    return this.travel(target, { speed: 1.3 + Math.random() * 0.9 });
  }

  travel(target, options, onArrive) {
    this.state = "move";
    this.ctx.mover.goTo(target, {
      ...options,
      onArrive: () => {
        if (onArrive) onArrive();
      },
    });
  }

  hideFor(seconds) {
    this.state = "hiding";
    this.timer = seconds;
  }

  freeze() {
    this.state = "frozen";
    this.ctx.mover.paused = true;
  }

  // Bolt to cover, away from the viewer.
  bolt() {
    const { room, mover, camera } = this.ctx;
    mover.paused = false;
    const head = camera.getWorldPosition(new THREE.Vector3());
    let spot = room.hideSpot("under", Math.random) || room.hideSpot("behind", Math.random);
    let target = spot ? spot.position : this.pointOutOfView(3);
    if (target.distanceTo(head) < 1.5) target = this.pointOutOfView(3);
    this.ctx.audio.oneShot("scuffle", mover.position, 0.35);
    this.travel(target, { speed: 2.4, pose: "still" }, () => this.hideFor(3 + Math.random() * 5));
  }

  // Creep closer in short pulses, always from outside the line of sight.
  creepStep() {
    const { mover, camera, room } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const side = Math.random() < 0.5 ? 1 : -1;
    const behind = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), side * (Math.PI * 0.75));
    const goal = head.clone().addScaledVector(behind, 0.9);
    goal.y = room.floorY;
    const step = goal.clone().sub(mover.position).setY(0);
    const len = Math.min(step.length(), 0.5 + Math.random() * 0.4);
    const to = mover.position.clone().addScaledVector(step.normalize(), len);
    to.y = room.floorY;
    this.state = "creep";
    mover.goTo(to, { speed: 0.35, pose: "still" });
  }

  leap() {
    const { mover, camera, audio, haptics, caption } = this.ctx;
    this.lastScare = this.clock;
    this.state = "leaping";
    mover.leapToShoulder(camera, () => {
      audio.oneShot("sting", null, 0.45);
      audio.oneShot("scuffle", mover.position, 0.6);
      audio.oneShot("breath", mover.position, 0.4);
      haptics(0.6, 220);
      this.state = "shoulder";
      this.timer = 3.5;
    });
  }
}
