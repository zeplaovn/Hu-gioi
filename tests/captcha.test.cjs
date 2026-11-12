'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const SITEKEY = '10000000-ffff-ffff-ffff-000000000001';

function captcha(sitekey, options = {}) {
  const appended = [], timers = [];
  const root = {
    HU_HCAPTCHA_SITEKEY: sitekey,
    document: {
      head: { appendChild: el => { appended.push(el); options.onScript?.(el, root); } },
      createElement: () => ({})
    },
    setTimeout: (fn, ms) => { timers.push(fn); return timers.length; },
    clearTimeout() {}
  };
  vm.runInNewContext(read('client/auth/captcha.js'), { window: root, globalThis: root, Promise, String, RegExp, Error });
  return { root, appended, timers };
}

test('CAPTCHA tắt khi sitekey trống hoặc sai định dạng và không tải script bên thứ ba', async () => {
  for (const key of ['', 'not-a-uuid', undefined]) {
    const { root, appended } = captcha(key);
    assert.equal(root.HU_CAPTCHA.enabled, false);
    await root.HU_CAPTCHA.mount({});
    assert.equal(appended.length, 0);
  }
  assert.equal(captcha(SITEKEY).root.HU_CAPTCHA.enabled, true);
});

test('CAPTCHA chờ hcaptcha.render sẵn sàng thay vì render ngay trong script.onload', async () => {
  let rendered = null;
  const container = { hidden: true };
  const { root, appended, timers } = captcha(SITEKEY);
  const mounting = root.HU_CAPTCHA.mount(container);
  assert.equal(appended.length, 1);
  assert.match(appended[0].src, /render=explicit/);
  assert.match(appended[0].src, /onload=__huGioiHcaptchaReady/);
  // Một số trình duyệt bắn script.onload trước khi API hcaptcha tồn tại.
  appended[0].onload();
  await Promise.resolve();
  assert.equal(container.hidden, true);
  root.hcaptcha = { render: (el, opts) => { rendered = { el, opts }; return 7; } };
  timers.shift()();
  await mounting;
  assert.equal(container.hidden, false);
  assert.equal(rendered.el, container);
  assert.equal(rendered.opts.sitekey, SITEKEY);
  root.HU_CAPTCHA.reset();
  assert.equal(root.HU_CAPTCHA.token(), '');
});

test('CAPTCHA dùng callback onload của hCaptcha khi API sẵn sàng', async () => {
  const container = { hidden: true };
  const { root, appended } = captcha(SITEKEY);
  const mounting = root.HU_CAPTCHA.mount(container);
  assert.equal(typeof root.__huGioiHcaptchaReady, 'function');
  root.hcaptcha = { render: () => 1 };
  root.__huGioiHcaptchaReady();
  await mounting;
  assert.equal(container.hidden, false);
  assert.equal(appended.length, 1);
});

test('CAPTCHA báo lỗi và cho phép thử lại khi không tải được script', async () => {
  const { root, appended, timers } = captcha(SITEKEY);
  const first = root.HU_CAPTCHA.mount({ hidden: true });
  appended[0].onerror();
  await assert.rejects(first, /Không tải được hCaptcha/);
  const second = root.HU_CAPTCHA.mount({ hidden: true });
  assert.equal(appended.length, 2);
  root.hcaptcha = { render: () => 1 };
  appended[1].onload();
  await second;
  assert.equal(timers.length, 0);
});

test('Mặc định client/config.js để trống sitekey (không đổi hành vi trước khi bật CAPTCHA)', () => {
  assert.match(read('client/config.js'), /HU_HCAPTCHA_SITEKEY = ''/);
});

test('Supabase adapter gửi captcha_token cho signup và login, và không gửi khi không có token', async () => {
  const bodies = [];
  const root = {
    location: { protocol: 'https:', hostname: 'game.example.invalid', origin: 'https://game.example.invalid', pathname: '/', hash: '', search: '' },
    HU_AUTH_MODE: 'direct',
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    async fetch(input, init) {
      const url = new URL(input);
      bodies.push({ path: url.pathname, body: JSON.parse(init.body || '{}') });
      const result = url.pathname.endsWith('/token')
        ? { access_token: 'a', refresh_token: 'r', expires_in: 3600 }
        : url.pathname.endsWith('/user') ? { id: 'u', email: 'dao@example.invalid' } : {};
      return { ok: true, status: 200, text: async () => JSON.stringify(result) };
    }
  };
  vm.runInNewContext(read('client/auth/supabase.js'), { window: root, globalThis: root, Date, URL, URLSearchParams, JSON, Error });
  await root.HU_SUPABASE.signup('dao@example.invalid', 'password-long-enough', { captchaToken: 'tok-1' });
  await root.HU_SUPABASE.login('dao@example.invalid', 'password-long-enough', { captchaToken: 'tok-2' });
  await root.HU_SUPABASE.login('dao@example.invalid', 'password-long-enough');
  const signup = bodies.find(b => b.path.endsWith('/signup')).body;
  const logins = bodies.filter(b => b.path.endsWith('/token')).map(b => b.body);
  assert.deepEqual(signup.gotrue_meta_security, { captcha_token: 'tok-1' });
  assert.deepEqual(logins[0].gotrue_meta_security, { captcha_token: 'tok-2' });
  assert.equal('gotrue_meta_security' in logins[1], false);
});

test('CSP (meta và _headers) cho phép hCaptcha, vẫn chặn script/frame lạ, và index nạp captcha.js trước auth.js', () => {
  const html = read('index.html');
  const meta = html.split('\n').find(line => line.includes('http-equiv="Content-Security-Policy"'));
  for (const csp of [meta, read('_headers')]) {
    assert.match(csp, /script-src 'self' https:\/\/js\.hcaptcha\.com https:\/\/\*\.hcaptcha\.com;/);
    assert.match(csp, /frame-src https:\/\/hcaptcha\.com https:\/\/\*\.hcaptcha\.com;/);
    assert.match(csp, /connect-src 'self' https:\/\/rvrwfeblishqadkpzspb\.supabase\.co https:\/\/hcaptcha\.com/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'|script-src[^;]*\*[^.]/);
  }
  assert.ok(html.indexOf('client/auth/supabase.js') < html.indexOf('client/auth/captcha.js'));
  assert.ok(html.indexOf('client/auth/captcha.js') < html.indexOf('client/auth/auth.js'));
  assert.match(html, /id="authCaptcha"/);
});
