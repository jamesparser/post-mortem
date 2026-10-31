# Steering: POST-Mortem

This file guides every Kiro session on this repo. Read it before writing code.

## Product

POST-Mortem is a Halloween funeral for dead consumer devices. The web app is what judges score. The Quest 3 app is the companion and the video star. The product promise is one sentence: bury your device for good, with the dignity it never got.

Resurrection is explicitly out of scope. The device does not come back. Finality is the comedy.

## Tone

Solemn priest voice. Real grief cadence. Device facts do the comedy. Never cute. Never meta. Never a wink.

Good: "He died before his time. Or perhaps exactly at it. His battery thought so."
Bad: "LOL your phone is dead. Rip."

## Art direction

Realistic AR in the user's real home or wherever they are. Never cartoony. Never a mascot.

Thing is a disembodied human hand in the spirit of the Addams Family character of the same name. It walks on its fingers the way a person walks on feet. Build it as an original model and an original rig. Do not use trademarked Addams Family artwork, textures, or assets.

- Thing is a realistic severed human hand. Skin tone, knuckles, tendons, veins, a little dirt under the nails. The stump is clean and healed. It looks like it belongs to someone. It is not a mitten and it is not a cartoon glove. The uncanny valley is the point.
- Wood, brass, glass, and bone white. Warm lamp light and deep shadow. No saturated colours.
- All Quest experiences run in passthrough AR and sit in the real room with real shadows.

## Tech stack

- Frontend: vanilla HTML, CSS, and JS. No framework. No bundler. Keep the repo small and the deploy simple.
- Backend: Node with Express. One small server. Handles eulogy generation, device recognition, and TTS proxying.
- LLM and vision: `google/gemma-3-27b-it` on the Nebius Token Factory. One model for the eulogy writer, the spirit voice, and device recognition. Endpoint `https://api.tokenfactory.nebius.com/v1`. Configure by env var. Never hardcode keys. Do not use expensive models like Kimi K3.
- TTS: Deepgram Aura. Male voice. Called from the backend so the key never reaches the browser.
- Audio: static files under `audio/`. Served by the same Node server.
- Quest 3: WebXR in the Quest browser. Passthrough, plane and mesh detection, hand tracking. three.js from a CDN import map. Lives under `web/quest/` and is served by the same Node server. Not required for the web deliverable.

## Repo layout

```
.kiro/            steering, specs, hooks. Never gitignore.
docs/             brief, design notes, submission writeup drafts.
web/              the judge-facing funeral app.
web/quest/        the Quest 3 Thing experience, WebXR.
quest/            notes for the headset build.
tools/            asset generators. Every sound is synthesized here.
audio/            organ dirge, storm, footsteps, groans.
```

## Code rules

- No secrets in the repo. Env vars only. `.env` is gitignored.
- No em dash, en dash, or double hyphen anywhere in strings, comments, docs, or user facing text. Use a period or a comma.
- No dates in user facing copy or submission materials.
- Keep functions small and named after what they do. No clever abbreviations.
- Every API call from the browser goes through the backend. No third party keys in the client.

## Kiro usage

This project is built with Kiro. Keep `.kiro/` at the repo root and never add it to `.gitignore`.

Use spec-driven development for each feature:

1. Write or update `requirements.md` with user stories and acceptance criteria.
2. Write `design.md` with the technical approach.
3. Write `tasks.md` as a sequenced checklist.
4. Implement the tasks. Keep the checklist in sync.

Use steering files for rules that apply everywhere. Use agent hooks for recurring chores like running tests after each change and checking for banned punctuation before commit.

## Repo protocol

- Build local.
- Keep the private and public copies in sync.
- Never commit keys, tokens, emails, or internal paths.
- Never force push the public repo. Additive commits only.

## What is scored

The web app must work from a clean browser with no login. A stranger opens the link, buries a device, hears the eulogy, and leaves smiling. Everything else exists to make that moment land and to make the demo video unforgettable.

## Devpost category

Enter **Costume Contest**. The product is a haunting, polished interface, and that is what the category asks for. Frankenstein is the backup if Costume Contest does not fit on the form. Do not enter Resurrection.

A heartbeat after burial is a ghost story, not a resurrection. The device does not work again and nothing is reimaged. If we claim Resurrection the judges will look for working resurrected tech and it is not there, which costs us points in the one category we would be strongest in.

## Platform for the Quest app

WebXR in the Quest 3 browser, not Unity. One stack with the web app, no APK, no store review, and a desktop preview for judges. Native Unity would give better occlusion and hand tracking, but the deadline and the single stack win. Documented in `.kiro/specs/thing-quest/design.md`.
