# Climbing Routes app

Expo app (iOS, Android, web) for browsing and searching OpenBeta climbing data, with 3D wall models. Covers the USA. Setup for the whole project is in [docs/setup.md](../docs/setup.md).

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

Settings are constants in `src/core/config.ts`. The keys there are public by design: openbeta.io's read-only search key and Supabase's publishable key.

| Constant | What it's for |
| --- | --- |
| `OPENBETA_GRAPHQL_URL` | OpenBeta's GraphQL API, for areas, routes and the map |
| `TYPESENSE_URL`, `TYPESENSE_KEY` | openbeta.io's search server and its read-only key (see Data below) |
| `ROOT_AREA` | Where Explore and the map start, and what search covers: the USA |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | The team's Supabase project, for accounts, wall models and route lines. Row-level security protects the data, so both can be public. Never put the secret key in the app |
| `LOCAL_DATA_URL` | Where `/author` reads models and saves route lines: the local `data/` folder, through `scripts/viewer/serve.mjs` on port 8765 |

- **Port:** `serve.mjs` takes a port (`node scripts/viewer/serve.mjs 9000`), but the app always looks on 8765, so change `LOCAL_DATA_URL` to match
- **Walls with a model** are the walls with a published model in Supabase. To publish one, see [docs/setup.md](../docs/setup.md#draw-route-lines)

## Drawing routes

The author tool at `/author` draws route lines on a wall's model and saves them to `data/routes/`. It isn't working right now: it loads models from `data/models/`, which was removed when the models moved to Supabase storage, and it will load them from Supabase instead.

It only exists in development, in a desktop browser. It reads and saves through a small server for the repo's `data/` folder, so run that too, from the repo root:

```
node scripts/viewer/serve.mjs
```

Then open http://localhost:8081/author. Pick a route, click **Draw**, and click holds from the start upward. **Save routes** writes `data/routes/<model>.json`; commit that file to share the lines. To publish a wall with its lines, see [docs/setup.md](../docs/setup.md#draw-route-lines).

## Layout

- `src/app/` screens and navigation (Expo Router). Explore, Map and Search share the area and route pages through the `(explore,map,search)` group. `walls/` is the 3D wall page, `scan/` the full-screen scan flow for a wall without a model, and `moderate/` the moderator section
- `src/core/` types, OpenBeta client, search, grades. No React imports, so Node scripts can reuse it (enforced by lint)
- `src/data/` React Query hooks and caching, and the Supabase client (`supabase.ts`) and sign-in (`auth.ts`)
- `src/ui/` shared components
- `src/viewer/` the 3D wall viewer, on three.js. It needs a browser, so screens show it through the `wall-viewer.tsx` DOM component, which runs in a webview on iOS and Android
- `src/author/` the route author tool behind `/author`, built on the viewer

## Data

- **Area and route pages:** OpenBeta GraphQL at `api.openbeta.io`, looked up by uuid
- **Wall models and route lines:** from Supabase (`src/data/models.ts`). A wall gets "View in 3D" once it has a published model, and the Wall page shows its newest version with that version's route lines. New versions and redrawn lines show within 5 minutes. Model files download through `modelUrl()` in `src/core/models.ts`, the one place their location is set. The `/author` tool still uses the local `data/` folder
- **Map:** starts with one dot per state. Zooming in splits an area into its children once they have room on screen, down to single walls (`src/core/map.ts`). Each area loads by uuid the first time the view reaches it. Drawn with MapLibre on OpenFreeMap tiles. The map is a DOM component (`src/ui/wall-map.tsx`), so it runs in a WebView on phones and works in Expo Go
- **Search:** openbeta.io's Typesense server, using the read-only key from their public website code. It isn't a documented API and the key could change. If it fails, search falls back to GraphQL area search, which can't find routes
- **Accounts:** email and password sign-in on the Profile tab, through Supabase. Team accounts only, made in the dashboard. The project URL and publishable key are in `src/core/config.ts`; see [supabase/README.md](../supabase/README.md)
- **Caching:** OpenBeta responses are cached in memory for a day. Each model version is saved on the device after its first download (IndexedDB, in the viewer's webview on phones), along with the wall's model lookup and route lines, so a wall that has opened once opens without signal
- **License:** OpenBeta data is CC0. The route page credits OpenBeta

Known data gaps: many routes have no length, bolt count or description. A wall's routes are numbered left to right only when OpenBeta has `leftRightIndex`.
