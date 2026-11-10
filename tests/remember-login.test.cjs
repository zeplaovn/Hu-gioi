'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../client/auth/supabase.js'), 'utf8');

function adapter({ durable = new Map(), session = new Map(), protocol = 'https:', revoked = false } = {}) {
  const requests = [];
  const store = map => ({
    getItem: key => map.get(key) || null,
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key)
  });
  const root = {
    location: { protocol, hostname: 'game.example.invalid', origin: protocol + '//game.example.invalid', pathname: '/', hash: '', search: '' },
    HU_AUTH_MODE: 'direct',
    sessionStorage: store(session),
    localStorage: store(durable),
    async fetch(input, init) {
      requests.push({ input, init });
      const target = new URL(input, root.location.origin);
      const grant = target.searchParams.get('grant_type');
      let status = 200, result = null;
      if (target.pathname.endsWith('/auth/v1/token') && grant === 'password')
        result = { access_token: 'access-login', refresh_token: 'refresh-login', expires_in: 3600 };
      else if (target.pathname.endsWith('/auth/v1/token') && grant === 'refresh_token') {
        if (revoked) { status = 401; result = { code: 'refresh_token_not_found' }; }
        else result = { access_token: 'access-refreshed', refresh_token: 'refresh-refreshed', expires_in: 3600 };
      } else if (target.pathname.endsWith('/auth/v1/user'))
        result = { id: 'player-verified', email: 'dao@example.invalid' };
      else if (target.pathname.endsWith('/auth/v1/logout'))
        result = {};
      else throw Error('Unexpected URL ' + input);
      return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(result) };
    }
  };
  vm.runInNewContext(source, { window: root, globalThis: root, Date, URL, URLSearchParams, JSON, Error });
  return { root, api: root.HU_SUPABASE, durable, session, requests };
}

test('mặc định không ghi refresh token vào vùng nhớ dài hạn', async () => {
  const first = adapter();
  assert.equal(first.api.isRemembered(), false);
  const account = await first.api.login('dao@example.invalid', 'password-should-not-be-stored');
  assert.equal(account.id, 'player-verified');
  assert.equal(first.durable.size, 0);
  assert.equal(first.session.size, 1);
  const next = adapter({ durable: first.durable });
  assert.equal(await next.api.user(), null);
});

test('người chơi bật nhớ 30 ngày: lần mở sau dùng refresh token để xác thực lại', async () => {
  const first = adapter();
  assert.equal(first.api.rememberOnThisDevice(true), true);
  await first.api.login('dao@example.invalid', 'secret-not-persistent');
  const saved = JSON.parse(first.durable.get('huGioiRememberSessionV1'));
  assert.equal(saved.refresh_token, 'refresh-login');
  assert.deepEqual(Object.keys(saved).sort(), ['refresh_token', 'until']);
  assert.ok(saved.until > Date.now() + 29 * 86400000);
  assert.doesNotMatch(JSON.stringify([...first.durable]), /access-login|secret-not-persistent|access_token/);
  const reopened = adapter({ durable: first.durable });
  assert.equal(reopened.session.size, 0);
  assert.equal(reopened.api.isRemembered(), true);
  assert.equal((await reopened.api.user()).id, 'player-verified');
  assert.ok(reopened.requests.some(x => x.input.includes('grant_type=refresh_token')));
  assert.equal(JSON.parse(reopened.durable.get('huGioiRememberSessionV1')).refresh_token, 'refresh-refreshed');
});

test('hết 30 ngày hoặc bị thu hồi: yêu cầu đăng nhập lại và xóa token đã nhớ', async () => {
  const first = adapter();
  first.api.rememberOnThisDevice(true);
  await first.api.login('dao@example.invalid', 'password-not-stored');
  const remembered = JSON.parse(first.durable.get('huGioiRememberSessionV1'));
  first.durable.set('huGioiRememberSessionV1', JSON.stringify({ ...remembered, until: Date.now() - 1 }));
  const expired = adapter({ durable: first.durable });
  assert.equal(await expired.api.user(), null);
  assert.equal(expired.durable.has('huGioiRememberSessionV1'), false);

  const second = adapter();
  second.api.rememberOnThisDevice(true);
  await second.api.login('dao@example.invalid', 'password-not-stored');
  const revoked = adapter({ durable: second.durable, revoked: true });
  assert.equal(await revoked.api.user(), null);
  assert.equal(revoked.durable.size, 0);
  assert.equal(revoked.session.size, 0);
});

test('đăng xuất và bỏ chọn ghi nhớ xóa dữ liệu dài hạn', async () => {
  const h = adapter();
  h.api.rememberOnThisDevice(true);
  await h.api.login('dao@example.invalid', 'not-stored');
  assert.equal(h.durable.size, 1);
  await h.api.logout();
  assert.equal(h.durable.size, 0);
  assert.equal(h.session.size, 0);
  h.api.rememberOnThisDevice(true);
  await h.api.login('dao@example.invalid', 'not-stored');
  assert.equal(h.api.rememberOnThisDevice(false), false);
  assert.equal(h.durable.size, 0);
  assert.equal(h.api.isRemembered(), false);
});

test('thiết bị không HTTPS hoặc chặn lưu trữ sẽ không kích hoạt ghi nhớ', async () => {
  const insecure = adapter({ protocol: 'http:' });
  assert.equal(insecure.api.rememberOnThisDevice(true), false);
  await insecure.api.login('dao@example.invalid', 'not-stored');
  assert.equal(insecure.durable.size, 0);
  const restricted = adapter();
  Object.defineProperty(restricted.root, 'localStorage', { get() { throw Error('blocked'); } });
  assert.equal(restricted.api.rememberOnThisDevice(true), false);
  await restricted.api.login('dao@example.invalid', 'not-stored');
  assert.equal(restricted.api.isRemembered(), false);
});

test('giao diện trình bày tùy chọn ghi nhớ và vẫn buộc xác nhận chính sách trước khi vào game', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const auth = fs.readFileSync(path.join(__dirname, '../client/auth/auth.js'), 'utf8');
  const privacy = fs.readFileSync(path.join(__dirname, '../client/legal/privacy.html'), 'utf8');
  assert.match(html, /id="authRemember" type="checkbox"/);
  assert.match(html, /Ghi nhớ đăng nhập 30 ngày/);
  assert.match(auth, /SB\.rememberOnThisDevice\?\.\(\$\('authRemember'\)\.checked\)/);
  assert.ok(auth.indexOf('const consent = await SB.accepted()') < auth.indexOf('if (consent.has('));
  assert.match(auth, /if \(consent\.has\('privacy'\) && consent\.has\('release_terms'\)\) await enter\(next\)/);
  assert.match(privacy, /mã dùng để gia hạn phiên đăng nhập/);
});
