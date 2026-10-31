// Hide and seek. Thing gets 30 seconds to hide in the real room while the
// player covers their eyes. Then the hunt. He never moves once hidden.

import * as THREE from "three";

export const ROUND_LENGTHS = {
  quick: { hide: 30, hunt: 60, label: "Quick" },
  standard: { hide: 30, hunt: 90, label: "Standard" },
  long: { hide: 30, hunt: 150, label: "Long" },
};

const CATEGORY_WEIGHTS = [
  ["blend", 0.33],
  ["under", 0.2],
  ["behind", 0.17],
  ["top", 0.17],
  ["hanging", 0.13],
];

const REACH = 0.2;

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem("pm-hideseek") || "") || { rounds: 0, finds: 0, totalFindTime: 0 };
  } catch (err) {
    return { rounds: 0, finds: 0, totalFindTime: 0 };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem("pm-hideseek", JSON.stringify(stats));
  } catch (err) {
    // Private mode. Keep the stats in memory only.
  }
}

export class HideSeekMode {
  constructor(ctx, lengthKey, onDone) {
    this.ctx = ctx;
    this.length = ROUND_LENGTHS[lengthKey] || ROUND_LENGTHS.standard;
    this.onDone = onDone;
    this.state = "intro";
    this.timer = 0;
    this.spot = null;
    this.peeking = false;
    this.stats = loadStats();
    this.breath = null;
    this.scrapeTimer = 6;
    this.lastShownSecond = -1;
  }

  enter() {
    const { mover, camera, room, audio, caption } = this.ctx;
    const head = camera.getWorldPosition(new THREE.Vector3());
    room.setStart(head);
    audio.bed("storm-bed", 0.1, 3);
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const p = head.clone().addScaledVector(fwd, 1.1);
    p.y = room.floorY;
    mover.place(p, Math.atan2(-fwd.x, -fwd.z));
    mover.restPose = "wave";
    audio.oneShot("scuffle", p, 0.5);
    caption.show("He wants to play.", 2.5);
    this.state = "intro";
    this.timer = 2.8;
  }

  exit() {
    const { mover } = this.ctx;
    mover.paused = false;
    mover.restPose = "walk";
    if (this.breath) {
      this.breath.setGain(0, 0.3);
      setTimeout(() => this.breath && this.breath.stop(), 1000);
    }
  }

  pickCategory() {
    let r = Math.random();
    for (const [name, weight] of CATEGORY_WEIGHTS) {
      if (r < weight) return name;
      r -= weight;
    }
    return "behind";
  }

  pickSpot() {
    const { room, camera } = this.ctx;
    const first = this.pickCategory();
    const order = [first, ...CATEGORY_WEIGHTS.map((c) => c[0]).filter((c) => c !== first)];
    for (const category of order) {
      const spot = room.hideSpot(category, Math.random);
      if (spot) return spot;
    }
    return room.fallbackSpot(Math.random, camera.getWorldDirection(new THREE.Vector3()));
  }

  sendToSpot() {
    const { mover } = this.ctx;
    this.spot = this.pickSpot();
    mover.restPose = "walk";
    mover.goTo(this.spot.position, {
      speed: 1.7,
      surface: this.spot.surface && this.spot.pose !== "hang" ? this.spot.surface : undefined,
      climbWall: this.spot.climbWall,
      pose: this.spot.pose,
      onArrive: () => this.settle(),
    });
  }

  settle() {
    const { mover } = this.ctx;
    if (!this.spot) return;
    mover.position.copy(this.spot.position);
    mover.forward.set(Math.sin(this.spot.yaw), 0, Math.cos(this.spot.yaw));
    mover.up.set(0, 1, 0);
    mover.restPose = this.spot.pose;
    this.arrived = true;
  }

  // Covering: hands over the headset, eyes on the floor, or headset off.
  isCovering() {
    const { camera, reachPoints, visibility } = this.ctx;
    if (visibility() !== "visible") return true;
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    if (fwd.y < -0.75) return true;
    const head = camera.getWorldPosition(new THREE.Vector3());
    const points = reachPoints();
    const near = points.filter((p) => p.distanceTo(head) < 0.17);
    return near.length >= 1;
  }

