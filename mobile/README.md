# Climbing Routes app

Expo app (iOS, Android, web) for browsing and searching OpenBeta climbing data. Covers the USA.

## Run

Needs Node 20 or newer. Works the same on Mac and Windows.

```
cd mobile
npm install
npx expo start
```

- **Web:** press `w`, or open http://localhost:8081
- **iPhone:** install Expo Go, then scan the QR code with the Camera app. Phone and computer must be on the same Wi-Fi. If the school network blocks it, run `npx expo start --tunnel`

Before pushing:

```
npx tsc --noEmit
npx expo lint
```

## Layout

- `src/app/` screens and navigation (Expo Router). Explore and Search share the area and route pages through the `(explore,search)` group
- `src/core/` types, OpenBeta client, search, grades. No React imports, so Node scripts can reuse it (enforced by lint)
- `src/data/` React Query hooks and caching
- `src/ui/` shared components
- `src/viewer/` the 3D wall viewer, on three.js. It needs a browser, so screens show it through the `wall-viewer.tsx` DOM component, which runs in a webview on iOS and Android

## Data

- **Area and route pages:** OpenBeta GraphQL at `api.openbeta.io`, looked up by uuid
- **Search:** openbeta.io's Typesense server, using the read-only key from their public website code. It isn't a documented API and the key could change. If it fails, search falls back to GraphQL area search, which can't find routes
- **Caching:** responses are cached in memory for a day. Nothing is stored on the device yet
- **License:** OpenBeta data is CC0. The route page credits OpenBeta

Known data gaps: many routes have no length, bolt count or description. A wall's routes are numbered left to right only when OpenBeta has `leftRightIndex`.
