/* Config tĩnh: Cloudflare Edge mặc định, Node local dùng gateway rõ ràng. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../client/config.js'), 'utf8');

function mode(hostname, deployMode) {
  const window = { location: { hostname }, ...(deployMode ? { HU_DEPLOY_MODE: deployMode } : {}) };
  vm.runInNewContext(source, { window, globalThis: window });
  return window;
}
test('Cloudflare Worker dùng direct Auth và Supabase Edge API, không Node gateway', () => {
  const x = mode('hugioi.blackbearvn.workers.dev');
  assert.equal(x.HU_AUTH_MODE, 'direct');
  assert.equal(x.HU_API_BASE, 'https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api');
});
test('Node localhost dùng /api/v1 và gateway, không gửi mật khẩu tới runtime Node thiếu Auth', () => {
  for (const host of ['127.0.0.1', 'localhost', '::1']) {
    const x = mode(host);
    assert.equal(x.HU_API_BASE, '/api/v1', host);
    assert.equal(x.HU_AUTH_MODE, 'gateway', host);
  }
  const explicit = mode('node.example.test', 'node');
  assert.equal(explicit.HU_AUTH_MODE, 'gateway');
  assert.equal(explicit.HU_API_BASE, '/api/v1');
  assert.equal(mode('localhost', 'edge').HU_AUTH_MODE, 'direct');
});
