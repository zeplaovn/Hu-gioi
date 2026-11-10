/* Password-login gateway: 10 failed attempts per IP per 15 minutes (single Node instance).
   For production across multiple instances, use a shared limiter and Supabase Auth rate limits. */
'use strict';
const crypto = require('node:crypto');
const { createClientIp, normalizeIp, quotaIpKey } = require('./client-ip.js');
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_BODY = 4096;
const MAX_KEYS = 10000;

function isValidEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || value.length < 6 || /\s/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-zA-Z0-9!#$%&'*+/=?^_\x60{|}~.-]+$/.test(local)) return false;
  if (!domain || domain.length > 253) return false;
  const labels = domain.split('.');
  if (labels.length < 2 || !/^[a-zA-Z]{2,63}$/.test(labels.at(-1))) return false;
  return labels.every(label => label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label));
}
const respond = (res, status, data, retryAfterMs = 0) => {
  const body = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
  };
  if (retryAfterMs > 0) headers['Retry-After'] = String(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  res.writeHead(status, headers).end(body);
};
function createSupabaseLoginGateway({
  url, publishableKey, fetchImpl = globalThis.fetch, clock = Date.now,
  maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS, maxKeys = MAX_KEYS, trustedProxyIps = [], clientIp = createClientIp(trustedProxyIps)
} = {}) {
  const origin = new URL(url);
  if (origin.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(origin.hostname) ||
      origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/')
    throw Error('SUPABASE_URL không hợp lệ cho gateway đăng nhập.');
  if (typeof publishableKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))
    throw Error('Thiếu khóa Supabase publishable cho gateway.');
  if (typeof fetchImpl !== 'function') throw Error('Thiếu dịch vụ HTTP cho gateway.');
  const attempts = new Map();
  // Khi hết quota key, không khóa toàn gateway: người mới chuyển sang bucket
  // hash hữu hạn (fail-closed theo shard). Không xóa quota IP đã bị giới hạn.
  const overflow = new Map();
  const OVERFLOW_SLOTS = 1024;
  let lastPrune = -Infinity;
  function prune(now) {
    if (now - lastPrune < 1000 && attempts.size < maxKeys) return;
    for (const store of [attempts, overflow])
      for (const [key, value] of store)
        if (value.until <= now && value.pending === 0) store.delete(key);
    lastPrune = now;
  }
  async function handle(req, res) {
    if (req.method !== 'POST') return respond(res, 405, { error: 'Phương thức không hợp lệ.' });
    const originHeader = req.headers.origin;
    if (originHeader && !(() => {
      try { const caller = new URL(originHeader); return ['http:', 'https:'].includes(caller.protocol) && caller.host === req.headers.host && caller.origin === originHeader; }
      catch { return false; }
    })()) return respond(res, 403, { error: 'Nguồn đăng nhập không hợp lệ.' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return respond(res, 403, { error: 'Nguồn đăng nhập không hợp lệ.' });
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || '')))
      return respond(res, 415, { error: 'Yêu cầu đăng nhập phải là JSON.' });
    if (Number(req.headers['content-length'] || 0) > MAX_BODY) return respond(res, 413, { error: 'Yêu cầu quá lớn.' });
    const ip = quotaIpKey(clientIp(req)), now = clock();
    prune(now);
    const saturated = !attempts.has(ip) && attempts.size >= maxKeys;
    const store = saturated ? overflow : attempts;
    const key = saturated ? crypto.createHash('sha256').update(ip).digest().readUInt16BE(0) % OVERFLOW_SLOTS : ip;
    const entry = store.get(key) || { count: 0, pending: 0, until: now + windowMs };
    if (entry.count + entry.pending >= maxAttempts)
      return respond(res, 429, { error: 'IP đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.' }, entry.until - now);
    entry.pending++;
    store.set(key, entry); // giữ slot ngay khi request bắt đầu, kể cả ở overflow
    const finish = (failed = false) => { entry.pending--; if (failed) entry.count++; };
    let payload, bytes = 0;
    try {
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_BODY) { finish(true); return respond(res, 413, { error: 'Yêu cầu quá lớn.' }); }
        chunks.push(chunk);
      }
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { finish(true); return respond(res, 400, { error: 'Dữ liệu đăng nhập không hợp lệ.' }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).some(key => !['email', 'password'].includes(key)) ||
        !isValidEmail(payload.email) || typeof payload.password !== 'string' ||
        payload.password.length < 1 || payload.password.length > 128)
      { finish(true); return respond(res, 400, { error: 'Email hoặc mật khẩu không hợp lệ.' }); }
    try {
      const upstream = await fetchImpl(origin.origin + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email.toLowerCase(), password: payload.password }),
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000)
      });
      if (upstream.status === 429) { finish(); return respond(res, 429, { error: 'Dịch vụ xác thực đang giới hạn tốc độ.' }, 60000); }
      if ([400, 401, 403].includes(upstream.status)) {
        finish(true);
        return respond(res, 401, { error: 'Thông tin đăng nhập không đúng hoặc email chưa xác minh.' });
      }
      if (!upstream.ok) { finish(); return respond(res, 503, { error: 'Dịch vụ xác thực tạm thời không khả dụng.' }); }
      const data = await upstream.json();
      if (!data?.access_token || !data?.refresh_token) { finish(); return respond(res, 503, { error: 'Phản hồi xác thực chưa hợp lệ.' }); }
      finish(); // đăng nhập thành công không tiêu quota thất bại
      return respond(res, 200, data);
    } catch { finish(); return respond(res, 503, { error: 'Không kết nối được dịch vụ xác thực.' }); }
  }
  return { handle, clientIp };
}
module.exports = { createSupabaseLoginGateway, isValidEmail, normalizeIp };
