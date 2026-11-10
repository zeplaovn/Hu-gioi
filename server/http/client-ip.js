/* Một cách xác định IP cho cả gateway đăng nhập và gameplay API. */
'use strict';
const net = require('node:net');

function normalizeIp(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  const normalized = ip.startsWith('::ffff:') && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  return net.isIP(normalized) ? normalized.toLowerCase() : '';
}
// Chỉ nhóm theo /64 cho QUOTA; proxy tin cậy vẫn so sánh IP ĐẦY ĐỦ để
// không vô tình tin cả một subnet IPv6 của kẻ tấn công.
function quotaIpKey(value) {
  const ip = normalizeIp(value);
  if (net.isIP(ip) !== 6) return ip || 'unknown';
  const halves = ip.split('::');
  const l = halves[0] ? halves[0].split(':') : [];
  const r = halves[1] ? halves[1].split(':') : [];
  const missing = halves.length === 2 ? 8 - l.length - r.length : 0;
  const groups = [...l, ...Array(Math.max(0, missing)).fill('0'), ...r];
  return groups.slice(0, 4).map(v => Number.parseInt(v, 16).toString(16)).join(':') + '::/64';
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
module.exports = { normalizeIp, quotaIpKey, createClientIp };
