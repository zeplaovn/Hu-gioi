/* Phiên đăng nhập phía server (docs/backend-knowledge.md §7).
   - Token 128 bit từ CSPRNG; kho chỉ lưu băm SHA-256 nên lộ kho không lộ token.
   - Timeout nhàn rỗi VÀ tuyệt đối, thực thi ở server; hủy phiên phía server khi đăng xuất.
   - Cookie HttpOnly, SameSite=Lax; tiền tố __Host- + Secure khi chạy HTTPS. ID chỉ nhận từ cookie, không từ URL.
   Kho bộ nhớ: mất khi khởi động lại. Bản bền dùng bảng sessions với cùng hợp đồng. */
'use strict';
const crypto = require('node:crypto');
const { sha256Hex } = require('../lib/util.js');

class SessionStore {
  constructor({ idleSeconds, absoluteSeconds, secureCookies = false, now = Date.now }) {
    Object.assign(this, { idleMs: idleSeconds * 1000, absoluteMs: absoluteSeconds * 1000, secureCookies, now });
    this.sessions = new Map();
    this.cookieName = secureCookies ? '__Host-hu_sid' : 'hu_sid';
  }

  create(accountId) {
    this.sweep();
    const token = crypto.randomBytes(16).toString('base64url');
    const t = this.now();
    this.sessions.set(sha256Hex(token), { accountId, createdAt: t, lastSeenAt: t });
    return token;
  }

  /* → { accountId, createdAt, lastSeenAt } hoặc null nếu không có/hết hạn. Gọi mỗi yêu cầu để làm mới mốc nhàn rỗi. */
  resolve(token) {
    if (!token) return null;
    const key = sha256Hex(token), session = this.sessions.get(key), t = this.now();
    if (!session) return null;
    if (t - session.lastSeenAt > this.idleMs || t - session.createdAt > this.absoluteMs) { this.sessions.delete(key); return null; }
    session.lastSeenAt = t;
    return { ...session };
  }

  destroy(token) { if (token) this.sessions.delete(sha256Hex(token)); }

  destroyAllFor(accountId) {
    for (const [key, s] of this.sessions) if (s.accountId === accountId) this.sessions.delete(key);
  }

  sweep() {
    const t = this.now();
    for (const [key, s] of this.sessions) if (t - s.lastSeenAt > this.idleMs || t - s.createdAt > this.absoluteMs) this.sessions.delete(key);
  }

  serializeCookie(token) {
    return `${this.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(this.absoluteMs / 1000)}${this.secureCookies ? '; Secure' : ''}`;
  }

  clearCookie() {
    return `${this.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${this.secureCookies ? '; Secure' : ''}`;
  }

  parseCookie(header) {
    if (typeof header !== 'string') return null;
    for (const part of header.split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === this.cookieName) {
        const value = part.slice(i + 1).trim();
        return /^[A-Za-z0-9_-]{16,64}$/.test(value) ? value : null;
      }
    }
    return null;
  }
}

module.exports = { SessionStore };
