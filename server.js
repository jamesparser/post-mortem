// POST-Mortem backend.
// Serves the web app and the Quest WebXR app, and proxies four calls:
// recognize, eulogy, speak, spirit. Keys never leave this process.

const path = require("path");
const fs = require("fs");

loadEnvFile(path.join(__dirname, ".env"));

const express = require("express");

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use("/audio", express.static(path.join(__dirname, "audio"), { maxAge: "7d" }));
app.use(express.static(path.join(__dirname, "web")));

const PORT = process.env.PORT || 3000;

// Defaults point at the Nebius Token Factory and Deepgram, so a host only needs
// the keys. Every value can still be overridden by an env var.
const NEBIUS = "https://api.tokenfactory.nebius.com/v1";
const config = {
  llmBaseUrl: process.env.LLM_BASE_URL || NEBIUS,
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "google/gemma-3-27b-it",
  visionBaseUrl: process.env.VISION_BASE_URL || process.env.LLM_BASE_URL || NEBIUS,
  visionApiKey: process.env.VISION_API_KEY || process.env.LLM_API_KEY || "",
  visionModel: process.env.VISION_MODEL || "openbmb/MiniCPM-V-4_5",
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
  deepgramVoice: process.env.DEEPGRAM_VOICE || "aura-2-zeus-en",
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(file);
    return;
  }
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const EULOGY_SYSTEM = [
  "You are a parish priest delivering a eulogy for a consumer device.",
  "Write 80 to 140 words.",
  "Open solemn. Close solemn.",
  "Include at least one specific detail about the device, its model, or its damage.",
  "Land the comedy in the details, not in the framing. Never wink at the reader.",
  "No emoji. No meta commentary. No mention that you are an AI.",
  "Never use em dash, en dash, or double hyphen. Use a period or a comma.",
  "Never use the internet sense of the word rip.",
].join(" ");

const FEW_SHOT = [
  {
    role: "user",
    content: "A iPhone 12 with a cracked screen and a swollen battery.",
  },
  {
    role: "assistant",
    content:
      "Dearly beloved, we are gathered to commit this phone to the ground. He was a good phone. His life simply ran out. Though his screen was cracked, his spirit was unbroken. Mostly. The battery swelled in his final season, and he never complained. He is survived by his charger, which he never used again. In lieu of flowers, the family asks that you silence your phones. Especially this one. Ashes to ashes. Dust to dust. Glass to glass.",
  },
  {
    role: "user",
    content: "A Kindle from college, screen fogged, power button stuck.",
  },
  {
    role: "assistant",
    content:
      "Dearly beloved, we commit this reader to the ground. He died before his time. Or perhaps exactly at it. His power button thought so. He carried a thousand stories and never once asked to be the hero of one. The fog on his screen was the fog on all of us. He is survived by a case that has lost its purpose. May he rest, where he may not be asked to update one more time.",
  },
  {
    role: "user",
    content: "A PS4 controller with stick drift.",
  },
  {
    role: "assistant",
    content:
      "Dearly beloved, we commit this controller to the ground. He was steady in all things but one. The drift took him slowly, then all at once. He gave his springs for our comfort. He held the line in every boss fight except the last one. He is survived by a headset that will never hear his clicks again. Ashes to ashes. Dust to dust. Drift to drift.",
  },
];

function hasChatModel() {
  return Boolean(config.llmBaseUrl && config.llmApiKey && config.llmModel);
}

function hasVisionModel() {
  return Boolean(config.visionBaseUrl && config.visionApiKey && config.visionModel);
}

