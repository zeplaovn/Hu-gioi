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
  if (MEDIA.installed) paths.forEach(file => assert.ok(existsSync(path.join(ROOT, file)), file));
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
  assert.match(src, /UI\.action\('meridianTone'/);
  assert.match(src, /chưa cộng vào chỉ số nhân vật/);
  assert.doesNotMatch(src, /UI\.command\('(?:meridian|openMeridian|advanceMeridian)'/);
});
