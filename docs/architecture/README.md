# Architecture

How the pieces fit today, how the app's code is organised, and where the project is heading. The reasons behind each choice are in the [decision records](../adr/).

## Today

```mermaid
flowchart LR
  OB["OpenBeta GraphQL<br/>api.openbeta.io"]
  TS["openbeta.io search<br/>(Typesense)"]
  OFM["OpenFreeMap<br/>map tiles"]
  GH["GitHub, main branch<br/>data/: wall models + route lines"]
  App["Expo app<br/>iOS · Android · web"]

  OB -->|"areas, routes, map areas"| App
  TS -->|"search"| App
  OFM -->|"map tiles"| App
  GH -->|"wall models, route lines"| App

  subgraph Team["Team, in development"]
    PC["Team PC<br/>RealityScan + scripts/realityscan"]
    Local["data/ in a local checkout"]
    Serve["scripts/viewer/serve.mjs<br/>localhost:8765"]
    Author["/author<br/>in a desktop browser"]
    PC -->|"wall GLB"| Local
    Local --> Serve
    Serve -->|"models, route lines, saved OpenBeta routes"| Author
    Author -->|"saved route lines"| Serve
    Serve -->|"writes data/routes/"| Local
  end

  Local -->|"pull request, merge"| GH
```

- **Route and area data** comes live from OpenBeta, looked up by uuid. Search uses openbeta.io's own search server and falls back to GraphQL area search ([ADR 0003](../adr/0003-openbeta-data.md), [openbeta.md](../openbeta.md))
- **Wall models and route lines** are files in [`data/`](../../data/README.md), loaded from `main` on GitHub. In development, in a desktop browser on localhost, the app reads the local `data/` through `serve.mjs` instead
- **Models** are made on the team PC: photos go through RealityScan and `scripts/realityscan/run.reproject.ps1` to one GLB per wall ([ADR 0001](../adr/0001-photogrammetry.md), [ADR 0005](../adr/0005-wall-model-format.md))
- **Route lines** are drawn on a model in `/author` and saved as `data/routes/<model>.json`. The author tool takes its route list from a saved OpenBeta response, `data/openbeta/date-wall.json`, so for now it only lists Date Wall's routes
- There's no backend of our own yet

## App code

All app code is in `mobile/src/`. Arrows point from a folder to what it imports.

```mermaid
flowchart TD
  app["src/app<br/>screens and navigation (Expo Router)"]
  author["src/author<br/>route author tool, /author (development only)"]
  ui["src/ui<br/>shared components, Wall page parts, map"]
  data["src/data<br/>React Query hooks and caching"]
  viewer["src/viewer<br/>three.js wall viewer"]
  core["src/core<br/>types, OpenBeta client, search, grades, walls"]

  app --> author
  app --> ui
  app --> data
  app --> core
  author --> viewer
  author --> core
  ui --> data
  ui --> viewer
  ui --> core
  data --> core
  viewer --> core
```

- `src/core` is plain TypeScript with no React, so Node scripts can share it. Lint enforces this
- Screens get data only through the hooks in `src/data`, never from the network directly, so offline storage can be added there later ([ADR 0002](../adr/0002-expo-app.md))
- three.js and MapLibre need a browser, so the wall viewer (`src/viewer/wall-viewer.tsx`) and the map (`src/ui/wall-map.tsx`) are Expo DOM components. They render as-is on the web and in a webview on iOS and Android ([ADR 0004](../adr/0004-wall-viewer.md))
- `src/hooks` and `src/constants` hold the theme and color-scheme helpers

More on each folder in the [app README](../../mobile/README.md#layout).

## Where it's heading

![Planned pipeline: climbers scan a wall in the app, photos upload to Supabase, the team PC turns them into a model, the author tool adds route lines, and a server publishes the 3D wall back to the app](PipelineDiagram.png)

The planned pipeline once climbers can scan walls themselves. Not all of it exists yet:

| Step | Status |
| --- | --- |
| OpenBeta and map tiles into the app | Built. The tiles come from OpenFreeMap, on OpenStreetMap data |
| 1 · Scan in the app, upload on Wi-Fi to Supabase | Milestone 2, in progress. Supabase is being recorded as ADR 0006 (#43) |
| 2 · Team PC pulls the scan | Milestone 2 (#46) |
| 3 · Team PC makes the wall model | Built, run by hand ([README](../../README.md#making-a-wall-model)) |
| 4 · Author tool draws route lines and publishes them | Built. "Publish" is a pull request to `main` today |
| 5 · Server sends 3D walls to the app | Today that server is GitHub. A real one needs a new decision record |
