/* Token bucket theo khóa (docs/backend-knowledge.md §6).
   capacity = số lần bùng nổ tối đa; refillPerSecond = thông lượng bền vững; mỗi yêu cầu tiêu `cost` token.
   Bộ nhớ có trần maxKeys: khóa ít dùng nhất bị loại trước. Bản nhiều tiến trình cần kho chung (Redis) với cùng hợp đồng take(). */
'use strict';

class TokenBucketLimiter {
  constructor({ capacity, refillPerSecond, now = Date.now, maxKeys = 10000 }) {
    if (!(capacity > 0) || !(refillPerSecond > 0)) throw Error('capacity và refillPerSecond phải > 0.');
    Object.assign(this, { capacity, refillPerSecond, now, maxKeys });
    this.buckets = new Map();
  }

  /* → { ok, remaining, retryAfterSeconds } */
  take(key, cost = 1) {
    const t = this.now();
    let bucket = this.buckets.get(key);
    if (bucket) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + (t - bucket.at) / 1000 * this.refillPerSecond);
      bucket.at = t;
      this.buckets.delete(key); // đặt lại cuối Map để giữ thứ tự dùng gần nhất
    } else {
      bucket = { tokens: this.capacity, at: t };
    }
    let result;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      result = { ok: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
    } else {
      result = { ok: false, remaining: Math.floor(bucket.tokens), retryAfterSeconds: Math.max(1, Math.ceil((cost - bucket.tokens) / this.refillPerSecond)) };
    }
    this.buckets.set(key, bucket);
    while (this.buckets.size > this.maxKeys) this.buckets.delete(this.buckets.keys().next().value);
    return result;
  }
}

module.exports = { TokenBucketLimiter };
