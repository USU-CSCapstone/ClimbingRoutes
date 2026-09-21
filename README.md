# ClimbingRoutes

A 3D climbing guide: photograph a climbing wall, get a 3D model you can move around, with routes and grades drawn on the rock from every angle.

## Main requirements

- **3D wall model from photos (photogrammetry):** the user captures a set of overlapping photos of a wall and the app turns them into a textured 3D model. The user orbits, pans, and zooms the model to see the climb from any angle
- **Routes drawn on the model:** each route is a line on the model's surface with its name and grade, so it reads correctly from every viewing angle. Drawn once, viewed from anywhere
- **Guided photo capture and upload:** the app walks the user through capturing enough photos (count, overlap, path along the wall) and uploads them for processing. This is the core user contribution and the only source of wall geometry
- **Route data from OpenBeta:** names, grades, and area hierarchy come from the OpenBeta GraphQL API (CC0 license) since Mountain Project's API is closed to new developers
- **Offline first:** each crag downloads as a bundle (3D models, route lines, route records). All viewing works with no signal. Captured photos queue for upload until connected

## Sub requirements

- **Multi-angle photo fallback:** when reconstruction fails or the device is weak, show the captured photos as a swipeable set of angles with route lines drawn per photo
- **Ease of use, measured:** a new user can identify a named route on the model after opening the app and rotate to see it from another angle with one finger. The model view shows only name and grade per route until tapped
- **Model quality bar:** on the finished model, a climber can identify every route's start holds and finish at default zoom, including routes that top out at the highest point of the wall

## Possible implementation

- **Climbing wall first.** v1 targets a single-pitch sport wall. A wall is captured from the ground in a front facing sweep, so the model is a relief of one face rather than a closed object, and the viewer lets the user move left, right, up, and down across a front arc of roughly 90 degrees rather than a full orbit. Walls under about 15 meters reconstruct best; above that the top loses detail because every photo is taken from far below. Boulders come later and are the easier case
- **Capture: 60 to 150 photos per wall,** not a few. Walk parallel to the wall at two or three distances, shoot straight on and angled left and right, and add a pass from any higher ground nearby. Keep 60 to 80 percent overlap between neighboring shots and use one lens throughout so the pipeline sees consistent camera geometry. A zoomed pass of the upper wall is worth testing in the spike. Overcast light preferred so shadows do not bake into the texture. The capture screen counts photos and shows coverage along the wall
- **Processing off the phone.** v1 pipeline: photos go to a team laptop and through an open-source or free reconstruction tool (COLMAP with OpenMVS, Meshroom, or RealityScan). The result is a textured mesh in GLB format, decimated and texture-compressed for download. On-device option to evaluate: Apple Object Capture's area mode on LiDAR iPhones, which is built for scenes rather than objects and may or may not handle a wall of this size
- **Viewer:** the platform's native 3D view (SceneKit or RealityKit on iOS, SceneView or Filament on Android), or a web viewer such as model-viewer or Three.js inside the app if that is faster to build. Camera constrained to the front arc so the user never ends up staring at the back of a one-sided mesh
- **Route authoring:** the author draws a line on one source photo. Because the pipeline knows that photo's camera pose, the line projects onto the mesh and becomes a 3D polyline. Alternative: tap points directly on the model surface. The spike decides which
- **Data model:** Crag -> Wall (photo set, mesh, camera poses, viewing arc) -> Route (OpenBeta id, name, grade, 3D line points)
- **Test site:** one wall in Logan Canyon, used all year. The Practice Walls at the canyon mouth are the first candidate for roadside access. Capture in October before snow
- **Two-week spike before anything else:** photograph the test wall, run the photos through two pipelines, and record processing time, output size, and whether holds are legible on the model. Check the top third of the wall specifically, since that is where a ground-level capture is weakest
- **Bundle budget:** target 50 MB or less per wall after decimation and texture compression. Show size before download

## Assumptions

- Crags have no cell signal. Capture happens offline; processing and download happen at home
- Reconstruction does not run on the phone in v1
- Walls are photographed from the ground. Detail falls off toward the top of the wall, and the model has no back side
- Rock is a good photogrammetry subject: matte, textured, static. Vegetation, people, and moving shadows are the enemies
- A usable model needs dozens of overlapping photos. The capture flow has to get users there without making them think about it
- Models are large. Offline storage and download time are real constraints, unlike with 2D topos
- Someone hand-authors every route line. The team seeds two or three walls for v1
- Primary users are single-pitch sport climbers. Boulderers are the stretch audience

## Unknowns

**Resolved**

- Route names and grades come from OpenBeta. Mountain Project is not an option
- Route geometry cannot be pulled automatically. It must be drawn
- Wall geometry comes from user photos. No existing source has it

**Open**

- Which reconstruction pipeline: COLMAP and OpenMVS, Meshroom, RealityScan, Apple Object Capture, or Gaussian splatting? The spike answers this
- How long does one wall take to process on a laptop: minutes or hours?
- What is the minimum photo count for a model where holds are legible?
- How legible is the top of a 15 meter wall from ground-level photos, and does a zoomed pass help?
- How big is a wall model after compression, and does it fit the bundle budget?
- Does draw-on-photo then project-to-mesh place lines accurately, or do authors need to draw in 3D?
- Does v1 need a server for photo upload and processing, or can the team process by hand? Decide by January
- OpenBeta coverage for Logan Canyon walls. Check before choosing the test site

## Success criteria

- From a fresh capture at the test wall, the pipeline produces a model on which every route's start holds and finish are identifiable, within one day of processing
- A new user identifies a named route on the model within 30 seconds and moves the view to see it from another angle
- The full demo runs in airplane mode, and the test wall bundle is 50 MB or less

## Users

Outdoor climbers, narrowed to single-pitch sport climbers for v1. Boulderers are the stretch audience.

## Possible features

- Boulder capture: full walk-around photogrammetry with a complete orbit in the viewer
- AR preview: place the 3D model in AR on the ground, tabletop size or life size, to study the wall before climbing
- AR overlay registered to the real wall (the original concept, now deferred)
- Measurements from the model: route height, overhang angle, bolt spacing
- Gaussian splatting for photoreal views instead of a textured mesh
- Leaderboard and ticks
- Beta videos
- Community upload and moderation pipeline
- Second platform
