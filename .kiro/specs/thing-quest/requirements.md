# Requirements: Thing on Quest 3

## Overview

A companion experience for the Quest 3 headset. Three modes share one hand character named Thing.

Mode one is the burial. Passthrough AR. The user places their real device into a virtual casket anchored to the floor. The service plays out in the room. Organ dirge, falling flowers, the priest eulogy.

Mode two is the ambient haunting, and it is the default. Thing lives in the house. He scurries around like a rat, hides under furniture, climbs, and jumps on you for a scare. This is what you get when you just put the headset on.

Mode three is hide and seek, a separate game selected from a menu. Thing is given 30 seconds to hide in your actual house while you cover your eyes. You then hunt for him. He blends in. He is under things, behind things, on top of things, and sometimes sitting on a counter next to the real objects pretending to be one of them.

This spec is the video star and the home experience. The web app remains the scored deliverable.

Platform: WebXR in the Quest 3 browser, served at `/quest/` by the same Node server. See `design.md` for why this replaced Unity.

## User stories

### US-1. Passthrough burial

As a headset owner, I want to bury a real device in my real room, so the funeral feels physical.

Acceptance:

- Passthrough AR is active. The room is visible.
- A virtual casket anchors to the floor plane in front of the user.
- The user physically places a real device into the casket using hand tracking.
- The casket lid closes. After a long pause it buzzes like a phone on vibrate, three times, and something knocks once from inside. The controllers buzz with it. Then it is still. It is not a resurrection. It is the last twitch.
- The organ dirge plays. Flowers fall in the room.
- The eulogy text floats in the air like a printed program. A Deepgram voice reads it.
- The casket sinks through the floor. The room returns to normal.

### US-2. Thing ambient

As a headset owner, I want Thing to live in my house, so the space feels haunted.

Acceptance:

- This is the default mode. Thing is always in the house whenever no game is selected.
- It scurries like a rat. Quick darting bursts along skirting boards and across open floor. It runs in short sprints and stops to listen. It never glides and it never walks calmly.
- It hides under tables and chairs. It climbs furniture. It sits on shelves and on the backs of sofas.
- It freezes when the user looks directly at it, then bolts the moment the user looks away.
- If the user stands still long enough, Thing creeps closer and leaps onto the shoulder or the arm for a jump scare.
- It makes small sounds as it moves. Nails on wood, a scuffle, a soft thud.

### US-3. Hide and seek

As a player, I want a real game of hide and seek with Thing in my house, so there is a reason to run around.

Acceptance:

- Hide and seek is a separate game selected from a menu. It is not part of the burial flow and it is not the same as the ambient haunting. Ambient keeps running when the game is not selected.
- Round start. Thing announces itself with a scuttle sound and a wave. A timer reads "30 seconds. Cover your eyes."
- The user is prompted to cover their eyes (hands over the headset proximity sensor, or simply look down at the floor). During this window Thing runs to a hiding spot.
- If the user peeks, Thing freezes mid dash and a soft tone plays. Peeking is allowed but Thing repositions after the peek.
- When the 30 seconds end, a soft chime plays and the hunt begins. A search timer starts at 90 seconds.

Hiding spots. Thing picks one of these categories each round, and the category is never announced.

1. Under something. Under a table, under a couch, under a chair, under a bed. Only reachable by crouching and looking.
2. Behind something. Behind a door, behind a curtain, behind a cushion, behind a real object standing on the floor.
3. On top of something. On a shelf, on a counter, on a table, on the back of a sofa. Requires looking up.
4. Blending in. On a counter or table, sitting still next to real objects, posed to look like a decorative hand, a glove, a utensil holder, or a piece of clutter. This is the hardest category and should appear about a third of the time.
5. Hanging. From a door frame, from a chair back, from a hook. Above eye line.

- Thing uses the scene mesh to pick a valid spot: on a real horizontal surface, inside the mapped area, at least 2 meters from the user start position, and reachable by walking.
- Thing stays perfectly still in its hiding spot during the hunt. It does not run away and it does not play games with movement. The only life is small: a finger twitch, a slow breath, a slight shift of the wrist. Finding it is the whole game.
- The user finds Thing by getting within arm reach and reaching out. Hand tracking grab closes the round. Controllers work too if hand tracking is not available.
- On catch. Thing squirms. A short sting plays. A line appears: "Found him. He is at rest again. For now."
- On timeout. Thing jumps out of its spot and lands on the user shoulder. A scare sting plays. A line appears: "Time. He found you."
- Score is shown briefly: rounds played, finds, average find time. Then back to the menu.
- Three round lengths are offered: quick (30 second hide, 60 second hunt), standard (30 second hide, 90 second hunt), long (30 second hide, 150 second hunt).

### US-4. Sound

As a headset owner, I want spatial audio, so the haunting has direction.

Acceptance:

- Organ dirge during the burial.
- Storm and wind bed during ambient and hide and seek.
- Thing footsteps on wood and stairs are spatialized and come from Thing's real position.
- During hide and seek, breathing and faint scraping come from the hiding spot, just loud enough to notice.
- Groans are rare and distant during ambient mode.
- Jump scare uses a short musical sting plus a scuttle sound.

## Art direction

Everything runs in passthrough AR inside the user's real home or wherever they happen to be. Nothing is a cartoon. Nothing is a mascot. The horror comes from how real it looks.

- Thing is a realistic severed human hand in the spirit of the Addams Family character of the same name. It walks on its fingers the way a person walks on feet. Skin tone, knuckles, tendons, veins, a little dirt under the nails. The stump is clean and healed. It looks like it belongs to someone. It is not a mitten and it is not a cartoon glove. The uncanny valley is the point. Build it as an original model and rig. Do not use trademarked Addams Family artwork, textures, or assets.
- The casket is real wood with a satin finish and brass fittings. The flowers are real looking petals with real weight. Shadows fall the way the real room's light says they should.
- The Ouija board is a real board. Aged wood, worn varnish, letters printed in ink that has faded unevenly. The planchette is wood with a glass window, not a flat graphic.
- The spirits are pale and soft and partly transparent, but their proportions are human. No blob shapes. No glowing outline cartoon ghosts.
- Colour stays in a narrow band: warm lamp light, deep shadow, and bone white. No saturated colours anywhere.
- If a choice comes up between looking expensive and looking cute, always choose expensive.

## Non-functional

- Runs on Quest 3 at a stable frame rate.
- Scene mesh occlusion makes Thing hide behind real furniture convincingly.
- Hand tracking grab feels immediate.
- Hide spot selection completes in under 2 seconds and never picks an unreachable spot.
- The app does not require the web backend. Eulogy and audio can be cached at build time for the demo, or fetched from the same backend when available.

## Out of scope

- Multiplayer.
- Quest 2 support. Scene mesh quality is too low.
- Editing the eulogy in VR. That happens on the web.
- Resurrection. Thing haunts. The device stays dead.
