// Pulls Date Wall from the OpenBeta GraphQL API and writes the raw response
// to data/openbeta/date-wall.json. Run from anywhere: node scripts/openbeta/fetch-date-wall.mjs
import { readFile, writeFile } from 'node:fs/promises';

const ENDPOINT = 'https://api.openbeta.io';
const DATE_WALL_UUID = '8c45d40d-363d-5a9b-9659-3df50c5d3916';

const queryUrl = new URL('./date-wall.graphql', import.meta.url);
const outUrl = new URL('../../data/openbeta/date-wall.json', import.meta.url);

const query = await readFile(queryUrl, 'utf8');

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { uuid: DATE_WALL_UUID } }),
  signal: AbortSignal.timeout(30_000),
});

if (!res.ok) {
  throw new Error(`OpenBeta returned HTTP ${res.status}: ${await res.text()}`);
}

const body = await res.json();

if (body.errors) {
  throw new Error(`OpenBeta returned errors: ${JSON.stringify(body.errors, null, 2)}`);
}
if (!body.data?.area) {
  throw new Error(`No area found for uuid ${DATE_WALL_UUID}`);
}

await writeFile(outUrl, JSON.stringify(body, null, 2) + '\n');

const { area_name, climbs } = body.data.area;
console.log(`Wrote ${area_name} with ${climbs.length} climbs to ${outUrl.pathname}`);
