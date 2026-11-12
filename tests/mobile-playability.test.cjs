/* Hồi quy mobile: Safari thiếu API tiện ích mới nhưng vẫn hỗ trợ fetch + CSPRNG. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const remoteSource = fs.readFileSync(path.join(__dirname, '../client/session/remote-session.js'), 'utf8');
const loaderSource = fs.readFileSync(path.join(__dirname, '../client/platform/loader.js'), 'utf8');

test('Safari thiếu AbortSignal.timeout và crypto.randomUUID vẫn tạo/sync/lệnh/trả Thiên Tinh', async () => {
  const PLAYER = '12345678-1234-4234-8234-555555555555';
  const requests = [], timers = new Set();
  const state = { created: true, name: 'Vân Lam', qi: 12, logs: [], settings: {} };
  const context = {
    AbortSignal: {}, // iOS Safari cũ: không có static timeout()
    AbortController,
    setTimeout(callback, ms) {
      assert.equal(ms, 20000);
      const id = setTimeout(callback, ms);
      timers.add(id);
      return id;
    },
    clearTimeout(id) { clearTimeout(id); timers.delete(id); },
    crypto: { getRandomValues: bytes => webcrypto.getRandomValues(bytes) },
    HU_GAME: { VERSION: 10, Game: class { constructor(s) { this.s = s; } }, create: () => ({ created: false }) },
    HU_COMMANDS: { VERSION: 3, validate: v => v },
    HU_SUPABASE: { accessToken: async () => 'ci-access-token' },
    document: { hidden: false },
    fetch: async (url, init) => {
      assert.ok(init.signal instanceof AbortSignal, 'timeout fallback phải tạo tín hiệu AbortController');
      requests.push({ url, body: init.body && JSON.parse(init.body) });
      const base = { protocolVersion: 3, schemaVersion: 10, contentVersion: 'mobile' };
      let payload;
      if (url.endsWith('/bootstrap')) payload = {
        ...base, player: { id: PLAYER }, snapshot: { ...base, revision: 0, state }
      };
      else if (url.endsWith('/commands')) payload = {
        ...base, revision: 1, state: { ...state, qi: 15 }, result: 3
      };
      else if (url.endsWith('/pavilion/purchase')) payload = {
        pavilion: { version: 1, balance: 0, upgrades: { ngoTinh: 1 } }
      };
      else throw Error('Unexpected API route ' + url);
      return { ok: true, status: 200, json: async () => payload };
    }
  };
  context.window = context;
  vm.runInNewContext(remoteSource, context);
  const session = new context.HU_REMOTE_SESSION.RemoteSession();
  await session.connect({ id: 'account' });
  assert.equal(session.ready, true);
  assert.equal(await session.dispatch('absorb', { index: 0 }), 3);
  await session.pavilionPurchase('upgrade', 'ngoTinh');

  const ids = requests.map(r => r.body?.requestId).filter(Boolean);
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(timers.size, 0, 'Không để timer 20 giây tồn tại sau request');

  context.crypto = {};
  await assert.rejects(session.dispatch('absorb', { index: 0 }), /mã giao dịch an toàn/);
  assert.equal(requests.length, 3, 'Không gửi lệnh không có requestId an toàn');
});

test('mobile chỉ chờ sáu ảnh cần thiết, không chặn màn đăng nhập bằng toàn bộ 97 ảnh', async () => {
  const images = [], events = [];
  const classNames = new Set();
  const fill = { style: {} }, pct = { textContent: '' }, track = { setAttribute() {} },
    tip = { textContent: '' }, label = { textContent: '' };
  const loading = {
    parentNode: { removeChild() {} },
    setAttribute() {},
    classList: { add(x) { classNames.add(x); }, contains(x) { return classNames.has(x); } },
    querySelector(selector) {
      return { '.loading-fill': fill, '.loading-pct': pct, '.loading-track': track,
        '.loading-tip': tip, '.loading-row span': label }[selector];
    }
  };
  const doc = { getElementById(id) { return id === 'loading' ? loading : null; } };
  class FakeImage {
    set src(url) { this.url = url; images.push(this); }
    decode() { return Promise.resolve(); }
  }
  const root = {
    document: doc,
    matchMedia: query => ({ matches: query.includes('pointer: coarse') }),
    HU_PRELOAD: Array.from({ length: 97 }, (_, i) => 'media/assets/unrelated-' + i + '.webp'),
    dispatchEvent(event) { events.push(event.type); }
  };
  vm.runInNewContext(loaderSource, {
    window: root, document: doc, Image: FakeImage,
    Event: class { constructor(type) { this.type = type; } },
    setTimeout: () => 1, clearTimeout: () => {},
    setInterval: () => 2, clearInterval: () => {},
    requestAnimationFrame: callback => callback()
  });
  assert.equal(root.HU_LOADER.status.assetsTotal, 6);
  const pending = images.filter(image => typeof image.onload === 'function');
  assert.equal(pending.length, 7, 'Sáu ảnh cần thiết + ảnh nền tải song song');
  assert.ok(images.every(image => !image.url.includes('/unrelated-')));
  root.HU_LOADER.engineReady({ ready: true });
  pending.forEach(image => image.onload());
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(root.HU_LOADER.status.assetsDone, 6);
  assert.equal(root.HU_LOADER.status.assetsReady, true);
  assert.equal(pct.textContent, '100%');
  assert.ok(classNames.has('done'));
  assert.deepEqual(events, ['hu:loaded']);
});
