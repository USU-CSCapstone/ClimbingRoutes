# Camera test: in-app camera vs the phone's own camera

Issue #48. Shoot the same rock twice, once with Expo's camera (JPEG) and once with the phone's own camera (HEIC), run both sets through RealityScan, and compare. The answer decides whether the guided camera (#51) can use Expo's camera, and feeds the capture method in #17.

## The test screen

In development, Explore shows a **Camera test** row at the top. It opens a throwaway screen (`mobile/src/app/camera-test.tsx`) that takes photos with `expo-camera` and saves each one to a **ClimbingRoutes camera test** album in the phone's photo library. It uses the back 1x lens, flash and zoom off, continuous autofocus and JPEG quality 1, and shows each photo's size and lens EXIF.

What reading `expo-camera`'s code showed (SDK 57 and 58 behave the same), which #51 needs too:

- **EXIF is only written with `exif: true`.** Without it the JPEG has no metadata at all, so RealityScan gets no focal length.
- **iOS crops each photo to the preview's shape.** A full-screen preview on a tall phone keeps only about 60% of the frame, and the EXIF focal length no longer matches the cropped picture. The test screen's preview is 3:4, like the sensor, so nothing is cropped.
- **iOS re-encodes the photo.** It captures HEVC, decodes it and saves a plain JPEG at the `quality` given, so none of the HDR data that the camera app's photos carry survives. It also asks iOS for balanced rather than best photo quality, so the camera app may process its photos more.
- **Photos are 12 MP.** `expo-camera` never raises the camera's maximum photo size. The camera app on an iPhone 16 takes 24 MP.
- **No exposure, brightness or HDR settings on phones.** The exposure and brightness options in its types are web only.

## Before shooting

On the iPhone:

- Settings → Camera → Formats → **High Efficiency**, so the camera app saves HEIC
- Settings → Camera → **Macro Control** on, so the camera app doesn't switch to the ultra-wide lens up close
- Settings → Photos → Transfer to Mac or PC → **Keep Originals**, or a cable transfer turns the HEICs into JPEGs

## Shooting

1. Pick a section of rock and mark where the line starts and ends
2. Walk the line with the test screen, one photo per step, about 20–30 photos ([capture checklist](capture-checklist.md))
3. Straight after, walk the same line with the camera app at 1x, flash off, with the same number of photos
4. Hold the phone the same way, portrait or landscape, for both passes, and note how long each took

## Processing

1. Copy each set into its own folder on the team PC, for example `camtest\inapp` and `camtest\native`, by cable or Google Drive
2. Check what each set carries: `node scripts/realityscan/exif.mjs <inapp folder> <native folder>`
3. Move `C:\Users\Garage\rs\wall.rsbox` aside if it exists. It comes from another alignment and won't line up with these
4. Run each set with the version of `run.reproject.ps1` that ignores the photos' GPS. The HEICs have GPS and the JPEGs don't, so with GPS on, only the HEIC model gets fitted to it:
   - `run.reproject.ps1 -Name camtest-inapp -Imgs <inapp folder>`
   - `run.reproject.ps1 -Name camtest-native -Imgs <native folder>`
5. Compare the lens EXIF with what RealityScan solved, the `FocalLength35mm` in each run's camera XMPs: `Select-String C:\Users\Garage\rs\camtest-inapp\cams\*.xmp -Pattern FocalLength35mm`
6. Add both models to `data/models/index.json` and look at them in `/author`: holes, how readable the holds are, tilt

## Results

| | In-app (Expo, JPEG) | Phone camera (HEIC) |
| --- | --- | --- |
| Phone | iPhone 16 | iPhone 16 |
| Photos | | |
| Pixels | 3024 × 4032 (12 MP) | 4284 × 5712 (24 MP) |
| Focal length, 35 mm equivalent (EXIF) | 26 mm | 26 mm |
| Focal length RealityScan solved | | |
| GPS | | |
| Average file size | | |
| Photos aligned | | |
| Model: holes, holds, tilt | | |
| Time to shoot | | |

### First photos: the in-app ones look dimmer

Both were shot with the same exposure (ISO 32, f/1.6, 1/125 against 1/127 s, 0 EV), so the sensor got the same light. The difference comes after:

- **HDR.** The camera app's HEIF carries HDR data that the iPhone screen uses to show highlights brighter. The in-app JPEG has none, so side by side in Photos the HEIF looks brighter
- **Processing.** `expo-camera` asks for balanced rather than best quality, so it likely gets less of the multi-frame processing that lifts shadows and midtones. How much less is up to iOS
- **File size.** 6.1 MB for the 12 MP JPEG at quality 1, against 2.6 MB for the 24 MP HEIF. Quality 0.9 would make much smaller files, which matters for uploads

To tell the first two apart, compare the photos with Settings → Photos → View Full HDR off, or on the PC. Whatever difference is left comes from the processing.

RealityScan cares more about detail, sharpness and photos that match each other than about brightness, so judge by the models. If the in-app textures come out dark, brighten the whole set evenly on the PC first. The bigger gap is 12 MP against 24 MP.

What could close it:

- **In Expo Go:** nothing in `expo-camera` controls exposure, HDR or processing. Shooting with the camera app and importing from the library (#52) keeps the 24 MP HDR originals, if the import doesn't convert them, but loses the guided overlays
- **Outside Expo Go,** in a development build, which needs a new ADR: patch `expo-camera` or write a small native module that asks for best quality, raises the photo size to 24 or 48 MP and saves Apple's HEIC as it is, or use `react-native-vision-camera`, which has settings for all three

**Conclusion:**
