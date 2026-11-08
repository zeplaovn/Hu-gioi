'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'client/ui/player-pack.js'), 'utf8');

function sandbox({ load = true } = {}) {
  let clock = 10_000, reduced = false, rerender = null, hits = { travel: 0, attack: 0, death: 0, rebirth: 0 };
  const state = { created: true, gender: 'nam', realm: 0, hp: 100, auto: false, settings: { motionMode: 'full' } };
  const a = {
    heroFrames: () => 3,
    heroSrc: (g, z, action, n) => `legacy/${g}/${action}/${n}`,
    heroPortrait: g => `legacy/${g}/portrait.png`,
    preloadHero: () => []
  };
  const ui = {
    s: () => state,
    isReduced: () => reduced,
    actions: { travel: () => { hits.travel++; return 'arrived'; } },
    action: (name, fn) => { ui.actions[name] = fn; },
    heroAttack: () => { hits.attack++; },
    onDeath: () => { hits.death++; },
    reincarnate: () => { hits.rebirth++; state.hp = 100; }
  };
  class FakeImage {
    set src(value) {
      this._src = value;
      if (load) queueMicrotask(() => this.onload?.());
      else queueMicrotask(() => this.onerror?.());
    }
    get src() { return this._src; }
  }
  const doc = { hidden: false, documentElement: { classList: { toggle() {} } }, getElementById: () => null };
  const env = { HU_ASSETS: a, HU_UI: ui, Image: FakeImage,
    setInterval: fn => { rerender = fn; },
    document: doc, Date: { now: () => clock },
    matchMedia: () => ({ matches: false })
  };
  vm.runInNewContext(source, env, { filename: 'player-pack.js' });
  return { a, ui, state, hits, setClock: t => { clock = t; }, setReduced: x => { reduced = x; }, render: () => rerender?.() };
}

test('thiếu asset thì giữ nguyên sprite cũ, không phá FE', async () => {
  const e = sandbox({ load: false });
  await Promise.resolve();
  assert.equal(e.a.heroFrames('nam', 0, 'dung_yen'), 3);
  assert.equal(e.a.heroSrc('nam', 0, 'dung_yen', 2), 'legacy/nam/dung_yen/2');
  assert.equal(e.ui.playerPack.has('nam'), false);
});

test('2 giới tính và 4 hành động dùng đúng bộ player.zip đã xử lý', async () => {
  const e = sandbox();
  await Promise.resolve();
  for (const g of ['nam','nu']) {
    assert.equal(e.ui.playerPack.has(g), true);
    assert.equal(e.a.heroFrames(g, 12, 'tan_cong'), 6);
    assert.match(e.a.heroPortrait(g, 10), new RegExp(`realistic/${g}/portrait\\.webp$`));
    assert.match(e.a.heroSrc(g, 10, 'dung_yen', 3), new RegExp(`realistic/${g}/thien_dinh/00\\.webp$`));
  }
});

test('đi bộ khi đổi khu vực, bước đủ nhịp rồi trở về thiền', async () => {
  const e = sandbox(); await Promise.resolve();
  assert.equal(e.ui.actions.travel(), 'arrived');
  assert.equal(e.hits.travel, 1);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /di_bo\/00\.webp$/);
  e.setClock(10170);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /di_bo\/01\.webp$/);
  e.setClock(11030);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /thien_dinh\/00\.webp$/);
});

test('tung skill khi đánh và không thay đổi logic chiến đấu', async () => {
  const e = sandbox(); await Promise.resolve();
  e.ui.heroAttack();
  assert.equal(e.hits.attack, 1);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /tung_skill\/00\.webp$/);
  e.setClock(10155);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /tung_skill\/01\.webp$/);
  e.setClock(11000);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /thien_dinh\/00\.webp$/);
});

test('gục ngã chỉ phát một lần, giữ khung cuối, trọng sinh resets', async () => {
  const e = sandbox(); await Promise.resolve();
  e.ui.onDeath({ died: true });
  assert.equal(e.hits.death, 1);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /guc_nga\/00\.webp$/);
  e.setClock(11400);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /guc_nga\/05\.webp$/);
  e.ui.reincarnate();
  assert.equal(e.hits.rebirth, 1);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /thien_dinh\/00\.webp$/);
});

test('giảm chuyển động dùng khung tĩnh và file WebP thực có alpha', async () => {
  const e = sandbox(); await Promise.resolve();
  e.setReduced(true);
  e.ui.heroAttack(); e.setClock(10550);
  assert.match(e.a.heroSrc('nam', 0, 'dung_yen'), /tung_skill\/00\.webp$/);
  const base = path.join(root, 'media/assets/chars/player/realistic');
  for (const g of ['nam', 'nu']) {
    for (const action of ['thien_dinh', 'di_bo', 'tung_skill', 'guc_nga']) {
      for (let i = 0; i < 6; i++) {
        const p = path.join(base, g, action, String(i).padStart(2,'0') + '.webp');
        assert.ok(fs.statSync(p).size > 500, p);
        assert.equal(fs.readFileSync(p).subarray(8,12).toString('ascii'), 'WEBP');
      }
    }
  }
});
