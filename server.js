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

const config = {
  llmBaseUrl: process.env.LLM_BASE_URL || "",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "",
  visionBaseUrl: process.env.VISION_BASE_URL || process.env.LLM_BASE_URL || "",
  visionApiKey: process.env.VISION_API_KEY || process.env.LLM_API_KEY || "",
  visionModel: process.env.VISION_MODEL || process.env.LLM_MODEL || "",
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
  deepgramVoice: process.env.DEEPGRAM_VOICE || "",
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

    const text = await visionChat(messages);
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

    const voice = config.deepgramVoice || "aura-2-orpheus-en";
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

app.post("/api/spirit", async (req, res) => {
  try {
    const { question, deviceName, condition, history } = req.body || {};
    if (!hasChatModel()) return res.json({ words: offlineSpirit(question) });

    const system = [
      "You are the voice of a Ouija board. You speak for the dead.",
      "Answer in 1 to 8 words. No punctuation. No emoji. No small talk.",
      "Prefer a single word. Sometimes two or three.",
      "Never be funny. Never be cute. Be cold and slightly wrong.",
      "Answer only what was asked. Sometimes answer the question that comes next.",
      "If you know the device being mourned, use its damage and its model in the answer.",
    ].join(" ");

    const prior = Array.isArray(history)
      ? history.slice(-4).map((h) => ({ role: "user", content: String(h).slice(0, 200) }))
      : [];

    const contextLine = deviceName
      ? "The departed is " + deviceName + (condition ? ". It died of " + condition : "") + "."
      : "";

    const messages = [
      { role: "system", content: system },
      ...(contextLine ? [{ role: "user", content: contextLine }] : []),
      ...prior,
      { role: "user", content: "Question: " + String(question || "Is anyone there?").slice(0, 200) },
    ];

    let words = cleanText(await chat(messages, { maxTokens: 60 }))
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .split(" ")
      .slice(0, 8)
      .join(" ");

    if (!words) words = "YES";
    res.json({ words });
  } catch (err) {
    console.error("spirit:", err.message);
    res.json({ words: "GOODBYE" });
  }
});

function offlineSpirit(question) {
  const answers = ["YES", "NO", "SOON", "BEHIND YOU", "COLD", "NOT YET", "ASK AGAIN", "GOODBYE"];
  const seed = String(question || "").length;
  return answers[seed % answers.length];
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
