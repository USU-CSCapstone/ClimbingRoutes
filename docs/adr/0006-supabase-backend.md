# 6. Supabase for accounts, the model queue and model hosting

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

Wall models were made by hand: photos copied to the team PC, the GLB committed to `data/models/`, and route lines drawn in `/author` against a local server. The next step is photos taken in the app, processed on the team PC, reviewed and published without anyone moving files. That needs accounts, somewhere to put photos and models, a job queue the team PC can poll, and rules for who can see unpublished models.

Limits:

- Free hosting only
- The team PC can't accept incoming connections. It's reached over Tailscale and SSH only
- Route lines only fit the exact model version they were drawn on

## Decision

Use one Supabase project on the free plan for auth, Postgres and storage.

- Email and password accounts, made in the dashboard. Public sign-up is off
- Tables: `profiles` (`is_moderator`, set by hand in SQL), `captures` (the job queue), `wall_models` (one row per version) and `route_lines` (per version)
- Buckets: `captures` and `review` are private, and `models` is public
- Access is enforced with row-level security, and checked by `supabase/tests/rls-check.mjs`
- The app uses only the publishable key and the user's session. The secret key stays on the team PC
- Versions never change. Reprocessing a wall adds `<wall>/v<N+1>.glb`
- The app loads published models from the `models` bucket instead of `data/models/` in git. [0005](0005-wall-model-format.md) still sets the file format
- The worker on the team PC polls Supabase, so the PC needs no incoming connections

## Consequences

- No servers of our own. The access rules live in SQL in `supabase/migrations/`
- The free plan gives 1 GB of storage and 50 MB per file. Photos are deleted once the PC archives them, and old versions may need pruning
- Free projects pause after a week with no activity
- Moving model files to Cloudflare R2 later means changing only the app's model URL function and the approval step
