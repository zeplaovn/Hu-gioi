'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'dist', f), 'utf8');
const build = env => spawnSync(process.execPath, ['tools/build-dist.cjs'], { cwd: root, env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
const SITEKEY = '10000000-ffff-ffff-ffff-000000000001';
const KEY = 'sb_publishable_TESTKEYTESTKEYTESTKEY123';

test('build-dist đưa SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, HCAPTCHA_SITEKEY vào dist và CSP', () => {
  try {
    const r = build({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_PUBLISHABLE_KEY: KEY, HCAPTCHA_SITEKEY: SITEKEY });
    assert.equal(r.status, 0, r.stderr);
    assert.match(read('client/auth/supabase.js'), new RegExp("const SUPABASE_URL = 'https://abcdefgh\\.supabase\\.co';"));
    assert.ok(read('client/auth/supabase.js').includes("const KEY = '" + KEY + "';"));
    assert.ok(read('client/config.js').includes("HU_HCAPTCHA_SITEKEY = '" + SITEKEY + "'"));
    for (const file of ['index.html', '_headers']) {
      assert.match(read(file), /connect-src 'self' https:\/\/abcdefgh\.supabase\.co /);
      assert.doesNotMatch(read(file), /rvrwfeblishqadkpzspb/);
    }
  } finally { build({}); }
});

test('không đặt env thì dist giữ mặc định; env sai hoặc là secret bị từ chối', () => {
  assert.equal(build({}).status, 0);
  assert.match(read('client/auth/supabase.js'), /rvrwfeblishqadkpzspb\.supabase\.co/);
  assert.match(read('client/config.js'), /HU_HCAPTCHA_SITEKEY = ''/);
  for (const env of [{ SUPABASE_URL: 'https://evil.example.com' }, { SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abcdefghijklmnopqrstuvwxyz' }, { SUPABASE_PUBLISHABLE_KEY: 'bad' }, { HCAPTCHA_SITEKEY: 'x' }])
    assert.notEqual(build(env).status, 0, JSON.stringify(env));
  build({});
});
