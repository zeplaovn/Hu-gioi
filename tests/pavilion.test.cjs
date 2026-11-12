/* HƯ GIỚI — Thiên Mệnh Các: giao dịch SQLite, đột phá, không trọng sinh. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('../engine/game.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService, seededRng, ERASE_CONFIRMATION } = require('../server/services/player-service.js');

const T0 = 1_800_000_000_000;
function setup() {
  const repo = new SqlitePlayers(':memory:');
  const service = new PlayerService({ repository: repo, clock: () => T0, contentVersion: 'test', onError: e => { throw e; } });
  return { repo, service };
}
async function spawn(service, owner, name) {
  const ticket = await service.previewCreation(owner);
  return await service.createPlayer(owner, {
    ticketId: ticket.ticketId, name, gender: 'nam', talent: { canCot: 8 }, destiny: 'exp'
  });
}
const body = async (service, owner, requestId, type = 'breakthrough') => ({
  protocolVersion: 3, requestId, expectedRevision: (await service.bootstrap(owner)).player.revision,
  type, payload: {}
});
async function addPoints(repo, playerId, amount) {
  await repo.transact(playerId, () => ({ pavilionAward: amount, value: null }));
}
const buy = async (service, owner, requestId, kind, key) => await service.pavilionPurchase(owner, {
  requestId, expectedVersion: (await service.bootstrap(owner)).pavilion.version, kind, key
});
async function forceAscension({ repo, service }, playerId, owner, requestId) {
  const record = await repo.get(playerId), state = record.state;
  state.age = 14;
  state.realm = 0;
  state.stage = H.F.STAGES[0];
  state.shield = 100000;
  state.reduction = .99;
  state.qi = new H.Game(state).need();
  state.hp = new H.Game(state).stats().HP;
  const g = new H.Game(state), chance = g.chance();
  assert.ok(g.tribulation().every(e => e.success), 'hộ kiếp thử nghiệm đủ mạnh');
  assert.ok(chance > 0);
  const seed = Array.from({ length: 100 }, (_, i) => i.toString(16).padStart(64, '0'))
    .find(s => seededRng(s, 0)() < chance);
  assert.ok(seed, 'tìm được RNG thử nghiệm thành công');
  await repo.transact(playerId, tx => ({ save: {
    state, revision: tx.record.revision + 1, rngCounter: 0, lastSeenAt: T0,
    schemaVersion: H.VERSION, contentVersion: 'test'
  } }));
  repo.db.prepare('UPDATE players SET rng_seed = ?, rng_counter = 0 WHERE id = ?').run(seed, playerId);
  return await service.command(owner, playerId, await body(service, owner, requestId));
}

test('quy luật Thiên Tinh: mỗi lần vượt một đại cảnh giới nhận 5, 10, 15… không trần tích lũy', async () => {
  assert.equal(H.PAVILION.realmReward(1), 5);
  assert.equal(H.PAVILION.realmReward(2), 10);
  assert.equal(H.PAVILION.realmReward(3), 15);
  assert.equal(H.PAVILION.realmReward(13), 65);
  assert.equal(H.PAVILION.realmReward(0), 0);
  assert.equal(H.PAVILION.bonus(20), .5);
  assert.equal(H.PAVILION.bonus(300), .5);
  const plain = H.create(T0), normal = new H.Game({ ...plain, pavilion: { ngoTinh: 20 } });
  const tooMuch = new H.Game({ ...plain, pavilion: { ngoTinh: 2000 } });
  assert.equal(normal.rate(), tooMuch.rate(), 'engine không vượt trần +50% kể cả khi snapshot hỏng');
  assert.equal(H.PAVILION.upgradeCost(0), 2);
  assert.equal(H.PAVILION.upgradeCost(5), 4);
  assert.equal(H.PAVILION.upgradeCost(10), 8);
  assert.equal(H.PAVILION.upgradeCost(15), 12);
  assert.equal(H.PAVILION.upgradeCost(20), null);
});

test('đại đột phá thực qua engine thưởng 5 Thiên Tinh nguyên tử; replay không nhân đôi', async () => {
  const { repo, service } = setup();
  try {
    const id = (await spawn(service, 'a', 'Diệp Trường Sinh')).playerId;
    const first = await forceAscension({ repo, service }, id, 'a', 'ascension-01');
    assert.equal(first.result.success, true);
    assert.equal(first.result.thienTinh, 5);
    assert.equal(first.state.realm, 1);
    assert.equal(first.pavilion.balance, 5);
    assert.equal(first.pavilion.totalEarned, 5);
    assert.ok(first.logs.some(line => line.includes('Thiên Tinh')));
    const replay = await service.command('a', id, { ...await body(service, 'a', 'ascension-01'), expectedRevision: 0 });
    assert.equal(replay.replayed, true);
    assert.equal(replay.result.thienTinh, 5);
    assert.equal((await service.bootstrap('a')).pavilion.totalEarned, 5);
    assert.equal((await service.bootstrap('a')).pavilion.balance, 5);
  } finally { repo.close(); }
});

test('mua cấp Thiên Mệnh Các: optimistic version, receipt một lần, độc lập 2 tài khoản', async () => {
  const { repo, service } = setup();
  try {
    const a = (await spawn(service, 'a', 'Hàn Sương')).playerId;
    await spawn(service, 'b', 'Mạc Côn');
    await addPoints(repo, a, 600);
    const first = await buy(service, 'a', 'upgrade-0001', 'upgrade', 'ngoTinh');
    assert.equal(first.pavilion.upgrades.ngoTinh, 1);
    assert.equal(first.pavilion.balance, 598);
    assert.equal(first.state.pavilion.ngoTinh, 1);
    const base = new H.Game({ ...first.state, pavilion: {} }).rate();
    const boosted = new H.Game(first.state).rate();
    assert.ok(boosted > base);
    const oldVersion = first.pavilion.version - 1;
    const replay = await service.pavilionPurchase('a', { requestId: 'upgrade-0001', expectedVersion: oldVersion, kind: 'upgrade', key: 'ngoTinh' });
    assert.equal(replay.replayed, true);
    assert.equal(replay.pavilion.balance, 598);
    await assert.rejects(async () => service.pavilionPurchase('a', { requestId: 'upgrade-0002', expectedVersion: oldVersion, kind: 'upgrade', key: 'ngoTinh' }), { code: 'PAVILION_CONFLICT' });
    await assert.rejects(async () => service.pavilionPurchase('a', { requestId: 'upgrade-0001', expectedVersion: oldVersion, kind: 'upgrade', key: 'canCot' }), { code: 'REQUEST_ID_REUSED' });
    assert.equal((await service.bootstrap('b')).pavilion.balance, 0);
    await assert.rejects(async () => buy(service, 'b', 'upgrade-b001', 'upgrade', 'ngoTinh'), { code: 'INSUFFICIENT_TINH' });
    for (let i = 2; i <= 20; i++) await buy(service, 'a', 'upgrade-' + i.toString().padStart(4, '0'), 'upgrade', 'ngoTinh');
    const done = (await service.bootstrap('a')).pavilion;
    assert.equal(done.upgrades.ngoTinh, 20);
    assert.equal(done.balance, 600 - 130);
    await assert.rejects(async () => buy(service, 'a', 'upgrade-0021', 'upgrade', 'ngoTinh'), { code: 'GAME_RULE_VIOLATION' });
  } finally { repo.close(); }
});

test('tử vong: có thể tạo lại từ đầu, không giữ Thiên Tinh hay nâng cấp', async () => {
  const { repo, service } = setup();
  try {
    const id = (await spawn(service,'a','Tô Thiên Vân')).playerId;
    await forceAscension({ repo,service }, id,'a','first-ascend');
    await buy(service,'a','current-upgrade','upgrade','canCot');
    await assert.rejects(buy(service,'a','legacy-relic','relic','tuiLinhThach'), { code:'INVALID_REQUEST' });
    const record = await repo.get(id);
    await assert.rejects(service.resetAfterDeath('a',id), { code:'GAME_RULE_VIOLATION' });
    await repo.transact(id, tx => ({ save: {
      state: { ...record.state, death: { cause:'combat', at:T0 } },
      revision: tx.record.revision + 1, rngCounter: tx.record.rngCounter,
      lastSeenAt:T0, schemaVersion:H.VERSION, contentVersion:'test'
    } }));
    await assert.rejects(spawn(service,'a','Tô Vân Kiếp'), { code:'PLAYER_EXISTS' });
    const reset = await service.resetAfterDeath('a',id);
    assert.equal(reset.deleted,true);
    assert.equal(reset.pavilion.balance,0);
    assert.equal(reset.pavilion.totalEarned,0);
    assert.deepEqual(reset.pavilion.upgrades,{});
    assert.equal(reset.pavilion.rebirths,0);
    const next = await spawn(service,'a','Tô Vân Kiếp');
    assert.notEqual(next.playerId,id);
    assert.equal(next.pavilion.balance,0);
    assert.equal(next.state.pavilion?.canCot || 0,0);
  } finally { repo.close(); }
});

test('Thiên Tinh bền vững khi đóng/mở SQLite và bị xóa đúng quyền dữ liệu', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-pavilion-'));
  const dbFile = path.join(dir, 'game.sqlite');
  try {
    const firstRepo = new SqlitePlayers(dbFile);
    const service1 = new PlayerService({ repository: firstRepo, clock: () => T0, contentVersion: 'test' });
    const id = (await spawn(service1, 'account-persist', 'Thạch Đạo Nhân')).playerId;
    await addPoints(firstRepo, id, 80);
    await buy(service1, 'account-persist', 'persist-0001', 'upgrade', 'ngoTinh');
    await assert.rejects(buy(service1, 'account-persist', 'persist-0002', 'relic', 'tuiLinhThach'), { code: 'INVALID_REQUEST' });
    const expected = (await service1.bootstrap('account-persist')).pavilion;
    firstRepo.close();

    const secondRepo = new SqlitePlayers(dbFile);
    const service2 = new PlayerService({ repository: secondRepo, clock: () => T0, contentVersion: 'test' });
    assert.deepEqual((await service2.bootstrap('account-persist')).pavilion, expected, 'qua process vẫn giữ số dư và kho');
    const replay = await service2.pavilionPurchase('account-persist', {
      requestId: 'persist-0001', expectedVersion: 0, kind: 'upgrade', key: 'ngoTinh'
    });
    assert.equal(replay.replayed, true, 'receipt mua tồn tại sau khởi động lại');
    assert.equal(replay.pavilion.balance, expected.balance);
    const exported = await service2.exportData('account-persist');
    assert.equal(exported.pavilion.balance, expected.balance);
    assert.equal(exported.pavilion.upgrades.ngoTinh, 1);
    const erased = await service2.eraseData('account-persist', { confirm: ERASE_CONFIRMATION });
    assert.equal(erased.erased, true);
    assert.equal((await service2.bootstrap('account-persist')).pavilion.balance, 0);
    assert.equal((await service2.bootstrap('account-persist')).player, null);
    secondRepo.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
