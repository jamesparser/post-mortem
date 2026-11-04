# Design: Thing on Quest 3

## Decision. WebXR, not Unity

The Quest app is a WebXR page served by the same Node server as the funeral. It runs in the Quest 3 browser as an `immersive-ar` session with passthrough.

Why:

- One stack. Vanilla JS modules plus three.js from a CDN import map. No bundler, no APK, no store review.
- One link. Anyone with a headset opens `/quest/` and is in. The funeral done screen links to it.
- The Quest browser exposes what the spec needs: passthrough, `plane-detection` and `mesh-detection` with semantic labels from the user's room setup, `hand-tracking` with joint poses, controller haptics through `gamepad.hapticActuators`, and `initiateRoomCapture()` when the room is not mapped.
- Keys stay on the server. The burial calls the same `/api/eulogy` and `/api/speak` routes.

## Files

```
web/quest/index.html   landing page, import map, enter and preview buttons
web/quest/landing.js   support check, eulogy prefetch, session start
web/quest/main.js      App: renderer, session, input, menu, mode switching, frame loop
web/quest/thing.js     procedural model, rig, and animator for Thing
web/quest/skin.js      canvas painted skin, nail, wood, brass, satin materials
web/quest/room.js      planes and meshes, occluders, shadow catchers, hide spots
web/quest/mover.js     locomotion: run, climb, hop, mantle, leap, shoulder
web/quest/ambient.js   ambient haunting brain
web/quest/hideseek.js  hide and seek game
web/quest/burial.js    casket, bier, petals, program, service sequence
web/quest/audio.js     HRTF spatial audio with a limiter
web/quest/ui.js        menu card, captions, printed program, wrist button, rays
tools/make_audio.py    synthesizes every sound in audio/ from oscillators and noise
```

## Thing

Original model built in code. No imported meshes, no textures from anywhere else.

- Palm: a tapered superellipsoid with a domed back, knuckle bumps, thenar and hypothenar pads. Planar UVs. Triangles are split into a dorsal group and a palmar group so each gets its own painted map.
- Digits: three lathe segments each, with full hemispherical caps so neighbouring segments share a joint centre and blend at any bend angle. Flattened on the palm side. Nails are curved plates with a pink bed, a pale free edge, and a dark line of dirt under the edge.
- Wrist: a short elliptical tube ending in a healed, puckered cap.
- Skin: canvas painted colour and bump maps. Mottling, pores, tendons from wrist to knuckles, branching veins, knuckle redness and wrinkles, palm creases, a little grime. `MeshPhysicalMaterial` with a warm sheen for a subsurface feel.
- Rig: digit base groups and joint groups. Flexion is rotation about local X.

### Animator

- `walk`. Fingertip gait. Diagonal pairs move together like a trot. Each digit solves a two link IK in its sagittal plane so fingertips plant on the ground. Cadence and stride scale with ground speed. An index finger taps while he listens.
- `still`. Hiding. A slow breath and a rare single finger twitch.
- `flat`. Blending in. Palm down, fingers loose, like a dropped glove.
- `wave`. Standing on the stump, fingers up, waving.
- `hang`. Hooked over an edge, palm to the surface.
- `grip`. Clinging to the shoulder.
- `leap`. Fingers thrown forward mid air.
- `squirm`. Caught.

## Room

`Room` reads `frame.detectedPlanes` and `frame.detectedMeshes` every frame and rebuilds a record only when `lastChangedTime` changes.

- Every plane and mesh becomes a depth only occluder (`colorWrite: false`, rendered first). The global mesh from Quest scene understanding makes Thing disappear behind real furniture and below the real floor.
- Upward horizontal planes get a `ShadowMaterial` catcher so Thing casts real looking shadows on real tables and floors.
- Without a scan, a large floor disk stands in and the menu offers Map this room.

Queries: `surfaces`, `walls`, `furniture`, `insideRoom`, `randomFloorPoint`, `skirtingPoint`, `pointOnSurface`, `edgeOf`, `surfaceAt`, `hideSpot(category)`, `fallbackSpot`.

### Hide spots

All spots must be at least 2 meters from the start position and inside the floor polygon.

