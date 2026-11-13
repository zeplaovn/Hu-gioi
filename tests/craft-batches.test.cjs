'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../engine/game.js'), C = require('../engine/protocol/commands.js');
const { MemoryPlayers } = require('./helpers/memory-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const NOW = 1_800_000_000_000, CODE = 'PILL-001';
const profile = { name: 'Lâm Vân', gender: 'nu', age: 18, race: 'nhan', roots: [72, 61, 45, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 } };
function make() {
  const g = new H.Game(H.createCharacter(profile, NOW, () => 0), () => 0);
  g.s.borrowedBook = 'dan_ha'; g.s.bag = {}; g.s.stone = 1e6; g.s.extraLife = 1e6;
  const recipe = g.recipe(CODE);
  for (const [code, n] of Object.entries(recipe.herbs)) g.add(code, n * 3);
  return g;
}
const run = (g, payload) => C.execute(g, { type: 'craft', payload }, NOW);

test('xếp ba mẻ theo thứ tự, chỉ dùng tinh hoa cho mẻ đầu và nhận kết quả một lần', () => {
  const g = make(), recipe = g.recipe(CODE), beforeStone = g.s.stone;
  const herbs = Object.fromEntries(Object.keys(recipe.herbs).map(code => [code, g.ingredientCount(code)]));
  g.s.craftBoost = .2;
  const firstChance = g.craftChance(H.item(CODE).tier);
  run(g, { code: CODE, count: 3 });
  assert.equal(g.s.craftQueue.length, 3);
  assert.deepEqual(g.s.craftQueue.map(j => j.end), [1, 2, 3].map(n => NOW + n * recipe.time * 1000));
  assert.equal(g.s.craftQueue[0].success, firstChance);
  assert.equal(g.s.craftQueue[1].success, g.craftChance(H.item(CODE).tier));
  assert.equal(g.s.craftBoost, 0);
  assert.equal(g.s.stone, beforeStone - 3 * recipe.stone);
  for (const [code, n] of Object.entries(recipe.herbs)) assert.equal(g.ingredientCount(code), herbs[code] - 3 * n);
  const end = g.s.craftQueue[2].end;
  assert.equal(g.advance(end).batches, 3);
  assert.equal(g.ingredientCount(CODE), 9);
  assert.equal(g.advance(end + 1000).batches, 0);
  assert.equal(g.ingredientCount(CODE), 9);
});

test('kiểm tra đủ chỗ, nguyên liệu và linh thạch trước khi thay đổi trạng thái', () => {
  for (const kind of ['slots', 'herbs', 'stone']) {
    const g = make(), r = g.recipe(CODE);
    if (kind === 'slots') g.s.craftQueue.push({ code: CODE, end: NOW + r.time * 1000, success: .5, quality: 0 });
    if (kind === 'herbs') { const [code, n] = Object.entries(r.herbs)[0]; g.takeIngredient(code, n); }
    if (kind === 'stone') g.s.stone = r.stone * 3 - 1;
    const before = structuredClone(g.s);
    assert.throws(() => run(g, { code: CODE, count: 3 }), kind === 'slots' ? /ba chỗ/ : kind === 'herbs' ? /Thiếu/ : /linh thạch/);
    assert.deepEqual(g.s, before);
  }
});

test('lệnh cũ vẫn xếp một mẻ và từ chối số mẻ sai hoặc phần thưởng giả', () => {
  const g = make(); run(g, { code: CODE });
  assert.equal(g.s.craftQueue.length, 1);
  for (const count of [0, 4, 1.5, '3'])
    assert.throws(() => C.validate({ type: 'craft', payload: { code: CODE, count } }), { code: 'INVALID_COMMAND' });
  assert.throws(() => C.validate({ type: 'craft', payload: { code: CODE, count: 3, reward: 99 } }), { code: 'INVALID_COMMAND' });
});

test('máy chủ không xếp trùng khi lệnh được gửi lại và đóng băng hàng đợi lúc offline', async t => {
  const repo = new MemoryPlayers(); t.after(() => repo.close());
  let now = NOW;
  const svc = new PlayerService({ repository: repo, clock: () => now, contentVersion: 'test', onError: () => {} });
  const preview = await svc.previewCreation('owner');
  const made = await svc.createPlayer('owner', { ticketId: preview.ticketId, name: 'Lâm Tiên', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
  await repo.transact(made.playerId, async tx => {
    const r = tx.record, game = new H.Game(r.state, () => 0), recipe = game.recipe(CODE);
    game.s.borrowedBook = 'dan_ha'; game.s.bag = {}; game.s.stone = 1e6;
    for (const [code, n] of Object.entries(recipe.herbs)) game.add(code, n * 3);
    return { save: { state: r.state, revision: r.revision, rngCounter: r.rngCounter, lastSeenAt: r.lastSeenAt,
      schemaVersion: H.VERSION, contentVersion: r.contentVersion } };
  });
  const body = { protocolVersion: C.VERSION, requestId: 'batch-craft-01', expectedRevision: 0, type: 'craft', payload: { code: CODE, count: 3 } };
  const first = await svc.command('owner', made.playerId, body);
  const replay = await svc.command('owner', made.playerId, body);
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.craftQueue.length, 3);
  assert.deepEqual(replay.state.craftQueue, first.state.craftQueue);
  await svc.pause('owner', made.playerId);
  now += 3_600_000;
  const resumed = await svc.sync('owner', made.playerId);
  assert.deepEqual(resumed.state.craftQueue.map(j => j.end), first.state.craftQueue.map(j => j.end + 3_600_000));
});

test('giao diện chọn một hoặc tối đa ba mẻ theo nguyên liệu thực có', async () => {
  const g = make(), screens = {}, actions = {};
  const kit = { abs: String, $() {}, $$: () => [], esc: String, clamp: x => x, num: String, money: String,
    moneyHTML: String, pct: String, duration: String, row: (a, b) => `<p>${a}: ${b}</p>`,
    btn: (label, act, attrs = '', disabled = false) => `<button data-act="${act}" ${attrs}${disabled ? ' disabled' : ''}>${label}</button>`,
    img: () => '', codeAttr: code => `data-code="${code}"`, bar: () => '',
    card: (title, body) => `<section><h3>${title}</h3>${body}</section>`, empty: String, tabs: () => '', live: String };
  const ui = { kit, s: () => g.s, g: () => g, view: {}, data: { ART: { workshop: 'workshop' } },
    lists: { matches: x => x.code === CODE, slice: xs => xs, controls: () => '', pager: () => '' },
    register: x => { screens[x.id] = x; }, action: (name, fn) => { actions[name] = fn; },
    command: async (type, payload) => C.execute(g, JSON.parse(JSON.stringify({ type, payload })), NOW), toast() {} };
  const context = { HU_UI: ui, HU_GAME: H, HU_COMMANDS: C, HU_ASSETS: { BG: {} } }; context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../client/ui/screens/craft.js'), 'utf8'), context);
  let html = screens.craft.render('dan');
  assert.match(html, /data-count="1"[^>]*>Xếp 1 mẻ/);
  assert.match(html, /data-count="3"[^>]*>Xếp 3 mẻ/);
  await actions.craft(null, { code: CODE, count: '3' });
  assert.equal(g.s.craftQueue.length, 3);
  html = screens.craft.render('dan');
  assert.doesNotMatch(html, /data-count="3"/);
  assert.match(html, /data-count="1" disabled/);
});
