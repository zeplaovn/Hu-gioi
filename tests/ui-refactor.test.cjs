/* Bảo vệ bố cục mới, từ ngữ người chơi và phép cắt ảnh item. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const A = require('../client/assets/assets.js');
const I = require('../client/assets/item-index.js');

const root = join(__dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');
const atlas = JSON.parse(read('media/assets/item/atlas.json'));

test('atlas dùng ô 128×128, ID bắt đầu 1, quét ngang rồi xuống hàng', () => {
  assert.equal(atlas.cellSize, 128);
  assert.equal(atlas.indexBase, 1);
  assert.equal(A.ITEM_CELL_SIZE, 128);
  const first = A.itemTile('HERB-001');
  const second = A.itemTile('HERB-002');
  const eighth = A.itemTile('HERB-008');
  const ninth = A.itemTile('HERB-009');
  assert.deepEqual([first.id, first.row, first.column, first.x, first.y], [1, 1, 1, 0, 0]);
  assert.deepEqual([second.id, second.row, second.column, second.x, second.y], [2, 1, 2, 128, 0]);
  assert.deepEqual([eighth.id, eighth.row, eighth.column, eighth.x, eighth.y], [8, 1, 8, 896, 0]);
  assert.deepEqual([ninth.id, ninth.row, ninth.column, ninth.x, ninth.y], [9, 2, 1, 0, 128]);
  assert.deepEqual([ninth.width, ninth.height], [128, 128]);
  assert.match(A.itemImg('HERB-009').style, /background-size:800% 1000%/);
  assert.match(A.itemImg('HERB-009').style, /background-position:0\.000000% 11\.111111%/);
});

test('tất cả các ô ảnh dùng tọa độ hợp lệ và đúng bảng atlas', () => {
  assert.equal(Object.keys(I.items).length, 492);
  for (const [code, ref] of Object.entries(I.items)) {
    if (!ref.includes('#')) continue;
    const tile = A.itemTile(code), info = atlas.items[code];
    assert.ok(tile, code);
    assert.equal(tile.id, info.slot, code);
    assert.equal(tile.x, (tile.column - 1) * 128, code);
    assert.equal(tile.y, (tile.row - 1) * 128, code);
    assert.ok(tile.row <= tile.rows && tile.column <= tile.columns, code);
  }
  assert.equal(A.itemTile('KHONG_TON_TAI'), null);
});

test('Cài đặt không hiển thị Bản lưu; cơ chế tự lưu được giữ nguyên', () => {
  const s = read('client/ui/screens/settings.js');
  const store = read('client/persistence/local-store.js');
  assert.doesNotMatch(s, /id: 'save'|function save\(\)|action\('export'|action\('import'/);
  assert.match(s, /const body = \{ season, audio, guide, account, legal \}/);
  assert.match(s, /data-act="deleteCharacter"/);
  assert.doesNotMatch(s, /WebGL|localStorage|HỆ THỐNG|file JSON/);
  assert.match(store, /write\(\) \{/);
});

test('ba khung nâng cấp nhanh không còn che sân khấu, công năng nâng cấp vẫn giữ', () => {
  const hud = read('client/ui/idle-hud.js');
  const css = read('css/idle.css');
  const panel = read('client/ui/screens/idle.js');
  assert.doesNotMatch(hud, /quickDock|dockHTML|updateDock/);
  assert.doesNotMatch(css, /\.quick-dock|\.qd-card/);
  assert.match(hud, /id="peakCta"/);
  assert.match(panel, /UI\.action\('upgrade'/);
  assert.match(panel, /UI\.action\('absorb'/);
});

test('từ điển chỉ số sử dụng thuật ngữ tu tiên nhất quán', () => {
  const core = read('client/ui/core.js');
  const char = read('client/ui/screens/character.js');
  const creation = read('data/character.js');
  assert.match(core, /qiRate: 'Tốc độ hấp thụ linh khí'/);
  assert.match(core, /mp: 'Linh lực tối đa'/);
  assert.match(core, /statDescriptions = Object\.freeze/);
  assert.match(char, /class="stat-glossary"/);
  assert.match(creation, /tốc độ hấp thụ linh khí/);
  assert.doesNotMatch(char, /Tốc tu|tốc tu|HP \+| MP · | ATK \+| DEF \+/);
});

test('phần tạo nhân vật bắt buộc phân bổ đủ 8 điểm gốc cộng điểm Thiên Mệnh Các, không hiện chú thích cũ', () => {
  const html = read('index.html');
  const boot = read('client/ui/boot.js');
  const rule = read('engine/rules/creation.js');
  assert.doesNotMatch(html, /Bạn phải phân bổ đủ 8 điểm thiên phú/);
  assert.match(html, /id="startNew"[^>]*disabled/);
  assert.match(boot, /creation\.points !== 0/);
  assert.match(rule, /const required = H\.TALENT_MAX \+ extra/);
  assert.match(rule, /total !== required/);
});
