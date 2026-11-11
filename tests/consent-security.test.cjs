/* Kiểm thử ranh giới bảo mật: API không được bỏ qua quyền chấp thuận
   và SQLite không được tạo DB trong thư mục có quyền công khai. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createConsentVerifier } = require('../server/auth/consent.js');
const { createPrincipalResolver } = require('../server/auth/principal.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');

const SUPABASE_URL = 'https://rvrwfeblishqadkpzspb.supabase.co';
const KEY = 'sb_publishable_mock_key';
const UID = '12345678-1234-4234-8234-123456789abc';
const TOKEN = 'valid.jwt.token';

test('chấp thuận: cần đủ hai chính sách, chọn theo userId và version', async () => {
  let rows = [{ policy_kind: 'privacy' }], requests = 0, now = 0;
  const check = createConsentVerifier({
    url: SUPABASE_URL, publishableKey: KEY, clock: () => now,
    fetchImpl: async (uri, options) => {
      requests++;
      const req = new URL(uri);
      assert.equal(req.hostname, 'rvrwfeblishqadkpzspb.supabase.co');
      assert.equal(req.pathname, '/rest/v1/policy_acceptances');
      assert.equal(req.searchParams.get('user_id'), 'eq.' + UID);
      assert.equal(req.searchParams.get('policy_version'), 'eq.2026-11-11-v6');
      assert.equal(options.headers.apikey, KEY);
      assert.equal(options.headers.Authorization, 'Bearer ' + TOKEN);
      return { ok: true, status: 200, json: async () => rows };
    }
  }).check;
  await assert.rejects(() => check(TOKEN, UID), { code: 'CONSENT_REQUIRED' });
  rows = [{ policy_kind: 'privacy' }, { policy_kind: 'release_terms' }];
  await check(TOKEN, UID);
  assert.equal(requests, 2, 'không cache lần từ chối');
  await check(TOKEN, UID);
  assert.equal(requests, 2, 'cache tích cực trong TTL');
  now = 31000;
  await check(TOKEN, UID);
  assert.equal(requests, 3, 'hết TTL phải kiểm tra lại');
});

test('chấp thuận: lỗi Supabase không được tự động cho phép truy cập', async () => {
  const verify = opts => createConsentVerifier({ url: SUPABASE_URL, publishableKey: KEY, fetchImpl: async () => opts });
  await assert.rejects(() => verify({ ok: false, status: 401 }).check(TOKEN, UID), { code: 'UNAUTHENTICATED' });
  await assert.rejects(() => verify({ ok: false, status: 500 }).check(TOKEN, UID), { code: 'MAINTENANCE' });
  await assert.rejects(() => createConsentVerifier({
    url: SUPABASE_URL, publishableKey: KEY, fetchImpl: () => Promise.reject(Error('offline'))
  }).check(TOKEN, UID), { code: 'MAINTENANCE' });
  assert.throws(() => createConsentVerifier({ url: 'http://example.com', publishableKey: KEY }), /HTTPS/);
  assert.throws(() => createConsentVerifier({ url: SUPABASE_URL, publishableKey: 'unsafe' }), /SUPABASE_PUBLISHABLE_KEY/);
});

test('principal: JWT được xác minh rồi mới kiểm tra chính sách', async () => {
  let checked = false;
  const resolver = createPrincipalResolver({
    jwt: { verify: async token => { assert.equal(token, TOKEN); return { sub: UID }; } },
    verifyConsent: async (token, subject) => {
      assert.equal(token, TOKEN);
      assert.equal(subject, UID);
      checked = true;
    }
  });
  assert.deepEqual(await resolver({ headers: { authorization: 'Bearer ' + TOKEN }, method: 'GET' }),
    { accountId: UID, via: 'jwt' });
  assert.equal(checked, true);
  const blocked = createPrincipalResolver({
    jwt: { verify: async () => ({ sub: UID }) },
    verifyConsent: async () => { throw Object.assign(Error('Denied'), { code: 'CONSENT_REQUIRED' }); }
  });
  await assert.rejects(() => blocked({ headers: { authorization: 'Bearer ' + TOKEN }, method: 'GET' }),
    { code: 'CONSENT_REQUIRED' });
});

test('SQLite: DB có quyền 0600, thư mục 0700, cấm symlink và thư mục 0755', t => {
  if (process.platform === 'win32') return t.skip('Unix permissions only');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-permissions-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'private', 'game.sqlite');
  const db = new SqlitePlayers(file);
  db.close();
  assert.equal(fs.statSync(path.dirname(file)).mode & 0o777, 0o700);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const link = path.join(dir, 'private', 'link.sqlite');
  fs.symlinkSync(file, link);
  assert.throws(() => new SqlitePlayers(link), /symbolic link/);
  const publicDir = path.join(dir, 'public');
  fs.mkdirSync(publicDir, { mode: 0o755 });
  fs.chmodSync(publicDir, 0o755);
  assert.throws(() => new SqlitePlayers(path.join(publicDir, 'game.sqlite')), /0700/);
});
