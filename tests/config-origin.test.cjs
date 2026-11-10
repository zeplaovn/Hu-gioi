/* Cấu hình public duy nhất cho frontend, build, static Node và gateway đăng nhập. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeOrigin } = require('../client/config.js');
const { settings, connectSrc, csp, injectConnectSrc, renderBrowserConfig } = require('../server/http/public-config.js');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'client/config.js'), 'utf8');

test('same-origin khi HU_API_ORIGIN thiếu và dùng một helper cho cả gameplay/gateway', () => {
  const config = settings({});
  assert.equal(config.apiOrigin, '');
  const w = { location: { origin: 'https://game.example.test', protocol: 'https:' } };
  vm.runInNewContext(template, { window: w, URL });
  assert.equal(w.HU_API_ORIGIN, '');
  assert.equal(w.HU_PUBLIC_CONFIG.apiUrl('/api/v1/bootstrap'), '/api/v1/bootstrap');
  assert.equal(w.HU_PUBLIC_CONFIG.apiUrl('/api/auth/supabase-login'), '/api/auth/supabase-login');
  assert.equal(connectSrc(config).split(' ').filter(x => x === "'self'").length, 1);
});

test('FE khác origin dùng cùng HU_API_ORIGIN; CSP chỉ cấp đúng API và Supabase origin', () => {
  const env = {
    HU_API_ORIGIN: 'https://api.hu-gioi.example',
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_Public123'
  };
  const config = settings(env);
  const w = {};
  vm.runInNewContext(renderBrowserConfig(config), { window: w, URL });
  assert.equal(w.HU_PUBLIC_CONFIG.apiUrl('/api/v1/bootstrap'), 'https://api.hu-gioi.example/api/v1/bootstrap');
  assert.equal(w.HU_PUBLIC_CONFIG.apiUrl('/api/auth/supabase-login'), 'https://api.hu-gioi.example/api/auth/supabase-login');
  assert.equal(w.HU_PUBLIC_CONFIG.supabaseUrl, env.SUPABASE_URL);
  assert.equal(w.HU_PUBLIC_CONFIG.supabasePublishableKey, env.SUPABASE_PUBLISHABLE_KEY);
  const expected = "connect-src 'self' https://test-project.supabase.co https://api.hu-gioi.example";
  assert.ok(csp(config).includes(expected));
  const actual = injectConnectSrc('connect-src __HU_CONNECT_SRC__', config);
  assert.equal(actual, expected);
  assert.doesNotMatch(csp(config), /script-src[^;]*unsafe-(?:inline|eval)|connect-src[^;]*\*/);
});

test('API origin sai đều bị từ chối, kể cả authinfo/path/query/fragment', () => {
  for (const origin of [
    'http://example.com', 'http://api.hu-gioi.example', 'https://example.com/v1',
    'https://example.com/?x=1', 'https://example.com/#frag',
    'https://user:password@example.com', '//example.com', 'https://example.com.evil/path',
    'file:///tmp', 'https://example.com ',
  ]) assert.throws(() => normalizeOrigin(origin, true), undefined, origin);
  assert.equal(normalizeOrigin('http://localhost:8000'), 'http://localhost:8000');
  assert.equal(normalizeOrigin('http://127.0.0.1:8001'), 'http://127.0.0.1:8001');
  assert.throws(() => settings({ HU_API_ORIGIN: 'https://example.com/v1' }));
});

test('build meta/header từ một cấu hình, bỏ file: và giữ thứ tự classic script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  const resolved = injectConnectSrc(html);
  assert.ok(resolved.includes("<meta http-equiv=\"Content-Security-Policy\""));
  assert.doesNotMatch(resolved.match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)[0], /file:/);
  assert.ok(injectConnectSrc(headers).includes('connect-src '));
  assert.ok(html.indexOf('client/config.js') < html.indexOf('client/session/remote-session.js'));
  assert.ok(html.indexOf('client/session/remote-session.js') < html.indexOf('client/auth/supabase.js'));
});
