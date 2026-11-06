// POST-Mortem web client.
// States: idle, naming, recognizing, writing, speaking, lowering, done.

const VOICE_RATE = 0.9;

const state = {
  name: "",
  make: "",
  model: "",
  condition: "",
  eulogy: "",
  audio: null,
  muted: false,
  running: false,
  petalsRunning: false,
  petals: true,
};

const els = {
  name: document.getElementById("device-name"),
  plate: document.getElementById("plate-name"),
  inputName: document.getElementById("input-name"),
  inputPhoto: document.getElementById("input-photo"),
  photoNote: document.getElementById("photo-note"),
  panelName: document.getElementById("panel-name"),
  panelService: document.getElementById("panel-service"),
  panelDone: document.getElementById("panel-done"),
  eulogy: document.getElementById("eulogy"),
  casket: document.getElementById("casket"),
  grave: document.getElementById("grave"),
  btnPhoto: document.getElementById("btn-photo"),
  btnBegin: document.getElementById("btn-begin"),
  btnReplay: document.getElementById("btn-replay"),
  btnMute: document.getElementById("btn-mute"),
  btnAgain: document.getElementById("btn-again"),
  petals: document.getElementById("petals"),
};

function show(panel) {
  [els.panelName, els.panelService, els.panelDone].forEach((p) => {
    p.hidden = p !== panel;
  });
}

function setDeviceName(text) {
  const clean = (text || "your device").trim() || "your device";
  els.name.textContent = clean;
  els.plate.textContent = clean;
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(path + " failed: " + res.status);
  return res;
}

async function recognize(file) {
  const dataUrl = await fileToDataUrl(file);
  const res = await post("/api/recognize", { image: dataUrl });
  return res.json();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function writeEulogy() {
  const res = await post("/api/eulogy", {
    description: state.name,
    make: state.make,
    model: state.model,
    condition: state.condition,
  });
  const data = await res.json();
  return data.text || "";
}

async function speak(text) {
  const res = await post("/api/speak", { text });
  const blob = await res.blob();
  if (!blob.size || !/audio/.test(blob.type)) throw new Error("no audio");
  return URL.createObjectURL(blob);
}

// Fallback voice. The browser speaks low and slow if Deepgram is not reachable.
function speakWithBrowser(text) {
  const synth = window.speechSynthesis;
  if (!synth || state.muted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const male = voices.find((v) => /en/i.test(v.lang) && /male|daniel|george|arthur|fred|alex|guy|david/i.test(v.name));
    if (male) utter.voice = male;
    utter.rate = 0.82;
    utter.pitch = 0.6;
    utter.volume = 0.9;
    utter.onend = () => resolve(true);
    utter.onerror = () => resolve(false);
    synth.speak(utter);
    setTimeout(() => resolve(true), 90000);
  });
}

// Reveal text word by word across roughly totalMs, so it keeps pace with the voice.
function revealText(target, text, totalMs) {
  target.textContent = "";
  const words = text.split(/\s+/).filter(Boolean);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !words.length) {
    target.textContent = text;
    return Promise.resolve();
  }
  const perWord = Math.max(40, (totalMs || words.length * 380) / words.length);
  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      i += 1;
      target.textContent = words.slice(0, i).join(" ");
      if (i < words.length) {
        const last = words[i - 1];
        const pause = /[.!?]$/.test(last) ? perWord * 1.6 : perWord;
        setTimeout(tick, pause);
      } else {
        resolve();
      }
    };
    tick();
  });
}

function audioDurationMs(audio) {
  return new Promise((resolve) => {
    if (audio.duration && isFinite(audio.duration)) return resolve(audio.duration * 1000);
    audio.addEventListener("loadedmetadata", () => resolve((audio.duration || 0) * 1000 || null), { once: true });
    audio.addEventListener("error", () => resolve(null), { once: true });
    setTimeout(() => resolve(null), 3000);
  });
}

async function runService() {
  if (state.running) return;
  state.running = true;
  els.btnBegin.disabled = true;
  await Sound.unlock();
  Sound.startRoom();
  Sound.startOrgan();

  const typed = els.inputName.value.trim();
  state.name = typed || "a beloved device";
  setDeviceName(state.name);
  try {
    if (typed) localStorage.setItem("pm-last-buried", typed);
  } catch (err) {
    // Storage blocked. Nothing to remember.
  }

  show(els.panelService);
  els.eulogy.textContent = "";

  try {
    state.eulogy = await writeEulogy();
  } catch (err) {
    state.eulogy =
      "He was a good device. His life simply ran out. He is survived by his charger, which he never used again.";
  }

  startPetals();

  let audioUrl = null;
  try {
    audioUrl = await speak(state.eulogy);
  } catch (err) {
    audioUrl = null;
  }

  // The pause before the priest speaks is part of the service.
  await delay(1400);

  if (audioUrl) {
    state.audio = new Audio(audioUrl);
    state.audio.muted = state.muted;
    // Slower and lower than the raw voice: a priest who has buried too many phones.
    state.audio.preservesPitch = false;
    state.audio.playbackRate = VOICE_RATE;
    Sound.attachVoice(state.audio);
    Sound.duck(true);
    const duration = await audioDurationMs(state.audio);
    const reveal = revealText(els.eulogy, state.eulogy, duration ? (duration / VOICE_RATE) * 0.92 : null);
    try {
      await state.audio.play();
      await waitFor(state.audio);
    } catch (err) {
      // Autoplay or playback failed. The text still arrives.
    }
    await reveal;
    Sound.duck(false);
  } else {
    Sound.duck(true);
    const spoken = speakWithBrowser(state.eulogy);
    await revealText(els.eulogy, state.eulogy, null);
    await spoken;
    Sound.duck(false);
    await delay(900);
  }

  await delay(1800);
  await lowerAndListen();
  Sound.settle();
  rememberDeparted();
  show(els.panelDone);
  state.running = false;
  els.btnBegin.disabled = false;
}