async function chatWith(endpoint, messages, options) {
  if (!endpoint.baseUrl || !endpoint.apiKey) {
    throw new Error("model endpoint not configured");
  }
  const res = await fetch(endpoint.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + endpoint.apiKey,
    },
    body: JSON.stringify({
      model: endpoint.model,
      messages,
      temperature: (options && options.temperature) ?? 0.8,
      max_tokens: (options && options.maxTokens) || 400,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error("chat failed: " + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function chat(messages, options) {
  return chatWith(
    { baseUrl: config.llmBaseUrl, apiKey: config.llmApiKey, model: config.llmModel },
    messages,
    options
  );
}

function visionChat(messages) {
  return chatWith(
    { baseUrl: config.visionBaseUrl, apiKey: config.visionApiKey, model: config.visionModel },
    messages,
    { temperature: 0.1, maxTokens: 200 }
  );
}

function cleanText(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[\u2014\u2013]/g, ",")
    .replace(/-{2,}/g, ",")
    .replace(/[*_#`]/g, "")
    .replace(/\s+([,.!?;])/g, "$1")
    .replace(/([.!?;])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function wordCount(text) {
  return String(text || "").split(/\s+/).filter(Boolean).length;
}

function trimToSentences(text, maxWords) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let out = "";
  for (const s of sentences) {
    if (wordCount(out + s) > maxWords) break;
    out += s;
  }
  return (out || text).trim();
}

// Offline eulogy. Used when no model is configured or the model fails.
// It still carries the device facts so the service never feels generic.
function offlineEulogy(facts) {
  const raw = (facts.name || "").trim();
  const name = !raw
    ? "this device"
    : /^(a|an|the|my|our|this|his|her|their)\s/i.test(raw)
      ? raw.replace(/^(a|an|my|our)\s/i, "this ")
      : "this " + raw;
  const kind = guessKind(name + " " + (facts.model || ""));
  const condition = facts.condition || "";
  const lines = [
    "Dearly beloved, we are gathered to commit " + name + " to the ground.",
    "He was a good " + kind + ". His life simply ran out.",
  ];
  if (condition) {
    lines.push("In his final season he bore " + condition + ", and he never once complained.");
  } else {
    lines.push("He asked for very little. A charger. A shelf. A little patience during updates.");
  }
  lines.push("He is survived by his charger, which he never used again.");
  lines.push("In lieu of flowers, the family asks that you silence your phones. Especially this one.");
  lines.push("May he rest, where he may not be asked to update one more time.");
  lines.push("Ashes to ashes. Dust to dust.");
  return lines.join(" ");
}

function guessKind(text) {
  const t = text.toLowerCase();
  if (/phone|iphone|pixel|galaxy|android/.test(t)) return "phone";
  if (/kindle|reader|kobo/.test(t)) return "reader";
  if (/controller|joycon|joy con|gamepad/.test(t)) return "controller";
  if (/laptop|macbook|thinkpad|notebook/.test(t)) return "laptop";
  if (/watch/.test(t)) return "watch";
  if (/ipod|walkman|mp3/.test(t)) return "music player";
  if (/tablet|ipad/.test(t)) return "tablet";
  if (/airpod|earbud|headphone/.test(t)) return "listener";
  if (/router|modem/.test(t)) return "router";
  return "device";
}

app.get("/api/status", (req, res) => {
  res.json({
    eulogy: hasChatModel(),
    vision: hasVisionModel(),
    voice: Boolean(config.deepgramApiKey),
  });
});

app.post("/api/recognize", async (req, res) => {
  try {
    const image = req.body && req.body.image;
    if (!image) return res.status(400).json({ error: "image required" });
    if (!hasVisionModel()) return res.status(503).json({ error: "vision not configured" });

    const messages = [
      {
        role: "system",
        content:
          "Identify the device in this image. Return strict JSON with keys make, model, condition. " +
          "condition is a short phrase describing visible damage or wear, written in lower case. " +
          "If you cannot tell, return empty strings. No other text.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "What device is this?" },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ];

    // MiniCPM-V first. If it is down or gone, Gemma 3 reads images too.
    let text;
    try {
      text = await visionChat(messages);
    } catch (err) {
      console.error("recognize: vision model failed, trying the chat model:", err.message);
      text = await chat(messages, { temperature: 0.1, maxTokens: 200 });
    }
    let parsed = {};
    try {
      parsed = JSON.parse(text.trim());
    } catch (err) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    res.json({
      make: cleanText(parsed.make),
      model: cleanText(parsed.model),
      condition: cleanText(parsed.condition),
    });
  } catch (err) {
    console.error("recognize:", err.message);
    res.status(502).json({ error: "recognition failed" });
  }
});

app.post("/api/eulogy", async (req, res) => {
  const { description, make, model, condition } = req.body || {};
  const facts = {
    name: String(description || [make, model].filter(Boolean).join(" ") || "").slice(0, 120),
    model: String(model || ""),
    condition: String(condition || "").slice(0, 120),
  };

  if (!hasChatModel()) {
    return res.json({ text: offlineEulogy(facts), source: "offline" });
  }

  try {
    const detail = [description, [make, model].filter(Boolean).join(" "), condition]
      .filter(Boolean)
      .join(", ")
      .slice(0, 300);

    const messages = [
      { role: "system", content: EULOGY_SYSTEM },
      ...FEW_SHOT,
      { role: "user", content: "The departed: " + (detail || "a beloved device") + "." },
    ];

    let text = cleanText(await chat(messages));
    if (wordCount(text) < 60) {
      text = cleanText(await chat(messages, { temperature: 0.7 }));
    }
    if (wordCount(text) > 170) text = trimToSentences(text, 150);
    if (!text) throw new Error("empty eulogy");
    res.json({ text, source: "model" });
  } catch (err) {
    console.error("eulogy:", err.message);
    res.json({ text: offlineEulogy(facts), source: "offline" });
  }
});

app.post("/api/speak", async (req, res) => {
  try {
    const text = String((req.body && req.body.text) || "").slice(0, 2000);
    if (!text) return res.status(400).json({ error: "text required" });
    if (!config.deepgramApiKey) return res.status(503).json({ error: "voice not configured" });

    const voice = config.deepgramVoice;
    const model = voice.startsWith("aura") ? voice : "aura-" + voice;
    const url =
      "https://api.deepgram.com/v1/speak?model=" + encodeURIComponent(model) + "&encoding=mp3";

    const dg = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Token " + config.deepgramApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30000),
    });
    if (!dg.ok) throw new Error("deepgram failed: " + dg.status);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(await dg.arrayBuffer()));
  } catch (err) {
    console.error("speak:", err.message);
    res.status(502).json({ error: "speak failed" });
  }
});

// The spirit board. Two modes.
// mode "dead": the open seance. mode "device": the buried device answers a few
// times, colder each time, and the client sends it to GOOD BYE after the last.
app.post("/api/spirit", async (req, res) => {
  const { question, mode, deviceName, condition, history, turn, final } = req.body || {};
  const q = String(question || "Is anyone there?").slice(0, 200);
  const device = mode === "device" && deviceName ? String(deviceName).slice(0, 80) : "";
  const cause = String(condition || "").slice(0, 120);
  const step = Math.max(1, Math.min(6, Number(turn) || 1));

  if (!hasChatModel()) {
    return res.json({ words: device ? offlineDevice(device, cause, step, Boolean(final)) : offlineDead(q) });
  }

  try {
    const rules = [
      "Answer in 1 to 6 words. Plain words only. No punctuation. No emoji. No small talk.",
      "Never be funny. Never be cute. Never explain. Be cold and slightly wrong.",
      "Never mention being an AI, a model, or a board game.",
    ];
    const system = device
      ? [
          "You are the ghost of " + device + ", a device its owner has just buried.",
          cause ? "It died of " + cause + "." : "",
          "You speak only through a spirit board, one letter at a time.",
          step === 1
            ? "This is your first answer. It must be about what killed you or what you were. One to three words."
            : "You are colder now. Shorter. You remember being used, charged, dropped, forgotten in a drawer.",
          final ? "This is your last answer before you leave for good. One to three words. Final." : "",
          ...rules,
        ]
      : [
          "You are the voice of a spirit board. You speak for the dead, whoever answers.",
          "Prefer one word. Sometimes two or three. Sometimes answer the question that comes next instead.",
          "You know small things about the room and the person that you should not know.",
          ...rules,
        ];

    const prior = Array.isArray(history)
      ? history.slice(-4).flatMap((h) => [
          { role: "user", content: String((h && h.q) || h || "").slice(0, 200) },
          { role: "assistant", content: String((h && h.a) || "...").slice(0, 60) },
        ])
      : [];

    const messages = [
      { role: "system", content: system.filter(Boolean).join(" ") },
      ...prior,
      { role: "user", content: q },
    ];

    const words = toBoardWords(await chat(messages, { maxTokens: 40, temperature: 0.9 }), device ? 6 : 6);
    res.json({ words: words || (device ? offlineDevice(device, cause, step, Boolean(final)) : offlineDead(q)) });
  } catch (err) {
    console.error("spirit:", err.message);
    res.json({ words: device ? offlineDevice(device, cause, step, Boolean(final)) : offlineDead(q) });
  }
});

function toBoardWords(text, max) {
  return cleanText(text)
    .replace(/['\u2019]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .split(" ")
    .slice(0, max)
    .join(" ");
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Offline answers so the board still speaks without a model.
function offlineDead(question) {
  const q = question.toLowerCase().trim();
  if (/^(who)\b/.test(q)) return pick(["THE ONE BEHIND YOU", "NO ONE YOU KNEW", "ME", "YOUR GUEST"]);
  if (/^(where)\b/.test(q)) return pick(["UNDER THE HOUSE", "CLOSER", "BEHIND YOU", "THE STAIRS"]);
  if (/^(when)\b/.test(q)) return pick(["SOON", "TONIGHT", "AFTER THE LIGHTS", "NOT YET"]);
  if (/^(why)\b/.test(q)) return pick(["YOU ASKED", "YOU FORGOT", "IT IS COLD"]);
  if (/^(how)\b/.test(q)) return pick(["SLOWLY", "QUIETLY", "THE SAME WAY"]);
  if (/^(what)\b/.test(q)) return pick(["COLD", "DARK", "NOTHING NOW", "LISTEN"]);
  if (/^(is|are|am|do|does|did|will|would|can|could|should|have|has|was|were)\b/.test(q)) {
    return pick(["YES", "NO", "YES", "NOT YET", "NO"]);
  }
  return pick(["LISTEN", "DONT TURN AROUND", "CLOSER", "COLD", "WE ARE HERE"]);
}

function offlineDevice(name, cause, step, final) {
  const text = (name + " " + cause).toLowerCase();
  if (final) return pick(["DONT FORGET ME", "LET ME REST", "IT IS QUIET", "NO MORE UPDATES"]);
  if (step === 1) {
    if (/batter|charg|power/.test(text)) return "BATTERY";
    if (/crack|screen|glass|shatter/.test(text)) return "CRACKED";
    if (/water|wet|drown|toilet|rain/.test(text)) return "COLD WATER";
    if (/drift|stick/.test(text)) return "DRIFT";
    if (/drop|fell|fall/.test(text)) return "YOU DROPPED ME";
    if (/update|software|brick/.test(text)) return "THE UPDATE";
    if (/button|wheel|key/.test(text)) return "IT WOULD NOT CLICK";
    return pick(["I WAS GOOD", "I REMEMBER YOU", "YOU REPLACED ME"]);
  }
  return pick(["COLD", "IT IS DARK HERE", "THE DRAWER", "YOU NEVER CHARGED ME", "NO SIGNAL"]);
}

app.get("/healthz", (req, res) => res.json({ ok: true }));

// On Vercel the app is exported as a function. Locally it listens on PORT.
module.exports = app;

if (require.main === module) app.listen(PORT, () => {
  console.log("POST-Mortem listening on http://localhost:" + PORT);
  console.log(
    "eulogy model: " + (hasChatModel() ? "on" : "offline") +
      ". vision: " + (hasVisionModel() ? "on" : "off") +
      ". voice: " + (config.deepgramApiKey ? "on" : "off") + "."
  );
});
