# 3. OpenBeta for route data

- **Status:** Accepted
- **Date:** 2026-09-23

## Context

The app needs route and area data for the USA: names, grades, types, the left-to-right order on a wall, first ascents and locations. The team can't collect that by hand at any useful scale.

Options considered:

- **Mountain Project.** The most complete data, but its API is closed to new developers and its terms don't allow reusing its data. It's also the product this app competes with.
- **OpenBeta.** An open GraphQL API at `api.openbeta.io` that needs no key, with all data released as CC0. Coverage is uneven: length, bolts and descriptions are often missing, and some walls have no left-to-right order.
- **Our own data, entered by hand.** Complete for the walls we model, but it doesn't scale past a few walls.

## Decision

Use OpenBeta's GraphQL API as the app's only source of route and area data.

- Look areas and climbs up by uuid, never by name, because names aren't unique
- Search through openbeta.io's own search server (Typesense) with the read-only key from their public website code, and fall back to GraphQL area search if it fails
- Show missing details as unknown rather than hiding them
- Credit OpenBeta on route pages
- Keep Mountain Project ids in the data, but don't link to Mountain Project (decided 2026-10-12), so climbers stay in the app

## Consequences

- The data is free and legal to reuse, including offline
- Pages are only as full as OpenBeta: Date Wall's six routes have names, grades and first ascents, but no length, bolts or descriptions. Filling the gaps means contributing to OpenBeta, which improves the app too
- A wall's routes are only numbered left to right when OpenBeta has the order
- Search depends on a server that isn't a documented API, with a key that could change. The fallback finds areas but not routes. Asking OpenBeta for access, or building our own index from their data export, is still open
- OpenBeta's uuids tie drawn route lines (`data/routes/`) to their routes, so a renamed route keeps its line
- If OpenBeta is down, the app has nothing to show beyond what it has cached
