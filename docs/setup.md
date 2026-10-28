# Setup

How to run every part of the project. Works the same on Mac and Windows unless a step says otherwise.

| Part | Who needs it | Section |
|---|---|---|
| The app (web and iPhone) | Everyone, including reviewers | [Run the app](#run-the-app) |
| Backend scripts (seed, access checks) | Team | [Backend](#backend) |
| Route drawing tool | Team | [Draw route lines](#draw-route-lines) |
| Photos → 3D model | Team, on the team PC | [Make a wall model](#make-a-wall-model) |

## What you need

- **Node** 22.13+, 24.3+ or 26+ (`node -v` to check)
- **Git**
- **To run on a phone:** Expo Go from the App Store or Play Store, the version for Expo SDK 58

Nothing else for the app. It already points at the team's Supabase project, and needs no accounts or keys to browse.

## Run the app

```
git clone https://github.com/USU-CSCapstone/ClimbingRoutes.git
cd ClimbingRoutes/mobile
npm install
npx expo start
```

- **Web:** press `w`, or open http://localhost:8081
- **Phone:** scan the QR code with the Camera app (iOS) or Expo Go (Android). The phone and computer must be on the same Wi-Fi. If the network blocks it (school Wi-Fi often does), run `npx expo login` once, then `npx expo start --tunnel`

### Things to try

1. **Search:** type `Hooked` or `Logan Canyon`
2. **Browse:** Explore → Utah → down to Logan Canyon → Date Wall. Routes are numbered left to right
3. **3D wall:** on Date Wall, tap **View in 3D**. Three routes are drawn on the rock. Tap one in the list to fly to it. The first open downloads a 36 MB model; later opens load it from the device
4. **Map:** zoom into northern Utah. Walls with a 3D model show **3D**
5. **Sign in:** Profile tab. Accounts are made by the team; ask for a test account. Signing in as the moderator account adds **Moderator tools**

### Before pushing

```
npx tsc --noEmit
npx expo lint
```

CI runs both, plus a web build, on every pull request.

## Backend

Supabase: accounts, the wall model list, route lines and model files. The schema and access rules are SQL in `supabase/migrations/`. Who can do what is in [supabase/README.md](../supabase/README.md).

**Team members, using the existing project:**

1. Get the moderator password and the project's dashboard access from a teammate
2. In `supabase/`, copy `.env.example` to `.env` and fill in the moderator account and your own account. The file is git-ignored
3. Run:

   ```
   cd supabase
   npm install
   npm run check
   ```

   It should end with `48 of 48 passed`. Run it after any change to `migrations/`

**Applying a new migration:** add a file to `supabase/migrations/`, then from the repo root run `npx supabase login` once, `npx supabase link --project-ref ccflxypdobybekmsvbvn` once, and `npx supabase db push`.

**Starting a new project from scratch:** follow [supabase/README.md](../supabase/README.md#setting-up-the-project), then put its URL and publishable key in `mobile/src/core/config.ts`.

Never put the secret key (`sb_secret_…`) in the app or the repo. It belongs only in the team PC's git-ignored `.env`.

## Draw route lines

The `/author` tool draws lines on a model in `data/models/` and saves them to `data/routes/`. Development only, in a desktop browser. From the repo root, with the app running:

```
node scripts/viewer/serve.mjs
```

Open http://localhost:8081/author, pick a route, click **Draw**, and click holds from the start upward. **Save routes** writes `data/routes/<model>.json`.

To publish a wall that has no model yet, with its lines, as v1: from `supabase/`, run `npm run seed -- ../data/routes/<model>.json`. Date Wall is already published this way.

## Make a wall model

On the team PC: Windows, an NVIDIA GPU, Node, and RealityScan 2.2 installed through the Epic Games Launcher (the script looks for `RealityScan.exe` under `C:\Program Files\Epic Games`).

1. Photograph the wall with the [capture checklist](capture-checklist.md)
2. Copy the photos to a folder on the team PC
3. In PowerShell, from `scripts/realityscan/`:

   ```
   .\run.reproject.ps1 -Name <wall> -Imgs <photo folder>
   ```

   After RealityScan it fixes up the export (`glb-finish.mjs`), swaps the texture for a JPEG (`glb-texture.mjs`, `-Quality 85` by default) and levels the model from the camera poses (`level.mjs`). It prints how many photos aligned and the model's size against the 15 MB budget. Alignment ignores the photos' GPS, because phone GPS is metres off and fitting to it tilted crag models by 35–55 degrees (`-UseGps` turns it back on)

   Runs go in `-Root`, which defaults to the team PC's `C:\Users\Garage\rs`, so the model is `<Root>\<wall>\out\<wall>.glb`

RealityScan does nothing when started from an SSH session. Run the script on the PC's desktop, or from a scheduled task created with `/it`.

## Troubleshooting

- **Expo Go says the project is incompatible:** update Expo Go to the SDK 58 version
- **Phone can't connect to the dev server:** use `npx expo start --tunnel`
- **Profile says "Accounts aren't set up yet":** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are empty in `mobile/src/core/config.ts`
- **"Unable to find the 'DomWebView' view" in development:** harmless. It's an error in Expo's own code after leaving a 3D wall or the map, and release builds don't show it
- **`npm run check` fails to sign in:** check the emails and passwords in `supabase/.env`
