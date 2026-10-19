# 5. One GLB per wall

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

RealityScan turns a wall's photos into a textured mesh ([0001](0001-photogrammetry.md)). The app needs one file per wall that downloads quickly on a phone, looks sharp enough to pick out holds, runs smoothly, and lines up with the route lines drawn on it.

What the proof of concept found:

- RealityScan's default GLB export uses its checkerboard layer instead of the photo texture, comes out Z-up, keeps the texture as a separate 42–58 MB PNG, and includes vertex colors that darken the texture
- Texturing a simplified mesh looks blurry. Texturing the full-detail mesh first, then simplifying and copying the texture across, keeps it sharp
- On an iPhone, the 16-photo model ran at 60 fps with an 8K texture, and 8K was visibly sharper than 2K
- The same 8K texture stored as JPEG instead of PNG cut the file from 40 MB to 11.8 MB with no visible loss
- Preview-quality reconstructions are too rough to judge, so normal quality is the minimum

Options considered:

- **Triangle count.** 300k, 1M or 8M. At 8M triangles, Ouch Wall came out at 199 MB, far too big for a phone.
- **Texture format.** PNG is lossless but about 40 MB. JPEG is about 12 MB with no visible loss. KTX2 is compressed for the GPU, so it's smaller in memory too, but needs extra tooling.

## Decision

Each wall is one self-contained GLB in `data/models/`, made by `scripts/realityscan/run.reproject.ps1` and then `scripts/realityscan/glb-finish.mjs`.

- Reconstruct at normal quality, texture the full-detail mesh, then simplify to 300k–1M triangles and reproject the texture
- One 8K texture, or two at most, stored as JPEG and embedded in the file
- Y-up, with the photo texture only and no vertex colors
- 15 MB or less, running at 30 fps or more on the team's iPhones
- List each model in `data/models/index.json`

## Consequences

- A 300k-triangle model with one 8K JPEG comes to about 12 MB and fits the budget
- The two models in the repo don't fit yet. `crag16.glb` is 38 MB with a PNG texture, and `wall47.glb` is 35 MB with two 8K JPEGs and 1M triangles. They need their textures and geometry compressed (#37)
- `run.reproject.ps1` re-encodes the texture as a quality-85 JPEG and swaps it in with `glb-texture.mjs`, then levels the model from the camera poses with `level.mjs`. It warns when the result is over 15 MB
- JPEG only shrinks the download. On the phone, each 8K texture still takes about 358 MB of GPU memory, which older phones may not have. KTX2 (#37) is the fix if #34 shows trouble
- Every reconstruction has its own coordinate system, so rebuilding a wall's model means redrawing its routes. Changing only the texture doesn't
- Texturing before simplifying makes each run take longer
