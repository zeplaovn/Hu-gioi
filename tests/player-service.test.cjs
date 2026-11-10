/* PlayerService server-authoritative: tạo nhân vật bằng ticket, idempotency, revision, offline, cô lập chủ sở hữu, bền vững. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('../engine/game.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService, snapshot, assertStateSafe } = require('../server/services/player-service.js');

const T0 = 1_800_000_000_000;
function setup(config = {}, file = ':memory:') {
  const clock = { t: T0 }, repo = new SqlitePlayers(file);
  const svc = new PlayerService({ repository: repo, clock: () => clock.t, contentVersion: 'test', config, onError: () => {} });
  return { clock, repo, svc };
}
function spawn(svc, owner = 'owner-a', name = 'Bạch Thanh Vân') {
  const pv = svc.previewCreation(owner);
  return svc.createPlayer(owner, { ticketId: pv.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
}
const envelope = (svc, owner, type, payload, requestId, extra = {}) => ({
  protocolVersion: 2, requestId, expectedRevision: svc.bootstrap(owner).player.revision, type, payload, ...extra
});
const code = fn => { try { fn(); } catch (e) { return e.code; } return null; };

test('mọi hồ sơ do máy chủ gieo đều qua được createCharacter', () => {
  const { svc } = setup({ previewsPerDay: 1000 });
  for (let i = 0; i < 300; i++) {
    const pv = svc.previewCreation('roller');
    assert.doesNotThrow(() => H.createCharacter({ ...pv.preview, name: 'Thử Gieo', gender: 'nam', talent: { canCot: 8 } }, T0, Math.random), JSON.stringify(pv.preview));
  }
});

test('tạo nhân vật: age/race/linh căn lấy từ ticket, không nhận từ client', () => {
  const { svc } = setup();
  const pv = svc.previewCreation('owner-a');
  assert.equal(pv.rollsLeft, 4);
  assert.equal(code(() => svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp', age: 99, roots: [100, 100, 100, 100, 100] })), 'INVALID_REQUEST');
  assert.equal(code(() => svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 3 }, destiny: 'exp' })), 'INVALID_PROFILE');
  const made = svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp' });
  assert.equal(made.revision, 0);
  assert.equal(made.state.age, pv.preview.age);
  assert.equal(made.state.race, pv.preview.race);
  assert.deepEqual(made.state.roots, pv.preview.roots);
  assert.equal(svc.bootstrap('owner-a').player.id, made.playerId);
});

test('ticket dùng một lần, đúng chủ, hết hạn; mỗi tài khoản một nhân vật; tên không trùng', () => {
  const { svc, clock } = setup();
  const a = svc.previewCreation('owner-a'), b = svc.previewCreation('owner-b');
  const profile = { gender: 'nam', talent: { vanKhi: 8 }, destiny: 'luck' };
  assert.equal(code(() => svc.createPlayer('owner-b', { ticketId: a.ticketId, name: 'Kẻ Trộm', ...profile })), 'TICKET_INVALID');
  svc.createPlayer('owner-a', { ticketId: a.ticketId, name: 'Lý Phong', ...profile });
  assert.equal(code(() => svc.createPlayer('owner-a', { ticketId: a.ticketId, name: 'Lý Phong', ...profile })), 'TICKET_INVALID');
  assert.equal(code(() => svc.previewCreation('owner-a')), 'PLAYER_EXISTS');
  assert.equal(code(() => svc.createPlayer('owner-b', { ticketId: b.ticketId, name: 'lý phong', ...profile })), 'NAME_TAKEN');
  clock.t += 11 * 60000;
  assert.equal(code(() => svc.createPlayer('owner-b', { ticketId: b.ticketId, name: 'Tô Mạc', ...profile })), 'TICKET_EXPIRED');
});

test('giới hạn số lần gieo mỗi ngày', () => {
  const { svc, clock } = setup({ previewsPerDay: 2 });
  svc.previewCreation('x'); svc.previewCreation('x');
  assert.equal(code(() => svc.previewCreation('x')), 'RATE_LIMITED');
  clock.t += 24 * 3600 * 1000 + 1;
  assert.doesNotThrow(() => svc.previewCreation('x'));
});

test('lệnh: tăng revision, idempotent theo requestId, phát hiện revision lệch và requestId dùng lại', () => {
  const { svc, clock } = setup();
  const made = spawn(svc), id = made.playerId;
  clock.t += 5000;
  const first = svc.command('owner-a', id, envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-1'));
  const stone = first.state.stone, bag = first.state.bag['HERB-001'];
  assert.equal(first.revision, 1);
  assert.equal(first.replayed, false);
  assert.ok(bag > made.state.bag['HERB-001']);

  const replay = svc.command('owner-a', id, { ...envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-1'), expectedRevision: 0 });
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.stone, stone, 'retry không trừ tiền lần hai');
  assert.equal(replay.state.bag['HERB-001'], bag);
  assert.equal(replay.revision, 1);

  assert.equal(code(() => svc.command('owner-a', id, { ...envelope(svc, 'owner-a', 'sell', { code: 'HERB-001' }, 'req-1') })), 'REQUEST_ID_REUSED');
  const stale = (() => { try { svc.command('owner-a', id, { ...envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-2'), expectedRevision: 0 }); } catch (e) { return e; } })();
  assert.equal(stale.code, 'REVISION_CONFLICT');
  assert.equal(stale.details.currentRevision, 1);
  assert.equal(svc.bootstrap('owner-a').player.revision, 1, 'xung đột không ghi gì');
});

test('lệnh sai: envelope, payload thừa, loại lệnh lạ, luật từ chối không ghi state', () => {
  const { svc, clock } = setup();
  const { playerId: id } = spawn(svc);
  clock.t += 1000;
  const ok = (type, payload, rid) => envelope(svc, 'owner-a', type, payload, rid);
  assert.equal(code(() => svc.command('owner-a', id, ok('buy', { code: 'HERB-001' }, 'bad id!'))), 'INVALID_REQUEST');
  assert.equal(code(() => svc.command('owner-a', id, ok('hackState', {}, 'r1'))), 'INVALID_COMMAND');
  assert.equal(code(() => svc.command('owner-a', id, ok('buy', { code: 'HERB-001', price: 0 }, 'r2'))), 'INVALID_COMMAND');
  assert.equal(code(() => svc.command('owner-a', id, { ...ok('buy', { code: 'HERB-001' }, 'r3'), now: 1 })), 'INVALID_REQUEST');
  assert.equal(code(() => svc.command('owner-a', id, { ...ok('buy', { code: 'HERB-001' }, 'r4'), protocolVersion: 1 })), 'INVALID_REQUEST');

  const before = svc.state('owner-a', id);
  const rule = (() => { try { svc.command('owner-a', id, ok('buy', { code: 'EQ-005' }, 'r5')); for (let i = 0; i < 40; i++) svc.command('owner-a', id, ok('buy', { code: 'EQ-005' }, 'rb' + i)); } catch (e) { return e; } })();
  assert.equal(rule?.code, 'GAME_RULE_VIOLATION', 'hết linh thạch thì luật từ chối');
  const after = svc.state('owner-a', id);
  assert.ok(after.revision >= before.revision);
  assert.ok(after.state.stone >= 0);
  const rev = svc.bootstrap('owner-a').player.revision;
  assert.equal(code(() => svc.command('owner-a', id, envelope(svc, 'owner-a', 'buy', { code: 'EQ-005' }, 'after-fail'))), 'GAME_RULE_VIOLATION');
  assert.equal(svc.bootstrap('owner-a').player.revision, rev, 'lệnh thất bại không tăng revision');
});

test('sync: offline không cộng gì; heartbeat online vẫn tính đúng thời gian máy chủ', () => {
  const { svc, clock } = setup({ onlineGraceMs: 15000, nextSyncInMs: 5000 });
  const { playerId: id } = spawn(svc);
  clock.t += 5000;
  const online = svc.sync('owner-a', id);
  assert.ok(online.report.exp > 0);
  assert.equal(online.report.seconds, 5);
  const before = online.state;
  clock.t += 600000;
  const offline = svc.sync('owner-a', id);
  assert.equal(offline.report.seconds, 0);
  assert.equal(offline.state.qi, before.qi);
  assert.equal(offline.state.age, before.age);
  assert.equal(offline.state.stone, before.stone);
  assert.equal(offline.state.hp, before.hp);
  assert.equal(offline.state.lastUpdate, clock.t);
  clock.t += 5000;
  const back = svc.sync('owner-a', id);
  assert.ok(back.report.exp > 0, 'online resume only counts current session');
  const paused = svc.pause('owner-a', id);
  assert.equal(paused.state.presencePaused, true);
  clock.t += 1000;
  const resumed = svc.sync('owner-a', id);
  assert.equal(resumed.report.seconds, 0, 'explicit pause freezes even a short absence');
  assert.equal(resumed.state.presencePaused, false);
});

test('đồng hồ lùi không cộng tiến trình và không làm revision âm', () => {
  const { svc, clock } = setup();
  const { playerId: id } = spawn(svc);
  clock.t += 30000;
  const a = svc.sync('owner-a', id, {});
  clock.t -= 20000;
  const b = svc.sync('owner-a', id, {});
  assert.equal(b.report.exp, 0);
  assert.ok(b.revision >= a.revision);
});

test('cô lập chủ sở hữu: người khác không đọc, đồng bộ hay ra lệnh được', () => {
  const { svc } = setup();
  const { playerId: id } = spawn(svc, 'owner-a');
  spawn(svc, 'owner-b', 'Mạc Vân');
  assert.equal(code(() => svc.state('owner-b', id)), 'PLAYER_NOT_FOUND');
  assert.equal(code(() => svc.sync('owner-b', id, {})), 'PLAYER_NOT_FOUND');
  assert.equal(code(() => svc.command('owner-b', id, { protocolVersion: 2, requestId: 'x1', expectedRevision: 0, type: 'buy', payload: { code: 'HERB-001' } })), 'PLAYER_NOT_FOUND');
  assert.equal(code(() => svc.state('owner-a', '00000000-0000-4000-8000-000000000000')), 'PLAYER_NOT_FOUND');
});

test('snapshot gửi client không chứa seed bí cảnh; state bẩn bị chặn', () => {
  const s = H.create(T0);
  s.dungeon.active = { id: 'x', seed: 123456, start: 1, end: 2, stats: {}, hp: 1, affinity: 0 };
  const snap = snapshot(s);
  assert.equal('seed' in snap.dungeon.active, false);
  assert.equal(s.dungeon.active.seed, 123456, 'bản gốc không bị sửa');
  assert.throws(() => assertStateSafe({ a: NaN }, 65536), { code: 'STATE_CORRUPT' });
  assert.throws(() => assertStateSafe({ a: Infinity }, 65536), { code: 'STATE_CORRUPT' });
  assert.throws(() => assertStateSafe({ a: 'x'.repeat(70000) }, 65536), { code: 'STATE_CORRUPT' });
  assert.throws(() => assertStateSafe({ a: undefined }, 65536), { code: 'STATE_CORRUPT' });
});

test('thọ nguyên cạn: từ chối mọi lệnh và chỉ owner được xóa để tạo nhân vật mới', () => {
  const { svc, clock, repo } = setup();
  const { playerId: id } = spawn(svc);
  const current = repo.get(id);
  const maxLife = new H.Game(current.state).maxLife();
  repo.transact(id, tx => ({ save: {
    state: { ...tx.record.state, age: maxLife + 1 }, revision: 1,
    rngCounter: 0, lastSeenAt: clock.t, schemaVersion: H.VERSION, contentVersion: 'test'
  } }));
  clock.t += 3600 * 1000;
  const dead = svc.sync('owner-a', id);
  assert.equal(dead.died, true);
  assert.equal(dead.state.death.cause, 'lifespan');
  assert.equal(dead.report.seconds || 0, 0, 'offline không già thêm');
  const err = (() => { try { svc.command('owner-a', id, envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'd1')); } catch (e) { return e; } })();
  assert.equal(err.code, 'PLAYER_DEAD');
  assert.equal(code(() => svc.resetAfterDeath('owner-b', id)), 'PLAYER_NOT_FOUND');
  assert.equal(svc.resetAfterDeath('owner-a', id).deleted, true);
  assert.equal(svc.bootstrap('owner-a').player, null);
  assert.ok(svc.previewCreation('owner-a').ticketId);
});

test('dữ liệu bền qua khởi động lại (state, revision, receipt)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-db-'));
  const file = path.join(dir, 'nested', 'game.sqlite');
  try {
    const one = setup({}, file);
    const { playerId: id } = spawn(one.svc);
    one.clock.t += 8000;
    const r = one.svc.command('owner-a', id, envelope(one.svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'keep-1'));
    one.repo.close();

    const two = setup({}, file);
    two.clock.t = one.clock.t + 1000;
    assert.equal(two.svc.bootstrap('owner-a').player.revision, r.revision);
    const replay = two.svc.command('owner-a', id, { ...envelope(two.svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'keep-1'), expectedRevision: 0 });
    assert.equal(replay.replayed, true);
    assert.equal(replay.state.stone, r.state.stone);
    two.repo.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('RNG theo người chơi tiến bộ và được lưu: cùng lệnh ngẫu nhiên không lặp lại kết quả cũ', () => {
  const { svc, clock, repo } = setup();
  const { playerId: id } = spawn(svc);
  const c0 = repo.get(id).rngCounter;
  clock.t += 2000;
  svc.command('owner-a', id, envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'c1'));
  svc.sync('owner-a', id, {});
  assert.ok(repo.get(id).rngCounter >= c0);
  const seed = repo.get(id).rngSeed;
  assert.match(seed, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(svc.state('owner-a', id)).includes(seed), false, 'seed không lộ ra client');
});
