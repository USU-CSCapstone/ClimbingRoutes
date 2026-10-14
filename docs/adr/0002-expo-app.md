# 2. Expo for iOS, Android and web

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The app has to run on iOS, Android and the web from one codebase. Both team members test on iPhones, and one develops on Windows, so everything has to build and run from Windows, in a browser and on a phone, without a Mac. Milestone 1 was planned as a Vite web app in `web/` (#23 to #30), and the team switched before building it.

Options considered:

- **Vite and React, web only.** The fastest start, and three.js runs as-is. But there's no app on the phone, storage for offline use in mobile Safari is limited, and iOS and Android would come later as a second codebase.
- **React Native without Expo.** One codebase for both phone platforms, but iOS builds need a Mac with Xcode, and the web would be a separate project.
- **Flutter.** One codebase everywhere, but a new language (Dart) for a team that knows TypeScript and React, and the 3D and map libraries we want are web libraries.
- **Expo with Expo Router.** React Native and React Native Web from one TypeScript codebase. Expo Go runs the app on an iPhone straight from a Windows machine, and EAS builds iOS apps in the cloud.

## Decision

Build the app with Expo (SDK 57), Expo Router and TypeScript, in `mobile/`.

- Every screen is a file in `src/app/`, and everything else lives outside it
- `src/core/` is plain TypeScript with no React, enforced by lint, so Node scripts can share it
- Screens get data only through the hooks in `src/data/`, never from the network directly, so offline storage can be added there later
- Add packages with `npx expo install` so their versions match the SDK
- Stay within what Expo Go includes until a native module is really needed, then move to a development build
- Browser-only libraries, like three.js and MapLibre, run through Expo DOM components (see [0004](0004-wall-viewer.md))

## Consequences

- One codebase covers iOS, Android and the web, and anyone on the team can test on their own iPhone
- Milestone 1's tickets still say `web/`; they mean `mobile/`
- Expo renames and removes APIs with each SDK release, so upgrades take care, and the docs for the matching SDK version have to be checked rather than remembered (see `mobile/AGENTS.md`)
- A native module outside Expo Go means a development build, which is slower to set up than scanning a QR code
- The web gets the phone's screens by default; a desktop layout has to be built per screen, as the Wall page does