  update(dt) {
    const { mover, caption, audio, camera, haptics } = this.ctx;
    this.timer -= dt;

    if (this.state === "intro") {
      if (this.timer <= 0) {
        this.state = "hiding";
        this.timer = this.length.hide;
        this.arrived = false;
        caption.show("30 seconds. Cover your eyes.", 4);
        setTimeout(() => this.state === "hiding" && caption.show("Hands over the headset, or look at the floor.", 4, true), 4200);
        this.sendToSpot();
      }
      return;
    }

    if (this.state === "hiding") {
      const covering = this.isCovering();
      if (!covering && !this.peeking && this.timer < this.length.hide - 1.5) {
        this.peeking = true;
        mover.paused = true;
        audio.oneShot("peek-tone", null, 0.35);
        caption.show("No peeking.", 2);
      } else if (covering && this.peeking) {
        this.peeking = false;
        mover.paused = false;
        // He saw you see him. He goes somewhere else.
        this.sendToSpot();
      }
      const s = Math.ceil(this.timer);
      if (s !== this.lastShownSecond && (s === 20 || s === 10 || s <= 3) && s > 0) {
        this.lastShownSecond = s;
        caption.show(String(s), 1, true);
      }
      if (this.timer <= 0) {
        if (!this.arrived && this.spot) {
          mover.stop();
          this.settle();
        }
        mover.paused = false;
        this.startHunt();
      }
      return;
    }

    if (this.state === "hunt") {
      this.huntTime += dt;
      this.scrapeTimer -= dt;
      if (this.scrapeTimer < 0) {
        this.scrapeTimer = 7 + Math.random() * 8;
        audio.oneShot("nails-tap", mover.position, 0.12, 0.7);
      }
      const remaining = Math.ceil(this.length.hunt - this.huntTime);
      if (remaining !== this.lastShownSecond && (remaining === 30 || remaining === 10)) {
        this.lastShownSecond = remaining;
        caption.show(remaining + " seconds.", 2, true);
      }
      if (this.found()) return this.onFound();
      if (this.huntTime >= this.length.hunt) return this.onTimeout();
      return;
    }

    if (this.state === "caught") {
      if (this.timer <= 0) {
        this.ctx.mover.restPose = "walk";
        this.showScore();
      }
      return;
    }

    if (this.state === "scared") {
      if (mover.shoulder && this.timer <= 0) {
        const head = camera.getWorldPosition(new THREE.Vector3());
        const back = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize().multiplyScalar(-1.2);
        const p = head.clone().add(back);
        p.y = this.ctx.room.floorY;
        mover.dropFromShoulder(p);
        this.showScore();
      }
      return;
    }

    if (this.state === "score" && this.timer <= 0) {
      this.state = "done";
      this.onDone();
    }
  }

  startHunt() {
    const { audio, caption, mover } = this.ctx;
    this.state = "hunt";
    this.huntTime = 0;
    this.lastShownSecond = -1;
    audio.oneShot("chime", null, 0.4);
    caption.show("Find him.", 3);
    this.breath = audio.source("breath", { loop: true, refDistance: 0.35 });
    if (this.breath) {
      this.breath.setPosition(mover.position);
      this.breath.start();
      this.breath.setGain(0.22, 1);
    }
  }

  found() {
    const { mover, reachPoints, selectedNear } = this.ctx;
    const body = mover.position.clone().add(new THREE.Vector3(0, 0.03, 0));
    const points = reachPoints();
    if (points.some((p) => p.distanceTo(body) < REACH)) return true;
    return selectedNear(body, 0.32);
  }

  onFound() {
    const { mover, audio, caption, haptics } = this.ctx;
    this.state = "caught";
    this.timer = 2.6;
    mover.restPose = "squirm";
    audio.oneShot("sting", mover.position, 0.35, 1.1);
    audio.oneShot("scuffle", mover.position, 0.5);
    haptics(0.5, 160);
    caption.show("Found him. He is at rest again. For now.", 4);
    this.stats.rounds += 1;
    this.stats.finds += 1;
    this.stats.totalFindTime += this.huntTime;
    saveStats(this.stats);
    if (this.breath) this.breath.setGain(0, 0.2);
  }

  onTimeout() {
    const { mover, audio, caption, camera, haptics } = this.ctx;
    this.state = "scared";
    this.timer = 3.2;
    if (this.breath) this.breath.setGain(0, 0.1);
    mover.restPose = "walk";
    mover.leapToShoulder(camera, () => {
      audio.oneShot("sting", null, 0.45);
      audio.oneShot("scuffle", mover.position, 0.6);
      haptics(0.7, 250);
    });
    caption.show("Time. He found you.", 3.5);
    this.stats.rounds += 1;
    saveStats(this.stats);
  }

  showScore() {
    const { caption } = this.ctx;
    const s = this.stats;
    const avg = s.finds ? Math.round(s.totalFindTime / s.finds) : 0;
    const text =
      "Rounds " + s.rounds + ". Finds " + s.finds + "." + (s.finds ? " Average find " + avg + " seconds." : "");
    setTimeout(() => caption.show(text, 4.5, true), 3600);
    this.state = "score";
    this.timer = 8.5;
  }
}
