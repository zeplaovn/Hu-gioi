/* Atlas vật phẩm phải khớp kích thước ảnh thật; ô chủng tộc/linh căn chỉ hiện tên; logo có hiệu ứng lơ lửng. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const read = p => readFileSync(join(root, p), 'utf8');
global.window = global;
require('../client/assets/item-index.js');
const INDEX = global.HU_ITEM_INDEX;

/* Đọc kích thước WebP từ header (VP8 / VP8L / VP8X), không cần thư viện. */
function webpSize(file) {
  const b = readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', file);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error('WebP không rõ: ' + kind);
}

test('mỗi atlas vật phẩm: kích thước ảnh = số cột/hàng × 128 (HG và LT từng bị đặt ngược tên)', () => {
  for (const [sheet, [cols, rows]] of Object.entries(INDEX.sheets)) {
    const size = webpSize(join(root, 'media/assets/item', sheet.replace(/\.png$/, '.webp')));
    assert.deepEqual(size, { w: cols * 128, h: rows * 128 }, sheet);
  }
});

test('mọi tham chiếu vật phẩm nằm trong lưới của atlas', () => {
  for (const [code, ref] of Object.entries(INDEX.items)) {
    if (!ref.includes('#')) continue;
    const [sheet, id] = ref.split('#');
    assert.ok(INDEX.sheets[sheet], code + ' → atlas không tồn tại: ' + sheet);
    const [cols, rows] = INDEX.sheets[sheet];
    assert.ok(Number(id) >= INDEX.indexBase && Number(id) < INDEX.indexBase + cols * rows, code + ' ' + ref);
  }
});

test('HG chứa dược thảo (80 ô) và LT chứa hạt giống (69 ô)', () => {
  const count = s => Object.values(INDEX.items).filter(r => r.startsWith(s + '#')).length;
  assert.equal(count('HG.png'), 80);
  assert.equal(count('LT.png'), 69);
  assert.ok(Object.entries(INDEX.items).filter(([, r]) => r.startsWith('HG.png#')).every(([c]) => /^HERB-/.test(c)));
  assert.ok(Object.entries(INDEX.items).filter(([, r]) => r.startsWith('LT.png#')).every(([c]) => /^SEED-HERB-/.test(c)));
});

test('ô chủng tộc và linh căn chỉ hiện tên; chi tiết nằm trong bảng thông tin', () => {
  const boot = read('client/ui/boot.js');
  const body = boot.slice(boot.indexOf("$('raceValue').innerHTML"), boot.indexOf("$('rootValue').setAttribute"));
  assert.ok(!body.includes('field-sub'));
  assert.ok(!body.includes('purity'));
  assert.ok(!body.includes('chip'));
  assert.match(boot, /Độ tinh khiết <b class="gold">/, 'độ tinh khiết chuyển vào bảng thông tin');
  assert.match(read('css/creation.css'), /\.create-right>\*\{flex-shrink:0\}/, 'không để khối co lại rồi chồng chữ');
});

test('mọi logo có hiệu ứng lơ lửng và tôn trọng giảm chuyển động', () => {
  const base = read('css/base.css');
  for (const cls of ['loading-logo', 'auth-logo', 'brand-logo', 'scene-logo']) {
    assert.match(base, new RegExp('\\.' + cls), cls);
  }
  assert.match(base, /@keyframes huLogoFloat/);
  assert.match(base, /prefers-reduced-motion:reduce\)\{\.loading-logo/);
  const html = read('index.html');
  for (const cls of ['scene-photo', 'scene-mist', 'scene-motes']) assert.ok(html.includes(cls), cls);
});
