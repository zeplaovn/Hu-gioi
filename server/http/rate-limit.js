/* Token bucket trong bộ nhớ. Đủ cho một instance; nhiều instance cần Redis (docs/backend-plan.md §6.9). */
'use strict';
const { SYNC_INTERVAL_MS } = require('../presence-config.js');
class RateLimiter {
  constructor({ clock = Date.now, maxKeys = 20000 } = {}) { this.clock = clock; this.maxKeys = maxKeys; this.buckets = new Map(); }
  /* capacity: số lượt tối đa dồn lại; perMinute: tốc độ hồi. Trả { ok, retryAfterMs }. */
  take(key, { capacity, perMinute }) {
    const now = this.clock();
    let b = this.buckets.get(key);
    if (!b && this.buckets.size >= this.maxKeys) {
      // Chỉ loại bucket đã hồi đầy, theo thứ tự cũ nhất. Không xóa quota đang bị giới hạn.
      for (const [oldKey, old] of this.buckets) {
        const elapsed = Math.max(0, now - old.at);
        if (old.tokens + elapsed * old.perMinute / 60000 >= old.capacity) {
          this.buckets.delete(oldKey);
          if (this.buckets.size < this.maxKeys) break;
        }
      }
      // Khi mọi bucket vẫn còn hiệu lực, từ chối key mới thay vì cấp lại quota người khác.
      if (this.buckets.size >= this.maxKeys) return { ok: false, retryAfterMs: 1000 };
    }
    if (!b) b = { tokens: capacity, at: now, capacity, perMinute };
    b.tokens = Math.min(capacity, b.tokens + Math.max(0, now - b.at) * perMinute / 60000);
    b.at = now;
    b.capacity = capacity;
    b.perMinute = perMinute;
    let out = { ok: true, retryAfterMs: 0 };
    if (b.tokens >= 1) b.tokens -= 1;
    else out = { ok: false, retryAfterMs: Math.ceil((1 - b.tokens) * 60000 / perMinute) };
    this.buckets.delete(key);
    this.buckets.set(key, b); // key dùng gần đây nhất ở cuối Map
    return out;
  }
}
const LIMITS = Object.freeze({
  command: { capacity: 30, perMinute: 600 },   // 10 lệnh/giây, dồn tối đa 30
  sync: { capacity: 8, perMinute: 60000 / SYNC_INTERVAL_MS }, // tối thiểu một token mỗi heartbeat
  pause: { capacity: 8, perMinute: 4 },       // tab ẩn không được tiêu token sync
  preview: { capacity: 5, perMinute: 6 },
  read: { capacity: 30, perMinute: 60 },
  create: { capacity: 3, perMinute: 3 },
  ip: { capacity: 120, perMinute: 120 },       // mọi request /api/v1, kể cả chưa đăng nhập: chặn dò token/quét
  export: { capacity: 3, perMinute: 1 },
  erase: { capacity: 5, perMinute: 2 }
});
module.exports = { RateLimiter, LIMITS };
