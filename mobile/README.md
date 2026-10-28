# Climbing Routes app

Expo app (iOS, Android, web) for browsing and searching OpenBeta climbing data. Covers the USA.

## Run

Needs Node 22.13+, 24.3+ or 26+ (Expo SDK 58). Works the same on Mac and Windows.

```
cd mobile
npm install
npx expo start
```

- **Web:** press `w`, or open http://localhost:8081
- **iPhone:** install Expo Go, then scan the QR code with the Camera app. Expo Go must be the version for SDK 58. Phone and computer must be on the same Wi-Fi. If the school network blocks it, run `npx expo login` once, then `npx expo start --tunnel`

Before pushing, run the same checks as CI:

```
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```

There are no automated tests yet, so also try your change on the web and in Expo Go.

There are no standalone builds yet either: the project has no EAS setup (`eas.json`), and everything runs in Expo Go and the browser.

## Configuration

Settings are constants in `src/core/config.ts`. Nothing needs an API key.

| Constant | What it's for |
| --- | --- |
| `OPENBETA_GRAPHQL_URL` | OpenBeta's GraphQL API, for areas, routes and the map |
| `TYPESENSE_URL`, `TYPESENSE_KEY` | openbeta.io's search server and its read-only key (see Data below) |
| `ROOT_AREA` | Where Explore and the map start, and what search covers: the USA |
| `DATA_URL` | Where the app loads wall models and route lines: `data/` on this repo's `main` branch on GitHub |
| `LOCAL_DATA_URL` | Where `/author`, and the Wall page in a desktop browser on localhost, load `data/` instead: `scripts/viewer/serve.mjs` on port 8765 |

- **Phones only see `main`.** A model or route line you add shows on a phone once it's merged to `main`, after up to 5 minutes of GitHub caching. In a desktop browser on localhost you see your local `data/` straight away
- **Forks:** `DATA_URL` points at `USU-CSCapstone/ClimbingRoutes`, so a fork still loads this repo's models. Point it at your fork to test new models on a phone
- **Port:** `serve.mjs` takes a port (`node scripts/viewer/serve.mjs 9000`), but the app always looks on 8765, so change `LOCAL_DATA_URL` to match
- **Walls with a model** are listed in `src/core/walls.ts`. See [Adding a wall](../data/README.md#adding-a-wall)

## Drawing routes

The author tool at `/author` draws route lines on a wall's model and saves them to `data/routes/`. It only exists in development, in a desktop browser. It reads and saves through a small server for the repo's `data/` folder, so run that too, from the repo root:

```
node scripts/viewer/serve.mjs
```

Then open http://localhost:8081/author. `?model=crag16.glb` picks a model from `data/models/index.json`. Pick a route, click **Draw**, and click holds from the start upward. **Save routes** writes `data/routes/<model>.json`; commit that file to share the lines. To show a new model on a Wall page, see [Adding a wall](../data/README.md#adding-a-wall).

## Layout

- `src/app/` screens and navigation (Expo Router). Explore, Map and Search share the area and route pages through the `(explore,map,search)` group
- `src/core/` types, OpenBeta client, search, grades. No React imports, so Node scripts can reuse it (enforced by lint)
- `src/data/` React Query hooks and caching
- `src/ui/` shared components
- `src/viewer/` the 3D wall viewer, on three.js. It needs a browser, so screens show it through the `wall-viewer.tsx` DOM component, which runs in a webview on iOS and Android
- `src/author/` the route author tool behind `/author`, built on the viewer

## Data

- **Area and route pages:** OpenBeta GraphQL at `api.openbeta.io`, looked up by uuid
- **Wall models and route lines:** the Wall page reads `data/` from the repo's `main` branch on GitHub (`raw.githubusercontent.com`), so it works on phones on any network. New models and lines show there once they're merged to `main`, after up to 5 minutes of GitHub caching. In development in a desktop browser on localhost, it reads your local `data/` through `scripts/viewer/serve.mjs` instead, so lines you just saved in `/author` show right away
- **Map:** starts with one dot per state. Zooming in splits an area into its children once they have room on screen, down to single walls (`src/core/map.ts`). Each area loads by uuid the first time the view reaches it. Drawn with MapLibre on OpenFreeMap tiles. The map is a DOM component (`src/ui/wall-map.tsx`), so it runs in a WebView on phones and works in Expo Go
- **Search:** openbeta.io's Typesense server, using the read-only key from their public website code. It isn't a documented API and the key could change. If it fails, search falls back to GraphQL area search, which can't find routes
- **Caching:** responses are cached in memory for a day. Nothing is stored on the device yet
- **License:** OpenBeta data is CC0. The route page credits OpenBeta

Known data gaps: many routes have no length, bolt count or description. A wall's routes are numbered left to right only when OpenBeta has `leftRightIndex`.
