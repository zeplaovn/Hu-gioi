/* Tài khoản Hư Giới: mật khẩu không lưu dạng rõ, phiên cookie HttpOnly,
   đăng nhập/đăng xuất, tách đường API và bảo vệ origin. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AuthService } = require('../server/services/auth-service.js');
const { createRouter } = require('../server/http/router.js');

test('đăng ký, đăng nhập, cookie và đăng xuất hoạt động với kho tài khoản cục bộ', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-auth-'));
  const file = path.join(dir, 'private', 'accounts.json');
  const server = http.createServer(createRouter(null, new AuthService(file)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); });
  const port = server.address().port;
  const send = (url, data, cookie, origin) => new Promise((resolve, reject) => {
    const body = data === undefined ? null : JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1', port, method: body ? 'POST' : 'GET', path: url,
      headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}),
        ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) }
    }, res => {
      const chunks = [];
      res.on('data', part => chunks.push(part));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()), cookie: res.headers['set-cookie']?.[0] }));
    });
    req.on('error', reject); req.end(body);
  });
  assert.equal((await send('/api/auth/session')).data.account, null);
  const email = 'dao@example.com', password = 'mat-khau-dai-va-kho-doan';
  assert.equal((await send('/api/auth/signup', { email, password: 'short' })).status, 400);
  assert.equal((await send('/api/auth/signup', { email, password }, null, 'https://other.example')).status, 403);
  const reg = await send('/api/auth/signup', { email: 'DAO@example.com', password });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.account.email, email);
  assert.ok(reg.data.account.id);
  assert.match(reg.cookie, /HttpOnly/);
  assert.match(reg.cookie, /SameSite=Strict/);
  const pair = reg.cookie.split(';')[0];
  assert.equal((await send('/api/auth/session', undefined, pair)).data.account.id, reg.data.account.id);
  assert.equal((await send('/api/auth/signup', { email, password })).status, 409);
  assert.equal((await send('/api/auth/login', { email, password: 'sai-mat-khau' })).status, 401);
  const login = await send('/api/auth/login', { email, password });
  assert.equal(login.status, 200);
  assert.equal(login.data.account.id, reg.data.account.id);
  assert.equal((await send('/api/auth/logout', {}, login.cookie.split(';')[0])).status, 200);
  assert.equal((await send('/api/auth/session', undefined, login.cookie.split(';')[0])).data.account, null);
  const raw = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(raw, /mat-khau-dai-va-kho-doan/);
  assert.doesNotMatch(raw, new RegExp(login.cookie.split(/[=;]/)[1]));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('chỉ rõ trạng thái UI và quy tắc xóa mọi bản lưu khi tọa hóa', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const boot = fs.readFileSync(path.join(__dirname, '../client/ui/boot.js'), 'utf8');
  const store = fs.readFileSync(path.join(__dirname, '../client/persistence/local-store.js'), 'utf8');
  const auth = fs.readFileSync(path.join(__dirname, '../client/auth/auth.js'), 'utf8');
  assert.match(html, /id="authGate"/);
  assert.match(html, /id="authForm"/);
  assert.match(html, /id="authGuest"/);
  assert.match(html, /id="switchAccount"/);
  assert.match(boot, /UI\.resetAfterDeath\s*=\s*function/);
  assert.match(boot, /store\.ready = false;\s*store\.clearAll\(\);\s*store\.fresh\(\)/);
  assert.match(boot, /creation = freshCreation\(\)/);
  assert.doesNotMatch(boot, /UI\.command\('reincarnate'\)/);
  assert.match(store, /activeBackup/);
  assert.match(store, /\.\.\.\(guest \? LEGACY : \[\]\)/);
  assert.match(auth, /credentials: 'same-origin'/);
  assert.doesNotMatch(auth, /localStorage\.(?:setItem|getItem)/);
});

test('không cho cấu hình kho tài khoản trong thư mục tĩnh có thể truy cập', () => {
  assert.throws(() => new AuthService(path.join(__dirname, '..', 'data', 'accounts.json')), /công khai/);
});
