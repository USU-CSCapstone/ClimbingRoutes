# 4. Wall viewer as plain three.js in an Expo DOM component

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Wall models, with route lines laid over the rock, have to show on iOS, Android and the web, and in the team's route authoring tool in a desktop browser. The proof of concept built this as one page, `viewer/index.html`, loading three.js from a CDN: the model, lines draped over the surface with fast raycasting (three-mesh-bvh), labels, the front-arc camera and a frame rate readout. The requirements say "Three.js through React Three Fiber, on web and native", but nothing was built that way.

React Native screens have no browser, so three.js can't run in them as-is.

Options considered:

- **React Three Fiber, with expo-gl on native.** One React API, but two render paths. expo-gl isn't a full browser, so the HTML labels and some three.js add-ons would need native replacements, and the draping code would be rewritten as React components.
- **A native 3D engine,** such as Filament. Likely the fastest on phones, but a second implementation alongside the web and the authoring tool.
- **Plain three.js in an Expo DOM component.** The POC code becomes a TypeScript module with no React. An Expo DOM component (`'use dom'`) renders it as-is on the web and in a webview on iOS and Android, so there's one implementation everywhere.
- **Keep the separate HTML viewer.** Fine for the web and for authoring, but not usable inside the app.

## Decision

The wall viewer is a plain TypeScript module on three.js, `mobile/src/viewer/viewer.ts`, and app screens show it through the Expo DOM component `mobile/src/viewer/wall-viewer.tsx`.

- three.js and three-mesh-bvh come from npm, not a CDN
- The core has no React and no authoring code, and both the Wall page and the `/author` tool build on it
- Native screens import only the DOM component, never the core, so three.js stays out of the native bundle
- On the web the viewer loads on demand, so three.js stays out of the main bundle
- Props passed to the DOM component are plain data, and its callbacks are treated as asynchronous
- `viewer/index.html` is retired, and `/author` replaces it

## Consequences

- Loading, draping, highlighting, labels and camera moves are written once and behave the same on every platform and in the author tool
- The requirements' mention of React Three Fiber no longer applies
- On phones the viewer runs in a webview, so frame rate, load time and memory for 8K textures depend on the phone's browser engine. #34 measures this
- The screen and the viewer share no state; everything crosses between them as props and callbacks, and taps reach the screen asynchronously
- The same pattern suits other browser-only libraries, and the map (MapLibre) already uses it
- If the webview turns out too slow on phones, moving to a native renderer needs a new decision record
