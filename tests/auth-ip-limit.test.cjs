'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRouter } = require('../server/http/router.js');
const { createSupabaseLoginGateway, isValidEmail } = require('../server/http/supabase-login.js');

const KEY = 'sb_publishable_Abcd1234';
async function fixture(t, { trustedProxyIps = [], upstreamStatus = 200 } = {}) {
  let now = 1_800_000_000_000, upstreamCalls = 0, lastBody;
  const gateway = createSupabaseLoginGateway({
    url: 'https://demo-project.supabase.co', publishableKey: KEY,
    clock: () => now, trustedProxyIps,
    fetchImpl: async (_url, init) => {
      upstreamCalls++;
      lastBody = JSON.parse(init.body);
      return {
        status: upstreamStatus, ok: upstreamStatus === 200,
        json: async () => ({ access_token: 'secret-access', refresh_token: 'secret-refresh', expires_in: 3600 })
      };
    }
  });
  const server = http.createServer(createRouter(null, null, null, gateway));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const call = ({ path = '/api/auth/supabase-login', method = 'POST', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const data = body === undefined ? JSON.stringify({ email: 'Dao.Huu+1@example.com', password: 'test-password-long' }) : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: {
        'content-type': 'application/json',
        ...(method === 'POST' ? { 'content-length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', x => chunks.push(x));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch { parsed = null; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end(method === 'POST' ? data : undefined);
  });
  return { call, get upstreamCalls() { return upstreamCalls; }, get lastBody() { return lastBody; }, advance: ms => { now += ms; }, setUpstreamStatus: value => { upstreamStatus = value; } };
}

test('email syntax is validated server-side, including labels and lengths', () => {
  for (const email of ['dao@example.com', 't.n+1@sub.example.com']) assert.equal(isValidEmail(email), true, email);
  for (const email of ['abc', 'a@@example.com', '.a@example.com', 'a..b@example.com',
    'a@-example.com', 'a@example..com', 'a@example', 'a b@example.com', 'a@localhost',
    'a@foo.c', 'a'.repeat(65) + '@test.com']) assert.equal(isValidEmail(email), false, email);
});

test('login uses public Supabase key, trims no passwords, never exposes password in error', async t => {
  const f = await fixture(t);
  const ok = await f.call();
  assert.equal(ok.status, 200);
  assert.equal(ok.data.access_token, 'secret-access');
  assert.equal(ok.headers['cache-control'], 'no-store, private');
  assert.equal(f.lastBody.email, 'dao.huu+1@example.com');
  assert.equal(f.lastBody.password, 'test-password-long');
  assert.equal(f.upstreamCalls, 1);
  const bad = await f.call({ body: { email: 'x@-bad.com', password: 'secret-raw-password' } });
  assert.equal(bad.status, 400);
  assert.ok(!JSON.stringify(bad.data).includes('secret-raw-password'));
  assert.equal(f.upstreamCalls, 1);
});

test('after 10 attempts per IP in 15 minutes return 429 and Retry-After; spoofed IP ignored', async t => {
  const f = await fixture(t, { upstreamStatus: 401 });
  for (let i = 0; i < 10; i++) {
    const result = await f.call({ headers: { 'x-forwarded-for': '203.0.113.' + (i + 1) } });
    assert.equal(result.status, 401, 'attempt ' + i);
  }
  const denied = await f.call({ headers: { 'x-forwarded-for': '1.2.3.4' } });
  assert.equal(denied.status, 429);
  assert.ok(Number(denied.headers['retry-after']) >= 1);
  assert.equal(f.upstreamCalls, 10);
  f.advance(15 * 60 * 1000);
  assert.equal((await f.call()).status, 401);
  assert.equal(f.upstreamCalls, 11);
});

test('proxy tin cậy cô lập IP: login thành công không tiêu quota NAT, thất bại vẫn bị chặn', async t => {
  const f = await fixture(t, { trustedProxyIps: ['127.0.0.1'] });
  const a = { 'x-forwarded-for': '203.0.113.8' }, b = { 'x-forwarded-for': '203.0.113.9' };
  for (let i = 0; i < 25; i++)
    assert.equal((await f.call({ headers: a })).status, 200);
  f.setUpstreamStatus(401);
  for (let i = 0; i < 10; i++)
    assert.equal((await f.call({ headers: a })).status, 401);
  assert.equal((await f.call({ headers: a })).status, 429);
  f.setUpstreamStatus(200);
  assert.equal((await f.call({ headers: b })).status, 200);
  assert.equal((await f.call({ headers: a })).status, 429);
});

test('reject cross-site browser submissions, overlarge bodies and invalid content type', async t => {
  const f = await fixture(t);
  assert.equal((await f.call({ headers: { origin: 'https://not-game.example' } })).status, 403);
  assert.equal((await f.call({ headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await f.call({ headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await f.call({ body: 'x'.repeat(4100) })).status, 413);
  assert.equal((await f.call({ body: '{bad' })).status, 400);
  assert.equal(f.upstreamCalls, 0);
});

test('invalid credentials remain generic and provider throttling propagates as 429', async t => {
  const f = await fixture(t, { upstreamStatus: 429 });
  const r = await f.call();
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers['retry-after']) >= 1);
  assert.equal(r.data.error.includes('token'), false);
});
