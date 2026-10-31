# Requirements: Ouija Board

## Overview

A talking board that talks back. The user speaks or types a question. The planchette moves on its own and spells the answer, letter by letter, slowly, with drifts and hesitations. Creepy audio sits close to the ears. Spirits flicker at the edge of vision and vanish. The goal is not novelty. The goal is to make the user feel like something else is in the room.

There are two builds of the same experience.

Web build. Runs in a browser with headphones. Binaural audio. Planchette that pulls the cursor or moves under a finger on a touchscreen. Faint spirits at the edges of the screen. This is what judges run.

Quest build. Runs in passthrough AR. The board sits on a real table. Hand tracking lets the user rest fingers on the planchette and feel it pull. Spatial audio places whispers behind the head and groans beside the ear. Translucent spirits stand beside the user and vanish when looked at.

The board has two modes, the same way Thing has two modes. One board, a switch at the top.

**Mode A. Talk to the dead.** This is the default and it is open. Anyone asks the dead anything. Is anybody there. What happened to him. What is behind me. The planchette spells cold answers, letter by letter. This is the seance.

**Mode B. Your dead device.** Reached from the funeral done screen, or picked from the switch. The board opens pre-seeded with the buried device name and its condition. The device answers in its own cold voice, using what actually killed it. It runs for two to four questions, turns colder, then the planchette slides to GOOD BYE and refuses to move again until the user resets. This is the wake.

Both modes share the board, the planchette, the audio, and the spirits. Only the voice and the ending differ.

## Voice and tone

The spirits never joke. The horror is in the pacing, not in the words. Answers are short, cold, and slightly wrong. They know things they should not. They sometimes answer before the question is finished.

Good: "C O L D", "Y O U R E  L A T E", "D O N T  T U R N  A R O U N D"
Bad: "lol hi", "spooky", "boo"

## User stories

### US-1. The board

As a visitor, I want a real looking board, so the experience starts with a ritual and not a form.

Acceptance:

- A dark wooden board fills the scene with letters A through Z, digits 0 through 9, YES, NO, and GOOD BYE along the bottom.
- A planchette sits in the center. It is a small triangular pointer with a round window.
- The board is lit from above with a single warm light. The edges fall into darkness.
- On the web, the board scales to fit a laptop and a phone. On the phone the letters are still tappable.
- On the Quest build, the board anchors to a real table surface.

### US-2. Asking

As a visitor, I want to speak to it, so it feels like it hears me.

Acceptance:

- A microphone is requested only after the user presses "Ask". Never on page load.
- Speech is recognized and shown as a faint caption in a thin font. If the user prefers not to speak, a text field is always available.
- If recognition fails or the mic is denied, the typed question is used. The experience never blocks.
- The board reacts to the question before the answer begins. The planchette shivers. A low tone swells.

### US-3. The answer

As a visitor, I want the planchette to spell, so the answer arrives in pieces and feels physical.

Acceptance:

- The planchette glides to each letter with eased motion, overshoots slightly, and settles.
- Letters light very faintly as they are reached.
- There are 300 to 900 ms pauses between letters, longer at word boundaries.
- Occasionally the planchette drifts toward a wrong letter, pauses, then corrects. Do this once or twice per answer. Never more.
- The answer is 1 to 8 words. Short is scarier.
- After spelling, the planchette returns to the center and rests.

### US-4. Guided hands

As a visitor, I want to feel it guide me, so the horror is physical.

Acceptance:

- Quest with controllers. Quest controllers have no force feedback. The planchette cannot pull the hand. Instead the controller vibrates. Vibration is a faint pulse when the planchette is far from the target letter and grows stronger as it gets closer. A short sharp buzz marks the moment a letter is reached. This is the primary guidance on Quest.
- Quest with hand tracking. There is no vibration at all. The planchette trembles visibly as it nears a letter and the whisper layer rises slightly. Eyes and ears do the guiding instead.
- Web, mouse. The planchette moves on its own, and a soft magnetic pull tugs the cursor toward it while it is moving. The pull is gentle and can be resisted. Releasing the mouse stops the pull.
- Web, touch. The planchette moves under the finger with a small lag, as if the finger is being dragged.
- At least once per session, the planchette moves while the user is not touching it.

