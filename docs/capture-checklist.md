# Capture Checklist

How the team photographs a wall for a 3D model. It's still a working list: #17 is comparing capture methods to settle on one, and the in-app camera guide (#50) will follow whatever it decides.

Walk along the wall and take one photo every step, starting and ending a step past each edge. Bigger walls just mean more photos.

- Step sideways, don't turn in place
- Keep lots of overlap, so each photo looks almost like the last
- Stay on the 1x lens and hold still
- Overcast light is best, since hard shadows get baked into the model
- For the top of the wall, walk closer instead of zooming
- Transfer originals by cable or Google Drive, not Google Photos or messaging apps

## What's worked so far

- 16 overlapping photos were enough for a usable model (`crag16.glb`). The best model so far, `wall47.glb`, used 47
- Keep photo sets outside the repo. They're too big for git, and `.gitignore` skips HEIC files
- The photos go through `scripts/realityscan/run.reproject.ps1` on the team PC. See "Make a wall model" in [setup](setup.md#make-a-wall-model)
