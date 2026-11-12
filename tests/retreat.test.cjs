'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');

const NOW = 1_800_000_000_000;
const PROFILE = { name: 'Lâm Vân', gender: 'nu', age: 18, race: 'nhan',
  roots: [72, 61, 45, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 } };
const make = () => {
  const game = new H.Game(H.createCharacter(PROFILE, NOW, () => .5), () => .5);
  game.s.progress.meditate = 60;
  game.s.extraLife = 1e6;
  return game;
};
const run = (g, type, payload = {}, at = NOW) => C.execute(g, { type, payload }, at);

test('chỉ nhận thời lượng hợp lệ, mở sau 60 giây và không bắt đầu chồng hoạt động', () => {
  for (const bad of [0, 60, 1801, '1800'])
    assert.throws(() => C.validate({ type: 'startRetreat', payload: { duration: bad } }), { code: 'INVALID_COMMAND' });
  assert.throws(() => C.validate({ type: 'startRetreat', payload: { duration: 1800, reward: 999 } }), { code: 'INVALID_COMMAND' });
  const novice = make(); novice.s.progress.meditate = 59;
  assert.throws(() => run(novice, 'startRetreat', { duration: 1800 }), /60 giây/);
  const busy = make(); busy.s.craftQueue.push({ code: 'PILL-001', end: NOW + 10000, success: .9, quality: 0 });
  assert.throws(() => run(busy, 'startRetreat', { duration: 1800 }), /Đang luyện đan/);
  const g = make(); run(g, 'startRetreat', { duration: 1800 });
  assert.throws(() => run(g, 'breakthrough'), /Đang bế quan/);
  assert.throws(() => run(g, 'buy', { code: 'HERB-001' }), /Đang bế quan/);
  assert.doesNotThrow(() => run(g, 'setPreference', { key: 'season', value: 'summer' }));
});

test('báo cáo chỉ tính thời gian online của phiên, không tự cộng thưởng lần hai', () => {
  const g = make(); g.rate = () => .01;
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 1_000_000);
  assert.equal(g.s.retreat.active.seconds, 1000);
  g.advance(NOW + 2_000_000);
  const report = g.s.retreat.report;
  assert.equal(report.reason, 'finished');
  assert.equal(report.seconds, 1800);
  assert.ok(Math.abs(report.exp - 18) < 1e-8);
  assert.ok(Math.abs(g.s.totalRunExp - 20) < 1e-8, 'sau phiên tu luyện thường tiếp tục');
  const total = g.s.totalRunExp;
  assert.throws(() => run(g, 'startRetreat', { duration: 1800 }, NOW + 2_000_000), /xem báo cáo/);
  assert.equal(run(g, 'acknowledgeRetreat', {}, NOW + 2_000_000), true);
  assert.equal(g.s.totalRunExp, total);
  assert.equal(g.s.retreat.report, null);
});

test('ẩn tab đóng băng phiên và không tính phần thưởng offline', () => {
  const g = make(); g.rate = () => .01;
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 10_000);
  const before = structuredClone(g.s.retreat.active), exp = g.s.totalRunExp;
  g.advance(NOW + 3_610_000, true);
  assert.equal(g.s.totalRunExp, exp);
  assert.equal(g.s.retreat.active.seconds, before.seconds);
  assert.equal(g.s.retreat.active.end, before.end + 3_600_000);
  g.advance(NOW + 3_620_000);
  assert.equal(g.s.retreat.active.seconds, 20);
  const report = run(g, 'stopRetreat', {}, NOW + 3_620_000);
  assert.equal(report.reason, 'manual');
  assert.equal(report.seconds, 20);
  assert.ok(Math.abs(report.exp - .2) < 1e-8);
});

test('đến viên mãn dừng tại ranh giới, không tự dẫn lôi', () => {
  const g = make(); g.s.stage = H.F.STAGES[g.s.realm]; g.s.qi = g.need() - 10; g.rate = () => 1;
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 60_000);
  assert.equal(g.s.retreat.report.reason, 'ready');
  assert.ok(Math.abs(g.s.retreat.report.seconds - 10) <= .001);
  assert.equal(g.s.realm, 0);
  assert.equal(g.s.stage, H.F.STAGES[0]);
  assert.equal(g.s.qi, g.need());
  assert.equal(g.s.death, null);
});

