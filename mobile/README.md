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

Before pushing:

```
npx tsc --noEmit
npx expo lint
```

## Drawing routes

The author tool at `/author` draws route lines on a wall's model and saves them to `data/routes/`. It only exists in development, in a desktop browser. It reads and saves through a small server for the repo's `data/` folder, so run that too, from the repo root:

```
node scripts/viewer/serve.mjs
```

Then open http://localhost:8081/author. `?model=crag16.glb` picks a model from `data/models/index.json`. Pick a route, click **Draw**, and click holds from the start upward. **Save routes** writes `data/routes/<model>.json`; commit that file to share the lines.

## Layout

- `src/app/` screens and navigation (Expo Router). Explore, Map and Search share the area and route pages through the `(explore,map,search)` group. `walls/` is the 3D wall page, and `moderate/` the moderator section
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
