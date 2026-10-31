# Tasks: Ouija Board

Sequenced checklist. Keep status in sync.

## 1. Board skeleton

- [ ] 1.1 `web/ouija.html` with the canvas, controls, and caption layer.
- [ ] 1.2 `web/ouija.css` with the dark room, vignette, and thin caption type.
- [ ] 1.3 `web/ouija-board.js` draws the board once to an offscreen buffer and exposes letter centers.
- [ ] 1.4 Planchette drawing with shadow and window.

## 2. Planchette motion

- [ ] 2.1 Critically damped spring toward a target letter center.
- [ ] 2.2 Low frequency noise so the slide is never perfectly smooth.
- [ ] 2.3 Overshoot and settle on arrival.
- [ ] 2.4 Per letter pause with longer gaps at word boundaries.
- [ ] 2.5 One or two drift-and-correct moves per answer.

## 3. Asking

- [ ] 3.1 Mic request on the Ask gesture only. Text field fallback always visible.
- [ ] 3.2 Speech recognition caption in a thin font. Web Speech API where available.
- [ ] 3.3 Typed question path with the same flow.
- [ ] 3.4 Board reaction before the answer: planchette shiver and a low tone swell.

## 4. The voice of the dead

- [ ] 4.1 `POST /api/spirit` on the server with the cold prompt and optional device context.
- [ ] 4.2 Split the answer into words and feed the spelling engine.
- [ ] 4.3 Post-funeral mode: seed with the device name and condition. First answer must use them.
- [ ] 4.4 Drive the board toward GOOD BYE within 2 to 4 exchanges in post-funeral mode.

## 5. Guided hands

- [ ] 5.1 Mouse pull while the planchette moves. Escapable. Off on mouse up.
- [ ] 5.2 Touch path with 40 ms lag and a small directional offset.
- [ ] 5.3 One unsolicited planchette move per session when the user is not touching.

## 6. Sound

- [ ] 6.1 Room tone (pink noise, low pass) at a near silent level.
- [ ] 6.2 Whisper samples with panner placement left, right, and behind center.
- [ ] 6.3 Groans, breath, chair creak, floorboard at random long intervals.
- [ ] 6.4 Ducking during spelling. Silence between letters.
- [ ] 6.5 Quiet suggestion to use headphones on first load.

## 7. Spirits

- [ ] 7.1 Canvas spirit silhouettes at four edge anchors. Fade in, hold, fade out.
- [ ] 7.2 Random 40 to 90 second timer plus a post-answer trigger.
- [ ] 7.3 Never in the center. Never more often than the scare budget allows.

## 8. Ending

- [ ] 8.1 GOOD BYE control. Planchette slides there. Lights fade. Tone drops out.
- [ ] 8.2 Final line and restart control.
- [ ] 8.3 Reduced motion path: slower planchette, no spirit flashes.

## 9. Quest variant

- [ ] 9.1 Board anchored to a real table in passthrough.
- [ ] 9.2 Hand tracking pull with tremor on the planchette.
- [ ] 9.3 Spatial audio whispers behind the head and beside the ears.
- [ ] 9.4 Translucent spirits at the side that fade when looked at.

## 10. Ship

- [ ] 10.1 Link from the funeral done screen to the board.
- [ ] 10.2 Manual pass on desktop, on a phone, and on a headset.
- [ ] 10.3 Comfort review against the scare budget.
