# ClimbingRoutes

An AR app that draws climbing route lines over the live camera view of a real wall.

## Main requirements

- **AR route overlay:** point the camera at a selected wall and see route lines with name and grade drawn over the live view
- **Visual localization:** the phone aligns itself to the wall from a stored reference (reference photo or wall model), not from GPS and compass
- **Route authoring:** users draw route lines on a reference photo of the wall and link each line to a route record. This is the only source of route geometry, since no public database has it
- **Offline-first:** each crag downloads as a bundle (reference photos, anchor data, route data). All viewing works with no signal. Uploads queue until connected

## Sub requirements

- **Photogrammetry:** build a 3D wall model from user photos, processed off the phone, for localization or a 3D topo view. Only if the 2D reference photo approach proves insufficient
- **Ease of use, measured:** a new user can identify a named route on the wall within 30 seconds of opening the app. The AR view shows only name and grade per route until tapped
- **Fallback topo view:** the same drawn route lines shown on the static reference photo whenever AR cannot lock on

## Possible implementation

- **One platform for the year:** iOS with ARKit or Android with ARCore. Decide before writing code
- **Anchoring approach for v1:** reference-image detection (ARKit image anchors or ARCore Augmented Images) on a photo of the wall taken from a marked "photo spot." Route lines are stored in that photo's coordinates
- **Data model:** Crag → Wall (reference photo + anchor data) → Route (OpenBeta id, name, grade, line points)
- **Test site:** one boulder or wall in Logan Canyon, used for the whole year
- **Two week spike before anything else:** anchor a line to the real test wall and measure hit rate and drift at 5, 10, and 15 meters in two lighting conditions
- **Stargazing app comparison is UX only, not tech.** Stars are at infinity so orientation is enough. Walls are 5 to 30 meters away so position matters too
- **Route data from OpenBeta:** names, grades, and area hierarchy come from the OpenBeta GraphQL API (CC0 license). Mountain Project's API is closed to new developers

## Assumptions

- Crags have no cell signal
- Wall appearance changes with light and season, so a wall may need more than one reference photo
- Phone LiDAR reaches about 5 meters, so walls are not LiDAR-scanned
- Someone hand authors every route line
- Primary users are single pitch sport climbers, boulderers?

## Unknowns

**Resolved**

- Route names and grades come from OpenBeta. Mountain Project is not an option
- Route geometry cannot be pulled automatically. It must be drawn

**Open**

- Does image anchor detection hold on real rock outdoors at 10+ meters?
- How far off the photo spot can the user stand before tracking fails?
- How many reference photos per wall are needed across lighting and seasons?
- OpenBeta coverage for Logan Canyon. Check before committing
- Is photogrammetry needed for v1 at all?

## Success criteria

- Route line lands within 30 cm of the real holds in 8 of 10 attempts from 10 meters at the test wall
- A new user identifies a named route, within a reasonable amount of time
- The full demo runs in airplane mode

## Users

Outdoor climbers, narrowed to boulderers and single-pitch sport climbers for v1.

## Possible features

- Leaderboard and ticks
- Beta videos
- Community upload and moderation pipeline
- Full 3D photogrammetry topo view
