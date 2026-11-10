'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const loaderSource = fs.readFileSync(path.join(__dirname, '../client/platform/loader.js'), 'utf8');

function harness() {
  const images = [], events = [], intervals = new Map();
  let nextInterval = 0;
  const phaseLabel = { textContent: '' };
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
      return { '.loading-fill': bar, '.loading-pct': pct, '.loading-track': status, '.loading-tip': tip, '.loading-row span': phaseLabel }[selector];
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
    setInterval: callback => { const id = ++nextInterval; intervals.set(id, callback); return id; },
    clearInterval: id => { intervals.delete(id); },
    requestAnimationFrame: callback => callback()
  }, { filename: 'loader.js' });
  return { root, images, events, loading, pct, status, tip, phaseLabel, intervals, note };
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}
test('không đạt 100% trước khi ảnh và lõi game đều sẵn sàng', async () => {
  const h = harness();
  assert.equal(h.root.HU_LOADER.status.assetsDone, 0);
  assert.equal(h.pct.textContent, '0%');
  h.root.HU_LOADER.engineReady({ ready: true });
  assert.notEqual(h.pct.textContent, '100%');
  assert.equal(h.loading.classList.contains('done'), false);
  const pending = h.images.filter(img => typeof img.onload === 'function');
  assert.equal(pending.length, 4);
  pending.forEach(image => image.onload());
  await flush();
  assert.equal(h.root.HU_LOADER.status.assetsDone, 3);
  assert.equal(h.root.HU_LOADER.status.assetsReady, true);
  assert.equal(h.pct.textContent, '100%', 'Không phải đợi vòng mẹo mới được vào game');
  assert.equal(h.loading.classList.contains('done'), true);
  assert.equal(h.intervals.size, 0, 'Vòng mẹo dừng khi đã tải xong');
  assert.deepEqual(h.events, ['hu:loaded']);
});

test('ảnh đã tải xong vẫn chờ lõi game, không chờ mẹo', async () => {
  const h = harness();
  h.images.filter(img => typeof img.onload === 'function').forEach(image => image.onload());
  await flush();
  assert.equal(h.root.HU_LOADER.status.assetsReady, true);
  assert.notEqual(h.pct.textContent, '100%');
  assert.equal(h.loading.classList.contains('done'), false);
  h.root.HU_LOADER.engineReady({ ready: true });
  assert.equal(h.pct.textContent, '100%');
  assert.deepEqual(h.events, ['hu:loaded']);
});

test('ảnh lỗi vẫn có dự phòng, lõi game lỗi không báo hoàn tất giả', async () => {
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
  assert.equal(h.intervals.size, 0);
});

test('mẹo xoay ngay trong khi tải, không tác động tiến độ hay điều kiện hoàn tất', async () => {
  const h = harness();
  const seen = [h.tip.textContent];
  assert.ok(seen[0].length > 25);
  assert.match(h.phaseLabel.textContent, /Đang tải tài nguyên · 0\/3/);
  assert.equal(h.intervals.size, 1);
  for (let i = 0; i < 7; i++) {
    const rotate = [...h.intervals.values()][0];
    assert.ok(rotate);
    rotate();
    seen.push(h.tip.textContent);
    assert.equal(h.pct.textContent, '0%', 'Đổi mẹo không cộng phần trăm tải');
  }
  assert.equal(new Set(seen).size, 8, 'Đã phát đủ tám mẹo theo vòng');
  const rotate = [...h.intervals.values()][0];
  rotate();
  assert.equal(h.tip.textContent, seen[0], 'Mẹo quay vòng khi tải chậm');
  h.root.HU_LOADER.engineReady({ ready: true });
  h.images.filter(img => typeof img.onload === 'function').forEach(img => img.onload());
  await flush();
  assert.equal(h.pct.textContent, '100%');
  assert.equal(h.intervals.size, 0, 'Không còn bộ hẹn giờ sau khi vào game');
});

test('giữ tám mẹo đúng nội dung, kể cả mẹo nghề phụ tạm dừng khi rời game', () => {
  assert.match(loaderSource, /Ma thú về đêm mạnh và nguy hiểm hơn/);
  assert.match(loaderSource, /Nghề phụ tạm dừng khi rời game/);
  assert.match(loaderSource, /Trang bị phẩm chất cao giúp sống sót/);
  const block = loaderSource.split('  const HINTS = [')[1]?.split('\n  ];')[0] || '';
  assert.equal((block.match(/^    '[^\n]+',?$/gm) || []).length, 8);
  assert.match(loaderSource, /const stopInitialHints = rotateHints\(tip\)/);
  assert.match(loaderSource, /const stopEntryHints = rotateHints\(hint\)/);
  assert.match(loaderSource, /stopEntryHints\(\)/);
  assert.match(loaderSource, /3200/);
});

test('loading lúc tạo nhân vật không đợi mẹo trước khi vào game', () => {
  const begin = loaderSource.indexOf('async function enter(urls, start)');
  const section = loaderSource.slice(begin);
  assert.ok(begin >= 0);
  assert.match(section, /const stopEntryHints = rotateHints\(hint\)/);
  assert.match(section, /if \(typeof start === 'function'\) await start\(result\)/);
  assert.match(section, /draw\(bar, number, meter, 1,/);
  assert.doesNotMatch(section, /await hintsReady|resolveHints|chờ đủ 8 mẹo/i);
  assert.doesNotMatch(loaderSource, /hintsComplete/);
});
