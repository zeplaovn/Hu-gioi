'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../engine/game.js'), C = require('../engine/protocol/commands.js');
const NOW = 1_800_000_000_000;
const profile = { name: 'Lâm Vân', gender: 'nu', age: 18, race: 'nhan', roots: [72, 61, 45, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 } };

test('màn bế quan cho chọn phiên, dừng và xem báo cáo từ state máy chủ', async () => {
  const g = new H.Game(H.createCharacter(profile, NOW, () => .5), () => .5);
  g.s.extraLife = 1e6;
  const screens = {}, actions = {};
  const kit = {
    $() {}, esc: x => String(x).replace(/[&<>]/g, ''), clamp: x => x, num: String, money: String,
    moneyHTML: String, coinLabel: String, pct: String, duration: String,
    row: (a, b) => `<p>${a}: ${b}</p>`,
    btn: (label, action, attrs = '', disabled = false) => `<button data-act="${action}" ${attrs}${disabled ? ' disabled' : ''}>${label}</button>`,
    img() {}, codeAttr() {}, bar() {}, card: (title, body) => `<section><h3>${title}</h3>${body}</section>`, empty: String, live: String
  };
  const ui = { kit, data: { QUESTS: [] }, s: () => g.s, g: () => g,
    register: screen => { screens[screen.id] = screen; }, action: (name, fn) => { actions[name] = fn; },
    command: async (type, payload = {}) => C.execute(g, JSON.parse(JSON.stringify({ type, payload })), g.s.lastUpdate), toast() {} };
  const context = { HU_UI: ui, HU_GAME: H, HU_ASSETS: {} }; context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../client/ui/screens/idle.js'), 'utf8'), context);
  assert.match(screens.retreat.render(), /Tu luyện online đủ 60 giây/);
  g.s.progress.meditate = 60;
  assert.match(screens.retreat.render(), /data-duration="1800"/);
  assert.match(screens.retreat.render(), /data-duration="7200"/);
  assert.match(screens.retreat.render(), /data-duration="28800"/);
  await actions.retreatStart(null, { duration: '1800' });
  assert.match(screens.retreat.render(), /Kết thúc bế quan/);
  g.advance(NOW + 10_000);
  await actions.retreatStop();
  const html = screens.retreat.render();
  assert.match(html, /Báo cáo bế quan/);
  assert.match(html, /Mục tiêu gần/);
  assert.match(html, /Thời gian online: 10/);
  assert.match(html, /Đã kết thúc theo yêu cầu/);
  await actions.retreatAcknowledge();
  assert.equal(g.s.retreat.report, null);
});

test('menu có mục bế quan và báo hiệu khi báo cáo sẵn sàng', () => {
  const shell = fs.readFileSync(path.join(__dirname, '../client/ui/shell.js'), 'utf8');
  assert.match(shell, /const WINDOW_ORDER = \[[^\]]*'retreat'/);
  assert.match(shell, /badge\('retreat', '!', !!s\.retreat\?\.report\)/);
});
