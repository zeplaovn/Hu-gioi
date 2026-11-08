'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../client/ui/environment.js'), 'utf8');
const state = () => ({ zone: 0, tick: 0, settings: { season: 'spring' } });

function sandbox({ webpAvailable = true } = {}) {
  const requests = [];
  const elements = new Map();
  for (const id of ['game', 'scene', 'sceneBackdrop', 'sceneTransition', 'stageWeather', 'seasonAnnouncement']) {
    elements.set(id, { dataset: {}, style: {}, getAnimations: () => [], hidden: false, textContent: '' });
  }
  elements.get('game').dataset.stage = 'idle';
  const A = {
    BG: { combat: 'media/assets/world/bg/bi_canh.webp',
      combatFallback: 'media/assets/world/bg/bi_canh.png' },
    worldOf: () => 'ha_gioi',
    zoneBg: () => 'media/assets/world/bg/ha_gioi/day/xuan.webp'
  };
  const UI = { kit: { $: id => elements.get(id) }, isReduced: () => true };
  class MockImage {
    set src(value) {
      requests.push(value);
      queueMicrotask(() => {
        if (value === A.BG.combat && !webpAvailable) this.onerror?.();
        else this.onload?.();
      });
    }
    async decode() {}
  }
  const context = { HU_UI: UI, HU_ASSETS: A, Image: MockImage,
    document: { getElementById: id => elements.get(id) },
    setTimeout, clearTimeout, CustomEvent: class {},
    dispatchEvent() {} };
  vm.runInNewContext(source, context, { filename: 'environment.js' });
  return { env: UI.environment, state: state(), requests, elements, A,
    mode: value => { elements.get('game').dataset.stage = value; },
    flush: () => new Promise(resolve => setImmediate(resolve)) };
}

test('chiến đấu ưu tiên bi_canh.webp, không thay nền của tu luyện', async () => {
  const s = sandbox(), f = s.state;
  assert.equal(s.env.describe(f).src, 'media/assets/world/bg/ha_gioi/day/xuan.webp');
  s.env.update(f);
  await s.flush();
  s.mode('combat');
  assert.equal(s.env.describe(f).src, s.A.BG.combat);
  s.env.update(f);
  await s.flush();
  assert.equal(s.elements.get('sceneBackdrop').style.backgroundImage, "url('" + s.A.BG.combat + "')");
  s.mode('idle');
  s.env.update(f);
  await s.flush();
  assert.equal(s.elements.get('sceneBackdrop').style.backgroundImage, "url('" + s.A.zoneBg() + "')");
});

test('thiếu ảnh WebP thì tải PNG tồn tại thay vì để nền trống', async () => {
  const s = sandbox({ webpAvailable: false });
  s.mode('combat');
  s.env.update(s.state);
  await s.flush();
  assert.deepEqual(s.requests, [s.A.BG.combat, s.A.BG.combatFallback]);
  assert.equal(s.elements.get('sceneBackdrop').style.backgroundImage,
    "url('" + s.A.BG.combatFallback + "')");
  // Sau khi biết WebP không tồn tại, không lặp lại request 404 trên mỗi tick.
  s.env.update(s.state);
  assert.deepEqual(s.requests, [s.A.BG.combat, s.A.BG.combatFallback]);
  s.mode('idle');
  assert.equal(s.env.describe(s.state).src, s.A.zoneBg());
});

test('chỉ đổi ảnh cho stage combat, không đụng nền độ kiếp', () => {
  const assets = fs.readFileSync(path.join(__dirname, '../client/assets/assets.js'), 'utf8');
  assert.match(assets, /combat: BG_BASE \+ 'bi_canh\.webp'/);
  assert.match(assets, /combatFallback: BG_BASE \+ 'bi_canh\.png'/);
  assert.match(assets, /tribulation: BG_BASE \+ 'dai_loi_kiep\.webp'/);
  const shell = fs.readFileSync(path.join(__dirname, '../client/ui/shell.js'), 'utf8');
  assert.match(shell, /gameEl\.dataset\.stage = mode/);
  assert.match(shell, /UI\.environment\?\.update\(s\)/);
});
