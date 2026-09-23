# OpenBeta Data

Route names and grades for the test wall come from the [OpenBeta](https://openbeta.io) GraphQL API. The data is CC0 and needs no API key.

## Date Wall

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

All six are sport routes. `leftRightIndex` gives their order on the wall, which should help match each route to the model.

## Files

- `scripts/openbeta/date-wall.graphql` is the query
- `scripts/openbeta/fetch-date-wall.mjs` sends it and writes the response
- `data/openbeta/date-wall.json` is the raw response, unmodified

To refresh the data, run the script with Node 18 or newer:

```
node scripts/openbeta/fetch-date-wall.mjs
```

## Gaps

Coverage for Date Wall is thin. These fields exist in OpenBeta but come back empty, so the query leaves them out:

- Length and bolt count (returned as `-1`)
- Description, location, and protection text
- Safety rating (`UNSPECIFIED`)
- Per-route coordinates

Name and grade are all the POC needs for the route label. Anything beyond that will have to be recorded by the team.
