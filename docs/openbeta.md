# OpenBeta Data

All route and area data comes from [OpenBeta](https://openbeta.io). The data is CC0 and the API needs no key. Mountain Project's API is closed to new developers, so OpenBeta is the only open option.

## How the app uses it

- **Areas and routes:** the GraphQL API at `https://api.openbeta.io`, looked up by uuid
- **Search:** openbeta.io's own search server (Typesense), using the read-only key from their public website code. It isn't a documented API and the key could change. If it fails, the app falls back to GraphQL area search, which can't find routes
- **Coverage:** browsing and search start at the USA
- **Caching:** responses are cached in memory for a day. Nothing is stored on the device yet
- **Credit:** the route page credits OpenBeta

The endpoints and key are in `mobile/src/core/config.ts`.

## Gaps

Coverage is uneven. Common gaps:

- Length and bolt count missing (returned as `-1`)
- No description, location or protection text
- Safety rating left as `UNSPECIFIED`
- No per-route coordinates
- No left-to-right order (`leftRightIndex`) for some walls, so their routes can't be numbered like a topo

## POC test wall: Date Wall

- **Area:** USA › Utah › Wasatch Range › Northern Wasatch › Cache Valley › Logan Canyon › Date Wall
- **uuid:** `8c45d40d-363d-5a9b-9659-3df50c5d3916`
- **Location:** 41.7428, -111.7827
- **Pulled:** 2026-09-23

| L→R | Route | YDS | French | FA |
|---|---|---|---|---|
| 0 | Trix | 5.5 | 4b | James Fillerup |
| 1 | The Flirt | 5.8- | 5b | Lance Dickey |
| 2 | Twitterpation | 5.8- | 5b | Eric Ripplinger |
| 3 | Smitten | 5.9+ | 5c | Lance Dickey |
| 4 | Hooked | 5.10a | 6a | Lance Dickey |
| 5 | NCMO | 5.6 | 4c | Eric Ripplinger |

All six are sport routes with name and grade only. Length, bolts and descriptions are missing.

Files:

- `scripts/openbeta/date-wall.graphql`: the query
- `scripts/openbeta/fetch-date-wall.mjs`: sends it and writes the response. Run with Node 18 or newer: `node scripts/openbeta/fetch-date-wall.mjs`
- `data/openbeta/date-wall.json`: the raw response
