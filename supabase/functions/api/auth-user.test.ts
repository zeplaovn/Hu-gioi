import { getVerifiedUserId } from './auth-user.ts';

function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
const ID = '11111111-2222-4333-8444-555555555555';
const BASE = 'https://unit-test.supabase.co';
const KEY = 'test-public-key';
const TOKEN = 'test-token-not-a-real-secret';

Deno.test('Supabase Auth is asked to verify the bearer token on every request', async () => {
  let calls = 0;
  const fake: typeof fetch = (_input, init) => {
    calls++;
    ensure(_input === BASE + '/auth/v1/user', 'correct Auth URL');
    ensure(init?.method === 'GET', 'GET user');
    ensure(new Headers(init.headers).get('authorization') === 'Bearer ' + TOKEN,
      'token passed only as Auth header');
    ensure(new Headers(init.headers).get('apikey') === KEY, 'public API key');
    ensure(init.signal instanceof AbortSignal, 'request has timeout');
    return Promise.resolve(new Response(JSON.stringify({ id: ID, role: 'authenticated' }), { status: 200 }));
  };
  ensure(await getVerifiedUserId(TOKEN, BASE, KEY, fake) === ID, 'Auth user returned');
  ensure(await getVerifiedUserId(TOKEN, BASE, KEY, fake) === ID, 'subsequent request checked');
  ensure(calls === 2, 'no stale session cache');
});

Deno.test('Invalid, revoked, expired, and non-user sessions are denied', async () => {
  for (const status of [401, 403]) {
    const rejected: typeof fetch = () => Promise.resolve(new Response('', { status }));
    ensure(await getVerifiedUserId(TOKEN, BASE, KEY, rejected) === null, 'invalid token rejected');
  }
  for (const user of [
    { id: ID, role: 'service_role' },
    { id: 'invalid', role: 'authenticated' },
    { role: 'authenticated' },
    { id: ID, role: 'anon' },
    null
  ]) {
    const fake: typeof fetch = () => Promise.resolve(new Response(JSON.stringify(user), { status: 200 }));
    ensure(await getVerifiedUserId(TOKEN, BASE, KEY, fake) === null, 'unverified identity rejected');
  }
  ensure(await getVerifiedUserId(TOKEN, BASE, '') === null, 'no public API key rejected');
});

Deno.test('Supabase Auth outages are not mistaken for invalid user tokens', async () => {
  for (const fake of [
    (() => Promise.reject(new TypeError('network failure'))) as typeof fetch,
    (() => Promise.resolve(new Response('', { status: 503 }))) as typeof fetch,
    (() => Promise.resolve(new Response('{invalid json', { status: 200 }))) as typeof fetch,
  ]) {
    let unavailable = false;
    try { await getVerifiedUserId(TOKEN, BASE, KEY, fake); }
    catch (error) { unavailable = (error as Error).message === 'AUTH_UNAVAILABLE'; }
    ensure(unavailable, 'outage classified as transient maintenance');
  }
});
