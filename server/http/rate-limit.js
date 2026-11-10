/* Token bucket trong bộ nhớ. Đủ cho một instance; nhiều instance cần Redis (docs/backend-plan.md §6.9). */
'use strict';
const { HEARTBEAT } = require('../heartbeat-policy.js');
class RateLimiter {
  constructor({ clock = Date.now, maxKeys = 20000 } = {}) { this.clock = clock; this.maxKeys = maxKeys; this.buckets = new Map(); }
  /* capacity: số lượt tối đa dồn lại; perMinute: tốc độ hồi. Trả { ok, retryAfterMs }. */
  take(key, { capacity, perMinute }) {
    const now = this.clock();
    if (this.buckets.size > this.maxKeys) this.buckets.clear();
    const b = this.buckets.get(key) || { tokens: capacity, at: now };
    b.tokens = Math.min(capacity, b.tokens + (now - b.at) * perMinute / 60000);
    b.at = now;
    let out = { ok: true, retryAfterMs: 0 };
    if (b.tokens >= 1) b.tokens -= 1;
    else out = { ok: false, retryAfterMs: Math.ceil((1 - b.tokens) * 60000 / perMinute) };
    this.buckets.set(key, b);
    return out;
  }
}
const LIMITS = Object.freeze({
  command: { capacity: 30, perMinute: 600 },   // 10 lệnh/giây, dồn tối đa 30
  sync: HEARTBEAT.sync,                     // 12 lượt/phút thường, dư địa jitter -30%
  pause: HEARTBEAT.pause,                   // độc lập với heartbeat sync
  preview: { capacity: 5, perMinute: 6 },
  read: { capacity: 30, perMinute: 60 },
  create: { capacity: 3, perMinute: 3 },
  ip: { capacity: 120, perMinute: 120 },       // mọi request /api/v1, kể cả chưa đăng nhập: chặn dò token/quét
  export: { capacity: 3, perMinute: 1 },
  erase: { capacity: 5, perMinute: 2 }
});
module.exports = { RateLimiter, LIMITS };
