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
- A 3D Wall page: the wall's model with each route drawn on the rock, numbered to match the route list. Tap a route in the list or its line to select it. Date Wall in Logan Canyon is the first
- Team accounts, with a moderator account that will review new models
- A route drawing tool for the team (`/author`, development only)

**In progress**

- Photographing a wall in the app ("Scan this wall"), with models built on the team PC and published after review

**Planned**

- Saved routes, grade preferences and filters
- Offline areas for crags with no signal

The full list is in [docs/requirements.md](docs/requirements.md).

## Repo layout

| Path | What's there |
| --- | --- |
| `mobile/` | The app: Expo, Expo Router and TypeScript, for iOS, Android and web. Includes the route drawing tool at `/author` |
| `data/routes/` | Route lines saved by the drawing tool, one file per model |
| `data/openbeta/` | Saved OpenBeta responses for the test wall |
| `scripts/` | OpenBeta fetch, RealityScan pipeline, and the drawing tool's local server |
| `supabase/` | Backend: database tables and access rules, the seed script and access checks |
| `docs/` | Requirements, architecture, decisions and project notes |
| `.github/` | CI |

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

Route and area data comes from [OpenBeta](https://openbeta.io) and is CC0. Coverage is uneven: length, bolts and descriptions are often missing. To fix or fill in a route, edit it on openbeta.io; the app shows OpenBeta's data, so the fix shows up here too. Details in [docs/openbeta.md](docs/openbeta.md).

Published wall models and their route lines come from the team's Supabase project ([ADR 0006](docs/adr/0006-supabase-backend.md)). The files in [data/](data/README.md) are the working copies the route drawing tool uses.

## Docs

- [Setup](docs/setup.md): running every part of the project
- [Requirements](docs/requirements.md): what we're building and why
- [Architecture](docs/architecture/README.md): how the pieces fit, today and planned
- [Data](data/README.md): the models and route files in the repo, and their formats
- [OpenBeta data](docs/openbeta.md): how the app uses the API, and known gaps
- [Capture checklist](docs/capture-checklist.md): photographing a wall
- [Camera test](docs/camera-test.md): Expo's camera against the phone's own, for Milestone 2 (#48)
- [Backend](supabase/README.md): tables, access rules and how to set up a new project
- [Decisions](docs/adr/): architecture decision records
- [Proof of concept](docs/poc-plan.md) and [Milestone 1 summary](docs/milestone-1.md)
- [Work agreement](docs/work-agreement.md): how the team works

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).

## License

The code doesn't have a license yet; the team is still choosing one. Until then, ask before reusing it. OpenBeta's data is CC0.
