'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createGameApi } = require('../tools/ci-server/game-api.js');

test('F3: IP limit chỉ áp vào khách chưa xác thực hay JWT không hợp lệ; tài khoản hợp lệ đi theo account', async t => {
  const keys = [];
  const limiter = { take(key) { keys.push(key); return { ok: true, retryAfterMs: 0 }; } };
  const service = { bootstrap: who => ({ who }) };
  const api = createGameApi({
    service, limiter, clientIp: () => '203.0.113.5',
    resolvePrincipal: async req => {
      if (req.headers.authorization === 'Bearer valid') return { accountId: 'player-ok' };
      if (req.headers.authorization) throw Object.assign(Error('Token hỏng'), { code: 'UNAUTHENTICATED' });
      return null;
    }
  });
  const server = http.createServer((req, res) => api.handle(req, res, '/api/v1/bootstrap'));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => server.close(done)));
  const ask = token => new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1', port: server.address().port, path: '/api/v1/bootstrap',
      headers: token ? { authorization: 'Bearer ' + token } : {}
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    request.on('error', reject); request.end();
  });
  for (let i = 0; i < 150; i++) assert.equal(await ask('valid'), 200);
  assert.equal(keys.filter(k => k.startsWith('ip:')).length, 0);
  assert.equal(await ask(), 401);
  assert.equal(await ask('invalid'), 500, 'lỗi resolver bất thường được che thành INTERNAL');
  assert.equal(keys.filter(k => k === 'ip:203.0.113.5').length, 2);
});
