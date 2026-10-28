# Supabase

The backend for wall models: accounts, the capture job queue, model versions, route lines and file storage. Free plan.

- `migrations/`: tables, statuses, row-level security and storage buckets
- `seed.mjs`: publishes `data/models/wall47.glb` and its lines as Date Wall v1
- `tests/rls-check.mjs`: checks what each kind of account can and can't do
- `config.toml`: settings for the local stack (`npx supabase start`), not the hosted project

## Who can do what

| | Signed out | Regular account | Moderator | Team PC (secret key) |
|---|---|---|---|---|
| Published models, their lines and files | read | read | read | all |
| Unpublished models, their lines, `review` files | – | – | read | all |
| Review a model (publish or reject, with a note) | – | – | yes | all |
| Write route lines | – | – | yes | all |
| Add files to `models` | – | – | only for an existing model row | all |
| Captures and their photos | – | own: start, upload while uploading, mark uploaded, cancel while uploading | read and delete any | all |
| Profiles | – | read own | read all | all |

Also enforced in the database:

- A model version's file path never changes, and nothing in `models` is overwritten or deleted through the API
- Review status only goes `needs_review` → `published` or `rejected`, once, and records who reviewed it and when
- A model can't be published until its file is in `models`
- `is_moderator` can only be changed in SQL

Paths: photos at `captures/<user id>/<capture id>/<file>`, models at `review/` or `models/` + `<wall uuid>/v<N>.glb`.

## Setting up the project

The team's project already exists. These steps are for making a new one; to work with the existing one, see [docs/setup.md](../docs/setup.md#backend).

1. Create a project at [database.new](https://database.new) on the free plan, in an Americas region
2. **Authentication → Sign In / Providers → Email:** turn off **Allow new users to sign up** and **Confirm email**
3. **Authentication → Users → Add user → Create new user** for each account, with **Auto Confirm User** checked:
   - each of your personal accounts
   - the shared moderator account, such as a `+moderator` alias of a team inbox
4. Apply the migrations, either way:
   - CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`
   - or paste each file in `migrations/` into the **SQL Editor**, in order
5. Make the moderator account the only moderator, in the **SQL Editor**:

   ```sql
   update public.profiles set is_moderator = (
     id = (select id from auth.users where email = 'MODERATOR EMAIL HERE')
   );
   select u.email, p.is_moderator from public.profiles p join auth.users u using (id);
   ```

6. Put the **Project URL** and **Publishable key** (Project Settings → API Keys) in `mobile/src/core/config.ts`. They're public by design. The secret key goes only in the team PC's git-ignored `.env`, never in the app or the repo
7. In this folder, copy `.env.example` to `.env`, fill it in, then:

   ```
   npm install
   npm run seed
   npm run check
   ```

## Test plan

`npm run check` signs in signed-out, as `REGULAR_EMAIL` and as the moderator. It runs 48 checks, makes its own fixtures under a made-up wall, and removes them afterwards. It exits non-zero if anything fails. Run it after every migration. It covers:

- **Signed out and regular:** can't see unpublished models, their route lines or `review` files. Can't add model rows, upload to `models` or `review`, or see anyone else's captures or photos
- **Regular:**
  - Sees only their own profile, and can't make themselves a moderator
  - Can't change a model's review status, or add, edit or delete route lines
  - Can start their own capture and upload photos to it, but not into anyone else's capture, and can't overwrite photos
  - Can't set `processing` or a failure reason. Once marked uploaded, can't change the capture, add photos or delete it
- **Moderator:**
  - Sees unpublished models and every capture, and downloads from `review`
  - Rejecting a model records who and when, and the decision can't be changed afterwards
  - Can't publish before the file is in `models`, change a version's path, or delete a published model

Then by hand, in the app on web and in Expo Go:

1. Signed out, Profile shows the sign-in form, and Explore, Map and Search still work
2. A wrong password shows "Wrong email or password."
3. A personal account signs in, shows its email, and stays signed in after the app is closed and reopened
4. Sign out returns to the form
5. In the dashboard's **Table Editor**, `wall_models` has Date Wall v1 `published` with 3 `route_lines`, and the public URL `npm run seed` printed downloads the GLB
