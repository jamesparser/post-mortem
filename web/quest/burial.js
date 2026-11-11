// Passthrough burial. A small casket on a wooden bier in the real room.
// Lay the real device inside with your hand. The lid closes, the organ plays,
// flowers fall with weight, a printed program floats, the priest speaks, and
// chains take the casket down through the floor. Then silence, and a
// heartbeat from underneath.

import * as THREE from "three";

const SHOUT = "Wait! I am not dead yet! Let me out!";
const SHOUT_VOICE = "aura-2-orpheus-en";
import { woodTextures, woodMaterial, brassMaterial, satinMaterial } from "./skin.js";
import { Program } from "./ui.js";
import { VOICE_RATE } from "./audio.js";

const CASKET = { length: 0.46, height: 0.13, wall: 0.014 };
const BIER_HEIGHT = 0.68;

function coffinShape(scale = 1) {
  const s = new THREE.Shape();
  const pts = [
    [-0.068, -0.23],
    [0.068, -0.23],
    [0.105, 0.075],
    [0.078, 0.23],
    [-0.078, 0.23],
    [-0.105, 0.075],
  ].map(([x, z]) => [x * scale, z * scale]);
  s.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  return s;
}

function buildCasket() {
  const wood = woodMaterial(woodTextures());
  const brass = brassMaterial();
  const satin = satinMaterial();
  const group = new THREE.Group();

  // Walls: outer shape with an inner hole, extruded upward.
  const wallShape = coffinShape(1);
  wallShape.holes.push(coffinShape(0.88));
  const walls = new THREE.ExtrudeGeometry(wallShape, {
    depth: CASKET.height,
    bevelEnabled: true,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    bevelSegments: 2,
  });
  walls.rotateX(-Math.PI / 2);
  const wallMesh = new THREE.Mesh(walls, wood);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  const floorGeo = new THREE.ShapeGeometry(coffinShape(0.9));
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, satin);
  floor.position.y = 0.012;
  floor.receiveShadow = true;
  group.add(floor);

  // Satin lining walls, slightly inside the wood.
  const lining = new THREE.ExtrudeGeometry(coffinShape(0.875), { depth: CASKET.height - 0.012, bevelEnabled: false });
  lining.rotateX(-Math.PI / 2);
  const liningMesh = new THREE.Mesh(lining, satin);
  liningMesh.material = satin.clone();
  liningMesh.material.side = THREE.BackSide;
  liningMesh.position.y = 0.012;
  group.add(liningMesh);

  const pillow = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), satin);
  pillow.scale.set(0.055, 0.018, 0.035);
  pillow.position.set(0, 0.03, -0.175);
  group.add(pillow);

  // Brass handles along both long sides.
  for (const side of [-1, 1]) {
    for (const z of [-0.12, 0.0, 0.12]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 10), brass);
      bar.rotation.x = Math.PI / 2;
      const x = side * (0.095 - Math.abs(z - 0.075) * 0.12 + 0.016);
      bar.position.set(x, CASKET.height * 0.55, z);
      bar.castShadow = true;
      group.add(bar);
      for (const end of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.016, 8), brass);
        post.rotation.z = Math.PI / 2;
        post.position.set(x - side * 0.008, CASKET.height * 0.55, z + end * 0.03);
        group.add(post);
      }
    }
  }

  // Lid, hinged along the minus X side.
  const hinge = new THREE.Group();
  hinge.position.set(-0.105, CASKET.height + 0.003, 0);
  group.add(hinge);
  const lidGeo = new THREE.ExtrudeGeometry(coffinShape(1.02), {
    depth: 0.022,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.006,
    bevelSegments: 3,
  });
  lidGeo.rotateX(-Math.PI / 2);
  const lid = new THREE.Mesh(lidGeo, wood);
  lid.position.set(0.105, 0, 0);
  lid.castShadow = true;
  lid.receiveShadow = true;
  hinge.add(lid);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.08), brass);
  cross.position.set(0.105, 0.03, -0.04);
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.006), brass);
  crossBar.position.set(0.105, 0.03, -0.06);
  hinge.add(cross, crossBar);
  hinge.rotation.z = 1.75;

  return { group, hinge, wood };
}

