export const OPENBETA_GRAPHQL_URL = 'https://api.openbeta.io';

// openbeta.io's own read-only search key, taken from the public open-tacos repo.
// It is not a documented public API and may be rotated; search falls back to
// GraphQL area search if it fails.
export const TYPESENSE_URL = 'https://typesense-01.openbeta.io';
export const TYPESENSE_KEY = 'bCGIB4sHsJRy06NFjZLtxKIMgr4aO0tX';

/** v1 covers the USA. Explore and the map start here and search is limited to it. */
export const ROOT_AREA = { uuid: '1db1e8ba-a40e-587c-88a4-64f5ea814b8e', name: 'USA' };

/** The repo's data/ folder (wall models and route lines), served by scripts/viewer/serve.mjs. */
export const DATA_URL = 'http://localhost:8765/data';

/** Walls with a 3D model in data/models. Date Wall is the POC test wall. */
export const WALLS_WITH_MODELS: string[] = ['8c45d40d-363d-5a9b-9659-3df50c5d3916'];