- under. Centre of a table plane, projected to the floor. Pose still.
- behind. Far side of a floor standing mesh, away from the player. Pose still.
- top. Random point on a surface, higher surfaces preferred. Pose still.
- blend. Table or counter height surface, next to a mesh that sits on it. Pose flat.
- hanging. Top of a door frame, or the outer edge of a high surface. Pose hang.

Category weights: blend 0.33, under 0.2, behind 0.17, top 0.17, hanging 0.13. If the chosen category has no candidates the next one is tried, then the fallback spot behind the player.

## Locomotion

`ThingMover` plans a route as segments.

- On a surface and going elsewhere: run to the nearest edge, hop down.
- Going onto a surface: run to the floor point below the nearest edge. Hop up if lower than 55 cm, otherwise climb the side with his back to the room, then mantle over the edge.
- Hanging from a door frame: run to its base, climb the frame.
- Runs are rat like: hard acceleration, uneven surges, late braking.
- Leap to the shoulder: a ballistic arc to a point 19 cm right of the head and 26 cm down. Never toward the face or the hands.
- Seated players (head under 1.35 m from the floor) get the lap about 60 percent of the time: 30 cm in front of the head and 62 cm down, facing the player, gripping.

## Ambient brain

States: listen, move, hiding, frozen, creep, leaping, shoulder, dropping.

- Gaze test: the angle between head forward and the direction to Thing, under about 15 degrees.
- Watched: freeze. Unwatched for 0.35 seconds: bolt to cover away from the player.
- Pauses between moves are 0.6 to 3 seconds. The pause is the main tool.
- Player still for 8 seconds and the scare cooldown passed: creep closer from behind in short pulses, then leap to the shoulder. Cooldown 75 seconds.
- Distant groans no more than once every 70 seconds.

## Hide and seek

intro, hiding, hunt, caught or scared, score, done.

- Covering: headset visibility not `visible`, head pitched toward the floor, or a hand or controller within 17 cm of the head.
- Peeking freezes Thing mid dash with a soft tone. When the player covers again he picks a new spot.
- During the hunt he never moves. A breath loop sits at his position. A faint scrape every 7 to 15 seconds.
- Found: any fingertip, wrist, or controller within 20 cm, or a select within 32 cm. He squirms, a sting plays, the line appears, a haptic pulse.
- Timeout: he leaps to the shoulder.
- Stats persist in `localStorage`.

## Burial

- A small coffin shaped casket on a wooden bier, 70 cm in front of the player, long side facing them. Walnut finish with clearcoat, satin lining, brass handles and cross.
- Placing: a fingertip or controller enters the interior and then leaves, or a select near the casket. The real device stays in the player's hand or on the bier. The ritual is the gesture.
- Lid closes, organ starts from the casket, 56 petals fall with drag and come to rest on the lid or floor.
- The program floats above the casket and reveals the eulogy in step with the voice.
- Voice from `/api/speak`, positioned at the casket. Browser speech if unavailable.
- Chains: the organ fades, a chain and winch sound plays from the casket, and the casket and the petals on it sink through the floor. No haptics. The floor occluder hides them.
- Silence for about three seconds.
- Heartbeat: a muffled lub dub from half a meter under the floor, three or four beats about one second apart, each weaker. Each beat sends two controller pulses, lub then dub, 260 ms apart.
- Ambient resumes. He was never going to stay gone.

## Audio

- `AudioContext` with a compressor at minus 14 dB and a master at 0.75. No peak goes past the scare budget.
- HRTF panners for footsteps, breath, groans, organ, and voice. The listener follows the headset.
- All sounds are generated by `tools/make_audio.py`. The organ dirge is an original D minor piece.

## Input

- Controllers and hands through three.js `getController`, `getControllerGrip`, `getHand`, created before the session starts.
- Menu: point and select. The brass button on the left wrist or the B and Y buttons open it.
- Haptics: `hapticActuators[0].pulse` on catch, scare, and lid close. Hands have no haptics.

## Desktop preview

`/quest/` has a Preview button for browsers without a headset. A dim room with a table and a wall, a camera that looks around on its own. He freezes when the camera faces him and moves when it turns away. This is for judges and for the video.

## Testing

Tested in Chromium with the Immersive Web Emulation Runtime and its synthetic living room: planes and meshes are read, every hide category finds a spot, a round is found by reach, a timed out round ends on the shoulder, and the burial runs from lid open to sinking and back to ambient. Real headset passes are still required for feel.
