# Requirements

ClimbingRoutes is a climbing guide app for outdoor climbers. It's built in two phases:

1. **A climbing guide.** Search, browse and read route information from OpenBeta, on iOS, Android and web
2. **3D walls.** Photogrammetry models of real walls with each route drawn on the rock

There are two main parts to the project. Part 1 is climbing app with data/guide. Part 2 is the 3d models, and the viewer.

## Users

Outdoor climbers, starting with single-pitch sport climbers. Boulderers come later.

## Part 1: climbing guide

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

## Part 2: 3D walls

- A wall with a model can be opened fullscreen from its wall page or any of its route pages
- Routes are drawn as lines on the rock, numbered to match the route list
- Tapping a route in the list moves the camera to it. Tapping a line selects that route
- The camera stays within a front arc of the wall, because the model has no back side
- Models download with their area for offline use
- **Made by the team for now.** We photograph a wall, process it on the team PC with RealityScan ([ADR 0001](adr/0001-photogrammetry.md)), draw its routes, and publish it to the backend ([ADR 0006](adr/0006-supabase-backend.md)). Capture steps are in the [capture checklist](capture-checklist.md)
- **Captured in the app.** Photos taken in the app upload for the team PC to process. The moderator account reviews each model, draws its routes and publishes or rejects it. A wall's page offers "View in 3D" once it has a published model

## Technical approach

- **App:** Expo with Expo Router and TypeScript, in `mobile/`. Data loading and caching use React Query. Screens get data through `src/data/` and never call the network directly, so offline storage can be added later without changing them
- **Route data:** the OpenBeta GraphQL API. It's free, needs no key, and the data is CC0. See [openbeta.md](openbeta.md)
- **Search:** openbeta.io's own search server. If it fails, the app falls back to GraphQL area search, which can't find routes
- **3D:** plain three.js in an Expo DOM component, the same code on web and in a webview on phones ([ADR 0004](adr/0004-wall-viewer.md))
- **Model pipeline:** `scripts/realityscan/run.reproject.ps1`, which produces a single GLB per wall ([ADR 0005](adr/0005-wall-model-format.md))
- **Backend:** Supabase for accounts, the model list, route lines and model files, with access enforced in the database ([ADR 0006](adr/0006-supabase-backend.md))
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
- **Model size.** 300k, 1M or 8M triangles? Should we offer a lighter version on slow connections?
- **3D on phones.** Is the webview viewer smooth enough on older phones, with 8K textures?

## Success criteria

- A new user finds a named route by search and opens its page within 30 seconds
- Search, area pages and route pages work on iOS, Android and web
- A downloaded area works in airplane mode
- On a team-made model, a climber who knows the wall can identify every route's start and finish
- A wall model is 15 MB or less and runs at 30 fps or more on the team's iPhones

## Later

- Boulders, with full walk-around models
- AR: preview a wall model on a table, or overlay routes on the real wall
- Measurements from the model, such as route height and overhang angle
- Gaussian splatting for more realistic views
- Ticks, leaderboards and beta videos
- Community uploads with moderation
