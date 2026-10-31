// Room tone, whispers, groans, and ducking. WebAudio.

const BoardAudio = (() => {
  let ctx = null;
  let master = null;
  let roomGain = null;
  let whisperGain = null;
  let started = false;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    roomGain = ctx.createGain();
    roomGain.gain.value = 0.05;
    roomGain.connect(master);

    whisperGain = ctx.createGain();
    whisperGain.gain.value = 0.25;
    whisperGain.connect(master);

    return ctx;
  }

  function start() {
    const c = init();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    if (started) return;
    started = true;

    const bufferSize = 2 * c.sampleRate;
    const noise = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    src.connect(lp);
    lp.connect(roomGain);
    src.start();

    scheduleGroan();
    scheduleWhisper();
  }

  function scheduleGroan() {
    if (!ctx) return;
    const delay = 6000 + Math.random() * 12000;
    setTimeout(() => {
      groan();
      scheduleGroan();
    }, delay);
  }

  function scheduleWhisper() {
    if (!ctx) return;
    const delay = 9000 + Math.random() * 18000;
    setTimeout(() => {
      whisper(Math.random() > 0.5 ? -1 : 1);
      scheduleWhisper();
    }, delay);
  }

  function tone(freq, dur, gainValue, pan, filterFreq) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    g.gain.value = 0;
    osc.connect(g);

    let node = g;
    if (filterFreq) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filterFreq;
      g.connect(f);
      node = f;
    }
    if (panner) {
      panner.pan.value = pan || 0;
      node.connect(panner);
      panner.connect(whisperGain);
    } else {
      node.connect(whisperGain);
    }

    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(gainValue, now + 0.08);
    g.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function groan() {
    tone(70 + Math.random() * 30, 2.4, 0.05, Math.random() > 0.5 ? -0.8 : 0.8, 240);
  }

  function whisper(side) {
    tone(2400 + Math.random() * 900, 1.6, 0.018, side * 0.95, 3200);
  }

  function tick(pan) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = "square";
    osc.frequency.value = 1600 + Math.random() * 400;
    g.gain.value = 0.012;
    osc.connect(g);
    if (panner) {
      panner.pan.value = pan || 0;
      g.connect(panner);
      panner.connect(master);
    } else {
      g.connect(master);
    }
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.012, now + 0.005);
    g.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function duck(on) {
    if (!roomGain) return;
    const target = on ? 0.015 : 0.05;
    roomGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.4);
  }

  function close() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.linearRampToValueAtTime(0, now + 1.6);
  }

  return { start, tick, duck, close, whisper };
})();
