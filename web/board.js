// The board's controller. Two modes on one board.
// Talk to the dead: the open seance. Anyone asks anything.
// Your dead device: the device you buried answers two to four times, turns
// colder, then the planchette goes to GOOD BYE and will not move again.

(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    modeDead: $("mode-dead"),
    modeDevice: $("mode-device"),
    note: $("mode-note"),
    form: $("device-form"),
    deviceName: $("device-name"),
    deviceCondition: $("device-condition"),
    question: $("question"),
    ask: $("btn-ask"),
    mic: $("btn-mic"),
    goodbye: $("btn-goodbye"),
    mute: $("btn-mute"),
    caption: $("caption"),
    closed: $("closed"),
    closedLine: $("closed-line"),
    again: $("btn-again"),
    canvas: $("board"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    mode: "dead",
    device: null,
    turn: 0,
    maxTurns: 3,
    history: [],
    busy: false,
    locked: false,
    target: null,
    pointerTarget: null,
    guide: null,
    handsOn: false,
    lastInteraction: performance.now(),
    movedAlone: false,
    answered: 0,
    muted: false,
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function caption(text) {
    els.caption.textContent = text || "";
  }

  // Main loop: the spring, the wood sound, the drawing.
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    let target = state.target;
    if (state.handsOn && state.pointerTarget) {
      // It goes only where your finger takes it. No pull.
      target = state.pointerTarget;
    }
    let speed = 0;
    if (target) {
      const t = performance.now() / 1000;
      // Low frequency drift so the glide is never perfectly smooth.
      const wobble = state.busy ? { x: Math.sin(t * 1.7) * 2.2, y: Math.cos(t * 1.3) * 1.6 } : { x: 0, y: 0 };
      speed = Board.step({ x: target.x + wobble.x, y: target.y + wobble.y }, dt);
    }
    BoardAudio.slide(speed);
    Board.frame();
    if (!state.busy && !state.locked) maybeMoveAlone(now);
    requestAnimationFrame(loop);
  }

  async function settle(timeoutMs) {
    const start = performance.now();
    const p = Board.planchette;
    while (performance.now() - start < (timeoutMs || 2200)) {
      await sleep(30);
      const t = state.target;
      if (!t) return;
      if (Math.hypot(t.x - p.x, t.y - p.y) < 2.5 && Math.hypot(p.vx, p.vy) < 25) return;
    }
  }

  function centerOf(key) {
    const c = Board.centers[key];
    return c ? { x: c.x + (Math.random() - 0.5) * 3, y: c.y + (Math.random() - 0.5) * 3 } : null;
  }

  function pulse(ms) {
    try {
      if (state.handsOn && !state.muted && navigator.vibrate) navigator.vibrate(ms);
    } catch (err) {
      // Optional.
    }
  }

  // With a finger on the planchette, the visitor moves it. The board does not
  // say which letter it wants. It tells you by feel: the phone buzzes and a low
  // pulse in the ear beats faster and harder the closer you get.
  async function guided(c) {
    state.guide = c;
    const start = performance.now();
    let nextPulse = 0;
    const p = Board.planchette;
    const reach = Math.max(Board.size().W, Board.size().H) * 0.6;
    let overSince = 0;
    while (state.handsOn) {
      await sleep(30);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      // Right over it: a steady buzz, and held a moment the letter is taken.
      if (d < 16) {
        if (!overSince) overSince = performance.now();
        try {
          if (!state.muted && navigator.vibrate) navigator.vibrate(60);
        } catch (err) {
          // Optional.
        }
        BoardAudio.pulse(1);
        if (performance.now() - overSince > 550) break;
        continue;
      }
      overSince = 0;
      const near = Math.max(0, 1 - d / reach);
      const now = performance.now();
      if (now > nextPulse) {
        BoardAudio.pulse(near);
        try {
          if (!state.muted && navigator.vibrate) navigator.vibrate(Math.round(8 + near * 45));
        } catch (err) {
          // Optional.
        }
        nextPulse = now + 720 - near * 600;
      }
    }
    state.guide = null;
    const arrived = Math.hypot(c.x - p.x, c.y - p.y) < 16;
    if (arrived) {
      try {
        if (!state.muted && navigator.vibrate) navigator.vibrate(80);
      } catch (err) {
        // Optional.
      }
    }
    return arrived;
  }

  async function landOn(key) {
    const c = centerOf(key);
    if (!c) return;
    if (state.handsOn && (await guided(c))) {
      Board.mark(key);
      BoardAudio.tick((c.x / Board.size().W - 0.5) * 1.4);
      return;
    }
    // Hands off, or the visitor lost the trail: it moves on its own.
    state.target = c;
    await settle();
    Board.mark(key);
    BoardAudio.tick((c.x / Board.size().W - 0.5) * 1.4);
    pulse(18);
  }

  // A false start toward a neighbouring letter, then the correction.
  async function falseStart(key) {
    const order = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const i = order.indexOf(key);
    if (i < 0) return;
    const wrong = order[Math.max(0, Math.min(order.length - 1, i + (Math.random() < 0.5 ? -1 : 1)))];
    const a = centerOf(wrong);
    const b = Board.planchette;
    if (!a) return;
    state.target = { x: b.x + (a.x - b.x) * 0.8, y: b.y + (a.y - b.y) * 0.8 };
    await settle(1200);
    await sleep(450 + Math.random() * 450);
  }

  function tokens(words) {
    const out = [];
    const parts = words.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    for (let w = 0; w < parts.length; w += 1) {
      const word = parts[w];
      // YES and NO have their own places, but only when they are the whole answer.
      if ((word === "YES" || word === "NO") && parts.length === 1) out.push({ key: word, word: true });
      else if (word === "GOODBYE") out.push({ key: "GOOD BYE", word: true });
      else for (const ch of word) out.push({ key: ch });
      if (w < parts.length - 1) out.push({ gap: true });
    }
    return out;
  }

  async function spell(words) {
    const list = tokens(words);
    const letterCount = list.filter((t) => t.key).length;
    // One or two false starts per answer, never more.
    const falseAt = new Set();
    const wanted = letterCount > 3 ? 1 + (Math.random() < 0.4 ? 1 : 0) : Math.random() < 0.5 ? 1 : 0;
    while (falseAt.size < wanted) falseAt.add(1 + Math.floor(Math.random() * Math.max(1, letterCount - 1)));
    BoardAudio.duck(true);
    let shown = "";
    let n = 0;
    for (const t of list) {
      if (t.gap) {
        shown += "   ";
        await sleep(reduceMotion ? 700 : 900 + Math.random() * 700);
        continue;
      }
      n += 1;
      if (falseAt.has(n) && !t.word && !state.handsOn) await falseStart(t.key);
      await landOn(t.key);
      shown += (t.word ? t.key : t.key + " ");
      caption(shown.trim());
      await sleep(reduceMotion ? 700 : 300 + Math.random() * 600);
    }
    BoardAudio.duck(false);
    return shown.trim();
  }

  async function goHome() {
    state.target = Board.homePoint();
    await settle(2500);
  }

  function setBusy(b) {
    state.busy = b;
    els.ask.disabled = b || state.locked;
    els.goodbye.disabled = b;
  }

  async function ask() {
    if (state.busy || state.locked) return;
    if (state.mode === "device" && !state.device) {
      els.deviceName.focus();
      return;
    }
    const question = els.question.value.trim() || "Is anyone there?";
    state.lastInteraction = performance.now();
    setBusy(true);
    BoardAudio.start();
    caption("");
    // The board hears it before it answers. A shiver and a low swell.
    BoardAudio.swell();
    Board.planchette.shiver = reduceMotion ? 0 : 2.4;
    const answerPromise = fetchAnswer(question);
    await sleep(1300);
    Board.planchette.shiver = 0;
    await sleep(600);
    const words = await answerPromise;
    const spelled = await spell(words);
    state.history.push({ q: question, a: String(words) });
    state.answered += 1;
    els.question.value = "";
    // Then it says the answer, low, from just behind you.
    await BoardAudio.speak(String(words).toLowerCase(), "behind");
    if (Math.random() < 0.6) Spirits.flash();
    if (Math.random() < 0.45) BoardAudio.circle();

    if (state.mode === "device" && state.turn >= state.maxTurns) {
      await sleep(1400);
      await departs();
      setBusy(false);
      return;
    }
    await sleep(1200);
    await goHome();
    setBusy(false);
    state.lastInteraction = performance.now();
    els.question.focus();
  }

  async function fetchAnswer(question) {
    const body = { question, mode: state.mode, history: state.history.slice(-4) };
    if (state.mode === "device") {
      state.turn += 1;
      body.deviceName = state.device.name;
      body.condition = state.device.condition;
      body.turn = state.turn;
      body.final = state.turn >= state.maxTurns;
    }
    try {
      const res = await fetch("/api/spirit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data.words || "NO";
    } catch (err) {
      return "NOT NOW";
    }
  }

  // The device leaves. The planchette goes to GOOD BYE and stays there.
  async function departs() {
    caption("");
    state.target = centerOf("GOOD BYE");
    await sleep(reduceMotion ? 300 : 900);
    await settle(3500);
    Board.mark("GOOD BYE");
    BoardAudio.tick(0);
    caption("GOOD BYE");
    state.locked = true;
    els.ask.disabled = true;
    els.question.disabled = true;
    await sleep(1600);
    els.note.textContent = "It has gone. The planchette will not move again.";
    els.again.textContent = "Light the board again";
    showClosed("It has gone. The board will not move for it again.");
  }

  // Close the board: slide to GOOD BYE, the lamp dies, the room goes quiet.
  async function closeBoard() {
    if (state.busy) return;
    setBusy(true);
    BoardAudio.start();
    caption("");
    state.target = centerOf("GOOD BYE");
    await settle(3500);
    Board.mark("GOOD BYE");
    BoardAudio.close();
    const steps = 40;
    for (let i = 1; i <= steps; i += 1) {
      Board.setLight(1 - i / steps);
      await sleep(reduceMotion ? 10 : 55);
    }
    await sleep(1500);
    showClosed("The board is closed. It is not empty.");
    setBusy(false);
  }

  function showClosed(line) {
    els.closedLine.textContent = line;
    els.closed.hidden = false;
  }

  function relight() {
    els.closed.hidden = true;
    Board.reset();
    BoardAudio.reopen();
    state.locked = false;
    state.turn = 0;
    state.history = [];
    state.maxTurns = 2 + Math.floor(Math.random() * 3);
    els.question.disabled = false;
    els.ask.disabled = false;
    caption("");
    setMode(state.mode, true);
    goHome();
  }

  // Once per visit, it moves when nobody is touching it.
  function maybeMoveAlone(now) {
    if (state.movedAlone || state.handsOn || state.answered < 1) return;
    if (now - state.lastInteraction < 22000) return;
    state.movedAlone = true;
    (async () => {
      setBusy(true);
      BoardAudio.whisper("behind");
      await sleep(900);
      state.target = centerOf(Math.random() < 0.5 ? "YES" : "NO");
      await settle(4000);
      await sleep(1800);
      await goHome();
      setBusy(false);
      state.lastInteraction = performance.now();
    })();
  }

  function departedFromLink() {
    const params = new URLSearchParams(location.search);
    let name = params.get("device") || "";
    let condition = params.get("condition") || "";
    if (!name) {
      try {
        const saved = JSON.parse(sessionStorage.getItem("pm-departed") || "null");
        if (saved && saved.name) {
          name = saved.name;
          condition = saved.condition || "";
        }
      } catch (err) {
        // Ignore.
      }
    }
    if (!name) {
      try {
        name = localStorage.getItem("pm-last-buried") || "";
      } catch (err) {
        // Ignore.
      }
    }
    name = name.trim().slice(0, 80);
    if (!name || /^a beloved device$/i.test(name)) return null;
    return { name, condition: condition.trim().slice(0, 80) };
  }

  function setMode(mode, keepDevice) {
    state.mode = mode;
    els.modeDead.setAttribute("aria-selected", String(mode === "dead"));
    els.modeDevice.setAttribute("aria-selected", String(mode === "device"));
    state.turn = 0;
    state.history = [];
    if (!keepDevice) state.maxTurns = 2 + Math.floor(Math.random() * 3);
    if (mode === "dead") {
      els.form.hidden = true;
      els.note.textContent = "The board is open. Ask it anything.";
      els.question.placeholder = "Is anyone there?";
      return;
    }
    if (!state.device) state.device = departedFromLink();
    if (!state.device) {
      els.form.hidden = false;
      els.note.textContent = "Name the device you buried, and what took it.";
      return;
    }
    els.form.hidden = true;
    els.note.textContent = "The departed: " + state.device.name + ". It will not stay long.";
    els.question.placeholder = "Do you know who I am?";
  }

  // Hands on the planchette. It follows the finger with a little lag.
  function local(e) {
    const r = els.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  let hinted = false;
  els.canvas.addEventListener("pointerdown", (e) => {
    BoardAudio.start();
    state.lastInteraction = performance.now();
    const p = local(e);
    const pl = Board.planchette;
    if (Math.hypot(p.x - pl.x, p.y - pl.y) > 70) return;
    state.handsOn = true;
    pl.hands = true;
    if (!hinted) {
      hinted = true;
      document.getElementById("hint").textContent = "Keep your finger on it. It will not tell you the letter. Feel for it, and listen.";
    }
    els.canvas.setPointerCapture(e.pointerId);
    state.pointerTarget = p;
    if (!state.target) state.target = { x: pl.x, y: pl.y };
  });

  els.canvas.addEventListener("pointermove", (e) => {
    if (!state.handsOn) return;
    state.lastInteraction = performance.now();
    const p = local(e);
    const prev = state.pointerTarget || p;
    // Lag, and a slight pull of its own.
    state.pointerTarget = { x: prev.x + (p.x - prev.x) * 0.35 + 1.2, y: prev.y + (p.y - prev.y) * 0.35 };
  });

  const release = () => {
    state.handsOn = false;
    Board.planchette.hands = false;
    if (!state.busy) state.target = { x: Board.planchette.x, y: Board.planchette.y };
  };
  els.canvas.addEventListener("pointerup", release);
  els.canvas.addEventListener("pointercancel", release);

  els.ask.addEventListener("click", ask);
  els.question.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  });
  els.goodbye.addEventListener("click", closeBoard);
  els.again.addEventListener("click", relight);
  els.modeDead.addEventListener("click", () => {
    if (!state.busy) setMode("dead");
  });
  els.modeDevice.addEventListener("click", () => {
    if (!state.busy) setMode("device");
  });
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.deviceName.value.trim();
    if (!name) return;
    state.device = { name, condition: els.deviceCondition.value.trim() };
    setMode("device", true);
    BoardAudio.start();
    els.question.focus();
  });
  els.mute.addEventListener("click", () => {
    state.muted = !state.muted;
    BoardAudio.setMuted(state.muted);
    els.mute.textContent = state.muted ? "Unmute" : "Mute";
  });

  els.mic.addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      listenWithServer();
      return;
    }
    BoardAudio.start();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    caption("Listening");
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      els.question.value = text.trim();
      caption(text.trim());
    };
    rec.onerror = () => caption("It did not hear you. Type the question.");
    rec.onend = () => {
      if (els.question.value.trim()) ask();
    };
    try {
      rec.start();
    } catch (err) {
      caption("It did not hear you. Type the question.");
    }
  });

  // Browsers without speech recognition record a few seconds and the server
  // turns it into text.
  async function listenWithServer() {
    BoardAudio.start();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      caption("It cannot hear you. Type the question.");
      return;
    }
    if (!window.MediaRecorder) {
      caption("It cannot hear you here. Type the question.");
      return;
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
    const chunks = [];
    const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    caption("Listening");
    rec.start();
    await sleep(5000);
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
    try {
      const res = await fetch("/api/listen", { method: "POST", headers: { "Content-Type": blob.type.split(";")[0] }, body: blob });
      const text = String((await res.json()).text || "").trim();
      if (!text) {
        caption("It did not hear you. Type the question.");
        return;
      }
      els.question.value = text;
      caption(text);
      ask();
    } catch (err) {
      caption("It did not hear you. Type the question.");
    }
  }

  // Start in the mode the link asked for.
  const params = new URLSearchParams(location.search);
  setMode(params.get("mode") === "device" ? "device" : "dead");
  state.target = Board.homePoint();
  requestAnimationFrame(loop);
  window.BoardState = state;
})();
