# Tasks: Ouija Board

Sequenced checklist. Keep status in sync.

## 1. Board skeleton

- [x] 1.1 `web/ouija.html` with the canvas, controls, and caption layer.
- [x] 1.2 `web/ouija.css` with the dark room, vignette, and thin caption type.
- [x] 1.3 `web/ouija-board.js` draws the board once to an offscreen buffer and exposes letter centers.
- [x] 1.4 Planchette drawing with shadow and window.

## 2. Planchette motion

- [x] 2.1 Critically damped spring toward a target letter center.
- [x] 2.2 Low frequency noise so the slide is never perfectly smooth.
- [x] 2.3 Overshoot and settle on arrival.
- [x] 2.4 Per letter pause with longer gaps at word boundaries.
- [x] 2.5 One or two drift-and-correct moves per answer.

## 3. Asking

- [x] 3.1 Mic request on the Ask gesture only. Text field fallback always visible.
- [x] 3.2 Speech recognition caption in a thin font. Web Speech API where available.
- [x] 3.3 Typed question path with the same flow.
- [x] 3.4 Board reaction before the answer: planchette shiver and a low tone swell.

## 4. The voice of the dead

- [x] 4.1 `POST /api/spirit` on the server with the cold prompt and optional device context.
- [x] 4.2 Split the answer into words and feed the spelling engine.
- [x] 4.3 Post-funeral mode: seed with the device name and condition. First answer must use them.
- [x] 4.4 Drive the board toward GOOD BYE within 2 to 4 exchanges in post-funeral mode.

## 5. Guided hands

- [x] 5.1 Fingers on the planchette with mouse or touch. It follows with lag and a slight pull of its own. Off on release. (A browser cannot move the real cursor, so the pull is shown on the planchette.)
- [x] 5.2 Touch path with 40 ms lag and a small directional offset.
- [x] 5.3 One unsolicited planchette move per session when the user is not touching.

## 6. Sound

- [x] 6.1 Room tone (pink noise, low pass) at a near silent level.
- [x] 6.2 Whisper samples with panner placement left, right, and behind center.
- [x] 6.3 Groans, breath, chair creak, floorboard at random long intervals.
- [x] 6.4 Ducking during spelling. Silence between letters.
- [x] 6.5 Quiet suggestion to use headphones on first load.

## 7. Spirits

- [x] 7.1 Canvas spirit silhouettes at four edge anchors. Fade in, hold, fade out.
- [x] 7.2 Random 40 to 90 second timer plus a post-answer trigger.
- [x] 7.3 Never in the center. Never more often than the scare budget allows.

## 8. Ending

- [x] 8.1 GOOD BYE control. Planchette slides there. Lights fade. Tone drops out.
- [x] 8.2 Final line and restart control.
- [x] 8.3 Reduced motion path: slower planchette, no spirit flashes.

## 9. Quest variant

- [x] 9.1 Board on the nearest real table within reach, or on a small pedestal table if there is none.
- [x] 9.2 Hand or controller resting on the planchette moves it. Controllers buzz harder and faster near the hidden letter, a sharp pulse on arrival. Hands get a trembling planchette instead.
- [x] 9.3 Whispers and breath that start behind an ear and travel around the head. Footsteps behind, groans far off.
- [x] 9.4 A pale figure at 70 to 110 degrees off the gaze that fades the moment you turn toward it.

## 10. Ship

- [x] 10.1 Link from the funeral done screen to the board.
- [ ] 10.2 Manual pass on desktop, on a phone, and on a headset.
- [ ] 10.3 Comfort review against the scare budget.

## 11. Modes

- [x] 11.1 One board, a switch at the top: Talk to the dead (default) and Your dead device.
- [x] 11.2 Your dead device reads the name and cause of death from the funeral link, the session, or a short form.
- [x] 11.3 Two to four answers, colder each time, then GOOD BYE and the board locks until it is lit again.
- [x] 11.4 Offline answers for both modes when no model key is set.
- [x] 11.5 Phones vibrate briefly at each letter while a finger rests on the planchette.

## 12. Guided letters and the name

- [x] 12.1 The board never shows the letter it wants. With a finger on the planchette (web) or a hand or controller on it (Quest), the visitor moves it and feels for the letter: phone or controller pulses, and a low pulse in the ear, grow faster and stronger with proximity. Let go and it moves on its own.
- [x] 12.2 Whispers that circle the head on the web as well, with HRTF panning.
- [x] 12.3 Peripheral figures painted with a bowed head, hollow eyes, hair, and a shroud, half out of frame, flickering.
- [x] 12.4 User facing name is the spirit board. The word Ouija is a trademark and does not appear in the app.
- [x] 12.5 No automatic jump from the burial to the board. The gate lets the visitor choose.

## 13. A live voice

- [x] 13.1 Answers are written live by the model for the exact question asked: a time for when, a name for who, YES or NO first for yes or no questions. Two to six words, never a dodge. Canned lines only when no model is configured, and the response says which.
- [x] 13.2 After it spells, a spirit voice speaks the answer from behind the visitor: a Deepgram Aura voice chosen from a fixed server allowlist, slowed, low passed, doubled, in reverb.
- [x] 13.3 Spoken lines join the ambience (Behind you. Do not turn around.) with louder whispers, breath and footsteps.
- [x] 13.4 Figures appear sooner and stronger on the web: the first within about half a minute, then every thirty five to sixty seconds.
