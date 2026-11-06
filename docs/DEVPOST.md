## Inspiration

Everyone has a drawer. A phone with a spiderweb screen, a Kindle that fogged over, a controller that drifts left on its own. We never say goodbye to them. We just stop charging them. For Kiroween we decided they deserved a proper funeral, delivered with complete sincerity, because treating tech grief seriously is the joke.

## What it does

POST-Mortem opens on a gate with three doors.

**The burial.** Name your dead device, or show it to the camera. A vision model reads the make, the model, and the damage. An AI priest writes a eulogy that is solemn on the surface and quietly devastating underneath ("He is survived by his charger, which he never used again."), and a deep male voice reads it over an organ dirge and a storm. Petals fall. Chains lower the casket. Then the room goes quiet, and something under the ground beats three or four more times, weaker each time, before it stops for good. On an Android phone, the phone in your hand beats with it. The device stays dead.

**The spirit board.** Ask the dead anything, or ask the device you just buried. The board never shows you the letter it wants. Rest a finger on the planchette and feel for it: your phone buzzes and a low pulse in your ear quickens as you get close. Let go and it moves on its own. Whispers circle your head. Pale figures stand at the edge of the screen and are gone when you look. The departed device answers two to four times, colder each time, then the planchette slides to GOOD BYE and will not move again.

**Thing, on Quest 3.** A severed hand loose in your real house, in passthrough AR. He walks on his fingertips, freezes when you look at him, bolts when you look away, and if you stand still long enough he lands on your shoulder, or in your lap if you are sitting. Hide and seek is a separate game: he gets thirty seconds while you cover your eyes, then you hunt him through your actual rooms. About a third of the time he is sitting on a counter pretending to be a glove. The burial and the spirit board also run in the headset, on your real table, with the controllers pulsing the heartbeat and humming harder as you near the letter.

## How we built it

- **Spec driven with Kiro.** The `.kiro` folder holds a steering file (tone, art direction, stack, house style), three specs with requirements, design, and task checklists (the funeral, the spirit board, Thing), and an agent hook that rejects banned punctuation on every write. Every change of plan went into the spec first.
- **Web:** vanilla HTML, CSS, and JavaScript, no framework and no bundler, on a small Node and Express server deployed to Vercel.
- **AI:** Gemma 3 27B on the Nebius Token Factory writes the eulogies and speaks for the board. MiniCPM-V on Nebius reads the device photo, with Gemma as a fallback. Deepgram Aura gives the priest his voice. Every key stays on the server.
- **Quest:** WebXR in the Quest browser with three.js. Plane and mesh detection read your real room, so Thing hides under your real tables and disappears behind your real furniture. Hand tracking and controller haptics for the board and the burial. HRTF spatial audio.
- **Thing himself** is an original procedural model and rig built in code: tendons, veins, knuckle creases, nails with dirt under them, and a fingertip gait solved with inverse kinematics.
- **Sound:** every sound in the app, the organ dirge, storm, chains, heartbeat, whispers, and footsteps, is synthesized from oscillators and noise by a Python script in the repo. No samples.

## Challenges we ran into

Quest controllers cannot pull your hand, so the board guides you by feel instead: haptic strength and rate mapped to distance from a letter you are never shown. Scanned tabletops are a centimetre or two noisy, so the board sits on small feet above them. And the ending had to read as a heartbeat, not as the casket being lowered, so the lowering is silent to the hands and the heartbeat comes only after a real pause.

## Accomplishments that we're proud of

A stranger can open one link with no login, bury a phone in two minutes, and leave smiling. The same story continues in a headset, in their own house.

## What we learned

Spec driven development is not about one tool. Several agents worked on this project, Kiro CLI among them, and the steering file and specs are what kept the priest sounding like the same priest no matter who wrote the code.

## What's next

A Quest version where the departed device leaves one last message on the board before it goes, and a shared graveyard of every device ever buried.
