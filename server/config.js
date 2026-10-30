/* Cấu hình máy chủ từ biến môi trường. Giá trị mặc định là điểm xuất phát, cần chỉnh theo tải thật (docs/backend-knowledge.md §6–7). */
'use strict';

const int = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

function loadConfig(env = process.env) {
  return Object.freeze({
    host: env.HOST || '127.0.0.1',
    port: int(env.PORT, 8000, 0, 65535),
    /* Bật khi chạy sau HTTPS: cookie phiên dùng tiền tố __Host- và thuộc tính Secure. */
    secureCookies: env.SECURE_COOKIES === '1',
    maxBodyBytes: int(env.MAX_BODY_BYTES, 64 * 1024, 1024, 1024 * 1024),
    session: Object.freeze({
      idleSeconds: int(env.SESSION_IDLE_SECONDS, 30 * 60, 60, 24 * 3600),
      absoluteSeconds: int(env.SESSION_ABSOLUTE_SECONDS, 12 * 3600, 300, 30 * 24 * 3600)
    }),
    /* Receipt idempotency giữ bao lâu; client không nên retry cùng requestId sau thời gian này. */
    receiptTtlHours: int(env.RECEIPT_TTL_HOURS, 72, 1, 720),
    /* Khoảng vắng mặt tính là "ngoại tuyến" khi gọi engine.advance(now, offline). */
    offlineThresholdMs: int(env.OFFLINE_THRESHOLD_MS, 15000, 1000, 3600000),
    /* Token bucket: capacity = bùng nổ tối đa, refillPerSecond = thông lượng bền vững. */
    rateLimit: Object.freeze({
      ip: Object.freeze({ capacity: 120, refillPerSecond: 20 }),
      command: Object.freeze({ capacity: 30, refillPerSecond: 10 }),
      auth: Object.freeze({ capacity: 5, refillPerSecond: 0.1 })
    }),
    logLevel: env.LOG_LEVEL || 'info'
  });
}

module.exports = { loadConfig };
