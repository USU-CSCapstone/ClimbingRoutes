# Capture Checklist

How the team photographs a wall for a 3D model. It's still a working list: #17 is comparing capture methods to settle on one. The app's capture guide (#50) shows the photo-taking tips as cards and asks about the light before scanning, so change those in `mobile/src/ui/scan/guide.tsx` too.

Walk along the wall and take one photo every step, starting and ending a step past each edge. Bigger walls just mean more photos.

- Step sideways, don't turn in place
- Keep lots of overlap, so each photo looks almost like the last
- Stay on the 1x lens and hold still
- Overcast light is best, since hard shadows get baked into the model
- For the top of the wall, walk it again from about as far back as the wall is tall, with the phone tilted up, rather than zooming or walking closer. From close to the base the top is seen at too steep an angle to show much detail. This comes from the geometry and hasn't been tested yet (#17)
- Transfer originals by cable or Google Drive, not Google Photos or messaging apps

## What's worked so far

- 16 overlapping photos were enough for a usable model (`crag16.glb`). The best model so far, `wall47.glb`, used 47
- Keep photo sets outside the repo. They're too big for git, and `.gitignore` skips HEIC files
- The photos go through `scripts/realityscan/run.reproject.ps1` on the team PC. See "Make a wall model" in [setup](setup.md#make-a-wall-model)
