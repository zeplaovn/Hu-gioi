/* Google OAuth PKCE flow: no SDK, no inline script, no implicit JWT adoption. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../client/auth/supabase.js'), 'utf8');

function harness() {
  const store = new Map();
  const calls = [];
  const location = {
    protocol: 'https:', hostname: 'hugioi.blackbearvn.workers.dev',
    origin: 'https://hugioi.blackbearvn.workers.dev', pathname: '/',
    search: '', hash: '', assigned: '',
    assign(url) { this.assigned = url; }
  };
  const root = {
    location, crypto: webcrypto, TextEncoder, URL, URLSearchParams,
    btoa: binary => Buffer.from(binary, 'binary').toString('base64'),
    HU_AUTH_MODE: 'direct',
    sessionStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, val),
      removeItem: key => store.delete(key)
    },
    history: {
      replaceState(_state, _title, dest) {
        const u = new URL(dest, location.origin);
        location.pathname = u.pathname;
        location.search = u.search;
        location.hash = u.hash;
      }
    },
    async fetch(url, options) {
      calls.push({ url, options });
      if (url.includes('grant_type=pkce'))
        return response(200, { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
      if (url.endsWith('/auth/v1/user'))
        return response(200, { id: 'verified-user', email: 'test@example.com' });
      throw Error('Unexpected request ' + url);
    }
  };
  vm.runInNewContext(source, { window: root, Uint8Array, Date, URL, URLSearchParams, String, JSON });
  return { root, location, store, calls, auth: root.HU_SUPABASE };
}
function response(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

test('Google OAuth uses SHA-256 PKCE and exchanges same-tab callback only', async () => {
  const { auth, location, store, calls } = harness();
  await auth.loginGoogle();
  const url = new URL(location.assigned);
  assert.equal(url.origin, 'https://rvrwfeblishqadkpzspb.supabase.co');
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.equal(url.searchParams.get('redirect_to'), location.origin + '/');
  assert.match(url.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(url.searchParams.has('code_verifier'), false);
  assert.equal(url.searchParams.has('access_token'), false);
  assert.equal(store.size, 1);
  location.search = '?code=one-time-code';
  const account = await auth.user();
  assert.equal(account.id, 'verified-user');
  assert.equal(location.search, '');
  assert.equal(store.has('huGioiGoogleOAuthPkceV1'), false);
  const exchange = calls.find(c => c.url.includes('grant_type=pkce'));
  assert.ok(exchange);
  assert.equal(JSON.parse(exchange.options.body).auth_code, 'one-time-code');
  assert.match(JSON.parse(exchange.options.body).code_verifier, /^[a-f0-9]{64}$/);
  assert.equal(await auth.accessToken(), 'access');
});

test('OAuth callback with no matching verifier never adopts an unsolicited code', async () => {
  const { auth, location, calls } = harness();
  location.search = '?code=untrusted';
  await assert.rejects(auth.user(), /không hợp lệ hoặc đã hết hạn/);
  assert.equal(location.search, '');
  assert.equal(calls.length, 0);
});

test('OAuth callback rejects expired PKCE and Google cancellation', async () => {
  const { auth, location, store, calls } = harness();
  await auth.loginGoogle();
  const pending = JSON.parse(store.get('huGioiGoogleOAuthPkceV1'));
  pending.created = Date.now() - 11 * 60 * 1000;
  store.set('huGioiGoogleOAuthPkceV1', JSON.stringify(pending));
  location.search = '?code=expired';
  await assert.rejects(auth.user(), /hết hạn/);
  assert.equal(calls.length, 0);

  await auth.loginGoogle();
  location.search = '?error=access_denied&error_description=cancelled';
  await assert.rejects(auth.user(), /không hoàn tất/);
  assert.equal(calls.length, 0);
});

test('Google OAuth fails closed when sessionStorage is unavailable', async () => {
  const { auth, root, location } = harness();
  root.sessionStorage.setItem = () => { throw Error('denied'); };
  await assert.rejects(auth.loginGoogle(), /lưu trữ phiên/);
  assert.equal(location.assigned, '');
});
