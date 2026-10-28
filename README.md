# ClimbingRoutes

A climbing app for outdoor climbers, built on [OpenBeta](https://openbeta.io)'s open climbing data. Search for any route, browse from a region down to a single wall, and see the details you need at the crag.

The goal is to go further than a list of routes: 3D models of real walls, made from phone photos, with every route drawn on the rock so you can find your line from any angle.

USU Computer Science capstone project.

## Status

- **Proof of concept, done.** Phone photos of Date Wall in Logan Canyon became a 3D model that runs on a phone. [Plan and results](docs/poc-plan.md)
- **Milestone 1, done.** The app: search, browse, the map, route pages, and a Wall page with the 3D model. [Summary](docs/milestone-1.md)
- **Milestone 2, in progress (due 2026-11-02).** Climbers photograph a wall in the app and upload the photos for the team to make into a model. [Plan](docs/requirements.md#photo-capture-and-upload-milestone-2-in-progress) · [Issues](https://github.com/USU-CSCapstone/ClimbingRoutes/milestone/3)

## Features

**Now**

- Search routes and areas by name
- Browse the USA from state to area to wall
- Map of the USA that groups walls into their areas when zoomed out, with walls that have a 3D model marked
- Route pages with grade, type, length, bolts, description and first ascent when OpenBeta has them
- A 3D Wall page: the wall's model with each route drawn on the rock, numbered to match the route list. Tap a route in the list or its line to select it. Date Wall is the only wall with a model so far
- An author tool for drawing route lines on a model (development only)

**In progress**

- "Scan this wall": a guided camera for photographing a wall, and upload for processing

**Planned**

- Saved routes, grade preferences and filters
- Offline areas for crags with no signal
- 3D models for more walls, made from climbers' scans

The full list is in [docs/requirements.md](docs/requirements.md).

## Repo layout

| Path | What's there |
| --- | --- |
| `mobile/` | The app: Expo, Expo Router and TypeScript, for iOS, Android and web. Includes the route author tool at `/author` |
| `data/models/` | Wall models (`.glb`) and `index.json`, the list the author tool picks from. The app loads models from `main` on GitHub, so they stay in git |
| `data/routes/` | Route lines drawn in the author tool, one file per model |
| `data/openbeta/` | Saved OpenBeta responses for the test wall |
| `scripts/` | OpenBeta fetch, RealityScan pipeline, and the local server for `data/` |
| `docs/` | Requirements, architecture, decisions and project notes |
| `.github/` | CI, and the issue and pull request templates |

## Getting started

Needs Node 22.13+, 24.3+ or 26+ (Expo SDK 58). Works the same on Mac and Windows.

### App

```
cd mobile
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go on a phone on the same Wi-Fi. If the network blocks it, run `npx expo login` once, then `npx expo start --tunnel`. More, including settings and the checks to run before pushing, in [mobile/README.md](mobile/README.md).

### Try the demo

1. Start the app and press `w`
2. In Explore, go to Utah › Wasatch Range › Northern Wasatch › Cache Valley › Logan Canyon › Date Wall, or search for "Date Wall"
3. Tap **View the wall in 3D**, or open http://localhost:8081/walls/date-wall
4. Tap a route in the list, or its line on the rock, to see its details

On the Map, Date Wall is marked 3D. Three of its six routes are drawn so far; the [data README](data/README.md#demo-data) lists what's in the demo.

### Drawing route lines

The author tool is part of the app, at `/author`, in a desktop browser in development. It reads models and saves route lines through a small local server for `data/`, so run both, the server from the repo root:

```
node scripts/viewer/serve.mjs
```

```
cd mobile
npx expo start
```

Then open http://localhost:8081/author. Pick a model, then draw and save route lines. Details in [mobile/README.md](mobile/README.md#drawing-routes).

### Making a wall model

Needs a Windows PC with an NVIDIA GPU, RealityScan 2.2 installed through the Epic Games Launcher (the script looks for `RealityScan.exe` under `C:\Program Files\Epic Games`), and Node. The team does this on its own PC ([ADR 0001](docs/adr/0001-photogrammetry.md)).

1. Photograph the wall using the [capture checklist](docs/capture-checklist.md)
2. Process the photos with `scripts/realityscan/run.reproject.ps1 -Name <wall> -Imgs <photo folder>`. After RealityScan, it fixes up the export (`glb-finish.mjs`), swaps the texture for a JPEG (`glb-texture.mjs`, `-Quality 85` by default) and levels the model from the camera poses (`level.mjs`). It prints how many photos aligned and the size against the 15 MB budget. Alignment ignores the photos' GPS, because phone GPS is metres off and fitting the model to it tilted crag models by 35-55 degrees (`-UseGps` turns it back on)
3. Runs go in `-Root`, which defaults to the team PC's `C:\Users\Garage\rs`. Copy `<Root>\<wall>\out\<wall>.glb` to `data/models/`, then follow [Adding a wall](data/README.md#adding-a-wall) to list it, draw its routes and show it in the app

## Data

Route and area data comes from [OpenBeta](https://openbeta.io) and is CC0. Coverage is uneven: length, bolts and descriptions are often missing. To fix or fill in a route, edit it on openbeta.io; the app shows OpenBeta's data, so the fix shows up here too. Details in [docs/openbeta.md](docs/openbeta.md).

Wall models and route lines are files in [data/](data/README.md).

## Docs

- [Requirements](docs/requirements.md): what we're building and why
- [Architecture](docs/architecture/README.md): how the pieces fit, today and planned
- [Data](data/README.md): the demo models, file formats, and adding a wall
- [OpenBeta data](docs/openbeta.md): how the app uses the API, and known gaps
- [Capture checklist](docs/capture-checklist.md): photographing a wall
- [Camera test](docs/camera-test.md): Expo's camera against the phone's own, for Milestone 2 (#48)
- [Decisions](docs/adr/): architecture decision records
- [Proof of concept](docs/poc-plan.md) and [Milestone 1 summary](docs/milestone-1.md)
- [Work agreement](docs/work-agreement.md): how the team works

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).

## License

The code doesn't have a license yet; the team is still choosing one. Until then, ask before reusing it. OpenBeta's data is CC0.
