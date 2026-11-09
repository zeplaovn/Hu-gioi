'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const loaderSource = fs.readFileSync(path.join(__dirname, '../client/platform/loader.js'), 'utf8');

function harness() {
  const images = [], events = [];
  const elements = new Map();
  const status = { textContent: '', style: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const bar = { style: {} };
  const pct = { textContent: '' };
  const tip = { textContent: '' };
  const classSet = new Set();
  const loading = {
    parentNode: { removeChild() {} },
    attrs: {},
    classList: {
      add: x => classSet.add(x),
      remove: x => classSet.delete(x),
      contains: x => classSet.has(x)
    },
    setAttribute(k, v) { this.attrs[k] = v; },
    querySelector(selector) {
      return { '.loading-fill': bar, '.loading-pct': pct, '.loading-track': status, '.loading-tip': tip }[selector];
    }
  };
  const note = { hidden: true, textContent: '' };
  const doc = { getElementById(id) { return { loading, engineNotice: note }[id] || null; } };
  class FakeImage {
    set src(value) { this.url = value; images.push(this); }
    decode() { return Promise.resolve(); }
  }
  class FakeEvent { constructor(type) { this.type = type; } }
  const root = {
    document: doc,
    HU_PRELOAD: ['hero-frame.webp', 'hero-frame.webp'],
    dispatchEvent: ev => events.push(ev.type)
  };
  vm.runInNewContext(loaderSource, {
    window: root, document: doc, Image: FakeImage, Event: FakeEvent,
    setTimeout: () => 1, clearTimeout: () => {},
    requestAnimationFrame: callback => callback()
  }, { filename: 'loader.js' });
  return { root, images, events, loading, pct, status, tip, note };
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}

test('không báo 100% khi engine hoặc hình ảnh còn đang xử lý', async () => {
  const h = harness();
  assert.equal(h.root.HU_LOADER.status.assetsDone, 0);
  assert.equal(h.pct.textContent, '0%');
  h.root.HU_LOADER.engineReady({ ready: true });
  assert.notEqual(h.pct.textContent, '100%');
  assert.equal(h.loading.classList.contains('done'), false);
  const pending = h.images.filter(img => typeof img.onload === 'function');
  assert.equal(pending.length, 4); // ảnh nền hiển thị + 3 ảnh thật trong danh sách
  pending.forEach(image => image.onload());
  await flush();
  assert.equal(h.root.HU_LOADER.status.assetsDone, 3);
  assert.equal(h.root.HU_LOADER.status.assetsReady, true);
  assert.equal(h.pct.textContent, '100%');
  assert.equal(h.loading.classList.contains('done'), true);
  assert.deepEqual(h.events, ['hu:loaded']);
});

test('đã nạp xong ảnh vẫn phải đợi engine xác nhận', async () => {
  const h = harness();
  h.images.filter(img => typeof img.onload === 'function').forEach(image => image.onload());
  await flush();
  assert.equal(h.root.HU_LOADER.status.assetsReady, true);
  assert.notEqual(h.pct.textContent, '100%');
  assert.equal(h.loading.classList.contains('done'), false);
  h.root.HU_LOADER.engineReady({ ready: true });
  assert.equal(h.pct.textContent, '100%');
});

test('ảnh hỏng không làm kẹt; engine lỗi không được báo hoàn tất giả', async () => {
  const h = harness();
  h.images.filter(img => typeof img.onload === 'function').forEach(img => {
    if (img.url === 'hero-frame.webp') img.onerror();
    else img.onload();
  });
  await flush();
  assert.equal(h.root.HU_LOADER.status.assetsFailed, 1);
  assert.equal(h.root.HU_LOADER.status.assetsReady, true);
  h.root.HU_LOADER.engineReady({ ready: false });
  assert.equal(h.root.HU_LOADER.status.engine, 'failed');
  assert.notEqual(h.pct.textContent, '100%');
  assert.equal(h.note.hidden, false);
  assert.deepEqual(h.events, []);
});
