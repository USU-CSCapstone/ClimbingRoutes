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
- 3D wall models with each route drawn on the rock, numbered to match the route list. Date Wall in Logan Canyon is the first
- Team accounts, with a moderator account that will review new models

**Planned**

- Photographing a wall in the app, with models built on the team PC and published after review
- Saved routes, grade preferences and filters
- Offline areas for crags with no signal

The full list is in [docs/requirements.md](docs/requirements.md).

## Repo layout

| Path | What's there |
| --- | --- |
| `mobile/` | The app: Expo, Expo Router and TypeScript, for iOS, Android and web |
| `data/models/` | Wall models (`.glb`) for the route drawing tool, and `index.json`, its list. The app loads published models from Supabase |
| `data/routes/` | Route lines saved by the drawing tool, one file per model |
| `data/openbeta/` | Saved OpenBeta responses for the test wall |
| `scripts/` | OpenBeta fetch, RealityScan pipeline, and the drawing tool's local server |
| `supabase/` | Backend: database tables and access rules, the seed script and access checks |
| `docs/` | Requirements, decisions and project notes |

## Getting started

Needs Node 22.13+, 24.3+ or 26+.

```
cd mobile
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go (SDK 58) on a phone on the same Wi-Fi. The app already points at the team's backend, so there's nothing else to set up to browse.

Everything else, including the backend, the route drawing tool and making wall models on the team PC, is in [docs/setup.md](docs/setup.md).

## Data

Route and area data comes from [OpenBeta](https://openbeta.io) and is CC0. Coverage is uneven: length, bolts and descriptions are often missing. Details in [docs/openbeta.md](docs/openbeta.md).

## Docs

- [Setup](docs/setup.md): running every part of the project
- [Requirements](docs/requirements.md): what we're building and why
- [OpenBeta data](docs/openbeta.md): how the app uses the API, and known gaps
- [Capture checklist](docs/capture-checklist.md): photographing a wall
- [Backend](supabase/README.md): tables, access rules and how to set up a new project
- [Decisions](docs/adr/): architecture decision records
- [Work agreement](docs/work-agreement.md): how the team works
