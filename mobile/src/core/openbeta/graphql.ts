import { OPENBETA_GRAPHQL_URL } from '../config';

export class OpenBetaError extends Error {}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(OPENBETA_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) {
    throw new OpenBetaError(`OpenBeta returned HTTP ${res.status}`);
  }
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) {
    throw new OpenBetaError(body.errors.map((e) => e.message).join('; '));
  }
  if (!body.data) {
    throw new OpenBetaError('OpenBeta returned no data');
  }
  return body.data;
}
