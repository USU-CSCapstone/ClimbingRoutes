# Milestone 1 Summary

Milestone 1, "Climbing Wall Web App Start", was planned on 2026-10-05 and due 2026-10-12. Its last issues closed on 2026-10-21. The goal was a first version of the app: browse to Date Wall, open its 3D model with the routes drawn on the rock, and read each route's details. All of its issues are closed.

## What changed from the plan

- **Expo instead of a Vite web app.** The plan was a web app in `web/` (#23). The team switched to Expo before building it, to get iOS, Android and the web from one codebase ([ADR 0002](adr/0002-expo-app.md)). Tickets that say `web/` mean `mobile/`
- **The viewer became a shared module.** The POC's `viewer/index.html` became a three.js module in `mobile/src/viewer/` (#29), shown in the app through an Expo DOM component ([ADR 0004](adr/0004-wall-viewer.md)). `/author` replaced the old page (#30)
- **The map covers the USA.** Instead of pins from a saved Logan Canyon file (#26), the map loads areas live from OpenBeta and splits them into their children as you zoom in (#28)
- **Walls with a model are a list in code.** The crag index (#25) became `mobile/src/core/walls.ts`, a stand-in that lists Date Wall

## What shipped

- App layout and navigation, Explore, Search and route pages (#24, #27)
- The map, with walls that have a model marked 3D (#28)
- The Wall page: the 3D model next to the route list, highlighting between the two, and a route details panel (#31, #32, #33)
- The author tool at `/author`, on the shared viewer (#29, #30)
- Decision records 0002 to 0005
- CI: typecheck, lint and a web build on every pull request
- The model pipeline now saves the texture as JPEG and levels the model (`glb-texture.mjs`, `level.mjs`)

## Carried over to Milestone 2

- **Three Date Wall routes aren't drawn.** Trix, The Flirt and Twitterpation can't be placed on the current model (#35)
- **Model size.** The pipeline now makes JPEG textures, but the Date Wall page still uses `wall47.glb`, at 36 MB against [ADR 0005](adr/0005-wall-model-format.md)'s 15 MB budget (#37)
- **Phones.** The phone test (#34) was closed without its frame rate or load time written down. The end-to-end check (#36) found the 3D viewer not working on phones, with the fix planned alongside the database work. The 30-second test with a new user wasn't written down either
