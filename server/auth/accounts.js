/* Tài khoản (kho bộ nhớ). Hợp đồng bản bền: register / authenticate / get, tên đăng nhập không phân biệt hoa thường.
   Khung này chưa có email, khôi phục mật khẩu, khóa tài khoản hay xác minh: xem docs/backend-plan.md §11.3. */
'use strict';
const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('./passwords.js');
const { badRequest, conflict } = require('../http/errors.js');

const USERNAME = /^[A-Za-z0-9_]{3,24}$/;

class AccountStore {
  constructor({ hash = hashPassword, verify = verifyPassword } = {}) {
    Object.assign(this, { hash, verify });
    this.byName = new Map();
    this.byId = new Map();
    this.dummy = null;
  }

  async register(username, password) {
    if (typeof username !== 'string' || !USERNAME.test(username)) throw badRequest('Tên đăng nhập gồm 3–24 ký tự chữ, số hoặc gạch dưới.');
    if (typeof password !== 'string' || [...password].length < 10 || [...password].length > 128) throw badRequest('Mật khẩu dài 10–128 ký tự.');
    const key = username.toLowerCase();
    if (this.byName.has(key)) throw conflict('USERNAME_TAKEN', 'Tên đăng nhập đã được dùng.');
    const account = { id: crypto.randomUUID(), username, passwordHash: await this.hash(password), createdAt: Date.now() };
    if (this.byName.has(key)) throw conflict('USERNAME_TAKEN', 'Tên đăng nhập đã được dùng.'); // đăng ký song song
    this.byName.set(key, account);
    this.byId.set(account.id, account);
    return { id: account.id, username: account.username };
  }

  /* Không phân biệt "không có tài khoản" với "sai mật khẩu": luôn tốn một lần băm để thời gian phản hồi không lộ tên có tồn tại. */
  async authenticate(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 1024) return null;
    const account = this.byName.get(username.toLowerCase());
    if (!account) {
      this.dummy ??= await this.hash(crypto.randomBytes(16).toString('hex'));
      await this.verify(password, this.dummy);
      return null;
    }
    return (await this.verify(password, account.passwordHash)) ? { id: account.id, username: account.username } : null;
  }

  get(id) {
    const a = this.byId.get(id);
    return a ? { id: a.id, username: a.username } : null;
  }
}

module.exports = { AccountStore };
