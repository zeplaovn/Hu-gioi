/* Hồi quy bảo mật: tràn key không được xóa hạn mức các user đang bị khóa. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter, LIMITS } = require('../server/http/rate-limit.js');

test('maxKeys overflow không cấp lại token của người đang bị throttle', () => {
  let time = 1_800_000_000_000;
  const limiter = new RateLimiter({ clock: () => time, maxKeys: 3 });
  const rule = { capacity: 1, perMinute: 1 };
  assert.equal(limiter.take('ip:victim', rule).ok, true);
  assert.equal(limiter.take('ip:other1', rule).ok, true);
  assert.equal(limiter.take('ip:other2', rule).ok, true);
  assert.equal(limiter.take('ip:victim', rule).ok, false);
  assert.equal(limiter.take('ip:attacker', rule).ok, true);
  assert.equal(limiter.take('ip:victim', rule).ok, false,
    'tấn công làm tràn Map không được reset token của victim');
  assert.ok(limiter.buckets.size <= 3, 'giới hạn số key phải được giữ');
});

test('bucket đã hồi đầy được loại trước bucket đang bị khóa', () => {
  let time = 1_800_000_000_000;
  const limiter = new RateLimiter({ clock: () => time, maxKeys: 2 });
  const rule = { capacity: 1, perMinute: 60 };
  limiter.take('stale', rule);
  time += 3000;
  limiter.take('active', rule);
  limiter.take('third', rule);
  assert.ok(limiter.buckets.size <= 2);
  assert.equal(limiter.take('active', rule).ok, false);
});

test('thông số sync từ shared policy vẫn đồng nhất khi hạn chế LRU', () => {
  assert.equal(LIMITS.sync.perMinute, 24);
  assert.equal(LIMITS.pause.perMinute, 6);
});