test('không báo viên mãn khi còn thiếu một lượng tu vi rất nhỏ', () => {
  const g = make(); g.s.stage = H.F.STAGES[g.s.realm]; g.rate = () => 1;
  g.s.qi = g.need() - .001 - g.need() * 5e-13;
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 1);
  assert.ok(g.s.qi < g.need());
  assert.ok(g.s.retreat.active, 'phiên còn chạy khi tu vi chưa đầy');
  assert.equal(g.s.retreat.report, null);
  g.advance(NOW + 2);
  assert.equal(g.s.retreat.report.reason, 'ready');
  assert.equal(g.s.qi, g.need());
});

test('dừng phiên trước ngưỡng thọ nguyên, nhưng không dừng lão hóa thông thường', () => {
  const g = make(); g.rate = () => .01;
  const pace = H.F.aging_speed(g.s.realm);
  g.s.age = g.maxLife() - pace * 360;
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 120_000);
  assert.equal(g.s.retreat.report.reason, 'life');
  assert.ok(g.s.retreat.report.seconds >= 58 && g.s.retreat.report.seconds <= 61);
  assert.ok(g.lifeInfo().seconds < 300, 'thọ nguyên vẫn trôi khi online sau phiên');
});

test('bản lưu V9 nâng an toàn; phiên V10 được giữ và làm sạch khi nạp lại', () => {
  const g = make();
  const old = structuredClone(g.s); old.version = 9; delete old.retreat;
  const migrated = H.normalize(old, NOW);
  assert.equal(migrated.version, 10);
  assert.deepEqual(migrated.retreat, { active: null, report: null });
  assert.equal(migrated.name, old.name);
  run(g, 'startRetreat', { duration: 1800 });
  g.advance(NOW + 10_000);
  const restored = H.normalize(structuredClone(g.s), NOW + 10_000);
  assert.equal(restored.retreat.active.seconds, 10);
  assert.equal(restored.retreat.active.end, NOW + 1_800_000);
  const dirty = structuredClone(g.s); dirty.retreat.active.duration = 999999;
  assert.equal(H.normalize(dirty, NOW + 10_000).retreat.active, null);
});

test('máy chủ lưu phiên, ngừng offline và xử lý lại requestId không nhân đôi', async t => {
  const repo = new SqlitePlayers(':memory:'); t.after(() => repo.close());
  let now = NOW;
  const svc = new PlayerService({ repository: repo, clock: () => now, contentVersion: 'test', onError: () => {} });
  const preview = await svc.previewCreation('owner');
  const made = await svc.createPlayer('owner', { ticketId: preview.ticketId, name: 'Lâm Tiên', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
  const id = made.playerId;
  // Chuẩn bị nhân vật trên kho server để tình huống độc lập với linh căn gieo ngẫu nhiên.
  await repo.transact(id, async tx => {
    const r = tx.record; r.state.progress.meditate = 60; r.state.extraLife = 1e6;
    return { save: { state: r.state, revision: r.revision, rngCounter: r.rngCounter, lastSeenAt: r.lastSeenAt,
      schemaVersion: H.VERSION, contentVersion: r.contentVersion } };
  });
  const body = { protocolVersion: C.VERSION, requestId: 'retreat-start-01', expectedRevision: 0, type: 'startRetreat', payload: { duration: 1800 } };
  const first = await svc.command('owner', id, body);
  const replay = await svc.command('owner', id, body);
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.retreat.active.end, first.state.retreat.active.end);
  now += 20_000; const online = await svc.sync('owner', id);
  assert.equal(online.state.retreat.active.seconds, 20);
  await svc.pause('owner', id);
  now += 3_600_000; const resumed = await svc.sync('owner', id);
  assert.equal(resumed.state.retreat.active.seconds, 20);
  assert.equal(resumed.state.retreat.active.end, first.state.retreat.active.end + 3_600_000);
});
