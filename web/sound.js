// POST-Mortem sound bed for the web funeral.
// One AudioContext. Storm and organ loops, rare footsteps and groans,
// and a voice bus that ducks the organ while the priest speaks.

const Sound = (() => {
  const LEVELS = {
    storm: 0.2,
    organAlone: 0.5,
    organUnderVoice: 0.22,
    voice: 1.0,
    ambient: 0.12,
    fx: 0.75,
  };
  const FADE = 0.4;

  let ctx = null;
  let master = null;
  let organGain = null;
  let stormGain = null;
  let voiceGain = null;
  let ambientGain = null;
  let fxGain = null;
  const buffers = {};
  const loops = {};
  let ambientTimer = null;
  let muted = false;

  function supported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  function unlock() {
    if (!supported()) return Promise.resolve(false);
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      organGain = bus(0);
      stormGain = bus(0);
      voiceGain = bus(LEVELS.voice);
      ambientGain = bus(LEVELS.ambient);
      fxGain = bus(LEVELS.fx);
    }
    return ctx.resume().then(() => true).catch(() => false);
  }

  function bus(level) {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(master);
    return g;
  }

  async function load(name) {
    if (buffers[name]) return buffers[name];
    const res = await fetch("/audio/" + name + ".mp3");
    if (!res.ok) throw new Error("missing audio " + name);
    const data = await res.arrayBuffer();
    buffers[name] = await new Promise((resolve, reject) =>
      ctx.decodeAudioData(data, resolve, reject)
    );
    return buffers[name];
  }

  function fadeTo(gainNode, value, seconds) {
    if (!gainNode) return;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(value, now + (seconds ?? FADE));
  }

  async function startLoop(name, target) {
    if (!ctx || loops[name]) return;
    try {
      const buffer = await load(name);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(target);
      src.start();
      loops[name] = src;
    } catch (err) {
      // A missing loop should never stop the service.
    }
  }

  // target: a gain node, "front" for a centred effect, or empty for ambience.
  async function playOnce(name, target, rate) {
    if (!ctx) return;
    if (target === "front") {
      try {
        const buffer = await load(name);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate || 1;
        src.connect(fxGain);
        src.start();
      } catch (err) {
        // Ignore.
      }
      return;
    }
    try {
      const buffer = await load(name);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate || 1;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 1.6 - 0.8;
        src.connect(pan);
        pan.connect(target || ambientGain);
      } else {
        src.connect(target || ambientGain);
      }
      src.start();
    } catch (err) {
      // Ignore.
    }
  }

  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    const wait = 9000 + Math.random() * 14000;
    ambientTimer = setTimeout(() => {
      const pick = Math.random() < 0.65 ? "footsteps-wood" : "groans";
      playOnce(pick, ambientGain, 0.92 + Math.random() * 0.12);
      scheduleAmbient();
    }, wait);
  }

  async function startRoom() {
    if (!ctx) return;
    startLoop("storm-bed", stormGain);
    fadeTo(stormGain, LEVELS.storm, 2.5);
    scheduleAmbient();
  }

  async function startOrgan() {
    if (!ctx) return;
    await startLoop("organ-dirge", organGain);
    fadeTo(organGain, LEVELS.organAlone, 3);
  }

  function duck(on) {
    if (!ctx) return;
    fadeTo(organGain, on ? LEVELS.organUnderVoice : LEVELS.organAlone);
  }

  // Route an <audio> element through the voice bus so ducking stays smooth.
  // A stone church: a long, dark reverb tail built from decaying noise.
  let church = null;
  function churchReverb() {
    if (church) return church;
    const seconds = 3.2;
    const n = Math.floor(ctx.sampleRate * seconds);
    const ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2600;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    conv.connect(lowpass);
    lowpass.connect(wet);
    wet.connect(voiceGain);
    church = conv;
    return church;
  }

  function attachVoice(audioEl) {
    if (!ctx || !audioEl || audioEl.dataset.routed) return;
    try {
      const src = ctx.createMediaElementSource(audioEl);
      src.connect(voiceGain);
      src.connect(churchReverb());
      audioEl.dataset.routed = "1";
    } catch (err) {
      // Fall back to the element playing on its own.
    }
  }

  // Quiet the room for the lowering, so the heartbeat lands in near silence.
  function hush() {
    if (!ctx) return;
    clearTimeout(ambientTimer);
    fadeTo(organGain, 0, 3);
    fadeTo(stormGain, LEVELS.storm * 0.35, 3);
  }

  // Lub dub from under the ground, on the audio clock so it stays steady.
  async function heartbeat(count, period) {
    if (!ctx) return;
    try {
      const buffer = await load("heartbeat");
      const start = ctx.currentTime + 0.05;
      for (let i = 0; i < count; i += 1) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        // Each beat a little weaker. It is losing.
        g.gain.value = 1 - i * 0.12;
        src.connect(g);
        g.connect(fxGain);
        src.start(start + i * period);
      }
    } catch (err) {
      // Ignore.
    }
  }

  function settle() {
    if (!ctx) return;
    fadeTo(organGain, 0, 6);
    fadeTo(stormGain, LEVELS.storm * 0.7, 6);
    scheduleAmbient();
  }

  function reset() {
    if (!ctx) return;
    const organ = loops["organ-dirge"];
    if (organ) {
      try { organ.stop(); } catch (err) { /* already stopped */ }
      delete loops["organ-dirge"];
    }
    organGain.gain.value = 0;
  }

  function setMuted(value) {
    muted = value;
    if (master) fadeTo(master, muted ? 0 : 1, 0.25);
  }

  return { unlock, startRoom, startOrgan, duck, attachVoice, hush, heartbeat, settle, reset, setMuted, playOnce };
})();
