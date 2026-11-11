# Tasks: Thing on Quest 3

Sequenced checklist. Keep status in sync as tasks complete.

## 1. Platform

- [x] 1.1 Choose WebXR in the Quest browser over Unity. Record why in `design.md`.
- [x] 1.2 Landing page at `/quest/` with headset check, optional device name, and preview.
- [x] 1.3 `immersive-ar` session with `local-floor`, hand tracking, plane detection, mesh detection.
- [x] 1.4 Controllers and hands created before the session so existing inputs connect.

## 2. Thing model

- [x] 2.1 Procedural palm, digits, nails, and healed stump. Original geometry.
- [x] 2.2 Canvas painted skin: tendons, veins, knuckle wrinkles, creases, grime.
- [x] 2.3 Rig with digit and joint groups.
- [x] 2.4 Fingertip gait with two link IK.
- [x] 2.5 Poses: still, flat, wave, hang, grip, leap, squirm.
- [ ] 2.6 Headset pass on skin tone and scale under real lamp light.

## 3. Room

- [x] 3.1 Read planes and meshes. Rebuild only on change.
- [x] 3.2 Depth only occluders from every plane and mesh.
- [x] 3.3 Shadow catchers on upward surfaces.
- [x] 3.4 Fallback floor and Map this room when unscanned.
- [x] 3.5 Hide spot queries for all five categories with the 2 meter rule.

## 4. Locomotion

- [x] 4.1 Run, hop, climb, mantle, leap segments.
- [x] 4.2 Route planning between floor and surfaces.
- [x] 4.3 Shoulder perch that follows the head.
- [x] 4.4 Spatial nail taps scaled by speed.

## 5. Ambient

- [x] 5.1 Listen, dart, hide, perch loop with long pauses.
- [x] 5.2 Freeze under gaze, bolt when unwatched.
- [x] 5.3 Creep when the player is still, then leap to the shoulder.
- [x] 5.4 Rare distant groans. Scare cooldown.

## 6. Hide and seek

- [x] 6.1 Menu entry with quick, standard, long.
- [x] 6.2 Intro wave and the 30 second hide.
- [x] 6.3 Cover detection: hands at the headset, eyes on the floor, headset off.
- [x] 6.4 Peek freezes him, then he repositions.
- [x] 6.5 Weighted categories, blend about a third of rounds.
- [x] 6.6 Still in hiding. Breath and faint scrape from the spot.
- [x] 6.7 Find by reach or select. Squirm, sting, line.
- [x] 6.8 Timeout leap to the shoulder.
- [x] 6.9 Score with persisted stats.

## 7. Burial

- [x] 7.1 Casket and bier with wood, satin, brass.
- [x] 7.2 Place by hand, then lid closes.
- [x] 7.3 Organ from the casket, petals with weight.
- [x] 7.4 Floating program in step with the voice.
- [x] 7.5 Voice from the backend, browser speech fallback.
- [x] 7.6 Sink through the floor, then ambient resumes.
- [x] 7.7 Chains lower the casket with no haptics. Silence. Then a muffled lub dub from under the floor three or four times, each weaker, with controller haptics in the same rhythm. Then nothing.
- [x] 7.8 Seated players may get Thing in the lap instead of on the shoulder.

## 8. Sound

- [x] 8.1 Synthesize all sounds in `tools/make_audio.py`.
- [x] 8.2 HRTF sources and a limiter under the scare budget.

## 9. Verify

- [x] 9.1 Emulator pass with IWER and the synthetic living room.
- [ ] 9.2 Headset pass in a real mapped room: occlusion, shadows, scale, gaze freeze.
- [ ] 9.3 Headset pass with hands only. Pinch on menu, reach to find.
- [ ] 9.4 Frame rate check on Quest 3 with the global mesh loaded.
- [ ] 9.5 Capture footage for the demo video.

## 10. Spirit board in the house

- [x] 10.1 Menu entry with two modes: Talk to the dead, Your dead device.
- [x] 10.2 Board on a real table or a pedestal, planchette with glass window and felt feet.
- [x] 10.3 Guided letters by controller haptics, tremble for hands, auto move fallback.
- [x] 10.4 Circling whispers, breath, footsteps, and a figure at the side of the eye.
- [x] 10.5 Questions out loud where the browser can listen, otherwise it answers a question you did not ask.

## 11. Fixes from the first headset pass

