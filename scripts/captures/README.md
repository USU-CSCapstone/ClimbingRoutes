# Captures on the team PC

Turns photos uploaded from the app into a model waiting for the moderator, with nobody at the PC. The worker (`worker.mjs`) checks Supabase every minute, and for each uploaded capture downloads the photos, runs RealityScan, and puts the model in `review`, or marks the capture failed with a reason the person who took it sees.

## Setup, once

1. Copy `.env.example` to `.env` and paste the **secret** key from Supabase (Project Settings → API Keys). It bypasses every access rule, so it stays on this PC and is never committed
2. `npm install`
3. `.\install-task.ps1`. This starts the worker now, and again whenever this Windows account logs in, in its desktop session. RealityScan does nothing when started over SSH or as a service, so the worker can't run that way. If it says access is denied, run it in a PowerShell opened as administrator

The account has to stay logged in for the worker to run. After a reboot it starts again at the next login, so set Windows to log in automatically if the PC restarts on its own. `.\install-task.ps1 -Uninstall` removes it.

Everything goes in `C:\Users\Garage\ClimbingData` (`DATA_DIR` in `.env`):

- `worker.log`: what the worker did, with times
- `captures\<capture id>\`: the photos, `scan.json` from the app, and `capture.json`, the server's row
- `runs\<capture id>\` and `runs\<capture id>.log`: the RealityScan run and its output

## What the worker does with each capture

1. Claims it, marking it processing, so it's only taken once, and downloads it
2. Runs `run.reproject.ps1` with `runs\` as its root, so a region box from another wall can't get in
3. Fails the capture if RealityScan couldn't make a model, if under 80% of the photos aligned as one piece, or if the model is over 50 MB
4. Otherwise uploads the model to `review` as the wall's next version, marked `needs_review`, marks the capture processed, and deletes its photos from Supabase and this PC, keeping `scan.json`

A capture interrupted by a restart is picked up again when the worker starts. After 3 unexpected errors on one capture, like a dropped connection, it's marked failed. Photos of failed captures, and of uploads never finished, are deleted after 14 days.

## By hand

Stop the worker first (`.\install-task.ps1 -Uninstall`), since both would take the same captures.

1. `npm run pull` claims every uploaded capture, downloads it, and prints the next two commands for each
2. Run RealityScan with the printed `run.reproject.ps1` line, in PowerShell on the PC's desktop
3. `npm run finish -- <capture id>`, or `npm run finish -- <capture id> --failed "<reason>"`

`npm run finish -- --sweep` deletes old photos, and `npm run pull -- <capture id>` downloads a capture again.

To test without the app, upload a folder of photos as a capture from `supabase/`: `npm run upload -- <wall uuid> <photo folder>`.
