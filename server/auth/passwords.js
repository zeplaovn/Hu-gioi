/* Băm mật khẩu bằng scrypt tích hợp sẵn của Node 22 (chưa có Argon2 tích hợp).
   Thông số là lựa chọn của dự án (docs/backend-knowledge.md §7), không phải số liệu trích từ OWASP. Khi thêm phụ thuộc, chuyển sang Argon2id.
   Định dạng tự mô tả: scrypt$N$r$p$salt$hash — đổi thông số sau này không buộc di trú ngay (needsRehash). */
'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const DEFAULTS = Object.freeze({ N: 2 ** 15, r: 8, p: 1, keyLength: 32, saltBytes: 16 });

const derive = (password, salt, { N, r, p, keyLength }) =>
  scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: 256 * N * r });

async function hashPassword(password, params = DEFAULTS) {
  const salt = crypto.randomBytes(params.saltBytes ?? DEFAULTS.saltBytes);
  const hash = await derive(password, salt, params);
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

function parse(stored) {
  if (typeof stored !== 'string') return null;
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return null;
  const params = { N: Number(N), r: Number(r), p: Number(p), keyLength: Buffer.from(hash, 'base64url').length };
  if (![params.N, params.r, params.p].every(Number.isSafeInteger) || params.N < 2 || params.N > 2 ** 20) return null;
  return { params, salt: Buffer.from(salt, 'base64url'), hash: Buffer.from(hash, 'base64url') };
}

async function verifyPassword(password, stored) {
  const parsed = parse(stored);
  if (!parsed) return false;
  const actual = await derive(password, parsed.salt, parsed.params);
  return actual.length === parsed.hash.length && crypto.timingSafeEqual(actual, parsed.hash);
}

const needsRehash = (stored, params = DEFAULTS) => {
  const parsed = parse(stored);
  return !parsed || parsed.params.N !== params.N || parsed.params.r !== params.r || parsed.params.p !== params.p;
};

module.exports = { hashPassword, verifyPassword, needsRehash, DEFAULTS };
