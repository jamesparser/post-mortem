# Tasks: Web Funeral

Sequenced checklist. Keep status in sync as tasks complete.

## 1. Skeleton

- [x] 1.1 Create `web/index.html` with the scene markup: casket, name plate, controls, canvas layer.
- [x] 1.2 Create `web/style.css` with the dark room, vignette, casket, and control styling.
- [x] 1.3 Create `web/app.js` with the state machine and a stub for each async step.
- [x] 1.4 Create `server.js` with Express, static serving, and placeholder routes.
- [x] 1.5 Create `.env.example` and wire config loading.

## 2. Eulogy

- [x] 2.1 Write the eulogy system prompt with three few shot examples.
- [x] 2.2 Implement `POST /api/eulogy` against the OpenAI-compatible endpoint.
- [x] 2.3 Validate length and tone on the response. Trim or regenerate if out of bounds.
- [x] 2.4 Check output for banned punctuation (em dash, en dash, double hyphen) and strip.

## 3. Device recognition

- [x] 3.1 Add webcam capture and file upload in the UI.
- [x] 3.2 Implement `POST /api/recognize` with the vision model and a strict JSON schema.
- [x] 3.3 Merge recognition fields into the eulogy request.
- [x] 3.4 Add the soft fallback line when recognition fails or is skipped.

## 4. Priest voice

- [x] 4.1 Implement `POST /api/speak` with Deepgram Aura and a male voice.
- [x] 4.2 Stream or return audio to the browser and play it.
- [x] 4.3 Add replay and mute controls.
- [x] 4.4 Add the typewriter text fallback when TTS fails.

## 5. Service ritual

- [x] 5.1 Flower particle canvas. About 40 petals. Pause when hidden.
- [x] 5.2 Casket lowering animation after the audio ends.
- [x] 5.3 Final line and "Bury another" reset.
- [x] 5.4 Name plate text binding to the typed or recognized device name.
- [x] 5.5 Last stir before lowering: three muffled buzzes and a knock, the casket shakes, the phone vibrates where the browser allows.

## 6. Sound bed

- [x] 6.1 Drop the organ dirge and storm bed into `audio/` and confirm both loop cleanly.
- [x] 6.2 Wire the AudioContext mix with ducking under the voice.
- [x] 6.3 Add sparse footsteps and groans at random low volume.
- [x] 6.4 Single mute control that stays visible in every state.

## 7. Polish

- [x] 7.1 Keyboard reachable controls and visible focus ring.
- [x] 7.2 `prefers-reduced-motion` path.
- [x] 7.3 Phone layout at 360 px.
- [x] 7.4 Autoplay unlock button on first gesture.
- [x] 7.5 Failure paths for vision, LLM, and TTS, each with a graceful fallback.

## 8. Ship

- [x] 8.1 `.env.example` with empty values only. No secrets in git history.
- [x] 8.2 README quickstart: install, env, run.
- [x] 8.3 Deploy to a public URL that stays up through judging.
- [ ] 8.4 Manual pass on a clean browser and a phone.
