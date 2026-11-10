'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { normalizeIp, quotaIpKey, createClientIp } = require('../server/http/client-ip.js');
const { createSupabaseLoginGateway } = require('../server/http/supabase-login.js');

test('F4: IPv6 cùng /64 có chung quota; proxy trusted vẫn so khớp chính xác địa chỉ', () => {
  assert.equal(quotaIpKey('2001:db8:abcd:1234::1'), quotaIpKey('2001:0db8:abcd:1234:ffff::2'));
  assert.notEqual(quotaIpKey('2001:db8:abcd:1234::1'), quotaIpKey('2001:db8:abcd:1235::1'));
  assert.equal(quotaIpKey('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(normalizeIp('2001:db8::1'), '2001:db8::1');
  const getIp = createClientIp(['2001:db8::1']);
  assert.equal(getIp({ socket: { remoteAddress: '2001:db8::2' }, headers: { 'x-forwarded-for': '203.0.113.8' } }), '2001:db8::2');
});

test('F4: khi vượt MAX_KEYS không trả 503 cho mọi IP mới; quota IP cũ không reset', async t => {
  const gateway = createSupabaseLoginGateway({
    url: 'https://demo-project.supabase.co', publishableKey: 'sb_publishable_Test_01',
    maxKeys: 1, maxAttempts: 1, clientIp: req => req.headers['x-test-ip'],
    fetchImpl: async () => ({ status: 401, ok: false })
  });
  const server = http.createServer((req, res) => gateway.handle(req, res));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => server.close(done)));
  const ask = ip => new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'dao@example.com', password: 'invalid' });
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'x-test-ip': ip }
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end(body);
  });
  assert.equal(await ask('192.0.2.1'), 401);
  assert.equal(await ask('192.0.2.1'), 429);
  assert.equal(await ask('192.0.2.2'), 401, 'IP mới dùng fallback bucket thay vì 503 toàn hệ thống');
  assert.equal(await ask('192.0.2.1'), 429, 'IP đang bị giới hạn không được reset');
});
