'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../client/assets/player-preload.js'),'utf8');

test('preload chỉ giữ ảnh ưu tiên, bỏ frame pixel cũ và bảo toàn các asset khác', () => {
  const ctx = { HU_PRELOAD: [
    'media/assets/world/bg/logo.webp',
    'media/assets/chars/player/nam/ha_gioi/dung_yen/1.png',
    'media/assets/chars/player/nu/ha_gioi/portrait.png',
    'media/assets/world/bg/ha_gioi/day/xuan.webp'
  ] };
  vm.runInNewContext(source, ctx);
  const list = Array.from(ctx.HU_PRELOAD);
  assert.equal(list.length, 6);
  assert.deepEqual(list.slice(0,4), [
    'media/assets/chars/player/realistic/nam/portrait.webp',
    'media/assets/chars/player/realistic/nam/thien_dinh/00.webp',
    'media/assets/chars/player/realistic/nu/portrait.webp',
    'media/assets/chars/player/realistic/nu/thien_dinh/00.webp'
  ]);
  assert.ok(list.includes('media/assets/world/bg/logo.webp'));
  assert.ok(!list.some(x => x.includes('/chars/player/') && !x.includes('/realistic/')));
});

test('thiếu manifest không gây lỗi, giữ nguyên hành vi boot', () => {
  assert.doesNotThrow(()=>vm.runInNewContext(source, {}));
});
