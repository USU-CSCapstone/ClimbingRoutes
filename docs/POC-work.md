# POC Work Log

Day-by-day notes from the proof of concept. The plan and results are in [poc-plan.md](poc-plan.md).

## 2026-09-23

- **Setup (#2):** installed RealityScan 2.2 on the processing PC (HP Z2 G9, i7-13700, 32 GB RAM, NVIDIA RTX A4000 16 GB). GPU processing works on the current driver
- **Command line:** RealityScan runs headless from a script (align, mesh, simplify, texture, export GLB), so runs are repeatable and timed
- **Test 1:** RealityScan's sample set, 14 photos of a bronze relief. 66 s end to end, all photos aligned, 1.38M-triangle mesh simplified to 300k, one 8K texture
- **Test 2:** 20 iPhone HEIC photos of a campus building corner. 119 s, all photos aligned, 2.98M triangles simplified to 300k. Window glass and sky leaked into the texture, and one 8K texture held only about half the photo detail
- **Export problems:** the default GLB export uses RealityScan's checkerboard layer instead of the photo texture, comes out Z-up, and keeps the texture as a separate 42–58 MB PNG
- **OpenBeta:** added scripts that pull the test wall's routes into JSON. See [openbeta.md](openbeta.md)

## 2026-09-25

- **Remote access:** the processing PC can be reached remotely over Tailscale and OpenSSH
- **Headless runs over SSH:** RealityScan started from an SSH session runs in Windows' background session and silently does nothing. Fix: start it from a scheduled task created with `/it`, so it runs in the logged-in session
- **Preview vs. normal quality:** a preview-quality run takes about a minute but is too rough to judge. Normal quality is the minimum
- **Texture memory:** an 8K texture needs about 358 MB of GPU memory and made up 94% of the file

## 2026-09-28

- **New pipeline scripts (#18):** `run.reproject.ps1` textures the full-detail mesh, simplifies it, then copies the texture onto the simplified mesh. `glb-finish.mjs` fixes the export problems: it picks the photo texture, removes vertex colors, turns the model Y-up and embeds the texture
- **First crag run:** 16 photos, normal quality, automatic region. 4 minutes, 299,978 triangles, one 8K texture, 34.8 MB GLB
- **Best model so far:** 47 photos, 1M triangles, two 8K textures (`wall47.glb`), with a web viewer for the demo

## 2026-09-30

- **Route lines:** Date Wall routes drawn on `wall47.glb` and saved to `data/routes/wall47.json`
- **Viewer:** a second model added, and the viewer adjusted

## 2026-10-05

- **Phone test:** the 16-photo model in Safari on an iPhone ran at 60 fps with 2K and 8K textures. 8K was visibly sharper
- **JPEG textures:** the same 8K texture stored as JPEG cut the model from 40 MB to 11.8 MB with no visible loss
- **Ouch Wall:** reconstructed at 1M triangles (31.4 MB with a JPEG texture) and 8.1M triangles (199 MB)
