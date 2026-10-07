export const OPENBETA_GRAPHQL_URL = 'https://api.openbeta.io';

// openbeta.io's own read-only search key, taken from the public open-tacos repo.
// It is not a documented public API and may be rotated; search falls back to
// GraphQL area search if it fails.
export const TYPESENSE_URL = 'https://typesense-01.openbeta.io';
export const TYPESENSE_KEY = 'bCGIB4sHsJRy06NFjZLtxKIMgr4aO0tX';

/** v1 covers the USA. Explore starts here and search is limited to it. */
export const ROOT_AREA = { uuid: '1db1e8ba-a40e-587c-88a4-64f5ea814b8e', name: 'USA' };