### US-5. Sound in the ear

As a visitor, I want audio that comes from wrong places, so the room feels occupied.

Acceptance:

- A quiet room tone plays at all times after the first gesture. Room tone is barely audible.
- Whispers sit close to the ears. On web, use WebAudio panning and a short convolver reverb to fake binaural placement. Place them hard left, hard right, and just behind the center.
- On Quest, use spatial audio sources placed behind the head and beside the ears.
- Occasional sounds: breath, a chair creak, a floorboard, a throat clear, a whisper of the user's own name if we know it (from the device name field or the question).
- Groans and distant crying come from far left or far right and fade.
- During the spelling, the mix ducks everything else to almost nothing except the whisper layer and the planchette. Silence between letters is the scariest part. Do not fill it.

### US-6. Spirits

As a visitor, I want to see something at the edge, so the eyes and ears agree.

Acceptance:

- A faint figure appears at the edge of the screen (web) or beside the user (Quest) for 1 to 3 seconds, then fades.
- On web, spirits appear in the periphery of the board. They are pale, low contrast, and partially transparent. Looking directly at the spot where one appeared shows nothing.
- On Quest, spirits are translucent human shapes standing 1 to 2 meters to the side or slightly behind. If the user turns to face one, it fades before the gaze settles.
- Spirits never touch the user and never appear in the center of the board.
- A spirit appears about once every 40 to 90 seconds, and never in a fixed rhythm.
- The most effective moment is right after a word is spelled. Let one appear then.

### US-7. Post-funeral contact

As someone who just buried a device, I want to speak to it once more, so the suite feels like one story.

Acceptance:

- From the web funeral's done screen, a quiet control reads "Ask the board".
- The board opens pre-seeded with the device name and the eulogy details.
- The first answer is always personal to the device. Examples: "C R A C K E D", "B A T T E R Y", "I W A S  G O O D".
- The second answer turns cold. "G O O D  B Y E" is the correct ending. The board should try to reach it within 2 to 4 exchanges.
- The planchette then slides to GOOD BYE and refuses to move again until the user resets.

### US-8. Ending

As a visitor, I want a clean way out, so the scare can end.

Acceptance:

- "GOOD BYE" on the board can be pressed at any time.
- The planchette moves to it slowly. The lights fade. The room tone drops out. The screen holds on darkness for a beat.
- A final line reads "The board is closed. It is not empty."
- The session can be restarted.

## Art direction

This is an AR experience in the user's real room. It must look real, not stylised.

- The board is aged wood with worn varnish and letters in ink that has faded unevenly. It sits on the user's real table and casts a real shadow.
- The planchette is wood with a glass window. It has thickness and it slides the way a wooden object slides.
- Spirits are pale, soft, partly transparent, and human in proportion. No cartoon ghosts. No glowing outline.
- Colour is warm lamp light, deep shadow, and bone white. Nothing saturated.
- The web build follows the same rules in two dimensions. It should look like a photograph of a board on a table, not like an illustration.

## Non functional

- Works with headphones. Speakers are supported but the experience is worse and the app should quietly suggest headphones.
- Works on a modern desktop browser and a modern phone browser.
- Works on Quest 3 in passthrough AR for the deep version.
- No login.
- Mic is requested only after a gesture. Denial never breaks the flow.
- `prefers-reduced-motion` slows the planchette and removes spirit flashes. Audio stays.

## Scare budget

This is the one to be careful with. The experience should feel unsafe but not cheap.

- Never a jump scare that damages the user's real hands or headset.
- Never a very loud burst. Peaks stay under 70 dB.
- Never more than one spirit per 40 seconds.
- Never a flashing image.
- The strongest tool is the pause. Use it.

## Out of scope

- Real spirit communication. This is a performance.
- Accounts, sharing, payments.
- Multiplayer seances.
- Device recognition. That belongs to the funeral.
