'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../client/auth/supabase.js'), 'utf8');
const root = path.resolve(__dirname, '..');
const ID = '11111111-2222-4333-8444-555555555555';
const USER = { id: ID, email: 'test@example.invalid' };

function createAdapter(initialHash = '') {
  const records = [];
  const requests = [];
  const storage = new Map();
  const location = { protocol: 'https:', origin: 'https://game.example.invalid', pathname: '/', search: '', hash: initialHash };
  const window = {
    location,
    sessionStorage: {
      getItem(k) { return storage.get(k) || null; },
      setItem(k, v) { storage.set(k, v); },
      removeItem(k) { storage.delete(k); }
    },
    history: { replaceState(_a, _b, path) { location.hash = ''; location.changedTo = path; } },
    fetch: async (input, init) => {
      requests.push({ input, init });
      const url = new URL(input);
      const route = url.pathname;
      let status = 200, result;
      if (route.endsWith('/auth/v1/signup')) result = { user: USER };
      else if (route.endsWith('/auth/v1/token')) result = { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 };
      else if (route.endsWith('/auth/v1/user')) {
        if (!init.headers.Authorization) { status = 401; result = { msg: 'No token' }; }
        else result = USER;
      } else if (route.endsWith('/auth/v1/logout')) result = {};
      else if (route.endsWith('/rest/v1/policy_acceptances')) {
        if (init.method === 'POST') { records.push(JSON.parse(init.body)); result = null; status = 201; }
        else result = records.map(x => ({ policy_kind: x.policy_kind, policy_version: x.policy_version }));
      } else { status = 404; result = { message: route }; }
      return { ok: status < 300, status, text: async () => result ? JSON.stringify(result) : '' };
    }
  };
  vm.runInNewContext(src, { window, globalThis: window, URLSearchParams, Date, URL, Set, Error });
  return { sb: window.HU_SUPABASE, storage, requests, location, records };
}

test('signup waits for email confirmation and never stores password', async () => {
  const { sb, storage, requests } = createAdapter();
  const result = await sb.signup('test@example.invalid', 'password-at-least-10');
  assert.equal(result.user.id, ID);
  assert.equal(storage.size, 0);
  const req = requests[0];
  assert.equal(req.init.method, 'POST');
  assert.match(req.input, /redirect_to=/);
  assert.match(req.init.headers.apikey, /^sb_publishable_/);
  assert.doesNotMatch(JSON.stringify([...storage]), /password-at-least-10/);
});

test('after login consent is individually recorded and scoped to user', async () => {
  const { sb, storage, requests, records } = createAdapter();
  await assert.rejects(() => sb.accept(USER), /xác thực|hết hạn|đăng nhập/);
  const user = await sb.login('test@example.invalid', 'password-at-least-10');
  assert.equal(user.id, ID);
  assert.equal((await sb.accepted()).size, 0);
  await sb.accept(user);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(x => x.policy_kind).sort(), ['privacy', 'release_terms']);
  assert.ok(records.every(x => x.user_id === ID && x.policy_version === '2026-11-09-v3'));
  assert.ok(requests.filter(x => x.input.includes('policy_acceptances')).every(x => x.init.headers.Authorization === 'Bearer access'));
  assert.equal((await sb.accepted()).size, 2);
  await sb.accept(user);
  assert.equal(records.length, 2);
  await sb.logout();
  assert.equal(storage.size, 0);
});

test('confirmation callback strips unsolicited tokens and requires a new login', async () => {
  const { sb, location, storage } = createAdapter('#access_token=attacker&refresh_token=attacker&expires_in=3600&token_type=bearer');
  const user = await sb.user();
  assert.equal(user, null);
  assert.equal(location.hash, '');
  assert.equal(location.changedTo, '/');
  assert.equal(storage.size, 0);
});

test('legal pages, CSP and checkbox binding are present in shipping files', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const auth = fs.readFileSync(path.join(root, 'client/auth/auth.js'), 'utf8');
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  const ignored = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(html, /id="authPrivacy" type="checkbox" required/);
  assert.match(html, /id="authRelease" type="checkbox" required/);
  assert.match(html, /id="authConsentGate"/);
  assert.doesNotMatch(html, /id="authGuestRelease"/);
  assert.doesNotMatch(auth, /authGuestRelease/);
  assert.ok(html.indexOf('client/auth/supabase.js') < html.indexOf('client/auth/auth.js'));
  assert.match(auth, /await SB\.accept\(pending\)/);
  assert.match(headers, /connect-src 'self' https:\/\/rvrwfeblishqadkpzspb\.supabase\.co/);
  assert.match(ignored, /\.hu-gioi\//);
  assert.match(fs.readFileSync(path.join(root, 'client/legal/privacy.html'), 'utf8'), /91\/2025\/QH15/);
  assert.match(fs.readFileSync(path.join(root, 'client/legal/release.html'), 'utf8'), /147\/2024\/NĐ-CP/);
});
