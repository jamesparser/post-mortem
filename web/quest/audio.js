// Spatial audio for the Quest app. HRTF panners follow real positions in the
// room. A compressor and a master ceiling keep peaks gentle, per the scare budget.

import * as THREE from "three";

// The priest plays slower and lower than the raw voice.
export const VOICE_RATE = 0.9;

const FILES = [
  "storm-bed",
  "organ-dirge",
  "nails-tap",
  "scuffle",
  "thud",
  "groans",
  "breath",
  "sting",
  "chime",
  "peek-tone",
  "footsteps-wood",
  "chains",
  "heartbeat",
  "whispers",
];

const forward = new THREE.Vector3();
const up = new THREE.Vector3();
const position = new THREE.Vector3();

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.beds = {};
  }

  async init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -14;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.75;
    this.master.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);
    await this.ctx.resume().catch(() => {});
    await Promise.all(FILES.map((name) => this.load(name).catch(() => null)));
  }

  async load(name) {
    if (this.buffers[name]) return this.buffers[name];
    const res = await fetch("/audio/" + name + ".mp3");
    if (!res.ok) throw new Error("missing " + name);
    const data = await res.arrayBuffer();
    this.buffers[name] = await new Promise((resolve, reject) => this.ctx.decodeAudioData(data, resolve, reject));
    return this.buffers[name];
  }

  updateListener(camera) {
    if (!this.ctx) return;
    camera.getWorldPosition(position);
    camera.getWorldDirection(forward);
    up.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(position.x, t, 0.02);
      l.positionY.setTargetAtTime(position.y, t, 0.02);
      l.positionZ.setTargetAtTime(position.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02);
      l.upY.setTargetAtTime(up.y, t, 0.02);
      l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else {
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  panner(refDistance = 0.6) {
    const p = this.ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = refDistance;
    p.rolloffFactor = 1.2;
    p.maxDistance = 30;
    return p;
  }

  // A positional source that can loop and be moved every frame.
  source(name, options = {}) {
    if (!this.ctx || !this.buffers[name]) return null;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    const pan = this.panner(options.refDistance);
    gain.connect(pan);
    pan.connect(this.master);
    let node = null;
    const engine = this;
    return {
      setPosition(v) {
        if (pan.positionX) {
          const t = engine.ctx.currentTime;
          pan.positionX.setTargetAtTime(v.x, t, 0.03);
          pan.positionY.setTargetAtTime(v.y, t, 0.03);
          pan.positionZ.setTargetAtTime(v.z, t, 0.03);
        } else {
          pan.setPosition(v.x, v.y, v.z);
        }
      },
      setGain(value, time = 0.08) {
        gain.gain.setTargetAtTime(value, engine.ctx.currentTime, time);
      },
      setRate(rate) {
        if (node) node.playbackRate.setTargetAtTime(rate, engine.ctx.currentTime, 0.05);
      },
      start() {
        if (node) return;
        node = engine.ctx.createBufferSource();
        node.buffer = engine.buffers[name];
        node.loop = options.loop !== false;
        node.connect(gain);
        node.start();
      },
      stop() {
        if (!node) return;
        try { node.stop(); } catch (err) { /* already stopped */ }
        node = null;
      },
    };
  }

  oneShot(name, at, volume = 0.6, rate = 1) {
    if (!this.ctx || !this.buffers[name]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[name];
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    if (at) {
      const pan = this.panner();
      if (pan.positionX) {
        pan.positionX.value = at.x;
        pan.positionY.value = at.y;
        pan.positionZ.value = at.z;
      } else {
        pan.setPosition(at.x, at.y, at.z);
      }
      gain.connect(pan);
      pan.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    src.start();
  }

  bed(name, volume, fade = 3) {
    if (!this.ctx || !this.buffers[name]) return;
    let bed = this.beds[name];
    if (!bed) {
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.master);
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      src.loop = true;
      src.connect(gain);
      src.start();
      bed = this.beds[name] = { gain, src };
    }
    bed.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, fade / 3);
  }

  // A long dark reverb tail for the priest, as if the room were stone.
  church() {
    if (this.churchNode) return this.churchNode;
    const n = Math.floor(this.ctx.sampleRate * 3.2);
    const ir = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = ir;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.28;
    conv.connect(wet);
    wet.connect(this.master);
    this.churchNode = conv;
    return conv;
  }

  // Play a voice clip from a point in the room. Resolves when it ends.
  voice(url, at, volume = 1) {
    return new Promise((resolve) => {
      if (!this.ctx) return resolve(false);
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.src = url;
      el.preservesPitch = false;
      el.playbackRate = VOICE_RATE;
      const src = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      const pan = this.panner(1.2);
      if (pan.positionX) {
        pan.positionX.value = at.x;
        pan.positionY.value = at.y;
        pan.positionZ.value = at.z;
      }
      src.connect(gain);
      gain.connect(pan);
      pan.connect(this.master);
      src.connect(this.church());
      el.onended = () => resolve(true);
      el.onerror = () => resolve(false);
      el.play().catch(() => resolve(false));
    });
  }
}
