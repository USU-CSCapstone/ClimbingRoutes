# Requirements

ClimbingRoutes is a climbing guide app for outdoor climbers. It's built in two phases:

1. **A climbing guide.** Search, browse and read route information from OpenBeta, on iOS, Android and web
2. **3D walls.** Photogrammetry models of real walls with each route drawn on the rock

Phase 1 is the current focus. Phase 2 has a working proof of concept (see [poc-plan.md](poc-plan.md)).

## Users

Outdoor climbers, starting with single-pitch sport climbers. Boulderers come later.

## Phase 1: climbing guide

### Must have

- **Search:** find any route or area by name. Results show name, grade, type and where it is
- **Browse:** move from a region down through areas and crags to a single wall. Every area uses the same page, which lists its sub-areas or, at a wall, its routes
- **Wall page:** routes numbered left to right, like a guidebook topo, when OpenBeta provides the order
- **Route page:** name, grade, type, length, bolts, description and first ascent when OpenBeta has them, with a breadcrumb back up to the wall. OpenBeta is credited
- **Platforms:** iOS, Android and web from one codebase. Coverage starts with the USA
- **Usable at the crag:** works one-handed, keeps controls at the bottom, stays readable in direct sun

### Should have

- Saved routes and recently viewed
- Grades shown in the climber's preferred system (YDS, French, V-scale), and filtering by grade and type
- **Offline:** download an area and use it with no signal. iOS and Android only; the web version stays online
- Nearby crags and a map, using OpenBeta coordinates

## Phase 2: 3D walls

- A wall with a model can be opened fullscreen from its wall page or any of its route pages
- Routes are drawn as lines on the rock, numbered to match the route list
- Tapping a route in the list moves the camera to it. Tapping a line selects that route
- The camera stays within a front arc of the wall, because the model has no back side
- Models download with their area for offline use
- **Made by the team for now.** We photograph a wall, process it on the team PC with RealityScan ([ADR 0001](adr/0001-photogrammetry.md)), and draw the routes in our desktop tool (`viewer/`). Capture steps are in the [capture checklist](capture-checklist.md)

## Technical approach

- **App:** Expo with Expo Router and TypeScript, in `mobile/`. Data loading and caching use React Query. Screens get data through `src/data/` and never call the network directly, so offline storage can be added later without changing them
- **Route data:** the OpenBeta GraphQL API. It's free, needs no key, and the data is CC0. See [openbeta.md](openbeta.md)
- **Search:** openbeta.io's own search server. If it fails, the app falls back to GraphQL area search, which can't find routes
- **3D:** Three.js through React Three Fiber, on web and native
- **Model pipeline:** `scripts/realityscan/run.reproject.ps1` then `glb-finish.mjs`, which produce a single GLB per wall
- **Team setup:** one developer on a Mac and one on Windows, both with iPhones. Everything has to work from Windows, in the browser and in Expo Go

## What the proof of concept showed

- 16 overlapping phone photos were enough for a usable wall model, processed in about 4 minutes
- Texturing the full-detail mesh before simplifying keeps the texture sharp on a 300k–1M triangle model
- An 8K texture saved as JPEG gives a 12 MB model that runs at 60 fps on an iPhone and looks clearly sharper than 2K. Saved as PNG, the same model is 40 MB with no visible gain
- Preview-quality reconstructions are too rough to judge. Normal quality is the minimum
- Every reconstruction has its own coordinate system, so route lines only line up with the exact model they were drawn on

## Assumptions

- Many crags have no cell signal
- OpenBeta is the only open source of route data; Mountain Project's API is closed. Coverage is uneven, and length, bolts and descriptions are often missing
- 3D reconstruction does not run on the phone
- Walls are photographed from the ground, so detail falls off near the top

## Open questions

- **Search access.** The openbeta.io search server isn't a documented API, and its read-only key comes from their website code. Should we ask OpenBeta for access, or build our own index from their data export?
- **Backend.** Phase 1 doesn't need one. Do we need one to host models?
- **Model hosting.** Models are 10–200 MB and don't belong in plain git. Git LFS, or file storage with a list of models?
- **Model size.** 300k, 1M or 8M triangles? Should we offer a lighter version on slow connections?
- **Route-line format.** Save the surface-following points so phones don't recompute them, and name the exact model each file belongs to
- **3D on phones.** Is React Three Fiber smooth enough in the native app? Test with one model and one route before building the viewer screen

## Success criteria

- A new user finds a named route by search and opens its page within 30 seconds
- Search, area pages and route pages work on iOS, Android and web
- A downloaded area works in airplane mode
- On a team-made model, a climber who knows the wall can identify every route's start and finish
- A wall model is 15 MB or less and runs at 30 fps or more on the team's iPhones

## Later

- Guided photo capture and upload by users
- Boulders, with full walk-around models
- AR: preview a wall model on a table, or overlay routes on the real wall
- Measurements from the model, such as route height and overhang angle
- Gaussian splatting for more realistic views
- Ticks, leaderboards and beta videos
- Community uploads with moderation