// The ending. Chains lower the casket. Silence. Then a muffled heartbeat from
// the ground, three or four times, like something trying to get out. On phones
// that allow it, the phone beats in the same rhythm. Then nothing, for good.
async function lowerAndListen() {
  Sound.hush();
  Sound.playOnce("chains", "front", 1);
  els.casket.classList.add("lowered");
  await delay(6200);
  els.grave.hidden = false;
  Sound.playOnce("thud", "front", 0.7);
  // The silence is load bearing. Do not fill it.
  await delay(3200);
  const beats = 3 + (Math.random() < 0.5 ? 1 : 0);
  const period = 1050;
  Sound.heartbeat(beats, period / 1000);
  try {
    if (!state.muted && navigator.vibrate) {
      const pattern = [];
      for (let i = 0; i < beats; i += 1) pattern.push(70, 190, 90, period - 350);
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Vibration is optional.
  }
  for (let i = 0; i < beats; i += 1) {
    els.grave.classList.add("beat");
    setTimeout(() => els.grave.classList.remove("beat"), 420);
    await delay(period);
  }
  await delay(2600);
}

// Remember the departed, so the spirit board can reach it if the visitor
// chooses to go there from the gate.
function rememberDeparted() {
  try {
    sessionStorage.setItem("pm-departed", JSON.stringify({ name: state.name, condition: state.condition }));
  } catch (err) {
    // Storage blocked. The board will ask for the name instead.
  }
}

function waitFor(audio) {
  return new Promise((resolve) => {
    audio.onended = resolve;
    audio.onerror = resolve;
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startPetals() {
  if (!state.petals || state.petalsRunning) return;
  state.petalsRunning = true;
  const canvas = els.petals;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const petals = Array.from({ length: 36 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 2 + Math.random() * 3,
    vy: 0.4 + Math.random() * 0.9,
    vx: -0.3 + Math.random() * 0.6,
    a: 0.25 + Math.random() * 0.45,
    rot: Math.random() * Math.PI,
  }));

  const draw = () => {
    if (document.hidden) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of petals) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.01;
      if (p.y > window.innerHeight + 10) {
        p.y = -10;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(200, 162, 74, " + p.a + ")";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(draw);
  };
  draw();
}

els.btnPhoto.addEventListener("click", () => els.inputPhoto.click());

els.inputPhoto.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  els.photoNote.hidden = false;
  els.photoNote.textContent = "Looking at it...";
  try {
    const info = await recognize(file);
    state.make = info.make || "";
    state.model = info.model || "";
    state.condition = info.condition || "";
    const label = [state.make, state.model].filter(Boolean).join(" ").trim();
    if (label) {
      els.inputName.value = label + (state.condition ? ", " + state.condition : "");
      setDeviceName(els.inputName.value);
    }
    els.photoNote.textContent = "We see it. You can still edit the name above.";
  } catch (err) {
    els.photoNote.textContent =
      "We could not see it clearly. We will remember it as you described.";
  }
});

els.btnBegin.addEventListener("click", () => {
  runService();
});

els.inputName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runService();
});

els.btnReplay.addEventListener("click", async () => {
  if (state.audio) {
    try {
      await state.audio.play();
    } catch (err) {
      // Ignore.
    }
  } else if (state.eulogy) {
    await revealText(els.eulogy, state.eulogy, 20);
  }
});

els.btnMute.addEventListener("click", () => {
  state.muted = !state.muted;
  if (state.audio) state.audio.muted = state.muted;
  Sound.setMuted(state.muted);
  if (state.muted && window.speechSynthesis) window.speechSynthesis.cancel();
  els.btnMute.textContent = state.muted ? "Unmute" : "Mute";
});

els.btnAgain.addEventListener("click", () => {
  if (state.audio) {
    state.audio.pause();
    state.audio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  Sound.reset();
  els.casket.classList.remove("lowered");
  els.grave.hidden = true;
  els.inputName.value = "";
  els.photoNote.hidden = true;
  setDeviceName("your device");
  show(els.panelName);
});

show(els.panelName);
