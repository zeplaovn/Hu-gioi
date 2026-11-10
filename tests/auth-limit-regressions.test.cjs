/* RED trước khi sửa: đăng nhập thành công không phải lần thất bại, chống spray theo email băm. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createSupabaseLoginGateway } = require('../server/http/supabase-login.js');
const { createRouter } = require('../server/http/router.js');

async function fixture(t, { maxAttempts = 2, maxKeys = 6 } = {}) {
  let now = 1_800_000_000_000, upstream = 0;
  const gateway = createSupabaseLoginGateway({
    url: 'https://demo-project.supabase.co', publishableKey: 'sb_publishable_Safe123',
    trustedProxyIps: ['127.0.0.1'], maxAttempts, maxKeys,
    clock: () => now,
    fetchImpl: async (_url, init) => {
      upstream++;
      const input = JSON.parse(init.body);
      const ok = input.password === 'valid-secret';
      return {
        status: ok ? 200 : 401, ok,
        json: async () => ({ access_token: 'token', refresh_token: 'refresh' })
      };
    }
  });
  const server = http.createServer(createRouter(null, null, null, gateway));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const post = (email, password, ip = '203.0.113.1') => new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const req = http.request({
      host: '127.0.0.1', port: server.address().port, path: '/api/auth/supabase-login', method: 'POST',
      headers: { 'x-forwarded-for': ip, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject); req.end(body);
  });
  return { post, get upstream() { return upstream; }, advance: ms => now += ms };
}

test('20 lần login thành công không bị quota thất bại theo IP/email', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 20; i++) {
    const r = await f.post('dao@example.com', 'valid-secret');
    assert.equal(r.status, 200, 'lần đăng nhập hợp lệ ' + (i + 1));
  }
  assert.equal(f.upstream, 20);
});

test('password spray 3 IP cùng email bị khóa theo email băm, không chỉ theo IP', async t => {
  const f = await fixture(t);
  assert.equal((await f.post('victim@example.com', 'wrong', '203.0.113.1')).status, 401);
  assert.equal((await f.post('victim@example.com', 'wrong', '203.0.113.2')).status, 401);
  assert.equal((await f.post('victim@example.com', 'wrong', '203.0.113.3')).status, 429);
  assert.equal(f.upstream, 2);
});

test('khi đầy bảng giới hạn phải loại key cũ nhất, không trả 503 mọi người', async t => {
  const f = await fixture(t, { maxKeys: 4 });
  for (let i = 0; i < 10; i++) {
    const r = await f.post('user' + i + '@example.com', 'wrong', '203.0.113.' + (10 + i));
    assert.equal(r.status, 401, 'không thể dùng 503 như chốt chặn khi bảng đầy');
  }
});
