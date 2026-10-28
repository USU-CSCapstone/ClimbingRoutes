# Contributing

ClimbingRoutes is a USU Computer Science capstone project, built by Ryan Lewalski ([@RyanLewalski](https://github.com/RyanLewalski)) and Ethan Hunt ([@ethanbhunt](https://github.com/ethanbhunt)). Issues and pull requests from outside the team are welcome.

## Before you start

- Get the app running with the [README](README.md#getting-started). [mobile/README.md](mobile/README.md) covers the code layout, settings and checks
- Look at the open issues and the [current milestone](https://github.com/USU-CSCapstone/ClimbingRoutes/milestones). The team plans in one-week milestones, so for anything bigger than a small fix, open an issue first and agree on the approach
- Read the [decision records](docs/adr/) for the area you're changing. A change that goes against one needs a new record (see [docs/adr/README.md](docs/adr/README.md))

## Making a change

- Branch from `main` and give the branch a short name for the work, like `expo-sdk-58`. Pull requests go to `main`
- Keep each pull request to one change
- The app's rules ([ADR 0002](docs/adr/0002-expo-app.md)):
  - Add packages with `npx expo install`, so their versions match the Expo SDK
  - Stay within what Expo Go includes. A native module that needs a development build needs a decision record first
  - Screens get data only through the hooks in `src/data/`
  - `src/core/` stays plain TypeScript with no React. Lint enforces this
  - Never create or edit `ios/` or `android/` by hand
- Expo changes its APIs every SDK release, so check the docs for the SDK in `mobile/package.json` rather than going from memory
- Wall models and route lines: see [data/README.md](data/README.md)
- Wrong or missing route details come from OpenBeta, so fix them on [openbeta.io](https://openbeta.io) rather than in this repo
- Wall photos are processed on the team's PC, so for now open an issue if you'd like a wall modeled

## Checks

From `mobile/`:

```
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```

CI runs the same three on every pull request. There are no automated tests yet, so also try the change on the web and in Expo Go on a phone, and say in the pull request what you tried.

## Pull requests

- Say what changed and why, and link the issue
- Add screenshots for anything you can see
- A team member reviews every changed file and tries the change themselves before merging

## Reporting bugs and ideas

Open an issue with the bug or feature template. For a bug, say what device, browser or OS you were on, and the wall or route if it's about one.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## License

The code doesn't have a license yet; the team is still choosing one. OpenBeta's data is CC0.
