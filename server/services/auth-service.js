/* Tài khoản thử nghiệm cho máy chủ Node đơn lẻ. Không phải kho lưu gameplay online.
   Mật khẩu scrypt + salt ngẫu nhiên; phiên opaque lưu hash, cookie HttpOnly/SameSite=Strict.
   Dùng PostgreSQL/AuthProvider theo docs/backend-plan.md trước khi chạy nhiều instance. */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const COOKIE = 'hu_gioi_sid';
const MAX_AGE = 7 * 24 * 3600;
const FILE = process.env.HU_AUTH_FILE || path.resolve(process.cwd(), '.hu-gioi', 'accounts.json');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hashPassword = (pass, salt) => crypto.scryptSync(pass, salt, 64).toString('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const publicUser = u => ({ id: u.id, email: u.email });
const fail = (status, message) => Object.assign(Error(message), { status });

class AuthService {
  constructor(file = FILE) {
    this.file = path.resolve(file);
    /* Dù người vận hành cấu hình sai HU_AUTH_FILE, không ghi bí mật vào thư mục được public. */
    const publicRoot = path.resolve(__dirname, '..', '..');
    const exposed = ['client', 'css', 'data', 'engine', 'media'].some(dir => {
      const root = path.join(publicRoot, dir);
      return this.file === root || this.file.startsWith(root + path.sep);
    });
    if (exposed || this.file === path.join(publicRoot, 'index.html'))
      throw Error('HU_AUTH_FILE không được đặt trong thư mục tài nguyên công khai.');
    this.attempts = new Map();
  }
  read() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(raw.users) && Array.isArray(raw.sessions)) return raw;
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    return { users: [], sessions: [] };
  }
  save(db) {
    const dir = path.dirname(this.file);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = this.file + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600, flag: 'wx' });
      fs.renameSync(tmp, this.file);
    } finally {
      try { fs.unlinkSync(tmp); } catch { /* đã đổi tên */ }
    }
  }
  limit(req) {
    const key = req.socket.remoteAddress || 'unknown', now = Date.now();
    if (this.attempts.size > 10000) this.attempts.clear();
    const a = this.attempts.get(key) || { count: 0, reset: now + 15 * 60000 };
    if (a.reset < now) { a.count = 0; a.reset = now + 15 * 60000; }
    if (++a.count > 20) throw fail(429, 'Thử quá nhiều lần. Hãy thử lại sau.');
    this.attempts.set(key, a);
  }
  verifyMutationOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    const host = req.headers.host;
    if (!host || origin !== 'http://' + host && origin !== 'https://' + host) throw fail(403, 'Nguồn yêu cầu không hợp lệ.');
  }
  async body(req) {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw fail(415, 'Dữ liệu phải là JSON.');
    let size = 0, chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) throw fail(413, 'Dữ liệu quá lớn.');
      chunks.push(chunk);
    }
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'JSON không hợp lệ.'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'Dữ liệu không hợp lệ.');
    return value;
  }
  cookie(req, token, age = MAX_AGE) {
    const secure = (req.socket.encrypted || process.env.NODE_ENV === 'production') ? '; Secure' : '';
    return COOKIE + '=' + token + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + age + secure;
  }
  token(req) {
    const c = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
    const token = c?.slice(COOKIE.length + 1) || '';
    return /^[0-9a-f]{64}$/.test(token) ? token : null;
  }
  session(req) {
    const token = this.token(req);
    if (!token) return null;
    const db = this.read(), digest = sha(token);
    const s = db.sessions.find(s => s.hash === digest && s.expires > Date.now());
    const u = s && db.users.find(u => u.id === s.accountId);
    return u ? publicUser(u) : null;
  }
  issue(req, res, db, user) {
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions = db.sessions.filter(s => s.expires > Date.now() && s.accountId !== user.id).slice(-9999);
    db.sessions.push({ hash: sha(token), accountId: user.id, expires: Date.now() + MAX_AGE * 1000 });
    this.save(db);
    res.setHeader('Set-Cookie', this.cookie(req, token));
    return publicUser(user);
  }
  async signup(req, res) {
    this.verifyMutationOrigin(req); this.limit(req);
    const { email, password } = await this.body(req);
    const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(mail) || mail.length > 254)
      throw fail(400, 'Email không hợp lệ.');
    if (typeof password !== 'string' || password.length < 10 || password.length > 128)
      throw fail(400, 'Mật khẩu phải có 10–128 ký tự.');
    const db = this.read();
    if (db.users.some(u => u.email === mail)) throw fail(409, 'Email này đã được đăng ký.');
    const salt = crypto.randomBytes(16).toString('hex');
    const user = { id: crypto.randomUUID(), email: mail, salt, passwordHash: hashPassword(password, salt) };
    db.users.push(user);
    return this.issue(req, res, db, user);
  }
  async login(req, res) {
    this.verifyMutationOrigin(req); this.limit(req);
    const { email, password } = await this.body(req);
    const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof password !== 'string' || password.length > 128) throw fail(401, 'Email hoặc mật khẩu không đúng.');
    const db = this.read(), user = db.users.find(u => u.email === mail);
    const salt = user?.salt || '00000000000000000000000000000000';
    const digest = hashPassword(password, salt);
    if (!user || !safeEqual(user.passwordHash, digest)) throw fail(401, 'Email hoặc mật khẩu không đúng.');
    return this.issue(req, res, db, user);
  }
  logout(req, res) {
    this.verifyMutationOrigin(req);
    const token = this.token(req);
    if (token) {
      const db = this.read(), digest = sha(token);
      db.sessions = db.sessions.filter(s => s.hash !== digest);
      this.save(db);
    }
    res.setHeader('Set-Cookie', this.cookie(req, '', 0));
    return { ok: true };
  }
}
module.exports = { AuthService };