function buildBier(wood) {
  const group = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(0.03, BIER_HEIGHT, 0.03);
  for (const x of [-0.1, 0.1]) {
    for (const z of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(x, BIER_HEIGHT / 2, z);
      leg.castShadow = true;
      group.add(leg);
    }
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.52), wood);
  top.position.y = BIER_HEIGHT - 0.0125;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), wood);
  for (const z of [-0.2, 0.2]) {
    const r = rail.clone();
    r.position.set(0, 0.16, z);
    group.add(r);
  }
  return group;
}

// Petals with weight. They fall, flutter a little, and come to rest.
class Petals {
  constructor(count) {
    const geo = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2.4);
    geo.scale(0.014, 0.005, 0.02);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.count = count;
    this.items = [];
    const palette = [new THREE.Color(0x5a1f22), new THREE.Color(0x6e2a2c), new THREE.Color(0xd8cfbf), new THREE.Color(0xcfc3ad)];
    for (let i = 0; i < count; i += 1) {
      this.mesh.setColorAt(i, palette[i % palette.length]);
      this.items.push({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), r: new THREE.Euler(), spin: new THREE.Vector3(), resting: true, delay: 0 });
    }
    this.dummy = new THREE.Object3D();
    this.mesh.visible = false;
  }

  drop(center, floorY, casketTop, casketBox) {
    this.floorY = floorY;
    this.casketTop = casketTop;
    this.casketBox = casketBox;
    this.items.forEach((it, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.55;
      it.p.set(center.x + Math.cos(a) * r, center.y + 1.1 + Math.random() * 0.7, center.z + Math.sin(a) * r);
      it.v.set(0, 0, 0);
      it.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      it.spin.set(Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2);
      it.resting = false;
      it.onCasket = false;
      it.delay = (i / this.count) * 9;
    });
    this.mesh.visible = true;
  }

  update(dt, casketOffsetY) {
    if (!this.mesh.visible) return;
    const t = performance.now() / 1000;
    this.items.forEach((it, i) => {
      if (it.delay > 0) {
        it.delay -= dt;
      } else if (!it.resting) {
        // Gravity, air drag, and a little flutter.
        it.v.y -= 9.8 * dt * 0.35;
        it.v.multiplyScalar(1 - Math.min(0.9, dt * 3.2));
        it.v.x += Math.sin(t * 3 + i) * dt * 0.25;
        it.v.z += Math.cos(t * 2.6 + i * 1.3) * dt * 0.25;
        it.p.addScaledVector(it.v, dt);
        it.r.x += it.spin.x * dt;
        it.r.y += it.spin.y * dt;
        it.r.z += it.spin.z * dt;
        const overCasket = this.casketBox && it.p.x > this.casketBox.min.x && it.p.x < this.casketBox.max.x && it.p.z > this.casketBox.min.z && it.p.z < this.casketBox.max.z;
        const ground = overCasket ? this.casketTop : this.floorY + 0.003;
        if (it.p.y <= ground) {
          it.p.y = ground;
          it.resting = true;
          it.onCasket = overCasket;
          it.r.x = (Math.random() - 0.5) * 0.3;
          it.r.z = (Math.random() - 0.5) * 0.3;
        }
      }
      const y = it.onCasket ? it.p.y + casketOffsetY : it.p.y;
      this.dummy.position.set(it.p.x, it.delay > 0 ? -50 : y, it.p.z);
      this.dummy.rotation.copy(it.r);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class BurialMode {
  constructor(ctx, onDone) {
    this.ctx = ctx;
    this.onDone = onDone;
    this.state = "setup";
    this.timer = 0;
    const { group, hinge, wood } = buildCasket();
    this.casket = group;
    this.hinge = hinge;
    this.bier = buildBier(wood);
    this.root = new THREE.Group();
    this.root.add(this.bier);
    this.casket.position.y = BIER_HEIGHT;
    this.root.add(this.casket);
    this.petals = new Petals(56);
    this.program = new Program();
    this.sink = 0;
    this.insideFor = 0;
  }

  enter() {
    const { scene, camera, room, mover, audio, caption, funeral } = this.ctx;
    mover.hide();
    const head = camera.getWorldPosition(new THREE.Vector3());
    room.setStart(head);
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    this.root.position.copy(head).addScaledVector(fwd, 0.7);
    this.root.position.y = room.floorY;
    this.root.rotation.y = Math.atan2(fwd.x, fwd.z) + Math.PI / 2;
    scene.add(this.root);
    scene.add(this.petals.mesh);
    this.name = (funeral && funeral.name) || "the departed";
    this.program.draw(this.name, "", 0);
    this.program.mesh.visible = false;
    scene.add(this.program.mesh);
    audio.bed("storm-bed", 0.08, 3);
    this.ctx.movable = this.root;
    this.ctx.movableReach = 0.55;
    this.state = "place";
    this.step = "carry";
    this.stepAge = 0;
    this.timer = 30;
    this.showStep();
    // The voice from inside, fetched now so it is ready at the end.
    this.ctx.audio.preload(SHOUT, { voice: SHOUT_VOICE });
    this.eulogy = this.fetchEulogy();
  }

  exit() {
    const { scene, audio } = this.ctx;
    scene.remove(this.root);
    scene.remove(this.petals.mesh);
    scene.remove(this.program.mesh);
    if (this.organ) {
      this.organ.setGain(0, 1);
      const organ = this.organ;
      setTimeout(() => organ.stop(), 3000);
    }
    audio.bed("storm-bed", 0.12, 3);
  }

  async fetchEulogy() {
    const { funeral } = this.ctx;
    if (funeral && funeral.text) return funeral;
    try {
      const res = await fetch("/api/eulogy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: funeral && funeral.name ? funeral.name : "a device laid to rest by hand" }),
      });
      const data = await res.json();
      return { name: this.name, text: data.text };
    } catch (err) {
      return {
        name: this.name,
        text: "Dearly beloved, we commit this device to the ground. He was a good device. His life simply ran out. He is survived by his charger, which he never used again. Ashes to ashes. Dust to dust.",
      };
    }
  }

  interiorBox() {
    this.casket.updateMatrixWorld(true);
    const box = new THREE.Box3(new THREE.Vector3(-0.1, 0, -0.23), new THREE.Vector3(0.1, CASKET.height + 0.08, 0.23));
    return box.applyMatrix4(this.casket.matrixWorld);
  }

  update(dt) {
    const { reachPoints, selectedNear, anySelect, caption, audio, camera, haptics } = this.ctx;
    this.timer -= dt;
    this.age = (this.age || 0) + dt;
    const casketCenter = this.casket.getWorldPosition(new THREE.Vector3());

    // Two clear steps. First put the casket where you want it. Then put the
    // phone in. Nothing closes until you say so, and never while carrying.
    if (this.state === "place") {
      this.stepAge += dt;
      const carrying = this.ctx.isCarrying && this.ctx.isCarrying();
      if (carrying) this.stepAge = 0;
      const pressed = !carrying && this.stepAge > 1.2 && anySelect && anySelect();
      if (this.step === "carry" && pressed) {
        this.step = "phone";
        this.stepAge = 0;
        this.ctx.movable = null;
        audio.oneShot("thud", casketCenter, 0.2, 1.4);
        this.showStep();
      } else if (this.step === "phone" && pressed && this.stepAge > 1.5) {
        return this.closeLid();
      }
      if (this.timer <= 0) {
        this.showStep();
        this.timer = 25;
      }
    }

    if (this.state === "closing") {
      const t = Math.min(1, 1 - this.timer / 2.6);
      const eased = t * t * (3 - 2 * t);
      this.hinge.rotation.z = 1.75 * (1 - eased);
      if (this.timer <= 0) {
        this.hinge.rotation.z = 0;
        audio.oneShot("thud", casketCenter, 0.45, 0.9);
        haptics(0.4, 120);
        this.startService();
      }
    }

    if (this.state === "service" && this.reveal) {
      const elapsed = (performance.now() - this.reveal.start) / 1000;
      const fraction = Math.min(1, elapsed / this.reveal.duration);
      if (Math.floor(fraction * 60) !== this.reveal.step) {
        this.reveal.step = Math.floor(fraction * 60);
        this.program.draw(this.name, this.reveal.text, fraction);
      }
    }

    if (this.state === "lowering") {
      this.sink = Math.min(1.25, this.sink + dt * 0.17);
      if (this.baseY === undefined) this.baseY = this.root.position.y;
      this.root.position.y = this.baseY - this.sink;
      this.program.mesh.material.opacity = Math.max(0, 1 - this.sink * 1.4);
      if (this.sink >= 1.25) {
        // Gone. The silence that follows is load bearing. Do not fill it.
        this.state = "silence";
        this.timer = 3.2;
        audio.oneShot("thud", this.gravePoint(), 0.25, 0.7);
      }
    }

    if (this.state === "silence" && this.timer <= 0) this.beginHeartbeat();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const j = this.shake * 0.02;
      this.casket.position.x = (Math.random() - 0.5) * j;
      this.casket.position.z = (Math.random() - 0.5) * j;
      this.casket.rotation.z = (Math.random() - 0.5) * j * 2;
    }

    if (this.state === "heartbeat" && this.timer <= 0) {
      this.state = "after";
      this.timer = 6;
      caption.show("Rest now.", 4);
    }

    if (this.state === "after" && this.timer <= 0) {
      this.state = "done";
      this.ctx.setHint("", []);
      this.onDone();
    }

    // The program floats above the casket, tilted toward the viewer.
    if (this.program.mesh.visible) {
      const head = camera.getWorldPosition(new THREE.Vector3());
      const p = casketCenter.clone();
      p.y = (this.baseY ?? this.root.position.y) + BIER_HEIGHT + 0.55 + Math.sin(performance.now() / 1400) * 0.01;
      this.program.mesh.position.copy(p);
      this.program.mesh.lookAt(head);
    }
    this.petals.update(dt, this.dropY === undefined ? 0 : this.root.position.y - this.dropY);
  }

  showStep() {
    const { caption, setHint } = this.ctx;
    if (this.step === "carry") {
      caption.show("First, put the casket where you want it. Point at it and hold the grip to carry it. Pull the trigger when it is in place.", 9, true);
      setHint("Step 1 of 2: place the casket", [
        "Point at the casket and hold the grip button to carry it.",
        "Set it on a table, a bed or the floor and let go of the grip.",
        "Pull the trigger, or pinch, when it is where you want it.",
      ]);
    } else {
      caption.show("Now put your phone in the casket. Take your time. When it is inside, pull the trigger to close the lid.", 0, true);
      setHint("Step 2 of 2: lay it to rest", [
        "Put your dead phone or device inside the open casket.",
        "When it is inside, pull the trigger, or pinch, to close the lid.",
      ]);
    }
  }

  // The point under the floor where the casket came to rest.
  gravePoint() {
    const p = this.root.position.clone();
    p.y = this.ctx.room.floorY - 0.5;
    return p;
  }

  // Something under the floor will not stay quiet. It knocks, it shouts,
  // muffled through the lid, and the controllers buck as if it is trying to
  // get out. Then a heartbeat, three or four times, weaker each time. Then
  // nothing, and it does not come back. The device stays dead.
  beginHeartbeat() {
    const { audio, haptics, camera, caption, setHint } = this.ctx;
    this.state = "heartbeat";
    setHint("Listen", ["Something under the ground is not finished.", "Hold still. Feel the controllers."]);
    const head = camera.getWorldPosition(new THREE.Vector3());
    // Quest speakers lose deep bass, so the sound sits close and a little low.
    const toward = this.root.position.clone().setY(head.y - 0.7).sub(head);
    const near = head.clone().addScaledVector(toward.normalize(), 0.6).setY(head.y - 0.7);
    const at = (ms, fn) => setTimeout(() => this.state === "heartbeat" && fn(), ms);
    const knock = (strength) => {
      audio.oneShot("thud", near, 0.9 * strength, 1.25);
      audio.oneShot("nails-tap", near, 0.5 * strength, 0.6);
      haptics(0.95 * strength, 140);
      this.shake = 0.35;
    };
    // Knocking from inside.
    [0, 380, 760, 1700, 2000].forEach((t, i) => at(t, () => knock(i < 3 ? 1 : 0.8)));
    // A muffled shout.
    at(2700, () => {
      haptics(1, 450);
      this.shake = 0.6;
      audio.speech(SHOUT, near, { voice: SHOUT_VOICE, rate: 0.95, volume: 1.6, lowpass: 650, dry: true }).then((ok) => {
        if (!ok) audio.oneShot("groans", near, 0.9, 1.2);
      });
    });
    // Scrabbling and one long buck of the controllers, as if it is trying to get out.
    at(4900, () => {
      audio.oneShot("scuffle", near, 0.8, 0.8);
      haptics(1, 900);
      this.shake = 0.9;
    });
    // Then the heartbeat, slowing and fading.
    const beats = 3 + (Math.random() < 0.5 ? 1 : 0);
    const start = 7200;
    let period = 1000;
    let t = start;
    for (let i = 0; i < beats; i += 1) {
      const strength = 1 - i * 0.18;
      at(t, () => {
        audio.oneShot("heartbeat", near, 1.2 * strength, 1.3);
        audio.oneShot("thud", near, 0.35 * strength, 1.8);
        haptics(0.9 * strength, 90);
        this.shake = 0.25 * strength;
      });
      at(t + 280, () => {
        audio.oneShot("thud", near, 0.25 * strength, 2);
        haptics(0.65 * strength, 110);
      });
      t += period;
      period += 250;
    }
    this.timer = (t + 2600) / 1000;
    caption.hide();
  }

  closeLid() {
    this.ctx.movable = null;
    this.state = "closing";
    this.timer = 2.6;
    this.ctx.setHint("The burial", ["Stand still and listen to the service.", "Stay until the very end."]);
    this.ctx.caption.hide();
  }

  async startService() {
    const { audio, room } = this.ctx;
    this.state = "service";
    const center = this.casket.getWorldPosition(new THREE.Vector3());
    this.organ = audio.source("organ-dirge", { loop: true, refDistance: 1.2 });
    if (this.organ) {
      this.organ.setPosition(center.clone().add(new THREE.Vector3(0, 0.3, 0)));
      this.organ.start();
      this.organ.setGain(0.5, 1.5);
    }
    this.dropY = this.root.position.y;
    this.petals.drop(center, room.floorY, this.root.position.y + BIER_HEIGHT + CASKET.height + 0.03, this.interiorBox());
    const eulogy = await this.eulogy;
    this.program.mesh.visible = true;
    this.program.mesh.material.opacity = 1;
    await new Promise((r) => setTimeout(r, 3500));
    const text = eulogy.text;
    let url = null;
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) url = URL.createObjectURL(await res.blob());
    } catch (err) {
      url = null;
    }
    const words = text.split(/\s+/).length;
    if (this.organ) this.organ.setGain(0.2, 0.6);
    if (url) {
      const probe = new Audio(url);
      const duration = await new Promise((resolve) => {
        probe.onloadedmetadata = () => resolve(probe.duration ? probe.duration / VOICE_RATE : words * 0.4);
        probe.onerror = () => resolve(words * 0.4);
        setTimeout(() => resolve(words * 0.4), 2500);
      });
      this.reveal = { text, start: performance.now(), duration: duration * 0.92, step: -1 };
      await audio.voice(url, center.clone().add(new THREE.Vector3(0, 0.5, 0)), 1);
    } else {
      this.reveal = { text, start: performance.now(), duration: words * 0.38, step: -1 };
      await this.browserVoice(text);
      await new Promise((r) => setTimeout(r, Math.max(0, this.reveal.duration * 1000 - (performance.now() - this.reveal.start))));
    }
    this.program.draw(this.name, text, 1);
    if (this.organ) this.organ.setGain(0.45, 1);
    await new Promise((r) => setTimeout(r, 2500));
    // Chains take him down. Quiet and mechanical, no haptics.
    if (this.organ) this.organ.setGain(0, 3);
    audio.bed("storm-bed", 0.04, 3);
    audio.oneShot("chains", center.clone().add(new THREE.Vector3(0, 0.6, 0)), 0.6);
    this.state = "lowering";
  }

  browserVoice(text) {
    const synth = window.speechSynthesis;
    if (!synth) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.82;
      u.pitch = 0.6;
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
      setTimeout(resolve, 90000);
    });
  }
}
