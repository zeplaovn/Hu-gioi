/* Một bộ phân giải IP dùng chung cho game API và gateway đăng nhập.
   Chỉ tin X-Forwarded-For từ socket proxy đã cấu hình, một địa chỉ duy nhất. */
'use strict';
const net = require('node:net');
function normalizeIp(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  const normalized = ip.startsWith('::ffff:') && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  return net.isIP(normalized) ? normalized.toLowerCase() : '';
}
function createClientIp({ trustedProxyIps = [], env = 'development', warn = console.warn } = {}) {
  const trusted = new Set(trustedProxyIps.map(normalizeIp).filter(Boolean));
  const production = env === 'production';
  if (production && !trusted.size)
    warn('[security] HU_AUTH_TRUSTED_PROXY_IPS chưa cấu hình; mọi X-Forwarded-For sẽ bị bỏ qua.');
  let notified = false;
  return req => {
    const remote = normalizeIp(req.socket?.remoteAddress) || 'unknown';
    const raw = req.headers?.['x-forwarded-for'];
    if (!raw) return remote;
    const forwarded = typeof raw === 'string' ? raw.trim() : '';
    if (!trusted.has(remote) || !forwarded || forwarded.includes(',') || !normalizeIp(forwarded)) {
      if (production && !notified) {
        warn('[security] X-Forwarded-For không hợp lệ/không thuộc proxy tin cậy: bỏ qua, dùng socket IP.');
        notified = true;
      }
      return remote;
    }
    return normalizeIp(forwarded);
  };
}
module.exports = { normalizeIp, createClientIp };
