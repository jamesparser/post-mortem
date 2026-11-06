// Sound for the board. Room tone, a storm far away, and things that sit in the
// wrong places: whispers at each ear and just behind the head, a breath, a
// creak, a groan far to one side. During spelling everything ducks except the
// whispers and the wood of the planchette. The silence between letters is the
// point.

const BoardAudio = (() => {
  let ctx = null;
  let master = null;
  let bedGain = null;
  let whisperGain = null;
  let slideGain = null;
  let slideFilter = null;
  const buffers = {};
  let started = false;
  let timers = [];
  let muted = false;

  const FILES = ["whispers", "breath", "groans", "footsteps-wood", "storm-bed", "thud"];

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 8;
    limiter.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(limiter);
    bedGain = ctx.createGain();
    bedGain.gain.value = 1;
    bedGain.connect(master);
    whisperGain = ctx.createGain();
    whisperGain.gain.value = 0.9;
    whisperGain.connect(master);
    // Treat the listener as sitting at the board, facing it.
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = 0;
      l.positionY.value = 0;
      l.positionZ.value = 0;
    }
    return ctx;
  }

  async function load(name) {
    if (buffers[name]) return buffers[name];
    const res = await fetch("/audio/" + name + ".mp3");
    if (!res.ok) throw new Error("missing " + name);
    const data = await res.arrayBuffer();
    buffers[name] = await new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail));
    return buffers[name];
  }

  function panner(x, y, z) {
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = 0.5;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    return p;
  }

  // Play a slice of a buffer from a place around the head.
  async function play(name, where, volume, options = {}) {
    if (!ctx || muted) return;
    try {
      const buffer = await load(name);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = options.rate || 1;
      const g = ctx.createGain();
      g.gain.value = volume;
      src.connect(g);
      if (where) {
        const p = panner(where[0], where[1], where[2]);
        g.connect(p);
        p.connect(options.bus || bedGain);
      } else {
        g.connect(options.bus || bedGain);
      }
      const offset = options.slice ? Math.random() * Math.max(0, buffer.duration - options.slice) : 0;
      src.start(ctx.currentTime, offset, options.slice || undefined);
    } catch (err) {
      // A missing sound should never stop the seance.
    }
  }

  const PLACES = {
    left: [-0.45, 0.05, 0.05],
    right: [0.45, 0.05, 0.05],
    behind: [0.05, 0.1, 0.5],
    farLeft: [-4, 0, -1],
    farRight: [4, 0, -1],
  };

  function whisper(place) {
    const where = PLACES[place || ["left", "right", "behind"][Math.floor(Math.random() * 3)]];
    play("whispers", where, 0.55, { slice: 1.6 + Math.random() * 1.6, bus: whisperGain, rate: 0.92 + Math.random() * 0.12 });
  }

  function later(fn, min, max) {
    const id = setTimeout(fn, min + Math.random() * (max - min));
    timers.push(id);
  }

  function scheduleAmbience() {
    later(() => {
      const roll = Math.random();
      if (roll < 0.25) whisper();
      else if (roll < 0.45) circle();
      else if (roll < 0.6) play("breath", PLACES.behind, 0.35, { slice: 2 });
      else if (roll < 0.8) play("footsteps-wood", Math.random() < 0.5 ? PLACES.farLeft : PLACES.farRight, 0.3, { slice: 3 });
      else play("groans", Math.random() < 0.5 ? PLACES.farLeft : PLACES.farRight, 0.35);
      scheduleAmbience();
    }, 9000, 22000);
  }

  function roomTone() {
    const size = 2 * ctx.sampleRate;
    const noise = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < size; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(lp);
    lp.connect(g);
    g.connect(bedGain);
    src.start();

    // The planchette's wood on the board: filtered noise that follows its speed.
    const slide = ctx.createBufferSource();
    slide.buffer = noise;
    slide.loop = true;
    slideFilter = ctx.createBiquadFilter();
    slideFilter.type = "bandpass";
    slideFilter.frequency.value = 900;
    slideFilter.Q.value = 0.8;
    slideGain = ctx.createGain();
    slideGain.gain.value = 0;
    slide.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(master);
    slide.start();
  }

  async function start() {
    const c = init();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    if (started) return;
    started = true;
    roomTone();
    try {
      const storm = await load("storm-bed");
      const src = ctx.createBufferSource();
      src.buffer = storm;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.06;
      src.connect(g);
      g.connect(bedGain);
      src.start();
    } catch (err) {
      // Ignore.
    }
    FILES.forEach((f) => load(f).catch(() => {}));
    scheduleAmbience();
  }

  function slide(speed) {
    if (!slideGain) return;
    const level = Math.min(0.09, speed / 9000);
    slideGain.gain.setTargetAtTime(level, ctx.currentTime, 0.04);
    slideFilter.frequency.setTargetAtTime(700 + Math.min(900, speed), ctx.currentTime, 0.05);
  }

  // A soft wooden tick when the window settles on a letter.
  function tick(pan) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan || 0;
      g.connect(p);
      p.connect(master);
    } else {
      g.connect(master);
    }
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // A low pulse in the ear that gets louder as the planchette nears the letter.
  function pulse(near) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(70 + near * 40, now);
    o.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.03 + near * 0.16, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 0.25);
  }

  // Something circles the listener: a whisper or a breath that starts behind
  // one ear and moves slowly around the head.
  async function circle(name) {
    if (!ctx || muted) return;
    const clip = name || (Math.random() < 0.6 ? "whispers" : "breath");
    try {
      const buffer = await load(clip);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = clip === "whispers" ? 0.55 : 0.4;
      const p = panner(0, 0, 0.5);
      src.connect(g);
      g.connect(p);
      p.connect(whisperGain);
      const dur = Math.min(buffer.duration, 3.5 + Math.random() * 2);
      const start = Math.random() * Math.PI * 2;
      const sweep = (Math.random() < 0.5 ? 1 : -1) * Math.PI * (1.2 + Math.random() * 0.6);
      const radius = 0.35 + Math.random() * 0.4;
      const t0 = ctx.currentTime;
      const offset = Math.random() * Math.max(0, buffer.duration - dur);
      src.start(t0, offset, dur);
      const id = setInterval(() => {
        const k = Math.min(1, (ctx.currentTime - t0) / dur);
        const a = start + sweep * k;
        // Angle 0 is directly behind the head.
        const x = Math.sin(a) * radius;
        const z = Math.cos(a) * radius;
        if (p.positionX) {
          p.positionX.setTargetAtTime(x, ctx.currentTime, 0.05);
          p.positionZ.setTargetAtTime(z, ctx.currentTime, 0.05);
          p.positionY.setTargetAtTime(0.05 + Math.sin(k * Math.PI) * 0.1, ctx.currentTime, 0.05);
        } else {
          p.setPosition(x, 0.05, z);
        }
        if (k >= 1) clearInterval(id);
      }, 40);
    } catch (err) {
      // Ignore.
    }
  }

  // A low swell when the board hears the question.
  function swell() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09, now + 1.1);
    g.gain.linearRampToValueAtTime(0, now + 2.6);
    g.connect(master);
    for (const f of [55, 58.3, 82.4]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      o.start(now);
      o.stop(now + 2.7);
    }
  }

  function duck(on) {
    if (!bedGain) return;
    bedGain.gain.setTargetAtTime(on ? 0.12 : 1, ctx.currentTime, 0.25);
  }

  function close() {
    if (!ctx) return;
    timers.forEach(clearTimeout);
    timers = [];
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
  }

  function reopen() {
    if (!ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.4);
    if (started && !timers.length) scheduleAmbience();
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.1);
  }

  return { start, slide, tick, pulse, circle, swell, duck, close, reopen, whisper, play, setMuted };
})();
