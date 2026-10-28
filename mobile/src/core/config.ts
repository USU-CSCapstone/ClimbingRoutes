export const OPENBETA_GRAPHQL_URL = 'https://api.openbeta.io';

// openbeta.io's own read-only search key, taken from the public open-tacos repo.
// It is not a documented public API and may be rotated; search falls back to
// GraphQL area search if it fails.
export const TYPESENSE_URL = 'https://typesense-01.openbeta.io';
export const TYPESENSE_KEY = 'bCGIB4sHsJRy06NFjZLtxKIMgr4aO0tX';

/** v1 covers the USA. Explore and the map start here and search is limited to it. */
export const ROOT_AREA = { uuid: '1db1e8ba-a40e-587c-88a4-64f5ea814b8e', name: 'USA' };

// The team's Supabase project: accounts, wall models and route lines. Both values are
// public by design (row-level security in supabase/migrations/ protects the data), so
// they live here rather than in a .env. Never put the secret (service) key in the app.
// If they're ever emptied, the Profile tab says accounts aren't set up.
export const SUPABASE_URL = 'https://ccflxypdobybekmsvbvn.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9tORocZZsmU6UyOOOmrXYQ_BU5F_NT4';

/** The repo's data/ folder (wall models and route lines) on main, as GitHub serves it. */
export const DATA_URL = 'https://raw.githubusercontent.com/USU-CSCapstone/ClimbingRoutes/main/data';

/** The local data/ folder, served by scripts/viewer/serve.mjs. The author tool reads and saves here. */
export const LOCAL_DATA_URL = 'http://localhost:8765/data';

/** Walls with a 3D model in data/models. Date Wall is the POC test wall. */
export const WALLS_WITH_MODELS: string[] = ['8c45d40d-363d-5a9b-9659-3df50c5d3916'];
