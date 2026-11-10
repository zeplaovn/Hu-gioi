/* Hồi quy heartbeat: 10 phút idle tại nhịp FE từ Node, không một lần 429. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter, LIMITS } = require('../server/http/rate-limit.js');
const { SYNC_INTERVAL_MS, ONLINE_GRACE_MS } = require('../server/presence-config.js');

test('10 phút idle: heartbeat đúng nhịp FE không có lần 429', () => {
  let now = 1_800_000_000_000;
  const limiter = new RateLimiter({ clock: () => now });
  assert.ok(ONLINE_GRACE_MS >= 2 * SYNC_INTERVAL_MS);
  let rejected = 0;
  for (let elapsed = 0; elapsed < 10 * 60000; elapsed += SYNC_INTERVAL_MS) {
    now += SYNC_INTERVAL_MS;
    if (!limiter.take('sync:idle-account', LIMITS.sync).ok) rejected++;
  }
  assert.equal(rejected, 0, '10 phút idle không được trả 429');
});
