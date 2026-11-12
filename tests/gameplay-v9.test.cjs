/* Regression: irreversible death and frozen offline clocks (gameplay spec V9). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const NOW = 1_800_000_000_000;
const PROFILE = {
  name: 'Lý Vô Thường', gender: 'nam', age: 18, race: 'nhan',
  roots: [72, 61, 45, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 },
  destiny: 'exp'
};
const character = rng => new H.Game(H.createCharacter(PROFILE, NOW, rng), rng);
const execute = (game, type, payload = {}, now = NOW) => C.execute(game, { type, payload }, now);

test('protocol v3 rejects resurrection, meta purchases and offline upgrades', () => {
  assert.equal(C.VERSION, 3);
  for (const type of ['prestige', 'reincarnate', 'buyMeta', 'upgradeOffline'])
    assert.throws(() => C.validate({ type, payload: {} }), { code: 'INVALID_COMMAND' });
  assert.equal(H.VERSION, 10);
});

test('defeated tribulation ends the life, preserves cause and blocks all commands', () => {
  const g = character(() => .999999);
  g.s.stage = H.F.STAGES[g.s.realm]; g.s.qi = g.need();
  const res = execute(g, 'breakthrough');
  assert.equal(res.success, false);
  assert.equal(res.died, true);
  assert.equal(g.s.death.cause, 'tribulation');
  assert.equal(g.s.pity, 0);
  assert.equal(g.isDead(), true);
  assert.throws(() => execute(g, 'setPreference', { key: 'season', value: 'summer' }), /tọa hóa/);
});

test('winning tribulation does not set death', () => {
  const g = character(() => 0);
  g.s.stage = H.F.STAGES[g.s.realm]; g.s.qi = g.need();
  const res = execute(g, 'breakthrough');
  assert.equal(res.success, true);
  assert.equal(g.s.death, null);
});

test('PvP defeat ends the life; victory does not', () => {
  const lose = character(() => .999999);
  lose.s.realm = 3; lose.s.extraLife = 1e6;
  const lost = execute(lose, 'duel', { id: H.RIVALS[0].id });
  assert.equal(lost.win, false);
  assert.equal(lost.died, true);
  assert.equal(lose.s.death.cause, 'pvp');
  const win = character(() => 0);
  win.s.realm = 3; win.s.extraLife = 1e6;
  assert.equal(execute(win, 'duel', { id: H.RIVALS[0].id }).win, true);
  assert.equal(win.s.death, null);
});

test('combat damage over time with zero HP kills instead of restoring health', () => {
  const g = character(() => .5);
  g.s.hp = 1;
  g.s.enemyHp = 1;
  g.s.designCombat.bleed = { pct: 1, last: NOW, end: NOW + 2000 };
  g.tickDefinedCombat(NOW + 1000);
  assert.equal(g.s.hp, 0);
  assert.equal(g.s.death.cause, 'combat');
});

test('offline stops all stats, progression, jobs and exploration timers', () => {
  const g = character(() => .5);
  const q = g.s.qi, age = g.s.age, hp = g.s.hp, stone = g.s.stone;
  g.s.craftQueue = [{ code: 'PILL-001', end: NOW + 20_000, success: .9, quality: 1 }];
  g.s.exploration.active = { start: NOW, end: NOW + 60_000, name: 'Đường xưa', kind: 'npc', text: '' };
  const report = g.advance(NOW + 24 * 60 * 60 * 1000, true);
  assert.equal(report.seconds, 0);
  assert.equal(report.paused, true);
  assert.equal(g.s.qi, q);
  assert.equal(g.s.age, age);
  assert.equal(g.s.hp, hp);
  assert.equal(g.s.stone, stone);
  assert.equal(g.s.craftQueue[0].end, NOW + 24 * 60 * 60 * 1000 + 20_000);
  assert.equal(g.s.exploration.active.end, NOW + 24 * 60 * 60 * 1000 + 60_000);
  assert.equal(g.isDead(), false);
});

test('V4–V8 saves can normalize to V10 without granting fresh destiny points', () => {
  const g = character(() => .5);
  for (const version of [5, 6, 7, 8]) {
    const legacy = structuredClone(g.s);
    legacy.version = version;
    delete legacy.destiny;
    delete legacy.death;
    const state = H.normalize(legacy, NOW);
    assert.equal(state.version, 10);
    assert.equal(state.death, null);
    assert.equal(state.destiny, 'none');
  }
  assert.equal(H.normalize(g.s, NOW).destiny, 'exp');
});

test('offline also freezes ability cooldowns, NPC discussions and auction cycle', () => {
  const g = character(() => .5);
  g.s.cooldowns[0] = NOW + 30_000;
  g.s.social.friends['trieu-nguyet'] = { affinity: 30, metAt: NOW, giftAt: 0, discussAt: NOW + 40_000 };
  g.s.social.pvp.lastAt = NOW;
  g.s.auction.offers['EQ-001'] = 100;
  const cycle = g.s.auction.cycle, cooldown = g.s.cooldowns[0];
  const away = 7200_000;
  const pause = g.advance(NOW + away, true);
  assert.equal(pause.paused, true);
  assert.equal(g.s.cooldowns[0], cooldown + away);
  assert.equal(g.s.social.friends['trieu-nguyet'].discussAt, NOW + 40_000 + away);
  assert.equal(g.s.auction.cycle, cycle);
  assert.equal(g.s.auction.pausedMs, away);
  g.advance(NOW + away + 1000);
  assert.equal(g.s.auction.cycle, cycle, 'NPC auction does not settle after two hours offline');
  assert.equal(g.s.auction.offers['EQ-001'], 100);
});
