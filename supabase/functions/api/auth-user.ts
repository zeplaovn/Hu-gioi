/* Verify user identity with Supabase Auth, rather than maintaining signing
 * keys in the game Edge Function. No token, user profile or API key is logged. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVerifiedUserId(
  accessToken: string,
  baseUrl: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!apiKey || !accessToken) return null;
  let response: Response;
  try {
    response = await fetchImpl(baseUrl + '/auth/v1/user', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'apikey': apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    throw Error('AUTH_UNAVAILABLE');
  }
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw Error('AUTH_UNAVAILABLE');
  let user: { id?: unknown; role?: unknown };
  try { user = await response.json(); }
  catch { throw Error('AUTH_UNAVAILABLE'); }
  return user && typeof user.id === 'string' && UUID.test(user.id) &&
    user.role === 'authenticated' ? user.id : null;
}
