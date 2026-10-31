# Thing on Quest 3

Companion experience. WebXR in the Quest 3 browser. The code lives in `web/quest/` and is served by the same Node server as the funeral. See `.kiro/specs/thing-quest/` for requirements, design, and tasks.

Everything is passthrough AR in your real home and it must look realistic. Thing is a real looking human hand, not a cartoon.

## Run it on a headset

1. Map your room on the Quest 3 (Settings, Physical space, Space setup). Thing hides using that map.
2. Open https://post-mortem-ten.vercel.app/quest/ in the Quest browser, or serve your own copy over HTTPS. WebXR needs a secure origin. Either deploy, or run locally and tunnel it, or use `adb reverse tcp:3000 tcp:3000` with a USB cable and open `http://localhost:3000/quest/`.
3. Open `/quest/` in the Quest browser and press Enter the house.
4. The menu opens first. Press the brass button on your left wrist, or B or Y, to bring it back.

No headset? Press Preview on the same page to watch him in a desktop room.

## Modes

- Ambient (default). Thing scurries around the house like a rat. Hides, climbs, freezes when watched, bolts when you look away, and comes for your shoulder if you stand still.
- Hide and seek. Quick, standard, or long. He gets 30 seconds to hide while you cover your eyes. Then you hunt. Reach out and touch him to find him.
- Burial. A casket on a bier in your room. Lay a real device inside with your hand. Service plays in the room.

## Not required for judging

The web app is the scored deliverable. This build exists for the demo video and for anyone who has a headset at home.
