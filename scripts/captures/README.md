# Captures on the team PC

Turns photos uploaded from the app into a model waiting for the moderator. Run on the team PC, in PowerShell on its desktop: RealityScan does nothing when started over SSH.

## Setup, once

1. Copy `.env.example` to `.env` and paste the **secret** key from Supabase (Project Settings → API Keys). It bypasses every access rule, so it stays on this PC and is never committed
2. `npm install`

Everything goes in `C:\Users\Garage\ClimbingData` (`DATA_DIR` in `.env`):

- `captures\<capture id>\`: the photos, `scan.json` from the app, and `capture.json`, the server's row
- `runs\<capture id>\`: the RealityScan run

## Each capture

1. `npm run pull` claims every uploaded capture, downloads it, and prints the next two commands for each
2. Run RealityScan with the printed `run.reproject.ps1` line. It uses `runs\` as its root, so a region box from another wall can't get in
3. `npm run finish -- <capture id>`:
   - fails the capture if under 80% of its photos aligned as one piece, or if the model is over 50 MB
   - otherwise uploads the model to `review` as the wall's next version, marked `needs_review`
   - marks the capture processed, and deletes its photos from Supabase and this PC, keeping `scan.json`

If RealityScan fails, record why, so the person who took the photos can see it:

```
npm run finish -- <capture id> --failed "RealityScan couldn't align the photos"
```

Failed photos are kept for 14 days, so the capture can be run again. `npm run finish -- --sweep` then deletes them, along with photos from uploads that were never finished. Run it now and then.

If the PC restarts in the middle of a pull, `npm run pull -- <capture id>` downloads that capture again.

To test without the app, upload a folder of photos as a capture from `supabase/`: `npm run upload -- <wall uuid> <photo folder>`.
