# Design: Ouija Board

## Shape

One page on the web. One scene in Unity. Shared behaviour described here so both builds feel like the same board.

Web stack stays vanilla HTML, CSS, JS, plus WebAudio. No framework. The board is a canvas layer so the planchette can move smoothly and so spirits can draw over the edges.

## Web layout

```
web/ouija.html
web/ouija.css
web/ouija.js
web/ouija-board.js      board rendering and letter hit zones
web/ouija-audio.js      room tone, whispers, panning, ducking
web/ouija-spirit.js     peripheral spirit flashes
```

Server gets one new route.

```
POST /api/spirit   { question, deviceName?, history[] } -> { words: string }
```

## Board rendering

Canvas at device pixel ratio. Draw once to an offscreen buffer and blit.

Layers bottom to top:

1. Wood grain background. Procedural, warm dark brown, vignette at the corners.
2. Letters and numbers in a serif face. Arched rows for the alphabet.
3. YES, NO, and a long GOOD BYE bar along the bottom.
4. Planchette. A rounded triangle with a circular window. Casts a soft shadow.
5. Glow layer. When a letter is reached, a faint warm glow appears under it and fades in 600 ms.
6. Spirit layer. Transient, drawn above the board, never opaque.

## Planchette motion

Target based. Each letter has a center point. The planchette eases toward it.

- Motion uses a critically damped spring, not a linear tween. It should feel like wood sliding on wood.
- Add 1 to 2 px of low frequency noise so it never looks mechanical.
- Overshoot 4 to 8 px on arrival, then settle.
- Pause 300 to 900 ms at each letter. 900 ms at word boundaries.
- Drift once or twice per answer. Choose a nearby wrong letter, move 30 percent of the way, hesitate 400 to 700 ms, then correct.

## Guided hands

Web, mouse. A 6 px radius pull around the planchette while it is moving. The pull applies a small offset to the cursor position each frame, capped so the user can always escape. Releasing the mouse stops it.

Web, touch. Track the finger and place the planchette 40 ms behind it with a 2 px offset in the direction of travel. The lag is the point.

Quest, controllers. Quest controllers have no force feedback, so there is nothing to pull with. Use haptics instead. Map the distance from planchette to target letter onto the controller impulse amplitude. Far from the letter is a faint continuous pulse. Near the letter is a strong buzz. The arrival of a letter is a short sharp pulse. Hold the planchette on the letter for the length of the pause so the vibration settles. This is the whole guidance story on Quest.

Quest, hand tracking. No haptics exist. The planchette runs the same spelling path and adds visible tremor that scales with proximity to the target letter. Lift the whisper gain by about 3 dB as it nears a letter so the ears get the cue the hands cannot.

## Audio

One `AudioContext` on the web. Nodes:

- Room tone. Pink noise through a low pass at 400 Hz, gain 0.06.
- Whispers. Short pre recorded or synthesized whisper samples, placed with `PannerNode` or a stereo pan with a short convolver reverb. Positions: hard left, hard right, and behind center (pan 0 but lower volume and slightly darker filter).
- Groans. Low, distant, hard panned, 6 to 12 second gaps.
- Spelling layer. A near silent tick per letter, filtered, panned slightly toward the letter's side of the board. Barely there.

Ducking. During spelling, room tone drops to 0.02 and groans pause. Whispers continue at low volume. The silence between letters is the product.

Quest uses the same layer names but routes through the Meta spatial audio system. Whispers are placed at world positions behind and beside the head.

## Spirits

On web, a spirit is a canvas draw: a tall pale silhouette with soft edges, drawn at one of four anchors (left edge, right edge, bottom left, bottom right). Opacity ramps to 0.22 over 400 ms, holds 1 to 3 seconds, ramps to 0 over 800 ms. Never in the center.

On Quest, a spirit is a translucent capsule with a soft head and shoulders mesh, placed 1 to 2 meters to the side or slightly behind. It fades in over 400 ms and fades out faster when the head turns toward it, so it always feels like it was just there.

Triggering. A timer with a random interval between 40 and 90 seconds. Additionally, trigger one within 3 seconds of an answer completing about half the time.

## Voice of the spirits

The server calls the chat model with a cold system prompt.

- Answer in 1 to 8 words.
- No punctuation. No emoji. No small talk.
- Prefer single words. Sometimes two or three.
- Be specific to the question and the device when we know it.
- Never be funny. Never be cute.
- Occasionally answer a question the user did not ask.

The response is split into words and spelled letter by letter on the client. Spaces become long pauses.

For the post-funeral mode, the request carries the device name and condition. The first answer must use them.

## Safety and comfort

- Mic is requested only on a user gesture. Denial falls back to typing.
- No volume peaks above 70 dB. No sudden loud stings in this experience. The scare is in the quiet.
- `prefers-reduced-motion` slows the planchette to half speed and disables spirit flashes.
- A visible "Close the board" control at all times.
- Never simulate physical contact. The pull is always small and always escapable.

## What is deliberately not built

No device recognition here. No payments. No multiplayer. No resurrection. The board speaks and then it stops.
