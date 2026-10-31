# POST-Mortem

A proper funeral for dead devices.

You place your device in a casket. An AI priest identifies it and delivers a eulogy that is sincere on the surface and quietly devastating underneath. Deepgram voices the priest. Organ music plays. Flowers fall. The casket is lowered. The device is buried for good.

A companion Quest 3 experience brings back Thing, a disembodied hand that stalks the house and will not stay in the grave. Hide and seek, ambient dread, and a proper burial in passthrough AR.

And a Ouija board that listens, pulls at your hands, and spells words from the dead. Web build with headphones. Quest build with spatial audio and spirits beside you.

Built for Kiroween 2026.

## Web app (what judges run)

Live at https://post-mortem-ten.vercel.app. The Quest haunting is at https://post-mortem-ten.vercel.app/quest/.

Run it locally:

```
npm install
cp .env.example .env
npm start
```

Fill in `.env` for the real priest. Without keys the service still runs with an offline eulogy and the browser voice.

Open http://localhost:3000

## Quest 3 app

Open `/quest/` in the Quest 3 browser. WebXR passthrough, no install. See `quest/README.md`. No headset? The same page has a desktop preview.

## Repo layout

```
.kiro/     steering, specs, hooks for Kiro
docs/      brief and design notes
web/       funeral and ouija (what judges run)
web/quest/ the Quest 3 Thing experience, WebXR
quest/     headset notes
audio/     organ dirge, storm, footsteps, groans, all synthesized
tools/     the script that synthesizes every sound
```

## Specs

- `.kiro/specs/funeral-web/` the burial app
- `.kiro/specs/ouija/` the board
- `.kiro/specs/thing-quest/` Thing hide and seek, ambient, and the VR burial

## Built with Kiro

This project uses spec-driven development. See `.kiro/steering/steering.md` and `.kiro/specs/`. Agent hooks enforce house style.

## House style

- No em dash, no en dash, no double hyphen. Use a period or a comma.
- No dates in user facing copy or submission materials.
- Solemn voice. Device facts do the comedy.
