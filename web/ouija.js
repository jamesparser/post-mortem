// Main controller. Ask, spell, pull, close.

(() => {
  const input = document.getElementById("question");
  const btnAsk = document.getElementById("btn-ask");
  const btnMic = document.getElementById("btn-mic");
  const caption = document.getElementById("caption");

  let busy = false;
  let spelling = false;
  let glowChar = null;
  let pullEnabled = false;
  let lastTime = performance.now();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setCaption(text) {
    caption.textContent = text || "";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function letterCenter(ch) {
    return Board.centers[ch] || null;
  }

  async function moveTo(ch, speedScale) {
    const target = letterCenter(ch);
    if (!target) return;
    Board.planchette.target = target;
    const steps = reduceMotion ? 80 : 60;
    for (let i = 0; i < steps; i++) {
      await sleep(16);
      Board.springTo(Board.planchette.target, 0.016 * (speedScale || 1));
    }
    glowChar = ch;
    setTimeout(() => {
      if (glowChar === ch) glowChar = null;
    }, 600);
    BoardAudio.tick(target.x < Board.size().W / 2 ? -0.4 : 0.4);
  }

  async function spell(words) {
    spelling = true;
    BoardAudio.duck(true);
    setCaption("");

    const cleaned = words.replace(/\s+/g, " ").trim().toUpperCase();
    const parts = cleaned.split(" ");

    for (let w = 0; w < parts.length; w++) {
      const word = parts[w];
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        if (letterCenter(ch)) {
          await moveTo(ch, 1);
          await sleep(reduceMotion ? 450 : 300 + Math.random() * 600);
        }
      }
      if (w < parts.length - 1) {
        await sleep(reduceMotion ? 500 : 800 + Math.random() * 500);
        const driftRoll = Math.random();
        if (driftRoll < 0.35) {
          const neighbors = "QWERTYASDFGZXCV";
          const wrong = neighbors[Math.floor(Math.random() * neighbors.length)];
          if (letterCenter(wrong)) {
            await moveTo(wrong, 0.6);
            await sleep(400 + Math.random() * 400);
          }
        }
      }
    }

    setCaption(cleaned);
    BoardAudio.duck(false);
    spelling = false;
    if (Math.random() < 0.5) Spirits.flash();
  }

  async function ask() {
    if (busy) return;
    const question = (input.value || "").trim() || "Is anyone there?";
    busy = true;
    setCaption("Listening...");
    BoardAudio.start();

    Board.planchette.target = { x: Board.size().W / 2, y: Board.size().H * 0.52 };
    for (let i = 0; i < 20; i++) {
      Board.springTo(Board.planchette.target, 0.016);
      await sleep(16);
    }

    try {
      const res = await fetch("/api/spirit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      await spell(data.words || "Y E S");
    } catch (err) {
      await spell("G O O D B Y E");
    }
    busy = false;
    input.value = "";
    input.focus();
  }

  async function sayGoodbye() {
    if (busy) return;
    busy = true;
    BoardAudio.start();
    setCaption("Closing the board...");
    await moveTo("GOOD BYE", 0.5);
    BoardAudio.close();
    setCaption("The board is closed. It is not empty.");
    busy = false;
  }

  btnAsk.addEventListener("click", ask);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  });

  btnMic.addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setCaption("Your browser will not listen. Type the question instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    BoardAudio.start();

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      input.value = text.trim();
      setCaption(text.trim());
    };
    rec.onerror = () => {
      setCaption("It did not hear you. Type the question instead.");
    };
    rec.onend = () => {
      if (input.value.trim()) ask();
    };
    rec.start();
  });

  Board.canvas.addEventListener("pointerdown", (e) => {
    pullEnabled = true;
    BoardAudio.start();
    const rect = Board.canvas.getBoundingClientRect();
    Board.jumpTo(e.clientX - rect.left, e.clientY - rect.top);
  });

  Board.canvas.addEventListener("pointerup", () => {
    pullEnabled = false;
  });

  window.addEventListener("pointerup", () => {
    pullEnabled = false;
  });

  Board.canvas.addEventListener("pointermove", (e) => {
    if (!pullEnabled || spelling) return;
    const rect = Board.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = Board.planchette;
    p.x += (x - p.x) * 0.18;
    p.y += (y - p.y) * 0.18;
    p.target = { x, y };
  });

  function loop(now) {
    const dt = Math.min(0.032, (now - lastTime) / 1000);
    lastTime = now;
    if (spelling && Board.planchette.target) {
      Board.springTo(Board.planchette.target, dt);
    }
    Board.frame(glowChar);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.BoardGoodbye = sayGoodbye;

  const goodBar = document.createElement("button");
  goodBar.className = "ghost";
  goodBar.textContent = "Good bye";
  goodBar.addEventListener("click", sayGoodbye);
  document.querySelector(".ask-row").appendChild(goodBar);
})();
