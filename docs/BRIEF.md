# POST-Mortem: One Page Brief

## What

A proper funeral for dead devices. You place your device in a casket. An AI priest identifies it from a photo or a short description and delivers a eulogy that is sincere on the surface and quietly devastating underneath. Deepgram voices the priest. Organ music plays. Flowers fall. The casket is lowered. The device is buried for good. No resurrection. Finality is the joke.

A companion Quest 3 experience brings back Thing, a disembodied hand that stalks the house. Hide and seek when you want a game. Ambient crawling, climbing, and jump scares when you do not.

And a Ouija board that listens, pulls at your hands, and spells words from the dead in the dark.

## Why

Everyone has dead devices in drawers and shoeboxes. Nobody gives them a send off. Treating tech grief with total sincerity is the comedy. The eulogy is never a bit. The situation is the bit.

## Who

Judges and visitors of the Kiroween 2026 gallery. They open a web link and bury a device in two minutes. Quest 3 owners get the full haunting at home.

## Judge experience (web)

1. Name the device, or show it to the camera.
2. The vision model reads the make, model, and visible damage.
3. The AI writes the eulogy in a solemn priest voice.
4. Deepgram speaks it over organ and storm ambience.
5. Flowers fall. The casket lowers. It is done.

## Quest 3 experience

- Burial in passthrough AR. Place your real device into a virtual casket anchored to the floor.
- Mourners throw flowers. The organ dirge plays. The priest speaks.
- Thing appears after the burial and will not stay gone.
- Hide and seek. A real game. Thing is given 30 seconds to hide while you cover your eyes. Then you hunt. He hides under things, behind things, on top of things, and about a third of the time he sits on a counter next to real objects trying to blend in. Red light, green light while you search. Find him or he finds you.
- Ambient mode. Thing crawls the house while you are not playing. Climbs chairs. Sits on your shoulder. Jumps.

## The board (web and Quest 3)

A dark wooden board. A planchette that moves on its own. It listens to your question and spells the answer letter by letter, slowly, with drifts and hesitations. Whispers sit close to your ears and behind your head. Faint spirits appear at the edge of your vision and vanish when you look.

- Web build. Browser plus headphones. Binaural panning. The planchette pulls at your cursor or drags your finger on a phone. This is what judges run.
- Quest build. Passthrough AR. The board sits on your real table. Your hand rests on the planchette and feels it pull. Spirits stand beside you and fade when you turn your head.
- Post-funeral mode. After a device is buried, the board opens pre-seeded with its name. The departed answers one last time, then the planchette slides to GOOD BYE and stops.

Make it scary. Silence between letters. Never a cheap jump. The scare budget is in the spec.

## Voice and tone

Solemn first. The jokes land in the details and in the pauses. Never wink at the camera.

Sample lines:

- "He was a good phone. His life simply ran out."
- "He died before his time. Or perhaps exactly at it. His battery thought so."
- "Though his screen was cracked, his spirit was unbroken. Mostly."
- "He is survived by his charger, which he never used again."
- "In lieu of flowers, the family asks that you silence your phones. Especially this one."
- "Ashes to ashes. Dust to dust. Glass to glass."
- "May he rest, where he may not be asked to update one more time."

## Sound

- Organ dirge (original, D minor, slow).
- Storm bed. Wind. Rain on glass.
- Footsteps on wood floors and on stairs.
- Distant groans from the dead.
- Low whisper layer under the eulogy.

Sources: CC0 recordings plus real Foley on a phone. All assets live on the AI Drive.

## Stack

- Web: vanilla HTML, CSS, JS. Small Node backend.
- Eulogy writer: any OpenAI-compatible endpoint. Bonsai 27B on the VPS is the primary.
- Device recognition: multimodal model reads a webcam photo of the device and returns make, model, and visible condition.
- TTS: Deepgram Aura, male priest voice.
- Quest 3: Unity with Meta XR SDK. Scene mesh for occlusion. Hand tracking for the chase.
- Repo: build local, then push to the public submission repo.

## Constraints

- Judges cannot wear a headset. The web link is the scored deliverable. The Quest build is the video star.
- Only code written after Oct 30 counts. No recycled work.
- Use Kiro. Specs, steering, and agent hooks live in `.kiro/` at the repo root. Do not gitignore that folder.
- Never use em dash, en dash, or double hyphen in any written material. Space after period, exclamation, question mark, and semicolon.
- No dates on submission materials. Not on slides, README, video descriptions, or write ups.
- The public repo is what Devpost links to. Never commit keys or internal paths.

## Milestones

- Week 1. Web funeral works end to end with real audio and a real eulogy.
- Week 2. Device recognition locked. Eulogy quality pass. Priest voice final.
- Week 3. Quest 3 burial scene. Thing ambient behaviors.
- Week 4. Thing hide and seek. Funeral video shoot.
- Week 5. Polish. Demo video. Submit.

## Working title

POST-Mortem. Power on self test, and the examination of the dead. Change it if a better one shows up.
