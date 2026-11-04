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
