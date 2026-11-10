/* Node static production readiness và maintenance envelope. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRouter } = require('../server/http/router.js');

test('API gameplay chưa cấu hình trả 503 theo cùng envelope v2, không thành 404 chung', async t => {
  const server = http.createServer(createRouter());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const get = path => new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: server.address().port, path }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject);
  });
  for (const route of ['/api/v1/bootstrap', '/api/v1/players/01234567-1234-4234-8234-555555555555/state']) {
    const res = await get(route);
    assert.equal(res.status, 503);
    assert.equal(res.data.error.code, 'MAINTENANCE');
    assert.equal(res.data.error.retryable, true);
    assert.equal(res.data.error.requestId, res.headers['x-request-id']);
  }
  const health = await get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.gameplay, false);
});

test('Docker image có HEALTHCHECK Node tới /api/health, runtime log fatal errors', () => {
  const root = path.resolve(__dirname, '..');
  const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  const entry = fs.readFileSync(path.join(root, 'server/main.js'), 'utf8');
  assert.match(docker, /HEALTHCHECK/);
  assert.match(docker, /\/api\/health/);
  assert.match(entry, /uncaughtException/);
  assert.match(entry, /unhandledRejection/);
});
