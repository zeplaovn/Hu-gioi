'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter } = require('../server/http/rate-limit.js');

test('làm tràn key không đặt lại quota đang bị rate-limit của client khác', () => {
  let now = 1_800_000_000_000;
  const limiter = new RateLimiter({ clock: () => now, maxKeys: 2 });
  const rule = { capacity: 1, perMinute: 1 };
  assert.equal(limiter.take('ip:victim', rule).ok, true);
  assert.equal(limiter.take('ip:victim', rule).ok, false);
  assert.equal(limiter.take('ip:second', rule).ok, true);
  for (let n = 0; n < 100; n++)
    assert.equal(limiter.take('ip:spray-' + n, rule).ok, false);
  assert.equal(limiter.buckets.size, 2);
  assert.equal(limiter.take('ip:victim', rule).ok, false, 'key spam không được reset quota nạn nhân');
  now += 60_000;
  assert.equal(limiter.take('ip:new', rule).ok, true, 'bucket đã hồi đầy có thể được loại');
  assert.equal(limiter.buckets.size, 2);
});

test('chỉ loại key hồi đầy và ưu tiên key cũ nhất', () => {
  let now = 0;
  const limiter = new RateLimiter({ clock: () => now, maxKeys: 2 });
  const rule = { capacity: 1, perMinute: 1 };
  limiter.take('first', rule);
  now += 60_000;
  limiter.take('second', rule);
  assert.equal(limiter.take('third', rule).ok, true);
  assert.equal(limiter.buckets.has('first'), false);
  assert.equal(limiter.buckets.has('second'), true);
});
