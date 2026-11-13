/* PlayerService server-authoritative: tạo nhân vật bằng ticket, idempotency, revision, offline, cô lập chủ sở hữu, bền vững. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../engine/game.js');
const { MemoryPlayers } = require('./helpers/memory-players.js');
const { PlayerService, snapshot, assertStateSafe } = require('../server/services/player-service.js');

const T0 = 1_800_000_000_000;
function setup(config = {}) {
  const clock = { t: T0 }, repo = new MemoryPlayers();
  const svc = new PlayerService({ repository: repo, clock: () => clock.t, contentVersion: 'test', config, onError: () => {} });
  return { clock, repo, svc };
}
async function spawn(svc, owner = 'owner-a', name = 'Bạch Thanh Vân') {
  const pv = await svc.previewCreation(owner);
  return await svc.createPlayer(owner, { ticketId: pv.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
}
const envelope = async (svc, owner, type, payload, requestId, extra = {}) => ({
  protocolVersion: 4, requestId, expectedRevision: (await svc.bootstrap(owner)).player.revision, type, payload, ...extra
});
const code = async fn => { try { await fn(); } catch (e) { return e.code; } return null; };

test('mọi hồ sơ do máy chủ gieo đều qua được createCharacter', async () => {
  const { svc } = setup({ previewsPerDay: 1000 });
  for (let i = 0; i < 300; i++) {
    const pv = await svc.previewCreation('roller');
    assert.doesNotThrow(() => H.createCharacter({ ...pv.preview, name: 'Thử Gieo', gender: 'nam', talent: { canCot: 8 } }, T0, Math.random), JSON.stringify(pv.preview));
  }
});

test('tạo nhân vật không bắt buộc chọn Thiên mệnh khởi nguyên', async () => {
  const { svc } = setup();
  const cases = [
    ['owner-a', 'Vô Danh A', {}],
    ['owner-b', 'Vô Danh B', { destiny: null }],
    ['owner-c', 'Vô Danh C', { destiny: 'exp' }]
  ];
  for (const [owner, name, extra] of cases) {
    const pv = await svc.previewCreation(owner);
    const made = await svc.createPlayer(owner, {
      ticketId: pv.ticketId, name, gender: 'nam', talent: { ngoTinh: 8 }, ...extra
    });
    assert.equal(made.state.destiny, 'none');
    assert.equal(made.state.meta.upgrades.exp, 0, 'Không mua Dấu ấn thì không nhận buff từ client');
    assert.equal((await svc.bootstrap(owner)).player.id, made.playerId);
  }
});

test('tạo nhân vật: age/race/linh căn lấy từ ticket, không nhận từ client', async () => {
  const { svc } = setup();
  const pv = await svc.previewCreation('owner-a');
  assert.equal(pv.rollsLeft, 4);
  assert.equal(await code(async () => await svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp', age: 99, roots: [100, 100, 100, 100, 100] })), 'INVALID_REQUEST');
  assert.equal(await code(async () => await svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 3 }, destiny: 'exp' })), 'INVALID_PROFILE');
  const made = await svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Hàn Lập', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp' });
  assert.equal(made.revision, 0);
  assert.equal(made.state.age, pv.preview.age);
  assert.equal(made.state.race, pv.preview.race);
  assert.deepEqual(made.state.roots, pv.preview.roots);
  assert.equal((await svc.bootstrap('owner-a')).player.id, made.playerId);
});

test('ticket dùng một lần, đúng chủ, hết hạn; mỗi tài khoản một nhân vật; tên không trùng', async () => {
  const { svc, clock } = setup();
  const a = await svc.previewCreation('owner-a'), b = await svc.previewCreation('owner-b');
  const profile = { gender: 'nam', talent: { vanKhi: 8 }, destiny: 'luck' };
  assert.equal(await code(async () => await svc.createPlayer('owner-b', { ticketId: a.ticketId, name: 'Kẻ Trộm', ...profile })), 'TICKET_INVALID');
  await svc.createPlayer('owner-a', { ticketId: a.ticketId, name: 'Lý Phong', ...profile });
  assert.equal(await code(async () => await svc.createPlayer('owner-a', { ticketId: a.ticketId, name: 'Lý Phong', ...profile })), 'TICKET_INVALID');
  assert.equal(await code(async () => await svc.previewCreation('owner-a')), 'PLAYER_EXISTS');
  assert.equal(await code(async () => await svc.createPlayer('owner-b', { ticketId: b.ticketId, name: 'lý phong', ...profile })), 'NAME_TAKEN');
  clock.t += 11 * 60000;
  assert.equal(await code(async () => await svc.createPlayer('owner-b', { ticketId: b.ticketId, name: 'Tô Mạc', ...profile })), 'TICKET_EXPIRED');
});

test('giới hạn số lần gieo mỗi ngày', async () => {
  const { svc, clock } = setup({ previewsPerDay: 2 });
  const first = await svc.previewCreation('x');
  assert.equal((await svc.previewCreation('x')).ticketId, first.ticketId, 'Mở lại màn tạo không tiêu lượt');
  const second = await svc.previewCreation('x', { fresh: true });
  assert.equal(await code(async () => await svc.previewCreation('x', { fresh: true })), 'RATE_LIMITED');
  assert.equal((await svc.previewCreation('x')).ticketId, second.ticketId, 'Vẫn dùng được phiếu mới nhất khi hết lượt gieo mới');
  clock.t += 24 * 3600 * 1000 + 1;
  const next = await svc.previewCreation('x');
  assert.notEqual(next.ticketId, first.ticketId);
});

test('hết lượt gieo và không còn phiếu chưa dùng: mở lại phiếu cũ thay vì chặn tạo nhân vật', async () => {
  const { svc, clock, repo } = setup({ previewsPerDay: 1 });
  const ticket = await svc.previewCreation('owner-a');
  const made = await svc.createPlayer('owner-a', {
    ticketId: ticket.ticketId, name: 'Cố Tái Sinh', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp'
  });
  const current = await repo.get(made.playerId);
  const maxLife = new H.Game(current.state).maxLife();
  await repo.transact(made.playerId, tx => ({ save: {
    state: { ...tx.record.state, age: maxLife + 1 }, revision: 1,
    rngCounter: 0, lastSeenAt: clock.t, schemaVersion: H.VERSION, contentVersion: 'test'
  } }));
  clock.t += 3600 * 1000;
  assert.equal((await svc.sync('owner-a', made.playerId)).died, true);
  await svc.resetAfterDeath('owner-a', made.playerId);

  // Phiếu duy nhất đã dùng: xin gieo mới vẫn bị giới hạn...
  assert.equal(await code(async () => await svc.previewCreation('owner-a', { fresh: true })), 'RATE_LIMITED');
  // ...nhưng mở lại màn tạo phải dùng lại đúng phiếu cũ, không chặn người chơi.
  const revived = await svc.previewCreation('owner-a');
  assert.equal(revived.ticketId, ticket.ticketId);
  assert.equal(revived.revived, true);
  assert.equal(revived.reused, true);
  assert.equal(revived.rollsLeft, 0);
  assert.deepEqual(revived.preview, ticket.preview);
  const remade = await svc.createPlayer('owner-a', {
    ticketId: revived.ticketId, name: 'Cố Tái Sinh', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp'
  });
  assert.ok(remade.playerId);
});

test('mở lại màn tạo dùng lại phiếu trong 24 giờ và hồi hạn phiếu đã hết TTL', async () => {
  const { svc, clock } = setup({ previewsPerDay: 5 });
  const first = await svc.previewCreation('owner-a');
  assert.equal(first.reused, false);
  assert.equal(first.rollsLeft, 4);
  const again = await svc.previewCreation('owner-a');
  assert.equal(again.ticketId, first.ticketId);
  assert.equal(again.reused, true);
  assert.equal(again.rollsLeft, first.rollsLeft);
  assert.deepEqual(again.preview, first.preview);
  clock.t += 11 * 60000;
  const revived = await svc.previewCreation('owner-a');
  assert.equal(revived.ticketId, first.ticketId);
  assert.equal(revived.expiresAt, clock.t + 10 * 60000);
  assert.equal(await code(async () => await svc.previewCreation('owner-a', { fresh: 'yes' })), 'INVALID_REQUEST');
});

test('lệnh: tăng revision, idempotent theo requestId, phát hiện revision lệch và requestId dùng lại', async () => {
  const { svc, clock } = setup();
  const made = await spawn(svc), id = made.playerId;
  clock.t += 5000;
  const first = await svc.command('owner-a', id, await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-1'));
  const stone = first.state.stone, bag = first.state.bag['HERB-001'];
  assert.equal(first.revision, 1);
  assert.equal(first.replayed, false);
  assert.ok(bag > made.state.bag['HERB-001']);

  const replay = await svc.command('owner-a', id, { ...await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-1'), expectedRevision: 0 });
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.stone, stone, 'retry không trừ tiền lần hai');
  assert.equal(replay.state.bag['HERB-001'], bag);
  assert.equal(replay.revision, 1);

  assert.equal(await code(async () => await svc.command('owner-a', id, { ...await envelope(svc, 'owner-a', 'sell', { code: 'HERB-001' }, 'req-1') })), 'REQUEST_ID_REUSED');
  const stale = await (async () => { try { await svc.command('owner-a', id, { ...await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-2'), expectedRevision: 0 }); } catch (e) { return e; } })();
  assert.equal(stale.code, 'REVISION_CONFLICT');
  assert.equal(stale.details.currentRevision, 1);
  assert.equal((await svc.bootstrap('owner-a')).player.revision, 1, 'xung đột không ghi gì');
});

test('mượn sách được ghi bền và retry không trừ điểm lịch luyện hai lần', async () => {
  const { svc, clock, repo } = setup({ onlineGraceMs: 300000 });
  const made = await spawn(svc), id = made.playerId;
  const send = async (type, payload, req) => svc.command('owner-a', id, await envelope(svc, 'owner-a', type, payload, req));
  await send('joinSect', { id: H.SECTS[0].id }, 'lib-join');
  for (let i = 0; i < 2; i++) {
    await send('startSectMission', { id: 'patrol' }, 'lib-start-' + i);
    clock.t += 90000;
    await send('claimSectMission', {}, 'lib-claim-' + i);
  }
  const intent = await envelope(svc, 'owner-a', 'buySect', { id: 'dan_ha' }, 'lib-borrow');
  const first = await svc.command('owner-a', id, intent);
  assert.equal(first.state.adventurePoints,30);
  assert.equal(first.state.borrowedBook,'dan_ha');
  const replay = await svc.command('owner-a', id, intent);
  assert.equal(replay.replayed,true);
  assert.equal(replay.state.adventurePoints,30);
  const stored = await svc.state('owner-a', id);
  assert.equal(stored.state.adventurePoints,30);
  assert.equal(stored.state.borrowedBook,'dan_ha');
  repo.close();
});

test('lệnh sai: envelope, payload thừa, loại lệnh lạ, luật từ chối không ghi state', async () => {
  const { svc, clock } = setup();
  const { playerId: id } = await spawn(svc);
  clock.t += 1000;
  const ok = async (type, payload, rid) => await envelope(svc, 'owner-a', type, payload, rid);
  assert.equal(await code(async () => await svc.command('owner-a', id, await ok('buy', { code: 'HERB-001' }, 'bad id!'))), 'INVALID_REQUEST');
  assert.equal(await code(async () => await svc.command('owner-a', id, await ok('hackState', {}, 'r1'))), 'INVALID_COMMAND');
  assert.equal(await code(async () => await svc.command('owner-a', id, await ok('buy', { code: 'HERB-001', price: 0 }, 'r2'))), 'INVALID_COMMAND');
  assert.equal(await code(async () => await svc.command('owner-a', id, { ...await ok('buy', { code: 'HERB-001' }, 'r3'), now: 1 })), 'INVALID_REQUEST');
  assert.equal(await code(async () => await svc.command('owner-a', id, { ...await ok('buy', { code: 'HERB-001' }, 'r4'), protocolVersion: 1 })), 'INVALID_REQUEST');

  const before = await svc.state('owner-a', id);
  const rule = await (async () => { try { await svc.command('owner-a', id, await ok('buy', { code: 'EQ-005' }, 'r5')); for (let i = 0; i < 40; i++) await svc.command('owner-a', id, await ok('buy', { code: 'EQ-005' }, 'rb' + i)); } catch (e) { return e; } })();
  assert.equal(rule?.code, 'GAME_RULE_VIOLATION', 'hết linh thạch thì luật từ chối');
  const after = await svc.state('owner-a', id);
  assert.ok(after.revision >= before.revision);
  assert.ok(after.state.stone >= 0);
  const rev = (await svc.bootstrap('owner-a')).player.revision;
  assert.equal(await code(async () => await svc.command('owner-a', id, await envelope(svc, 'owner-a', 'buy', { code: 'EQ-005' }, 'after-fail'))), 'GAME_RULE_VIOLATION');
  assert.equal((await svc.bootstrap('owner-a')).player.revision, rev, 'lệnh thất bại không tăng revision');
});

test('sync: offline không cộng gì; heartbeat online vẫn tính đúng thời gian máy chủ', async () => {
  const { svc, clock } = setup({ onlineGraceMs: 15000, nextSyncInMs: 5000 });
  const { playerId: id } = await spawn(svc);
  clock.t += 5000;
  const online = await svc.sync('owner-a', id);
  assert.ok(online.report.exp > 0);
  assert.equal(online.report.seconds, 5);
  const before = online.state;
  clock.t += 600000;
  const offline = await svc.sync('owner-a', id);
  assert.equal(offline.report.seconds, 0);
  assert.equal(offline.state.qi, before.qi);
  assert.equal(offline.state.age, before.age);
  assert.equal(offline.state.stone, before.stone);
  assert.equal(offline.state.hp, before.hp);
  assert.equal(offline.state.lastUpdate, clock.t);
  clock.t += 5000;
  const back = await svc.sync('owner-a', id);
  assert.ok(back.report.exp > 0, 'online resume only counts current session');
  const paused = await svc.pause('owner-a', id);
  assert.equal(paused.state.presencePaused, true);
  clock.t += 1000;
  const resumed = await svc.sync('owner-a', id);
  assert.equal(resumed.report.seconds, 0, 'explicit pause freezes even a short absence');
  assert.equal(resumed.state.presencePaused, false);
});

test('đồng hồ lùi không cộng tiến trình và không làm revision âm', async () => {
  const { svc, clock } = setup();
  const { playerId: id } = await spawn(svc);
  clock.t += 30000;
  const a = await svc.sync('owner-a', id, {});
  clock.t -= 20000;
  const b = await svc.sync('owner-a', id, {});
  assert.equal(b.report.exp, 0);
  assert.ok(b.revision >= a.revision);
});

test('cô lập chủ sở hữu: người khác không đọc, đồng bộ hay ra lệnh được', async () => {
  const { svc } = setup();
  const { playerId: id } = await spawn(svc, 'owner-a');
  await spawn(svc, 'owner-b', 'Mạc Vân');
  assert.equal(await code(async () => await svc.state('owner-b', id)), 'PLAYER_NOT_FOUND');
  assert.equal(await code(async () => await svc.sync('owner-b', id, {})), 'PLAYER_NOT_FOUND');
  assert.equal(await code(async () => await svc.command('owner-b', id, { protocolVersion: 4, requestId: 'x1', expectedRevision: 0, type: 'buy', payload: { code: 'HERB-001' } })), 'PLAYER_NOT_FOUND');
  assert.equal(await code(async () => await svc.state('owner-a', '00000000-0000-4000-8000-000000000000')), 'PLAYER_NOT_FOUND');
});

test('snapshot gửi client không chứa seed bí cảnh; state bẩn bị chặn', async () => {
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

test('thọ nguyên cạn: khởi đầu lại sau chết không mang theo tiền và chỉ chủ nhân được xóa', async () => {
  const { svc, clock, repo } = setup();
  const { playerId: id } = await spawn(svc);
  const current = await repo.get(id);
  const maxLife = new H.Game(current.state).maxLife();
  await repo.transact(id, tx => ({ save: {
    state: { ...tx.record.state, age: maxLife + 1 }, revision: 1,
    rngCounter: 0, lastSeenAt: clock.t, schemaVersion: H.VERSION, contentVersion: 'test'
  } }));
  clock.t += 3600 * 1000;
  const dead = await svc.sync('owner-a', id);
  assert.equal(dead.died, true);
  assert.equal(dead.state.death.cause, 'lifespan');
  assert.equal(dead.report.seconds || 0, 0, 'offline không già thêm');
  const err = await (async () => { try { await svc.command('owner-a', id, await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'd1')); } catch (e) { return e; } })();
  assert.equal(err.code, 'PLAYER_DEAD');
  assert.equal(await code(async () => svc.resetAfterDeath('owner-b', id)), 'PLAYER_NOT_FOUND');
  assert.equal((await svc.bootstrap('owner-a')).player.id, id);
  assert.equal(await code(async () => svc.previewCreation('owner-a')), 'PLAYER_EXISTS');
  assert.equal((await svc.resetAfterDeath('owner-a', id)).deleted, true);
  assert.equal((await svc.bootstrap('owner-a')).player, null);
  assert.ok((await svc.previewCreation('owner-a')).ticketId);
  assert.equal((await svc.bootstrap('owner-a')).pavilion.balance, 0);
});

test('RNG theo người chơi tiến bộ và được lưu: cùng lệnh ngẫu nhiên không lặp lại kết quả cũ', async () => {
  const { svc, clock, repo } = setup();
  const { playerId: id } = await spawn(svc);
  const c0 = (await repo.get(id)).rngCounter;
  clock.t += 2000;
  await svc.command('owner-a', id, await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'c1'));
  await svc.sync('owner-a', id, {});
  assert.ok((await repo.get(id)).rngCounter >= c0);
  const seed = (await repo.get(id)).rngSeed;
  assert.match(seed, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(await svc.state('owner-a', id)).includes(seed), false, 'seed không lộ ra client');
});


/* BỘ HỢP ĐỒNG DÙNG CHUNG: chạy nguyên ca trên SQLite và Postgres/PGlite.
 * Không thay thế ca SQLite lịch sử. Dữ liệu UUID phù hợp FK auth.users ở Postgres.
 * PGlite chỉ chạy trên Node test, không được bundle vào client/Edge. */
