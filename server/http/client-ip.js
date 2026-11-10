/* Một cách xác định IP cho cả gateway đăng nhập và gameplay API. */
'use strict';
const net = require('node:net');

function normalizeIp(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  const normalized = ip.startsWith('::ffff:') && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  return net.isIP(normalized) ? normalized.toLowerCase() : '';
}
function createClientIp(trustedProxyIps = []) {
  const trusted = new Set(trustedProxyIps.map(normalizeIp).filter(Boolean));
  return req => {
    const remote = normalizeIp(req.socket?.remoteAddress) || 'unknown';
    if (!trusted.has(remote)) return remote;
    // Proxy tin cậy phải ghi đè X-Forwarded-For, không nhận chuỗi do khách tự thêm.
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0];
    return normalizeIp(forwarded) || remote;
  };
}
module.exports = { normalizeIp, createClientIp };
