'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const MEDIA = require('../client/assets/custom-media.js');
const M = require('../data/meridians.js');

const ROOT = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(ROOT, file), 'utf8');

test('asset mới chỉ kích hoạt sau khi được chép đầy đủ', () => {
  const paths = [
    ...Object.values(MEDIA.backgrounds),
    MEDIA.furnace,
    ...['nam', 'nu'].flatMap(gender => [
      MEDIA.meridian(gender, 'xanh'), MEDIA.meridian(gender, 'vang'),
      ...['dan', 'khi'].flatMap(job => [
        MEDIA.workshop(gender, job, true), MEDIA.workshop(gender, job, false)
      ])
    ])
  ];
  assert.equal(new Set(paths).size, 15);
  assert.ok(paths.every(file => file.startsWith('media/assets/custom/2026-11/') && file.endsWith('.webp')));
  assert.equal(MEDIA.installed, true, 'Gói ảnh được triển khai trực tiếp cùng repository');
  paths.forEach(file => {
    const full = path.join(ROOT, file);
    assert.ok(existsSync(full), 'Thiếu ảnh đã kích hoạt: ' + file);
    const buffer = readFileSync(full);
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', 'Không phải WebP: ' + file);
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', 'Không phải WebP: ' + file);
  });
});

test('bốn đạo thể là ảnh gốc có alpha và giữ đúng 1312 × 1199 pixel', () => {
  for (const gender of ['nam', 'nu']) {
    for (const tone of ['xanh', 'vang']) {
      const file = MEDIA.meridian(gender, tone);
      const content = readFileSync(path.join(ROOT, file));
      assert.equal(content.toString('ascii', 12, 16), 'VP8X', file);
      assert.ok(content[20] & 0x10, 'Ảnh không còn alpha: ' + file);
      assert.equal(content.readUIntLE(24, 3) + 1, 1312, file);
      assert.equal(content.readUIntLE(27, 3) + 1, 1199, file);
    }
  }
  const src = read('client/ui/screens/character.js');
  assert.ok(src.includes('media?.installed'));
  assert.ok(src.includes('media.meridian(state.gender, tone)'));
  assert.match(src, /<img src=/);
});

test('HTML tải stylesheet và manifest trước giao diện nghề phụ, nhân vật', () => {
  const html = read('index.html');
  assert.match(html, /css\/custom-media\.css/);
  assert.ok(html.indexOf('client/assets/assets.js') < html.indexOf('client/assets/custom-media.js'));
  assert.ok(html.indexOf('client/assets/custom-media.js') < html.indexOf('client/ui/screens/craft.js'));
  assert.ok(html.indexOf('client/assets/custom-media.js') < html.indexOf('client/ui/screens/character.js'));
});

test('cảnh nghề phụ dùng hoạt ảnh theo giới tính, vẫn hoạt động khi thiếu gói asset', () => {
  const src = read('client/ui/screens/craft.js');
  assert.match(src, /function workshopScene\(tab\)/);
  assert.match(src, /!media\?\.installed/);
  assert.match(src, /media\.workshop\(s\.gender, tab, !UI\.isReduced\(\)\)/);
  assert.match(src, /media\.backgrounds\[tab\]/);
  assert.match(src, /UI\.action\('workshopFocus'/);
  assert.match(src, /Xem riêng lò đan/);
  assert.doesNotMatch(src, /Nghề phụ vẫn chạy khi bạn offline/);
});

test('kinh mạch hiển thị đủ 12 chính kinh, 8 kỳ kinh và không tạo lệnh gameplay mới', () => {
  const src = read('client/ui/screens/character.js');
  assert.equal(M.CHINH_KINH.length, 12);
  assert.equal(M.KY_KINH.length, 8);
  assert.match(src, /MERIDIAN_POSITIONS/);
  assert.match(src, /M\.CHINH_KINH/);
  assert.match(src, /M\.KY_KINH/);
  assert.match(src, /UI\.action\('meridianPick'/);
  assert.match(src, /UI\.action\('meridianGroup'/);
  // Nhóm quyết định màu ảnh và điểm mạch; không được chọn màu độc lập.
  assert.match(src, /const tone = group === 'ky' \? 'vang' : 'xanh'/);
  assert.match(src, /group === 'ky' \? '#e5c458' : '#75bfed'/);
  // Nút chỉ chuyển loại kinh mạch, không có nút chọn Thanh quang / Kim quang.
  assert.match(src, /option\('meridianGroup', 'group', 'chinh', '12 Chính Kinh', group === 'chinh'\)/);
  assert.match(src, /option\('meridianGroup', 'group', 'ky', '8 Kỳ Kinh', group === 'ky'\)/);
  assert.doesNotMatch(src, /option\('meridianGroup', 'group', 'chinh', '12 Chính Kinh · Màu xanh'/);
  assert.doesNotMatch(src, /option\('meridianGroup', 'group', 'ky', '8 Kỳ Kinh · Màu vàng'/);
  // Chú thích màu vẫn có ở bản đồ, đổi tự động theo nhóm.
  assert.match(src, /12 Chính Kinh · Màu xanh/);
  assert.match(src, /8 Kỳ Kinh · Màu vàng/);
  assert.match(src, /media\.meridian\(state\.gender, tone\)/);
  assert.match(src, /media\?\.meridianFallback\?\.\(state\.gender, tone\)/);
  assert.doesNotMatch(src, /UI\.action\('meridianTone'/);
  assert.doesNotMatch(src, /aria-label="Màu đạo thể"/);
  assert.match(src, /chưa cộng vào chỉ số nhân vật/);
  assert.doesNotMatch(src, /UI\.command\('(?:meridian|openMeridian|advanceMeridian)'/);
});
