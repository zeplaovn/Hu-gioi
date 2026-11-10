'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createJwtVerifier } = require('../server/auth/jwt.js');
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const uid = '11111111-2222-4333-8444-555555555555';
function sign(privateKey, kid, now) {
  const head = b64({ alg: 'ES256', kid });
  const payload = b64({ sub: uid, aud: 'authenticated', exp: Math.floor(now / 1000) + 3600 });
  return head + '.' + payload + '.' + crypto.sign('sha256', Buffer.from(head + '.' + payload),
    { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}
test('F5: JWKS timeout, backoff, negative kid cache và giữ khóa cũ khi fetch lỗi', async () => {
  const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = { ...pair.publicKey.export({ format: 'jwk' }), alg: 'ES256', kid: 'trusted', use: 'sig' };
  let now = 1_800_000_000_000, calls = 0, broken = false;
  const verify = createJwtVerifier({
    jwksUrl: 'https://test.invalid/jwks', clock: () => now,
    jwksTtlMs: 100, jwksMinRefetchMs: 1000, negativeKidTtlMs: 10000,
    fetchImpl: async (_url, init) => {
      calls++;
      assert.ok(init.signal, 'fetch luôn dùng AbortSignal timeout');
      if (broken) throw Error('mạng gián đoạn');
      return { ok: true, json: async () => ({ keys: [jwk] }) };
    }
  });
  assert.equal((await verify.verify(sign(pair.privateKey, 'trusted', now))).sub, uid);
  now += 1100;
  broken = true;
  assert.equal((await verify.verify(sign(pair.privateKey, 'trusted', now))).sub, uid);
  assert.equal(calls, 2);
  await assert.rejects(verify.verify(sign(pair.privateKey, 'unknown', now)), { code: 'UNAUTHENTICATED' });
  await assert.rejects(verify.verify(sign(pair.privateKey, 'unknown', now)), { code: 'UNAUTHENTICATED' });
  assert.equal(calls, 2, 'thất bại được cache, không fetch lặp cho kid lạ');
  now += 10001;
  assert.equal((await verify.verify(sign(pair.privateKey, 'trusted', now))).sub, uid);
  assert.equal(calls, 3, 'hết backoff mới thử lại JWKS');
});
