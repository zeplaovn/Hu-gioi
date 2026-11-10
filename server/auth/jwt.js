/* Xác minh JWT của Supabase Auth bằng node:crypto (không phụ thuộc gói ngoài).
   Hỗ trợ HS256 (JWT secret) và ES256/RS256 qua JWKS. Từ chối alg khác, kể cả "none". */
'use strict';
const crypto = require('node:crypto');
const { GameError } = require('../errors.js');

const b64 = s => Buffer.from(s, 'base64url');
const unauth = msg => new GameError('UNAUTHENTICATED', msg || 'Phiên đăng nhập không hợp lệ.');

function createJwtVerifier({ secret = '', jwksUrl = '', issuer = '', audience = 'authenticated', fetchImpl = globalThis.fetch,
  clock = Date.now, jwksTtlMs = 10 * 60000, jwksMinRefetchMs = 60000, jwksTimeoutMs = 5000,
  negativeKidTtlMs = 15000, skewSec = 5 } = {}) {
  if (!secret && !jwksUrl) throw Error('Cần SUPABASE_JWT_SECRET hoặc URL JWKS để xác minh JWT.');
  let keys = new Map(), fetchedAt = 0, inflight = null;
  let failures = 0, nextRetryAt = 0;
  const negativeKids = new Map();

  async function loadKeys(force = false) {
    const now = clock();
    if (!force && keys.size && now - fetchedAt < jwksTtlMs) return;
    if (keys.size && now - fetchedAt < jwksMinRefetchMs) return;
    if (now < nextRetryAt) {
      if (keys.size) return; // khóa đã xác minh vẫn dùng được khi JWKS tạm gián đoạn
      throw Error('JWKS đang chờ thử lại.');
    }
    inflight ||= (async () => {
      try {
        const res = await fetchImpl(jwksUrl, {
          headers: { accept: 'application/json' }, signal: AbortSignal.timeout(jwksTimeoutMs)
        });
        if (!res.ok) throw Error('JWKS ' + res.status);
        const body = await res.json(), next = new Map();
        for (const jwk of body.keys || []) {
          if (!jwk.kid || !['EC', 'RSA'].includes(jwk.kty) || (jwk.use && jwk.use !== 'sig')) continue;
          next.set(jwk.kid, { alg: jwk.alg || (jwk.kty === 'EC' ? 'ES256' : 'RS256'), key: crypto.createPublicKey({ key: jwk, format: 'jwk' }) });
        }
        if (!next.size) throw Error('JWKS không có khóa hợp lệ.');
        keys = next;
        fetchedAt = clock();
        failures = 0;
        nextRetryAt = 0;
        negativeKids.clear();
      } catch (error) {
        failures++;
        nextRetryAt = clock() + Math.min(300000, Math.max(1000, jwksMinRefetchMs) * 2 ** Math.min(failures - 1, 5));
        if (!keys.size) throw error;
        // Giữ nguyên khóa công khai cũ, không xoá cache trong lúc nhà cấp khóa lỗi.
      }
    })().finally(() => { inflight = null; });
    await inflight;
  }

  async function verify(token) {
    if (typeof token !== 'string' || token.length > 4096) throw unauth();
    const parts = token.split('.');
    if (parts.length !== 3) throw unauth();
    let header, payload;
    try { header = JSON.parse(b64(parts[0])); payload = JSON.parse(b64(parts[1])); } catch { throw unauth(); }
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') throw unauth();
    const data = Buffer.from(parts[0] + '.' + parts[1]), sig = b64(parts[2]);

    let ok = false;
    if (header.alg === 'HS256' && secret) {
      const mac = crypto.createHmac('sha256', secret).update(data).digest();
      ok = mac.length === sig.length && crypto.timingSafeEqual(mac, sig);
    } else if ((header.alg === 'ES256' || header.alg === 'RS256') && jwksUrl && typeof header.kid === 'string') {
      try {
        await loadKeys(false);
        if (!keys.has(header.kid) && (negativeKids.get(header.kid) || 0) <= clock()) {
          await loadKeys(true); // có thể là khóa xoay vòng; không fetch lặp vô hạn cho kid lạ
          if (!keys.has(header.kid)) negativeKids.set(header.kid, clock() + negativeKidTtlMs);
          if (negativeKids.size > 2048) negativeKids.delete(negativeKids.keys().next().value);
        }
      } catch { throw new GameError('MAINTENANCE', 'Không tải được khóa xác thực.'); }
      const k = keys.get(header.kid);
      if (k && k.alg === header.alg) {
        ok = header.alg === 'ES256'
          ? crypto.verify('sha256', data, { key: k.key, dsaEncoding: 'ieee-p1363' }, sig)
          : crypto.verify('sha256', data, k.key, sig);
      }
    }
    if (!ok) throw unauth();

    const now = Math.floor(clock() / 1000);
    if (!Number.isFinite(payload.exp) || payload.exp + skewSec < now) throw unauth('Phiên đăng nhập đã hết hạn.');
    if (payload.nbf !== undefined && payload.nbf - skewSec > now) throw unauth();
    if (issuer && payload.iss !== issuer) throw unauth();
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (audience && !aud.includes(audience)) throw unauth();
    if (typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)) throw unauth();
    return payload;
  }
  return { verify };
}

/* Cấu hình từ biến môi trường: SUPABASE_URL (suy ra issuer + JWKS), SUPABASE_JWT_SECRET (tùy chọn, cho project dùng HS256). */
function verifierFromEnv(env = process.env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, ''), secret = env.SUPABASE_JWT_SECRET || '';
  if (!url && !secret) return null;
  return createJwtVerifier({ secret, jwksUrl: url ? url + '/auth/v1/.well-known/jwks.json' : '', issuer: url ? url + '/auth/v1' : '' });
}
module.exports = { createJwtVerifier, verifierFromEnv };
