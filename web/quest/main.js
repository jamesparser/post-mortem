// POST-Mortem for Quest 3. WebXR passthrough. Thing lives in your house.
// Modes: ambient haunting (default), hide and seek, and the burial.

import * as THREE from "three";
import { createThing, ThingAnimator } from "./thing.js";
import { Room } from "./room.js";
import { AudioEngine } from "./audio.js";
import { ThingMover } from "./mover.js";
import { AmbientMode } from "./ambient.js";
import { HideSeekMode, ROUND_LENGTHS } from "./hideseek.js";
import { BurialMode } from "./burial.js";
import { SpiritBoardMode } from "./board.js";
import { MenuPanel, Caption, WristButton, makeRay } from "./ui.js";

const JOINTS = ["index-finger-tip", "middle-finger-tip", "thumb-tip", "wrist", "middle-finger-metacarpal"];

export class App {
  constructor(options = {}) {
    this.preview = Boolean(options.preview);
    this.funeral = options.funeral || null;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.xr.enabled = true;
    this.renderer.domElement.className = "xr-canvas";
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
    this.camera.position.set(0, 1.6, 0);
    this.scene.add(this.camera);

    // Warm lamp light and deep shadow. Nothing saturated.
    this.scene.add(new THREE.HemisphereLight(0xffe7cc, 0x16110c, 0.85));
    this.key = new THREE.DirectionalLight(0xffd8a6, 1.9);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    const sc = this.key.shadow.camera;
    sc.left = sc.bottom = -1.2;
    sc.right = sc.top = 1.2;
    sc.near = 0.1;
    sc.far = 6;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.01;
    this.scene.add(this.key, this.key.target);

    this.room = new Room(this.scene);
    this.audio = new AudioEngine();
    this.thing = createThing();
    this.scene.add(this.thing.root);
    this.animator = new ThingAnimator(this.thing);
    this.mover = new ThingMover(this.thing, this.animator, this.room, this.audio);

    this.menu = new MenuPanel();
    this.caption = new Caption();
    this.wrist = new WristButton();
    this.scene.add(this.menu.mesh, this.caption.mesh, this.wrist.mesh);

    this.inputs = [];
    this.selects = [];
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.frames = 0;
    this.mode = null;
    this.menuStack = [];
    this.session = null;

    this.ctx = {
      scene: this.scene,
      camera: this.camera,
      room: this.room,
      audio: this.audio,
      mover: this.mover,
      caption: this.caption,
      funeral: this.funeral,
      reachPoints: () => this.reachPoints(),
      touchPoints: () => this.touchPoints(),
      mic: null,
      movable: null,
      selectedNear: (p, r) => this.selectedNear(p, r),
      haptics: (i, ms) => this.haptics(i, ms),
      visibility: () => (this.session ? this.session.visibilityState || "visible" : "visible"),
    };

    window.addEventListener("resize", () => {
      if (this.renderer.xr.isPresenting) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  async enterXR() {
    const base = ["hand-tracking", "plane-detection", "mesh-detection", "anchors", "hit-test"];
    // Depth sensing lets the real world hide Thing: walls, furniture, your own
    // legs. It works even when the room was never mapped. If the browser will
    // not open a session with it, try again without.
    const withDepth = {
      requiredFeatures: ["local-floor"],
      optionalFeatures: [...base, "depth-sensing"],
      depthSensing: { usagePreference: ["gpu-optimized"], dataFormatPreference: ["luminance-alpha", "float32", "unsigned-short"] },
    };
    const audioReady = this.audio.init();
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", withDepth);
    } catch (err) {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"], optionalFeatures: base });
    }
    this.session = session;
    this.renderer.xr.setReferenceSpaceType("local-floor");
    // Controllers must exist before the session starts, or three.js never
    // reports the input sources that are already connected.
    if (!this.inputs.length) this.setupInputs();
    await this.renderer.xr.setSession(session);
    await audioReady;
    session.addEventListener("end", () => this.onEnd());
    this.renderer.setAnimationLoop((t, frame) => this.tick(frame));
  }

  async enterPreview() {
    this.preview = true;
    await this.audio.init().catch(() => {});
    this.buildPreviewRoom();
    this.renderer.setAnimationLoop((t) => this.tick(null, t));
  }

  onEnd() {
    this.renderer.setAnimationLoop(null);
    if (this.mode && this.mode.exit) this.mode.exit();
    this.mode = null;
    if (this.audio.ctx) this.audio.ctx.suspend();
    if (this.onExit) this.onExit();
  }

  setupInputs() {
    for (let i = 0; i < 2; i += 1) {
      const ray = this.renderer.xr.getController(i);
      const grip = this.renderer.xr.getControllerGrip(i);
      const hand = this.renderer.xr.getHand(i);
      const line = makeRay();
      ray.add(line);
      this.scene.add(ray, grip, hand);
      const entry = { ray, grip, hand, line, source: null, lastMenuButton: false };
      ray.addEventListener("connected", (e) => {
        entry.source = e.data;
      });
      ray.addEventListener("disconnected", () => {
        entry.source = null;
      });
      ray.addEventListener("select", () => this.onSelect(entry));
      ray.addEventListener("squeezestart", () => this.onGrabStart(entry));
      ray.addEventListener("squeezeend", () => this.onGrabEnd(entry));
      ray.addEventListener("selectstart", () => {
        if (entry.source && entry.source.hand && this.ctx.movableHands !== false) this.onGrabStart(entry);
      });
      ray.addEventListener("selectend", () => {
        if (entry.source && entry.source.hand) this.onGrabEnd(entry);
      });
      this.inputs.push(entry);
    }
  }

  // World positions of everything that can reach: fingertips, wrists, controllers.
  reachPoints() {
    const points = [];
    for (const input of this.inputs) {
      if (!input.source) continue;
      if (input.source.hand) {
        for (const name of JOINTS) {
          const joint = input.hand.joints && input.hand.joints[name];
          if (joint && joint.visible) points.push(joint.getWorldPosition(new THREE.Vector3()));
        }
      } else if (input.grip.visible) {
        points.push(input.grip.getWorldPosition(new THREE.Vector3()));
      }
    }
    return points;
  }

  // Where each input touches the world, and whether it is gripping:
  // a controller with its trigger or grip held, or a hand pinching.
  touchPoints() {
    const out = [];
    for (const input of this.inputs) {
      if (!input.source) continue;
      if (input.source.hand) {
        const j = input.hand.joints || {};
        const a = j["thumb-tip"];
        const b = j["index-finger-tip"];
        if (!a || !b || !a.visible || !b.visible) continue;
        const pa = a.getWorldPosition(new THREE.Vector3());
        const pb = b.getWorldPosition(new THREE.Vector3());
        out.push({ point: pa.clone().lerp(pb, 0.5), pressed: pa.distanceTo(pb) < 0.03, hand: true, input });
      } else if (input.grip.visible) {
        const pad = input.source.gamepad;
        // The trigger grips the planchette. The grip button is kept for carrying things.
        const pressed = Boolean(pad && pad.buttons[0] && pad.buttons[0].pressed);
        out.push({ point: input.grip.getWorldPosition(new THREE.Vector3()), pressed, hand: false, input });
      }
    }
    return out;
  }

  // Grab and carry the current mode's object: the casket or the board.
  onGrabStart(entry) {
    const target = this.ctx.movable;
    if (!target || this.grab) return;
    const p = this.inputPosition(entry) || (entry.grip.visible ? entry.grip.getWorldPosition(new THREE.Vector3()) : null);
    if (!p) return;
    // Anywhere on or near the object counts: its bounds, grown by a hand's reach.
    const box = new THREE.Box3().setFromObject(target).expandByScalar(this.ctx.movableReach ? this.ctx.movableReach * 0.5 : 0.2);
    if (!box.containsPoint(p)) return;
    const anchor = target.getWorldPosition(new THREE.Vector3());
    this.grab = { entry, offset: anchor.clone().sub(p) };
  }

  onGrabEnd(entry) {
    if (this.grab && this.grab.entry === entry) {
      this.grab = null;
      if (this.ctx.onMoved) this.ctx.onMoved();
    }
  }

  updateGrab(dt) {
    const target = this.ctx.movable;
    if (!target) {
      this.grab = null;
      return;
    }
    if (this.grab) {
      const e = this.grab.entry;
      const p = this.inputPosition(e) || (e.grip.visible ? e.grip.getWorldPosition(new THREE.Vector3()) : null);
      if (p) {
        const want = p.clone().add(this.grab.offset);
        target.parent.worldToLocal(want);
        target.position.lerp(want, Math.min(1, dt * 18));
      }
    }
    // Thumbsticks raise and lower it, and turn it.
    for (const input of this.inputs) {
      const pad = input.source && !input.source.hand && input.source.gamepad;
      if (!pad || !pad.axes || pad.axes.length < 4) continue;
      const y = pad.axes[3];
      const x = pad.axes[2];
      if (Math.abs(y) > 0.25) target.position.y -= y * dt * 0.35;
      if (Math.abs(x) > 0.5 && !this.menu.mesh.visible) target.rotation.y -= x * dt * 0.9;
    }
  }

  // Calibrate the floor by touching it, for rooms the headset never mapped.
  setFloor() {
    this.menu.hide();
    this.awaitingFloor = true;
    this.caption.show("Touch the floor with a controller or a hand, then pull the trigger or pinch.", 0, true);
  }

  selectedNear(point, radius) {
    return this.selects.some((p) => p && p.distanceTo(point) < radius);
  }

  haptics(intensity, ms) {
    for (const input of this.inputs) {
      const pad = input.source && input.source.gamepad;
      const actuator = pad && pad.hapticActuators && pad.hapticActuators[0];
      if (actuator && actuator.pulse) actuator.pulse(intensity, ms).catch?.(() => {});
    }
  }

  inputPosition(entry) {
    if (!entry.source) return null;
    if (entry.source.hand) {
      const tip = entry.hand.joints && entry.hand.joints["index-finger-tip"];
      return tip && tip.visible ? tip.getWorldPosition(new THREE.Vector3()) : null;
    }
    return entry.grip.visible ? entry.grip.getWorldPosition(new THREE.Vector3()) : null;
  }

  rayHit(entry, objects) {
    const ray = entry.ray;
    ray.updateMatrixWorld(true);
    const origin = new THREE.Vector3().setFromMatrixPosition(ray.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).transformDirection(ray.matrixWorld);
    this.raycaster.set(origin, dir);
    return this.raycaster.intersectObjects(objects.filter((o) => o.visible), false)[0] || null;
  }

  onSelect(entry) {
    if (this.awaitingFloor) {
      const p = this.inputPosition(entry) || (entry.grip.visible ? entry.grip.getWorldPosition(new THREE.Vector3()) : null);
      if (p) {
        this.awaitingFloor = false;
        // A controller held to the floor sits a few centimetres above it.
        this.room.setManualFloor(p.y - (entry.source && entry.source.hand ? 0.01 : 0.04));
        this.caption.show("The floor is here now.", 3, true);
        if (this.modeName === "burial" || this.modeName === "board") this.startMode(this.modeName, this.modeArg);
        return;
      }
    }
    if (this.menu.mesh.visible) {
      const hit = this.rayHit(entry, [this.menu.mesh]);
      if (hit) {
        const i = this.menu.pick(hit.uv);
        if (i >= 0) this.menu.items[i].action();
        return;
      }
    }
    if (this.wrist.mesh.visible) {
      const hit = this.rayHit(entry, [this.wrist.mesh]);
      if (hit) {
        this.toggleMenu();
        return;
      }
    }
    this.selects.push(this.inputPosition(entry));
  }

  toggleMenu() {
    if (this.menu.mesh.visible) {
      this.menu.hide();
    } else {
      this.showMainMenu();
    }
  }

  showMainMenu() {
    const items = [
      { label: "Let him roam", note: "He lives here now", action: () => this.startMode("ambient") },
      { label: "Hide and seek", note: "He hides. You hunt.", action: () => this.showRoundMenu() },
      { label: "The burial", note: "Lay a real device to rest", action: () => this.startMode("burial") },
      { label: "The spirit board", note: "On your table. Feel for the letters.", action: () => this.showBoardMenu() },
    ];
    if (!this.room.hasScan) {
      items.push({ label: "Set the floor", note: "Touch it once so things stand on it", action: () => this.setFloor() });
      if (this.session && this.session.initiateRoomCapture) {
        items.push({ label: "Map this room", note: "So he knows your walls", action: () => this.mapRoom() });
      }
    }
    items.push({ label: "Leave the house", action: () => this.leave() });
    this.menu.setItems("The house", "Press the brass button on your wrist to return here.", items);
    this.menu.showAt(this.camera);
  }

  showBoardMenu() {
    const items = [
      { label: "Talk to the dead", note: "Ask anything, out loud", action: () => this.startMode("board", "dead") },
      { label: "Your dead device", note: "The last thing you buried", action: () => this.startMode("board", "device") },
      { label: "Back", action: () => this.showMainMenu() },
    ];
    this.menu.setItems("The spirit board", "Rest a hand or a controller on the planchette. It will not show you the letter.", items);
    this.menu.showAt(this.camera);
  }

  showRoundMenu() {
    const items = Object.entries(ROUND_LENGTHS).map(([key, r]) => ({
      label: r.label,
      note: r.hide + " seconds to hide. " + r.hunt + " to hunt.",
      action: () => this.startMode("hideseek", key),
    }));
    items.push({ label: "Back", action: () => this.showMainMenu() });
    this.menu.setItems("Hide and seek", "He gets 30 seconds. Cover your eyes.", items);
    this.menu.showAt(this.camera);
  }

  mapRoom() {
    this.menu.hide();
    // The headset maps the room in its own Space Setup. The new map only
    // reaches a page when a session starts, so the visitor has to come back in.
    this.session
      .initiateRoomCapture()
      .then(() => this.caption.show("Mapped. Leave the house and enter again to load the new map.", 8, true))
      .catch(() =>
        this.caption.show("Map the room in the headset: Settings, Physical space, Space setup. Then enter again.", 8, true)
      );
  }

  leave() {
    this.menu.hide();
    if (this.session) this.session.end();
  }

  startMode(name, arg) {
    this.menu.hide();
    if (this.mode && this.mode.exit) this.mode.exit();
    this.ctx.movable = null;
    this.ctx.movableHands = true;
    this.ctx.onMoved = null;
    this.grab = null;
    this.modeArg = arg;
    const back = () => this.startMode("ambient");
    if (name === "hideseek") this.mode = new HideSeekMode(this.ctx, arg, back);
    else if (name === "burial") this.mode = new BurialMode(this.ctx, back);
    else if (name === "board") this.mode = new SpiritBoardMode(this.ctx, arg, back);
    else this.mode = new AmbientMode(this.ctx);
    this.modeName = name;
    this.mode.enter();
  }

  pollButtons() {
    for (const input of this.inputs) {
      const pad = input.source && input.source.gamepad;
      if (!pad || input.source.hand) continue;
      const pressed = Boolean((pad.buttons[5] && pad.buttons[5].pressed) || (pad.buttons[4] && pad.buttons[4].pressed && input.source.handedness === "left"));
      if (pressed && !input.lastMenuButton) this.toggleMenu();
      input.lastMenuButton = pressed;
    }
  }

  updatePointers() {
    let hover = -1;
    for (const input of this.inputs) {
      const show = Boolean(input.source) && (this.menu.mesh.visible || this.wrist.mesh.visible);
      input.line.visible = show && this.menu.mesh.visible;
      if (!show) continue;
      const hit = this.rayHit(input, [this.menu.mesh, this.wrist.mesh]);
      input.line.scale.z = hit ? hit.distance : 1.5;
      if (hit && hit.object === this.menu.mesh) hover = this.menu.pick(hit.uv);
    }
    if (this.menu.mesh.visible) this.menu.setHover(hover);
    // The brass button sits on the left wrist or the left controller.
    const left = this.inputs.find((i) => i.source && i.source.handedness === "left");
    if (left) {
      const isHand = Boolean(left.source.hand);
      const target = isHand ? left.hand.joints && left.hand.joints.wrist : left.grip;
      this.wrist.follow(target, isHand);
    } else {
      this.wrist.mesh.visible = false;
    }
  }

  updateLight() {
    let focus = this.mover.position;
    if (this.modeName === "burial" && this.mode && this.mode.casket) focus = this.mode.casket.getWorldPosition(new THREE.Vector3());
    if (this.modeName === "board" && this.mode && this.mode.root) focus = this.mode.root.getWorldPosition(new THREE.Vector3());
    this.key.target.position.copy(focus);
    this.key.position.copy(focus).add(new THREE.Vector3(0.7, 2.4, 0.5));
    this.key.target.updateMatrixWorld();
  }

  tick(frame, time) {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.frames += 1;
    if (frame) this.room.update(frame, this.renderer.xr.getReferenceSpace());
    if (this.preview) this.updatePreviewCamera(time || 0);

    // Give the headset a moment to report a real head pose before starting.
    if (!this.mode && this.frames > 20) {
      this.startMode("ambient");
      if (!this.preview) {
        this.showMainMenu();
        if (!this.room.hasScan) {
          setTimeout(() => {
            if (!this.room.hasScan) {
              this.caption.show(
                "This room is not mapped, so Thing cannot see your walls. Map it in Settings, Physical space, Space setup, then enter again. Or choose Set the floor.",
                9,
                true
              );
            }
          }, 4000);
        }
      }
    }

    if (this.mode) this.mode.update(dt);
    this.updateGrab(dt);
    this.mover.update(dt);
    this.selects.length = 0;
    this.pollButtons();
    this.updatePointers();
    this.caption.update(this.camera, dt);
    this.audio.updateListener(this.camera);
    this.updateLight();
    this.renderer.render(this.scene, this.camera);
  }

  // Desktop preview: a dim room with a table, and a camera that looks around,
  // so Thing can be seen freezing under the gaze and bolting when it leaves.
  buildPreviewRoom() {
    this.scene.background = new THREE.Color(0x1b1612);
    this.scene.fog = new THREE.Fog(0x1b1612, 4, 10);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const table = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.7), wood);
    top.position.y = 0.73;
    top.castShadow = top.receiveShadow = true;
    table.add(top);
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), wood);
        leg.position.set(x, 0.365, z);
        leg.castShadow = true;
        table.add(leg);
      }
    }
    table.position.set(0.9, 0, -2.2);
    this.scene.add(table);
    const y = 0.75;
    const c = table.position;
    this.room.addSyntheticPlane("table", "horizontal", [
      new THREE.Vector3(c.x - 0.6, y, c.z - 0.35),
      new THREE.Vector3(c.x + 0.6, y, c.z - 0.35),
      new THREE.Vector3(c.x + 0.6, y, c.z + 0.35),
      new THREE.Vector3(c.x - 0.6, y, c.z + 0.35),
    ], new THREE.Vector3(0, 1, 0));
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b241e, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.6), wallMat);
    wall.position.set(0, 1.3, -3.2);
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.room.addSyntheticPlane("wall", "vertical", [
      new THREE.Vector3(-4, 0, -3.2),
      new THREE.Vector3(4, 0, -3.2),
      new THREE.Vector3(4, 2.6, -3.2),
      new THREE.Vector3(-4, 2.6, -3.2),
    ], new THREE.Vector3(0, 0, 1));
    const lamp = new THREE.PointLight(0xffc98a, 6, 6, 1.6);
    lamp.position.set(-1.5, 1.8, -1.5);
    this.scene.add(lamp);
    this.room.setStart(new THREE.Vector3(0, 0, 0));
  }

  updatePreviewCamera(time) {
    const t = time / 1000;
    const yaw = Math.sin(t * 0.18) * 1.4 + Math.sin(t * 0.07) * 0.8;
    this.camera.position.set(0, 1.55, 0.4);
    this.camera.rotation.set(-0.32, yaw, 0, "YXZ");
  }
}
