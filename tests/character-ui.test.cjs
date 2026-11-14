/* Giao diện Nhân vật: năm tab, cửa sổ nổi cho pháp bảo/công pháp/vật phẩm. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../engine/game.js');

const NOW = 1800000000000;
const profile = { name: 'Lý Vô Thường', gender: 'nam', age: 18, race: 'nhan', roots: [72, 61, 45, 44, 33], rootType: 'Song', talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 }, destiny: 'exp' };

function setup() {
  const game = new H.Game(H.createCharacter(profile, NOW, () => 0), () => 0), actions = {}, modals = [];
  const str = x => String(x ?? '');
  const kit = { abs: str, $: () => null, esc: str, num: str, money: str, moneyHTML: str, pct: str, duration: str, row: (a, b) => `<p>${a}: ${b}</p>`, btn: (a, b, c = '') => `<button data-act="${b}" ${c}>${a}</button>`, img: () => '<img>', codeAttr: code => `data-code="${code}"`, bar: () => '', card: (t, b) => `<section>${t}${b}</section>`, empty: str, tabs: () => '' };
  let screen;
  const ui = { kit, data: { ELEMENTS: [] }, lists: {}, statNames: {}, statDescriptions: {}, view: {}, tabState: {}, session: { pavilion: {} }, s: () => game.s, g: () => game, register: x => { screen = x; }, action(n, f) { actions[n] = f; }, modalActions: new Set(), KEEP: Symbol('keep'), modal: (...a) => modals.push(a), refresh() {}, toast() {}, command: async () => {} };
  const env = { HU_GAME: H, HU_UI: ui, HU_ASSETS: { heroPortrait: () => '/portrait', heroSrc: () => '/meditation' }, document: { addEventListener() {}, querySelectorAll: () => [], elementFromPoint: () => null } };
  env.window = env;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../client/ui/screens/character.js'), 'utf8'), env);
  return { game, ui, screen, actions, modals };
}

test('màn Nhân vật có năm tab, gồm Công pháp và Thiên phú', () => {
  const { screen } = setup();
  assert.equal(screen.tabs.map(t => t.id).join(','), 'stats,skills,talents,roots,bag');
});

test('tab Thiên phú và Công pháp có nội dung riêng, tab Đạo thể không còn lẫn vào', () => {
  const { screen } = setup();
  assert.match(screen.render('talents'), /Thiên phú khởi nguyên/);
  assert.match(screen.render('skills'), /Bồi dưỡng theo cảnh giới/);
  assert.doesNotMatch(screen.render('stats'), /talent-list/);
});

test('hành trang: ô pháp bảo và công pháp mở cửa sổ, vật phẩm không còn khung chi tiết bên cạnh', () => {
  const html = setup().screen.render('bag');
  assert.match(html, /data-act="gearOpen"/);
  assert.match(html, /data-act="manualOpen"/);
  assert.match(html, /data-popup="1"/);
  assert.doesNotMatch(html, /inventory-detail/);
});

test('bấm vào pháp bảo mở cửa sổ danh sách, bấm vật phẩm mở cửa sổ chi tiết có nút trang bị', async () => {
  const { game, actions, modals, ui } = setup();
  const key = H.ITEMS.find(x => x.kind === 'EQ' && x.tier === 0).code;
  game.s.bag[key] = 1;
  assert.equal(await actions.gearOpen({}, {}), ui.KEEP);
  assert.equal(modals.at(-1)[0], 'Pháp bảo');
  assert.match(modals.at(-1)[1], new RegExp('data-select="' + key + '"'));
  await actions.itemPop({}, { select: key, from: 'gearOpen' });
  assert.match(modals.at(-1)[1], /data-act="equip"/);
  assert.match(modals.at(-1)[1], /Quay lại/);
});

test('cửa sổ công pháp báo trống khi chưa lĩnh ngộ, hiện công pháp khi đã học', async () => {
  const { game, actions, modals } = setup();
  await actions.manualOpen({}, {});
  assert.match(modals.at(-1)[1], /Chưa lĩnh ngộ công pháp nào/);
  const manual = H.ITEMS.find(x => x.kind === 'BT' && x.tier === 0 && !['BT-900', 'BT-901'].includes(x.code));
  game.s.learned[manual.key || manual.code] = 0;
  await actions.manualOpen({}, {});
  assert.match(modals.at(-1)[1], /data-select=/);
});
