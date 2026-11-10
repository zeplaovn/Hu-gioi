/* Reverse proxy: giới hạn IP xác định giống nhau ở đăng nhập và gameplay. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('mẫu triển khai và Docker đều có HU_AUTH_TRUSTED_PROXY_IPS', () => {
  const root = path.resolve(__dirname, '..');
  for (const file of ['compose.yaml', '.env.example', 'docs/online-deployment.md']) {
    const body = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(body, /HU_AUTH_TRUSTED_PROXY_IPS/, file);
  }
});

test('hai client đằng sau cùng proxy tin cậy có bucket riêng, spoof bị bỏ qua', () => {
  const { createClientIp } = require('../server/http/client-ip.js');
  const warnings = [];
  const ip = createClientIp({
    trustedProxyIps: ['127.0.0.1'], env: 'production', warn: msg => warnings.push(msg)
  });
  const make = (remote, xff) => ({ socket: { remoteAddress: remote }, headers: { 'x-forwarded-for': xff } });
  const first = ip(make('127.0.0.1', '203.0.113.8'));
  const second = ip(make('127.0.0.1', '203.0.113.9'));
  assert.equal(first, '203.0.113.8');
  assert.equal(second, '203.0.113.9');
  assert.notEqual(first, second);
  assert.equal(ip(make('192.0.2.12', '203.0.113.9')), '192.0.2.12', 'không tin proxy lạ');
  assert.equal(ip(make('127.0.0.1', '203.0.113.1, 192.0.2.1')), '127.0.0.1',
    'proxy phải ghi đè một IP, không được nối chuỗi do khách tạo');
  assert.ok(warnings.length > 0);
});
