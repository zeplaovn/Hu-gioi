/* Kiểm thử ánh xạ ảnh vật phẩm và điều kiện sử dụng hết điểm thiên phú. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const INDEX = require('../client/assets/item-index.js');
const ASSETS = require('../client/assets/assets.js');
const CATALOGUE = require('../data/items.js');
const H = require('../engine/game.js');
const ROOT = join(__dirname, '..');
const ATLAS = JSON.parse(readFileSync(join(ROOT, 'media/assets/item/atlas.json'), 'utf8'));

test('493 item trong danh mục được ánh xạ đúng vị trí và atlas JSON', () => {
  const codes = CATALOGUE.map(item => item.code);
  assert.equal(codes.length, 493);
  assert.equal(new Set(codes).size, 493);
  assert.deepEqual(Object.keys(INDEX.items).sort(), [...codes].sort());
  assert.deepEqual(Object.keys(ATLAS.items).sort(), [...codes].sort());
  for (const code of codes) {
    const ref = INDEX.items[code], detail = ATLAS.items[code];
    assert.ok(detail, code);
    if (ref.includes('#')) {
      const [sheet, index] = ref.split('#');
      const grid = INDEX.sheets[sheet];
      assert.ok(grid, code + ': thiếu atlas ' + sheet);
      assert.ok(Number.isInteger(Number(index)) && index >= INDEX.indexBase, code);
      assert.ok(index - INDEX.indexBase < grid[0] * grid[1], code);
      assert.equal(detail.image, 'item/' + sheet, code);
      assert.equal(detail.slot, Number(index), code);
    } else {
      assert.equal(detail.image, ref, code);
    }
  }
});

test('mọi ảnh item đều trỏ tới file PNG tồn tại trong repo', () => {
  for (const sheet of Object.keys(INDEX.sheets)) {
    assert.ok(existsSync(join(ROOT, 'media/assets/item', sheet)), 'Thiếu sprite sheet: ' + sheet);
    assert.equal(ATLAS.sheets[sheet].columns, INDEX.sheets[sheet][0]);
    assert.equal(ATLAS.sheets[sheet].rows, INDEX.sheets[sheet][1]);
  }
  for (const [code, ref] of Object.entries(INDEX.items)) {
    if (!ref.includes('#')) assert.ok(existsSync(join(ROOT, 'media/assets', ref)), code + ': ' + ref);
  }
});

test('resolver hiển thị atlas và ảnh đơn; mã không tồn tại có SVG dự phòng', () => {
  const herb = ASSETS.itemImg({ code: 'HERB-002' });
  assert.match(herb.src, /^data:image\/svg\+xml/);
  assert.match(herb.style, /media\/assets\/item\/HG\.png/);
  assert.match(herb.style, /background-image:/);
  const special = ASSETS.itemImg({ code: 'QITEM-HD-01' });
  assert.equal(special.src, 'media/assets/item/vat_pham_dac_biet/SSSITEM01.png');
  assert.equal(special.style, '');
  const unknown = ASSETS.itemImg({ code: 'ITEM-KHONG-CO' });
  assert.match(unknown.src, /^data:image\/svg\+xml/);
  assert.equal(unknown.style, '');
});

test('trang tra cứu item không dùng tên sprite sheet cũ', () => {
  const html = readFileSync(join(ROOT, 'media/assets/tra_cuu_item.html'), 'utf8');
  for (const old of ['herb.png','seed.png','material.png','talisman.png','gift.png','cong_phap.png','phap_bao.png','single_pill.png','pack_pill.png']) {
    assert.ok(!html.includes('item/' + old), old);
  }
  assert.match(html, /item\/HG\.png/);
  assert.match(html, /item\/DAN_1\.png/);
});

test('engine từ chối tạo nhân vật khi còn điểm thiên phú chưa dùng', () => {
  const profile = {
    name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan',
    roots: [72, 61, 55, 44, 33], rootType: 'Song',
    talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 0 }
  };
  assert.throws(() => H.createCharacter(profile, 1700000000000, () => .5), /phân bổ đủ 8 điểm/);
  const full = { ...profile, talent: { ...profile.talent, vanKhi: 1 } };
  const state = H.createCharacter(full, 1700000000000, () => .5);
  assert.equal(Object.values(state.talent).reduce((a, b) => a + b, 0), 8);
  assert.deepEqual(state.talent, full.talent);
});

test('nút vào game chỉ mở khi phân bổ đủ 8 điểm và thông báo rõ ràng', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const boot = readFileSync(join(ROOT, 'client/ui/boot.js'), 'utf8');
  assert.match(html, /id="startNew"[^>]*aria-describedby="pointsValue" disabled/);
  assert.match(html, /Còn 8\/8 điểm — cần phân bổ hết để bắt đầu/);
  assert.doesNotMatch(html, /Bạn phải phân bổ đủ 8 điểm thiên phú để bắt đầu/);
  assert.match(boot, /start\.disabled = [^;]*creation\.points !== 0/);
  assert.match(boot, /if \(creation\.points !== 0\) \{/);
  assert.match(boot, /points\.classList\.toggle\('points-complete', complete\)/);
});
