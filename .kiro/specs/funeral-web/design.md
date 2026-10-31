# Design: Web Funeral

## Shape

One static page. One small Node server. No framework, no bundler. The page is a single scene: a casket, a name plate, falling flowers, and a control to start the service. The server has four jobs: write the eulogy, recognize the device, render the voice, and serve static files and audio.

## Frontend

Plain `index.html`, `style.css`, `app.js` under `web/`.

Scene layers, bottom to top:

1. Background. Dark room with a soft vignette. CSS gradients only. No image required.
2. Grave slab and casket. CSS shapes. The device name renders on a small plate.
3. Flower particle layer. A canvas over the scene. Simple falling petals. About 40 particles on screen. Pause when the tab is hidden.
4. UI controls. Name field, photo capture, start service, replay, mute. Minimal. No chrome.

State machine in `app.js`:

```
idle -> naming -> recognizing (optional) -> writing -> speaking -> lowering -> done
```

Every state transition is explicit. Failure in any async step falls forward with the text we already have. Never dead end.

## Backend

`server.js` with Express. Routes:

- `GET /` and static. Serves `web/` and `audio/`.
- `POST /api/recognize`. Accepts a base64 image. Calls the vision model. Returns `{ make, model, condition }`.
- `POST /api/eulogy`. Accepts `{ description, make, model, condition }`. Calls the chat model. Returns `{ text }`.
- `POST /api/speak`. Accepts `{ text }`. Calls Deepgram Aura. Returns audio bytes (mp3 or wav).

All model calls go through one thin client module so swapping the endpoint is an env var change. The primary and only lane is `google/gemma-3-27b-it` on the Nebius Token Factory. It handles the eulogy writer, the spirit voice, and device recognition. Do not use expensive models like Kimi K3.

## Env vars

```
LLM_BASE_URL       https://api.tokenfactory.nebius.com/v1
LLM_API_KEY        Nebius Token Factory key
LLM_MODEL          google/gemma-3-27b-it
VISION_BASE_URL    defaults to LLM_BASE_URL
VISION_API_KEY     defaults to LLM_API_KEY
VISION_MODEL       model id for device recognition
DEEPGRAM_API_KEY   Deepgram key
DEEPGRAM_VOICE     male Aura voice id
PORT               defaults to 3000
```

No key is ever sent to the browser. `.env` is gitignored. `.env.example` is committed with empty values.

## Eulogy prompt

System prompt in `web/../server/prompts/eulogy.txt` (or inline in the server module, whichever is cleaner). Rules for the model:

- Speak as a parish priest delivering a eulogy for a consumer device.
- 80 to 140 words.
- Open solemn. Close solemn.
- Include at least one specific detail about the damage or the model.
- Land the comedy in the details, not in the framing.
- No emoji. No meta commentary. No em dash, en dash, or double hyphen.

Few shot examples ship with the prompt. Three examples is enough. Use the lines from the brief.

## Device recognition

Send the image to the vision model with a strict JSON schema:

```
{ "make": string, "model": string, "condition": string }
```

`condition` is a short phrase such as "cracked screen and swollen battery" or "well worn with a faded keyboard". If the model cannot tell, return empty strings and the eulogy prompt falls back to the typed description.

## Audio

Static files under `audio/`:

- `organ-dirge.mp3` and `.ogg`. Original piece, D minor, about 60 seconds, loopable tail.
- `storm-bed.mp3`. Wind and rain. Loopable. 2 to 4 minutes.
- `footsteps-wood.mp3`. Sparse. Loopable.
- `groans.mp3`. Distant and rare. Loopable.
- `stairs-creak.mp3` for the Quest build, kept here for one audio home.

The web app uses `storm-bed` and `organ-dirge`. Footsteps and groans sit low in the mix at random intervals.

Playback: HTML5 `Audio` elements or one `AudioContext` with gain nodes. Prefer `AudioContext` so ducking under the voice is smooth. If `AudioContext` is unavailable, fall back to plain `Audio` and simply lower `volume` during speech.

## Ducking

Target mix: voice at 1.0, organ at 0.25 during speech and 0.5 alone, storm at 0.2. Fade times around 400 ms.

## Failure behavior

- Vision fails. Use the typed description. Show a soft line: "We could not see it clearly. We will remember it as you described."
- LLM fails. Show a short fixed eulogy so the service still completes. Log the error.
- TTS fails. Show the text in a typewriter reveal. Keep the ambience. Never a blank screen.
- Audio autoplay blocked. Show a quiet "Begin the service" button that unlocks audio on first gesture.

## Accessibility and reach

- Keyboard reachable controls. Visible focus ring in a muted gold.
- `prefers-reduced-motion` stops the flower particles and the casket animation. Keep the audio.
- Text contrast above 4.5 to 1 on the UI layer.
- The page works at 360 px wide.

## Deploy

Static plus one Node process. Any small host works. Vercel or a Cloudflare Pages plus a tiny worker is fine if the audio size allows. Keep the public URL alive until judging ends.

## What is deliberately not built

No account. No share buttons. No resurrection. No Quest integration in this app. Keep the web path short and finished.
