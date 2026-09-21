# Proof of Concept Plan

Prove that phone photos of a real Logan Canyon wall can become a 3D model that a phone can display, and that a route line drawn on that model reads correctly from multiple angles.

## Purpose

The POC exists to answer four questions before the team commits to the pipeline, the platform, or the wall height target.

1. Which free reconstruction pipeline produces a legible wall model, and at what processing cost?
2. How legible is the top third of a wall captured from the ground?
3. Can a phone render the compressed model smoothly?
4. Does a route line drawn on the model stay on the rock when the view moves?

## Scope

### In scope

- One real wall, one capture session, and one recapture if the first fails at the top
- Two reconstruction pipelines run on the same photo set for comparison
- One cleaned, compressed model in GLB format with real-world scale
- One web-based viewer with a constrained front-arc orbit, opened on a phone
- One route line drawn on the model, labeled with a name and grade from OpenBeta

### Out of scope

- Capture guidance in an app, offline bundles, an authoring tool, accounts, a native app
- More than one wall
- Any UI polish beyond what is needed to test the four questions

## Requirements

### Capture

- Photos come from a phone's main lens, with no ultra-wide, HDR, or portrait processing, and one lens per set
- Three sets kept separate so their contribution can be measured: parallel passes at two distances, angled shots from left and right, and a zoomed pass of the upper wall
- A scale reference of known length is in frame at the base so the model can be scaled to real units
- Reference photos of specific holds at the bottom, middle, and top of the wall are taken for the legibility check
- Light, time, wall dimensions, and photo counts are recorded

### Reconstruction

- Two pipelines process the same photo set. Candidates are RealityScan (formerly RealityCapture), Meshroom, and COLMAP with OpenMVS. If no NVIDIA GPU is available, COLMAP with OpenMVS on CPU and one cloud service stand in
- Processing time, hardware, triangle count, and texture resolution are recorded for each run
- The better pipeline is rerun with the zoomed set added, to measure what it does for the top of the wall

### Model

- Debris and background removed, cropped to the wall, decimated, and exported as GLB
- Geometry and textures compressed, with size recorded before and after
- Scaled to meters using the scale reference

### Viewer

- A single web page using Three.js loads the GLB
- Orbit is limited to a front arc, roughly 90 degrees horizontal and 60 vertical, with zoom limits that keep the camera outside the mesh
- Runs in the phone browser over local Wi-Fi with frame rate readable on screen

### Route line

- Tapping the mesh places points by raycasting; points join into a polyline offset slightly off the surface
- The line carries a label with route name and grade taken from an OpenBeta query for the wall
- One route is drawn, then viewed and screenshotted from five camera positions

## Measurements

| Metric | Target |
|---|---|
| Routes with start holds and finish identifiable on the model | 80% or more |
| Routes finishing in the top third with finish identifiable | Recorded; drives the recapture decision |
| Compressed GLB size | 50 MB or less |
| Phone frame rate in the viewer | 30 fps or more |
| Route line stays on the rock from five angles | Yes, no visible floating or sinking |
| Processing time per pipeline | Recorded; informs the server decision |

Legibility is scored by a climber who knows the wall, per route, on three points: start identifiable, line followable, finish identifiable.

## Exit criteria

- **Go.** One pipeline meets the legibility target, the GLB fits the size budget, the phone holds frame rate, and the line stays on the rock. The team picks that pipeline, picks the platform, and starts the core app.
- **Partial.** Bottom and middle of the wall pass, top fails. One recapture with a denser zoomed pass or a higher vantage point. If the top still fails, lower the v1 wall height target or accept reduced top detail as a known limit.
- **No-go.** Neither pipeline produces a legible model. Evaluate Gaussian splatting, or return to boulders as the first target.

## Deliverables

1. Photo sets with capture notes
2. Two raw reconstructions and one cleaned, compressed GLB
3. The viewer page with one labeled route, demonstrated on a phone
4. A results file with the filled metrics table, screenshots, and the exit decision
5. The OpenBeta query and its returned JSON for the wall
