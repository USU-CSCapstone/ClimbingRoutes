POC work day by day.

9-23-2026:

- **Setup (#2):** Installed RealityScan 2.2 on the processing PC (HP Z2 G9, i7-13700, 32 GB RAM, NVIDIA RTX A4000 16 GB). GPU processing works on the current driver.
- **Command line:** RealityScan can run headless from a script (align, mesh, simplify, texture, export GLB), so runs are repeatable and timed.
- **Test 1:** RealityScan's sample set, 14 photos of a bronze relief. 66 s end to end, all photos aligned, 1.38M-triangle mesh simplified to 300k, one 8K texture.
- **Test 2:** 20 iPhone HEIC photos of a campus building corner. 119 s, all photos aligned, 2.98M triangles simplified to 300k. Window glass and sky leaked into the texture, and one 8K texture held only about half the photo detail.
- **Export issues for #9/#11:** the default GLB export applies RealityScan's checkerboard layer instead of the photo texture, the model comes out Z-up, and the texture is a separate 42–58 MB PNG.
- **Still needed for #2:** Blender, gltf-transform, and a second reconstruction pipeline.
- **Added Initial OpenBeta Functionality** New OpenBeta scripts and pulled data into a JSON.