- [x] 11.1 Depth sensing for occlusion, so real walls and furniture hide Thing even in an unmapped room. Falls back cleanly if the browser refuses it.
- [x] 11.2 Without a map, Thing stays within about two meters of where you started.
- [x] 11.3 Set the floor: touch the floor once with a controller or a hand. Fixes floating caskets and tables in unmapped rooms.
- [x] 11.4 Map this room explains that the new map loads on the next entry, and points to Space setup if the browser cannot start it.
- [x] 11.5 Move the casket and the board: squeeze a grip button beside it and carry it. Thumbstick up or down raises or lowers it, left or right turns it. Hands can pinch and carry the casket.
- [x] 11.6 Spirit board needs both hands: pinch the planchette with both hands, or hold both triggers on it. It never moves without them.
- [x] 11.7 No pull: the planchette goes only where the hands take it. Haptics grow stronger and faster near the hidden letter, hum steadily over it, and the letter is taken after a short hold.
- [x] 11.8 Questions out loud: the headset microphone records a few seconds and the server transcribes it with Deepgram. Asked for on the landing page before entering.

## 12. Fixes from the second headset pass

- [x] 12.1 Hide and seek states the roles up front: he hides, you seek. A full count from 30 to 1 during the hide, one caption every second.
- [x] 12.2 The hunt counts every ten seconds, then every second for the last ten. Timeout reads: Time is up. You did not find him. So he comes to you.
- [x] 12.3 Unbounded reference space where the browser allows it, so you can walk the house. Landing page explains Roomscale or boundary off.
- [x] 12.4 Carry by ray: point at the casket or the board and hold the grip. It rides the end of the ray. Thumbstick on that hand pushes it away or pulls it closer.
- [x] 12.5 Burial: any trigger or pinch closes the lid once the departed is inside. The interior box is more forgiving.
- [x] 12.6 Spirit board answers say plainly what you asked and what it answered, then a spirit voice speaks the answer from behind you.
- [x] 12.7 Spoken spirit lines from Deepgram voices, slowed, low passed and doubled in a stone reverb, every seven to fourteen seconds on the board, never while the microphone is open.
- [x] 12.8 Shared ghost module: a figure 35 to 50 degrees off the gaze, one metre or so away, inside the field of view. First at about 22 seconds on the board, about 45 seconds in Thing's house. Gone when you look at it.
- [x] 12.9 A controls card stays low in view the whole time: each mode and each step sets its own lines (carry, close the lid, cover your eyes, find him, hands on the planchette, ask now). Menus, setting the floor and carrying override it. The menu buttons are always listed.
- [x] 12.10 The controls card shows for nine seconds when a step changes, then fades. Any trigger or pinch puts it away. A on the right controller, or Show controls in the menu, brings it back. It does not pop up again for a step seen in the last ninety seconds.
- [x] 12.11 Burial in two clear steps. Step 1: carry the casket and pull the trigger when it is in place. Step 2: put the phone in, then pull the trigger to close the lid. Nothing closes while carrying, and reaching inside no longer closes it by itself.
- [x] 12.12 The ending, loud enough for Quest speakers: knocking from inside, a muffled shout (Wait! I am not dead yet! Let me out!) in a Deepgram voice behind a low pass, scrabbling, the casket shaking and the controllers bucking hard, then three or four heartbeats that slow and fade. Then nothing. The device stays dead.
- [x] 12.13 Burial ending reordered: four heartbeats that slow and fade, a long pause, then the knocking and the muffled shout, the scrabbling and the controllers bucking. Then nothing.
- [x] 12.14 Ghosts that read in passthrough: dark shadow figures with a pale, half hidden face, 25 to 40 degrees off the gaze and 1.3 to 1.9 metres away, placed by head height so a wrong floor never hides them. Up to 88 percent opacity for four to seven seconds, gone the instant you look straight at one. First at about 12 seconds on the board, then every 20 to 35 seconds.
- [x] 12.15 Eighteen spirit lines, darker (Why did you let me die. Count the people in the room. Now count again.), slowed by a random amount, sometimes with a much lower voice speaking along.
- [x] 12.16 Seventeen more lines: under the bed, in the closet, in the walls, watching you sleep, and the dead devices still listening.
- [x] 12.17 Ten spirit voices, female and male. Voices move: fixed behind one ear, passing behind the head from ear to ear, circling all the way round, or coming from across the room right up to the ear. Same on the web board.
- [x] 12.18 Fewer voices: at least forty seconds between random spoken lines, ambience every 14 to 26 seconds, and only about a third of the figures speak. Board answers are always spoken.
- [x] 12.19 Thing always hides inside the headset boundary when there is one (bounded-floor, pulled in by 30 cm), and never beyond reach in an unmapped room. After the first third of the hunt the controllers pulse warmer as you get closer, and every twelve seconds a caption says roughly where he is.
