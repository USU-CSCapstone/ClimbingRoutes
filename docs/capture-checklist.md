# Capture Checklist

One page to take to the wall so the session is not improvised.
Works for practice captures (building facade, indoor wall) and real crag sessions.

---

## Before you leave

- [ ] Phone charged above 80%, storage above 5 GB free
- [ ] Camera → Formats → **Most Compatible** (shoots JPEG, not HEIC)
- [ ] HDR **off**, Live Photo **off**, portrait mode **off**, no filters
- [ ] Tape measure or a marked object of known length (scale reference)
- [ ] Notebook or notes app for the record sheet at the bottom
- [ ] If iCloud "Optimize Storage" is on, plan to let photos download fully before transfer

## Conditions

- [ ] **Overcast is ideal.** Hard shadows bake into the texture and move during the session.
- [ ] If sunny, shoot a shaded face, or go early morning / late afternoon
- [ ] Avoid wet or shiny surfaces — they reconstruct badly
- [ ] Avoid heavy glass/windows in frame; they punch holes in the mesh
- [ ] Wait out wind moving vegetation against the surface
- [ ] Nothing in the scene may move or change during the whole session

## On site setup

- [ ] Pick the extent you are capturing and note its rough width and height
- [ ] Lay the tape measure at the base, extended to a round number, visible in many frames
- [ ] Walk the shooting line first and check you can move freely along its whole length
- [ ] Note the farthest distance you can back up — this caps your baseline

---

## The three sets

Keep each set in its own folder from the moment you transfer. Never mix them.

### Set A — parallel passes · target 60–100 photos

- [ ] Stand back roughly 1/3 of the wall's width, camera at chest height, square to the surface
- [ ] Start one full step **past** the left edge — you want overrun on both ends
- [ ] Shoot → step sideways about 0.5 m → shoot → repeat across and one step past the right edge
- [ ] Back up to roughly 1.5× your first distance and repeat the entire pass
- [ ] On tall walls, add a third pass tilted upward to cover the upper portion

### Set B — angled passes · target 30–50 photos

- [ ] Return to the first distance line
- [ ] Turn the camera about **35° left** (shooting obliquely along the surface), walk the full line
- [ ] Repeat with the camera about **35° right**

> Set B is what makes the geometry solvable. A perpendicular pass alone cannot
> triangulate depth on a flat surface. Do not skip it because it feels redundant.

### Set C — zoomed pass of the upper wall · target 20–40 photos

- [ ] Move closer (about half your Set A distance), aim at the upper third
- [ ] Walk the full line again, same sideways stepping
- [ ] Move your feet to get closer. **Never use digital zoom.**

### Reference photos · 5 shots, separate folder

- [ ] Five close-ups of specific identifiable features: bottom, middle, and top
- [ ] These are ground truth for judging whether the model resolved real detail later

---

## Rules that decide whether this works

1. **Step sideways. Never pivot in place.** Rotating from a fixed point produces a
   panorama, and photogrammetry cannot extract depth from a panorama. This single
   mistake kills more captures than everything else combined.
2. **70–80% overlap.** Consecutive frames should look almost the same. If they look
   obviously different, your steps are too big.
3. **One lens per set.** Stay at 1x and watch the indicator — phones silently switch
   to ultrawide in low light or up close. Mixed focal lengths confuse the solver.
4. **Hold still.** Motion blur is invisible on the phone screen and fatal to alignment.
5. **Never crop, edit, filter, or screenshot.** That strips the EXIF the solver needs.
6. **Overrun the edges.** Coverage degrades at the boundary of your photo set, so
   shoot past what you actually care about.
7. **Keep the whole subject in frame** plus some surrounding context.

---

## Transfer

- [ ] Transfer originals only — USB cable, USB drive, or Google **Drive** / OneDrive / Dropbox
- [ ] **Never** email, iMessage, WhatsApp, or Google **Photos** — all recompress or strip EXIF
- [ ] Preserve the folder split: `set-A/`, `set-B/`, `set-C/`, `reference/`
- [ ] Verify the file count on the PC matches what you shot

---

## Record sheet

Fill this in before leaving the site.

| Field | Value |
|---|---|
| Location / wall name | |
| Date and start time | |
| End time | |
| Light (overcast / direct sun / shade / mixed) | |
| Wall width × height (approx.) | |
| Scale reference used, and its true length | |
| Max distance able to back up | |
| Phone model | |
| Set A count | |
| Set B count | |
| Set C count | |
| Reference photo count | |
| Anything unusual (people, wind, lens switched, rain) | |

---

## After processing

Note these so sessions can be compared to each other:

- Did all photos align into a **single** component? If it split into two or more,
  the cause is almost always insufficient overlap between passes.
- Where are the holes, and which rule above explains each one?
- Does a measured distance in the model match the real scale reference? Within 2%?
- Processing time, triangle count, raw output size.
