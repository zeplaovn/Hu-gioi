/* Tiện ích dùng chung: JSON ổn định, băm, RNG an toàn, che trường bí mật. */
'use strict';
const crypto = require('node:crypto');

/* JSON có khóa sắp xếp, để cùng một nội dung luôn cho cùng một chuỗi (dùng cho dấu vân tay idempotency). */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

const sha256Hex = text => crypto.createHash('sha256').update(text).digest('hex');

/* RNG [0, 1) từ nguồn an toàn của hệ điều hành; cùng chữ ký với Math.random để truyền vào engine. */
const secureRandom = () => crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48;

/* Bản sao sâu đã xóa các khóa bí mật (mặc định: seed của RNG/bí cảnh), để snapshot không lộ trạng thái ẩn. */
function redact(value, secretKeys = ['seed', 'rngState']) {
  const secrets = new Set(secretKeys);
  const walk = v => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, x] of Object.entries(v)) if (!secrets.has(k)) out[k] = walk(x);
      return out;
    }
    return v;
  };
  return walk(value);
}

module.exports = { stableStringify, sha256Hex, secureRandom, redact };
