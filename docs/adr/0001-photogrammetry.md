# 1. RealityScan for 3D models

- **Status:** Accepted
- **Date:** 2026-09-28

## Context

v1 turns a set of ground-level phone photos of a wall into a textured GLB, processed on a team PC.

Options considered:

- **RealityScan** Fast, high-quality meshes and textures, free for small teams. Desktop app is Windows-only and needs an NVIDIA GPU.
- **COLMAP with OpenMVS.** Open source and runs on CPU, but slower and takes more setup.
- **Meshroom.** Open source with a GUI, but also needs an NVIDIA GPU and is slower.
- **Apple Object Capture (area mode).** On-device on LiDAR iPhones, but unproven at wall scale.

## Decision

Use RealityScan as the v1 reconstruction pipeline.

- Process on a Windows team PC with an NVIDIA GPU
- Export a cleaned, decimated, texture-compressed GLB

## Consequences

- Processing needs a specific machine; without one, fall back to COLMAP with OpenMVS
- Closed source, so the pipeline can't be scripted or changed beyond what RealityScan exposes
