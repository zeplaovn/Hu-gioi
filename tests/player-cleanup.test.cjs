/* Bảo đảm đạo thân chỉ dùng WebP mới và ở tâm đài trên mọi tỷ lệ màn hình. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const A = require('../client/assets/assets.js');
const IDX = require('../client/assets/asset-index.js');

test('không còn ảnh PNG nhân vật đời cũ trong repository', () => {
  const player = path.join(ROOT, 'media/assets/chars/player');
  assert.equal(fs.existsSync(path.join(player, 'nam')), false);
  assert.equal(fs.existsSync(path.join(player, 'nu')), false);
  assert.equal(Object.keys(IDX.player).length, 8);
  assert.ok(Object.keys(IDX.player).every(key => /^(nam|nu)\/(thien_dinh|di_bo|tung_skill|guc_nga)$/.test(key)));
});

test('mỗi giới cùng dùng ảnh nam/nữ WebP 6 khung, không tham chiếu PNG cũ', () => {
  const base = path.join(ROOT, 'media/assets/chars/player/realistic');
  const actions = { dung_yen: 'thien_dinh', di_chuyen: 'di_bo', tan_cong: 'tung_skill', tu_vong: 'guc_nga' };
  for (const gender of ['nam', 'nu']) {
    assert.ok(fs.existsSync(path.join(base, gender, 'portrait.webp')));
    for (const zone of [0, 5, 9, 13]) {
      assert.match(A.heroPortrait(gender, zone), new RegExp('realistic/' + gender + '/portrait\\.webp$'));
      for (const [action, folder] of Object.entries(actions)) {
        assert.equal(A.heroFrames(gender, zone, action), 6);
        for (let i = 0; i < 6; i++) {
          const src = A.heroSrc(gender, zone, action, i);
          const expected = 'media/assets/chars/player/realistic/' + gender + '/' + folder + '/' + String(i).padStart(2, '0') + '.webp';
          assert.equal(src, expected);
          assert.ok(fs.existsSync(path.join(ROOT, expected)), expected);
        }
      }
    }
  }
});

test('ảnh mặc định và manifest chỉ trỏ tới bộ WebP hiện tại', () => {
  const html = read('index.html');
  const manifest = read('client/assets/preload-manifest.js');
  const assets = read('client/assets/assets.js');
  const pack = read('client/ui/player-pack.js');
  for (const source of [html, manifest, assets, pack]) {
    assert.doesNotMatch(source, /chars\/player\/(?:nam|nu)\//);
    assert.doesNotMatch(source, /sprite gốc|fallback sprite/);
  }
  assert.match(html, /id="heroSprite" src="media\/assets\/chars\/player\/realistic\/nam\/thien_dinh\/00\.webp"/);
  assert.match(html, /id="tribHero" class="trib-hero" src="media\/assets\/chars\/player\/realistic\/nam\/thien_dinh\/00\.webp"/);
  assert.match(html, /id="avatar" src="media\/assets\/chars\/player\/realistic\/nam\/portrait\.webp"/);
});

test('đạo thân và pháp trận cùng lấy tâm X/Y trên đài, không lệch theo breakpoint', () => {
  const css = read('css/player-pack.css');
  assert.match(css, /#game\[data-stage="idle"\] #stage \{/);
  assert.match(css, /--cultivation-altar-x:\s*50%/);
  assert.match(css, /--cultivation-altar-y:\s*68%/);
  assert.match(css, /#game\[data-stage="idle"\] #stage #heroActor\s*\{[^}]*left:\s*var\(--cultivation-altar-x\);[^}]*top:\s*var\(--cultivation-altar-y\);[^}]*bottom:\s*auto;[^}]*transform:\s*translate\(-50%,\s*-100%\)/);
  assert.match(css, /#game\[data-stage="idle"\] #stage \.idle-aura\s*\{[^}]*left:\s*var\(--cultivation-altar-x\);/);
  assert.match(css, /orientation:\s*portrait/);
  assert.match(css, /orientation:\s*landscape/);
  assert.ok(css.indexOf('html.hg-realistic-player #game[data-stage="idle"] #stage #heroActor') > css.indexOf('html.hg-realistic-player #stage .hero-wrap'));
});
