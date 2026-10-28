# 7. Wall models in git, served from GitHub

- **Status:** Accepted
- **Date:** 2026-10-19 (recorded 2026-10-28)

## Context

The Wall page needs each wall's model and route lines on phones, on any network, not just from a laptop on the same Wi-Fi. The requirements left model hosting open: "Models are 10–200 MB and don't belong in plain git. Git LFS, or file storage with a list of models?" Since then, [ADR 0005](0005-wall-model-format.md) set a 15 MB budget per model, and the team has no backend.

This was decided in practice during Milestone 1, when the app started loading `data/` from GitHub (`DATA_URL` in `mobile/src/core/config.ts`). This record writes it down.

Options considered:

- **Plain git, served by GitHub.** Models and route lines stay in `data/`, and the app fetches them from `raw.githubusercontent.com` on `main`. No server and no keys, and a pull request is the publishing step. Every model version stays in the repo's history for good.
- **Git LFS.** Keeps large files out of normal clones, but `raw.githubusercontent.com` serves LFS files as pointer files, the free plan has storage and bandwidth limits, and every contributor needs LFS installed.
- **File storage with a list of models,** such as Supabase Storage or S3. Scales past a few walls and doesn't grow the repo, but needs an account, keys and an upload step, and nothing else in the app needed a backend yet.

## Decision

Keep finished models and route lines in `data/` in plain git, and have the app load them from the `main` branch on GitHub.

- Only finished GLBs go in `data/models/`, within ADR 0005's 15 MB budget. Photos and RealityScan projects stay out (`.gitignore`)
- A model or route line is published by merging it to `main`
- In development, in a desktop browser on localhost, the app reads the local `data/` through `scripts/viewer/serve.mjs` instead, so new lines show before they're merged

## Consequences

- Phones see new models and lines once they're merged, after up to 5 minutes of GitHub caching
- The repo grows with every model and every rebuilt model, and clones get slower. GitHub warns about files over 50 MB and rejects files over 100 MB
- Forks still load this repo's models until they change `DATA_URL`
- This works for a handful of team-made walls, not for climbers' uploads. The planned pipeline ([architecture](../architecture/README.md#where-its-heading)) has a server for models, and moving to it needs a new record that supersedes this one
