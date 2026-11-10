/* Bản lưu của khách và các tài khoản phải tách rời; xóa khi chết không ảnh hưởng người khác. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

test('[legacy] xóa bản lưu và dự phòng chỉ của nhân vật hiện tại', () => {
  const source = readFileSync(join(__dirname, '../legacy/local-store.js'), 'utf8');
  const saved = new Map();
  const storage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
  let now = 1000;
  const H = {
    create: at => ({ created: false, name: '', lastSaved: at }),
    normalize: obj => obj?.created ? obj : null
  };
  const session = {
    clock: () => now,
    game: { s: H.create(now) },
    replace(x) { this.game = { s: x }; return this.game; }
  };
  const window = { HU_GAME: H };
  runInNewContext(source, { window, localStorage: storage, JSON, Blob: class {} });
  const store = window.HU_LOCAL_STORE.createStore(session, () => {});
  const key = 'huGioiWorkspaceV1';
  session.replace({ created: true, name: 'khach' }); store.write();
  const guest = saved.get(key);
  assert.ok(guest);
  store.setAccount('account-A');
  assert.equal(store.load(), null);
  session.replace({ created: true, name: 'A' }); store.write();
  session.replace({ created: true, name: 'A moi' }); store.write();
  const ka = key + ':account-A';
  assert.ok(saved.get(ka + 'Backup'));
  store.setAccount('account-B');
  assert.equal(store.load(), null);
  session.replace({ created: true, name: 'B' }); store.write();
  const kb = key + ':account-B';
  store.setAccount('account-A');
  assert.equal(store.load().name, 'A moi');
  store.clearAll();
  assert.equal(saved.has(ka), false);
  assert.equal(saved.has(ka + 'Backup'), false);
  assert.equal(store.load(), null);
  assert.ok(saved.has(kb));
  store.setAccount(null);
  assert.equal(store.load().name, 'khach');
  assert.equal(saved.get(key), guest);
});