const { PGlite } = require('@electric-sql/pglite');
const { PostgresPlayers } = require('../server/repositories/postgres-players.js');
const OWNER_A = '11111111-1111-4111-8111-111111111111';
const OWNER_B = '22222222-2222-4222-8222-222222222222';
const migrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261110075419_game_schema.sql'), 'utf8');
const socialMigrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261111015058_online_social_and_indexed_leaderboard.sql'), 'utf8');
const rankMigrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261111022001_desktop_chat_channels_and_power_ranks.sql'), 'utf8');
const accountMigrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261112020000_daily_mail_checkin.sql'), 'utf8');

async function sharedFixture(mode, t, config = {}) {
  let repo;
  if (mode === 'memory') {
    repo = new MemoryPlayers();
  } else {
    const db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
      INSERT INTO auth.users (id) VALUES ('${OWNER_A}'), ('${OWNER_B}');`);
    await db.exec(migrationSQL);
    // Production dùng cột combat_power, trigger ranking và bảng chat qua
    // migration additive; fixture phải phản ánh cùng schema trước kiểm thử.
    await db.exec(socialMigrationSQL);
    await db.exec(rankMigrationSQL);
    await db.exec(accountMigrationSQL);
    // PGlite dùng một Postgres backend; pool giả tuần tự hóa giao dịch như
    // driver connection pool size 1 của Edge, không mô phỏng mạng.
    let previous = Promise.resolve();
    const pool = {
      async connect() {
        const waiting = previous;
        let unlock;
        previous = new Promise(resolve => { unlock = resolve; });
        await waiting;
        return {
          queryObject: async ({ text, args = [] }) => ({ rows: (await db.query(text, args)).rows }),
          release: unlock
        };
      },
      async end() { await previous; await db.close(); }
    };
    repo = new PostgresPlayers({ pool });
  }
  t.after(async () => { await repo.close(); });
  const time = { now: T0 };
  const service = new PlayerService({
    repository: repo, clock: () => time.now, contentVersion: 'test',
    config: { nextSyncInMs: 20000, onlineGraceMs: 60000, repositoryRates: mode === 'postgres', ...config },
    onError: () => {}
  });
  const make = async (owner, name) => {
    const ticket = await service.previewCreation(owner);
    return service.createPlayer(owner, {
      ticketId: ticket.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
    });
  };
  const intent = async (owner, type, payload, requestId, revision = null) => ({
    protocolVersion: 4, type, payload, requestId,
    expectedRevision: revision ?? (await service.bootstrap(owner)).player.revision
  });
  return { repo, service, time, make, intent };
}
for (const adapter of ['memory', 'postgres']) {
  test(`PlayerService hợp đồng [${adapter}]: owner 404, ticket 1 lần, tên duy nhất`, async t => {
    const { service, make } = await sharedFixture(adapter, t);
    const a = await make(OWNER_A, 'Tử Yên');
    await assert.rejects(service.state(OWNER_B, a.playerId), { code: 'PLAYER_NOT_FOUND' });
    const ticketB = await service.previewCreation(OWNER_B);
    await assert.rejects(service.createPlayer(OWNER_B, {
      ticketId: ticketB.ticketId, name: 'tử yên', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
    }), { code: 'NAME_TAKEN' });
    await assert.rejects(service.previewCreation(OWNER_A), { code: 'PLAYER_EXISTS' });
    await assert.rejects(service.createPlayer(OWNER_A, {
      ticketId: ticketB.ticketId, name: 'Hồ Tiên', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
    }), { code: 'TICKET_INVALID' });
  });

  test(`PlayerService hợp đồng [${adapter}]: receipt, replay, revision, concurrent command`, async t => {
    const { service, make, intent } = await sharedFixture(adapter, t);
    const { playerId } = await make(OWNER_A, 'Ngọc Chi');
    const first = await intent(OWNER_A, 'buy', { code: 'HERB-001' }, 'shared-1', 0);
    const one = await service.command(OWNER_A, playerId, first);
    assert.equal(one.revision, 1);
    const replay = await service.command(OWNER_A, playerId, first);
    assert.equal(replay.replayed, true);
    assert.equal(replay.state.stone, one.state.stone);
    await assert.rejects(service.command(OWNER_A, playerId, {
      ...first, type: 'sell'
    }), { code: 'REQUEST_ID_REUSED' });
    const stale = await intent(OWNER_A, 'buy', { code: 'HERB-001' }, 'shared-stale', 0);
    await assert.rejects(service.command(OWNER_A, playerId, stale), { code: 'REVISION_CONFLICT' });
    const x = await intent(OWNER_A, 'setPreference', { key: 'music', value: true }, 'shared-x');
    const y = { ...x, requestId: 'shared-y' };
    const results = await Promise.allSettled([
      service.command(OWNER_A, playerId, x), service.command(OWNER_A, playerId, y)
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.code, 'REVISION_CONFLICT');
  });

  test(`PlayerService hợp đồng [${adapter}]: offline 20 phút, lỗi lệnh và pause lặp không cộng tiến trình`, async t => {
    const { service, time, repo, make, intent } = await sharedFixture(adapter, t);
    const { playerId } = await make(OWNER_A, 'Hắc Vân');
    const original = await service.state(OWNER_A, playerId);
    time.now += 20 * 60000;
    await assert.rejects(service.command(OWNER_A, playerId,
      await intent(OWNER_A, 'breakthrough', {}, 'shared-break')
    ), { code: 'GAME_RULE_VIOLATION' });
    const after = await service.sync(OWNER_A, playerId);
    assert.equal(after.report.seconds, 0);
    assert.equal(after.state.age, original.state.age);
    assert.equal(after.state.qi, original.state.qi);
    const first = await service.pause(OWNER_A, playerId);
    const metadata = await repo.get(playerId);
    time.now += 20 * 60000;
    const second = await service.pause(OWNER_A, playerId);
    assert.equal(second.revision, first.revision);
    assert.equal((await repo.get(playerId)).lastSeenAt, metadata.lastSeenAt);
    assert.equal((await service.sync(OWNER_A, playerId)).report.seconds, 0);
  });


  test(`PlayerService hợp đồng [${adapter}]: hết lượt gieo vẫn mở lại được phiếu đã dùng`, async t => {
    const { service, repo, time } = await sharedFixture(adapter, t, { previewsPerDay: 1 });
    const first = await service.previewCreation(OWNER_A);
    const { playerId } = await service.createPlayer(OWNER_A, {
      ticketId: first.ticketId, name: 'Bất Tử', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
    });
    const current = await repo.get(playerId);
    const maxLife = new H.Game(current.state).maxLife();
    await repo.transact(playerId, tx => ({ save: {
      state: { ...tx.record.state, age: maxLife + 1 }, revision: 1,
      rngCounter: 0, lastSeenAt: time.now, schemaVersion: H.VERSION, contentVersion: 'test'
    } }));
    time.now += 3600 * 1000;
    assert.equal((await service.sync(OWNER_A, playerId)).died, true);
    await service.resetAfterDeath(OWNER_A, playerId);

    assert.equal(await code(async () => await service.previewCreation(OWNER_A, { fresh: true })), 'RATE_LIMITED');
    const revived = await service.previewCreation(OWNER_A);
    assert.equal(revived.ticketId, first.ticketId);
    assert.equal(revived.revived, true);
    assert.equal(revived.rollsLeft, 0);
    assert.deepEqual(revived.preview, first.preview);
    const remade = await service.createPlayer(OWNER_A, {
      ticketId: revived.ticketId, name: 'Bất Tử', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
    });
    assert.ok(remade.playerId);
  });

  test(`PlayerService hợp đồng [${adapter}]: xóa nhân vật đặt lại lượt gieo, không ảnh hưởng tài khoản khác`, async t => {
    const { service, make } = await sharedFixture(adapter, t);
    const other = await service.previewCreation(OWNER_B);
    const otherReuse = await service.previewCreation(OWNER_B);
    assert.equal(otherReuse.ticketId, other.ticketId, 'Mở lại màn tạo dùng lại phiếu');
    const first = await service.previewCreation(OWNER_A);
    const { playerId } = await service.createPlayer(OWNER_A, { ticketId: first.ticketId, name: 'Tân Sinh', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
    await assert.rejects(service.deleteCharacter(OWNER_B, playerId, { confirm: 'delete-character' }), { code: 'PLAYER_NOT_FOUND' });
    await service.deleteCharacter(OWNER_A, playerId, { confirm: 'delete-character' });
    const next = await service.previewCreation(OWNER_A);
    assert.equal(next.rollsLeft, first.rollsLeft);
    await assert.rejects(service.createPlayer(OWNER_A, { ticketId: first.ticketId, name: 'Tân Sinh', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' }), { code: 'TICKET_INVALID' });
    const otherNext = await service.previewCreation(OWNER_B, { fresh: true });
    assert.equal(otherNext.rollsLeft, other.rollsLeft - 1);
  });

  test(`PlayerService hợp đồng [${adapter}]: xóa tài khoản xóa phiếu gieo của chính chủ`, async t => {
    const { service, make } = await sharedFixture(adapter, t);
    const other = await service.previewCreation(OWNER_B);
    await make(OWNER_A, 'Xóa Tài Khoản');
    const removed = await service.deleteAccount(OWNER_A, { confirm: 'delete-my-account' }, { deleteUser: async () => ({ deleted: true }) });
    assert.equal(removed.players, 1);
    assert.equal(removed.tickets, 1);
    assert.equal((await service.previewCreation(OWNER_A)).rollsLeft, other.rollsLeft);
    assert.equal((await service.previewCreation(OWNER_B, { fresh: true })).rollsLeft, other.rollsLeft - 1);
  });

  test(`PlayerService hợp đồng [${adapter}]: export bảo mật, erase, delete-account idempotent`, async t => {
    const { service, repo, make } = await sharedFixture(adapter, t);
    const { playerId } = await make(OWNER_A, 'Phàm Trần');
    const seed = (await repo.get(playerId)).rngSeed;
    const exported = await service.exportData(OWNER_A);
    assert.equal(exported.player.id, playerId);
    assert.ok(!JSON.stringify(exported).includes(seed));
    assert.doesNotMatch(JSON.stringify(exported), /rngSeed|rng_seed/);
    await assert.rejects(service.eraseData(OWNER_A, { confirm: 'wrong' }), { code: 'INVALID_REQUEST' });
    assert.equal((await service.eraseData(OWNER_A, { confirm: 'delete-my-game-data' })).players, 1);
    await assert.rejects(service.state(OWNER_A, playerId), { code: 'PLAYER_NOT_FOUND' });
    const calls = [];
    const admin = { deleteUser: async owner => { calls.push(owner); return { deleted: true }; } };
    const removed = await service.deleteAccount(OWNER_A, { confirm: 'delete-my-account' }, admin);
    assert.equal(removed.accountDeleted, true);
    assert.deepEqual(calls, [OWNER_A]);
  });
}

test('đồng bộ lưu danh phận cho đệ tử cũ mà không đổi cống hiến', async () => {
  const { svc, clock, repo } = setup();
  const { playerId:id } = await spawn(svc);
  await svc.command('owner-a', id, await envelope(svc,'owner-a','joinSect',{id:H.SECTS[0].id},'old-disciple-join'));
  const old = (await repo.get(id)).state;
  delete old.sect.discipleClass; old.rootType='Tam hành'; old.sect.contribution=123; old.sect.earned=456;
  const encoded=JSON.stringify(old);
  repo.testSetRawState(id, encoded);
  clock.t += 1000;
  await svc.sync('owner-a',id);
  const saved=(await repo.get(id)).state;
  assert.equal(saved.sect.discipleClass,'ngoai_mon');
  assert.equal(saved.sect.contribution,123); assert.equal(saved.sect.earned,456);
  repo.close();
});

test('máy chủ chặn xung đột khi luyện đan và chỉ cộng đả tọa sau lúc mẻ hoàn tất', async () => {
  const {svc,repo,clock}=setup({onlineGraceMs:60000});const {playerId:id}=await spawn(svc);
  const old=(await repo.get(id)).state;old.craftQueue=[{code:'PILL-002',end:clock.t+10000,success:1,quality:0}];
  const raw=JSON.stringify(old);repo.testSetRawState(id, raw);
  clock.t+=5000;const before=old.progress.meditate;
  assert.equal(await code(async()=>svc.command('owner-a',id,await envelope(svc,'owner-a','startExploration',{},'busy-work-1'))),'GAME_RULE_VIOLATION');
  assert.equal((await repo.get(id)).state.progress.meditate,before);
  clock.t+=10000;const synced=await svc.sync('owner-a',id);
  assert.equal(synced.state.craftQueue.length,0);assert.equal(synced.state.progress.meditate-before,5);
  assert.ok((await svc.command('owner-a',id,await envelope(svc,'owner-a','startExploration',{},'busy-work-2'))).state.exploration.active);
  repo.close();
});

test('sync và pause không truy vấn Thiên Mệnh Các; bootstrap vẫn trả dữ liệu', async () => {
  const {svc,repo,clock}=setup(); const {playerId}=await spawn(svc);
  let calls=0; const original=repo.getPavilion.bind(repo);
  repo.getPavilion=async (...args)=>{calls++; return original(...args);};
  clock.t+=1000; const sync=await svc.sync('owner-a',playerId);
  assert.equal(calls,0); assert.equal(sync.pavilion,undefined);
  const paused=await svc.pause('owner-a',playerId);
  assert.equal(calls,0); assert.equal(paused.pavilion,undefined);
  const boot=await svc.bootstrap('owner-a');
  assert.ok(calls>0); assert.ok(boot.pavilion);
  repo.close();
});
