# ClimbingRoutes

A climbing app for outdoor climbers, built on [OpenBeta](https://openbeta.io)'s open climbing data. Search for any route, browse from a region down to a single wall, and see the details you need at the crag.

The goal is to go further than a list of routes: 3D models of real walls, made from phone photos, with every route drawn on the rock so you can find your line from any angle.

USU Computer Science capstone project.

## Features

**Now**

- Search routes and areas by name
- Browse the USA from state to area to wall
- Map of the USA that groups walls into their areas when zoomed out, with walls that have a 3D model marked
- Route pages with grade, type, length, bolts, description and first ascent when OpenBeta has them

**Planned**

- Saved routes, grade preferences and filters
- Offline areas for crags with no signal
- 3D wall models with each route drawn on the rock, numbered to match the route list

The full list is in [docs/requirements.md](docs/requirements.md).

## Repo layout

| Path | What's there |
| --- | --- |
| `mobile/` | The app: Expo, Expo Router and TypeScript, for iOS, Android and web |
| `viewer/` | Desktop web viewer for wall models, used to draw route lines |
| `data/models/` | Wall models (`.glb`) and `index.json`, the list the author tool picks from. The app loads models from `main` on GitHub, so they stay in git |
| `data/routes/` | Route lines drawn in the viewer, one file per model |
| `data/openbeta/` | Saved OpenBeta responses for the test wall |
| `scripts/` | OpenBeta fetch, RealityScan pipeline, and the viewer's local server |
| `supabase/` | Backend: database migrations with access rules, the seed script and access checks. Setup in [supabase/README.md](supabase/README.md) |
| `docs/` | Requirements, decisions and project notes |

## Getting started

Needs Node 22.13+, 24.3+ or 26+ (Expo SDK 58). Works the same on Mac and Windows.

### App

```
cd mobile
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go on a phone on the same Wi-Fi. If the network blocks it, run `npx expo login` once, then `npx expo start --tunnel`. More in [mobile/README.md](mobile/README.md).

### 3D viewer

```
node scripts/viewer/serve.mjs
```

Then open http://localhost:8765/viewer/. Pick a model, then draw and save route lines.

### Making a wall model

1. Photograph the wall using the [capture checklist](docs/capture-checklist.md)
2. Process the photos on the team PC with `scripts/realityscan/run.reproject.ps1 -Name <wall> -Imgs <photo folder>`. After RealityScan, it fixes up the export (`glb-finish.mjs`), swaps the texture for a JPEG (`glb-texture.mjs`, `-Quality 85` by default) and levels the model from the camera poses (`level.mjs`). It prints how many photos aligned and the size against the 15 MB budget. Alignment ignores the photos' GPS, because phone GPS is metres off and fitting the model to it tilted crag models by 35-55 degrees (`-UseGps` turns it back on)
3. Copy `C:\Users\Garage\rs\<wall>\out\<wall>.glb` to `data/models/` and add it to `index.json`

## Data

Route and area data comes from [OpenBeta](https://openbeta.io) and is CC0. Coverage is uneven: length, bolts and descriptions are often missing. Details in [docs/openbeta.md](docs/openbeta.md).

## Docs

- [Requirements](docs/requirements.md): what we're building and why
- [OpenBeta data](docs/openbeta.md): how the app uses the API, and known gaps
- [Capture checklist](docs/capture-checklist.md): photographing a wall
- [Decisions](docs/adr/): architecture decision records
- [Work agreement](docs/work-agreement.md): how the team works
