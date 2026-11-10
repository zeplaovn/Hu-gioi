/* HƯ GIỚI — Thiên Mệnh Các: giao dịch SQLite, đột phá và tích lũy xuyên kiếp. */
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
function spawn(service, owner, name) {
  const ticket = service.previewCreation(owner);
  return service.createPlayer(owner, {
    ticketId: ticket.ticketId, name, gender: 'nam', talent: { canCot: 8 }, destiny: 'exp'
  });
}
const body = (service, owner, requestId, type = 'breakthrough') => ({
  protocolVersion: 2, requestId, expectedRevision: service.bootstrap(owner).player.revision,
  type, payload: {}
});
function addPoints(repo, playerId, amount) {
  repo.transact(playerId, () => ({ pavilionAward: amount, value: null }));
}
const buy = (service, owner, requestId, kind, key) => service.pavilionPurchase(owner, {
  requestId, expectedVersion: service.bootstrap(owner).pavilion.version, kind, key
});
function forceAscension({ repo, service }, playerId, owner, requestId) {
  const record = repo.get(playerId), state = record.state;
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
  repo.transact(playerId, tx => ({ save: {
    state, revision: tx.record.revision + 1, rngCounter: 0, lastSeenAt: T0,
    schemaVersion: H.VERSION, contentVersion: 'test'
  } }));
  repo.db.prepare('UPDATE players SET rng_seed = ?, rng_counter = 0 WHERE id = ?').run(seed, playerId);
  return service.command(owner, playerId, body(service, owner, requestId));
}

test('quy luật Thiên Tinh: mỗi lần vượt một đại cảnh giới nhận 5, 10, 15… không trần tích lũy', () => {
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

test('đại đột phá thực qua engine thưởng 5 Thiên Tinh nguyên tử; replay không nhân đôi', () => {
  const { repo, service } = setup();
  try {
    const id = spawn(service, 'a', 'Diệp Trường Sinh').playerId;
    const first = forceAscension({ repo, service }, id, 'a', 'ascension-01');
    assert.equal(first.result.success, true);
    assert.equal(first.result.thienTinh, 5);
    assert.equal(first.state.realm, 1);
    assert.equal(first.pavilion.balance, 5);
    assert.equal(first.pavilion.totalEarned, 5);
    assert.ok(first.logs.some(line => line.includes('Thiên Tinh')));
    const replay = service.command('a', id, { ...body(service, 'a', 'ascension-01'), expectedRevision: 0 });
    assert.equal(replay.replayed, true);
    assert.equal(replay.result.thienTinh, 5);
    assert.equal(service.bootstrap('a').pavilion.totalEarned, 5);
    assert.equal(service.bootstrap('a').pavilion.balance, 5);
  } finally { repo.close(); }
});

test('mua cấp Thiên Mệnh Các: optimistic version, receipt một lần, độc lập 2 tài khoản', () => {
  const { repo, service } = setup();
  try {
    const a = spawn(service, 'a', 'Hàn Sương').playerId;
    spawn(service, 'b', 'Mạc Côn');
    addPoints(repo, a, 600);
    const first = buy(service, 'a', 'upgrade-0001', 'upgrade', 'ngoTinh');
    assert.equal(first.pavilion.upgrades.ngoTinh, 1);
    assert.equal(first.pavilion.balance, 598);
    assert.equal(first.state.pavilion.ngoTinh, 1);
    const base = new H.Game({ ...first.state, pavilion: {} }).rate();
    const boosted = new H.Game(first.state).rate();
    assert.ok(boosted > base);
    const oldVersion = first.pavilion.version - 1;
    const replay = service.pavilionPurchase('a', { requestId: 'upgrade-0001', expectedVersion: oldVersion, kind: 'upgrade', key: 'ngoTinh' });
    assert.equal(replay.replayed, true);
    assert.equal(replay.pavilion.balance, 598);
    assert.throws(() => service.pavilionPurchase('a', { requestId: 'upgrade-0002', expectedVersion: oldVersion, kind: 'upgrade', key: 'ngoTinh' }), { code: 'PAVILION_CONFLICT' });
    assert.throws(() => service.pavilionPurchase('a', { requestId: 'upgrade-0001', expectedVersion: oldVersion, kind: 'upgrade', key: 'canCot' }), { code: 'REQUEST_ID_REUSED' });
    assert.equal(service.bootstrap('b').pavilion.balance, 0);
    assert.throws(() => buy(service, 'b', 'upgrade-b001', 'upgrade', 'ngoTinh'), { code: 'INSUFFICIENT_TINH' });
    for (let i = 2; i <= 20; i++) buy(service, 'a', 'upgrade-' + i.toString().padStart(4, '0'), 'upgrade', 'ngoTinh');
    const done = service.bootstrap('a').pavilion;
    assert.equal(done.upgrades.ngoTinh, 20);
    assert.equal(done.balance, 600 - 130);
    assert.throws(() => buy(service, 'a', 'upgrade-0021', 'upgrade', 'ngoTinh'), { code: 'GAME_RULE_VIOLATION' });
  } finally { repo.close(); }
});

test('tạo kiếp mới miễn phí: giữ số dư, cấp vĩnh viễn, kho bảo vật; thưởng lại đầy đủ', () => {
  const { repo, service } = setup();
  try {
    const id = spawn(service, 'a', 'Tô Thiên Vân').playerId;
    forceAscension({ repo, service }, id, 'a', 'first-ascend');
    buy(service, 'a', 'permanent-lvl', 'upgrade', 'canCot');
    addPoints(repo, id, 150);
    buy(service, 'a', 'relic-purchase1', 'relic', 'tuiLinhThach');
    buy(service, 'a', 'relic-purchase2', 'relic', 'tuiLinhThach');
    buy(service, 'a', 'relic-purchase3', 'relic', 'nguDaoNgoc');
    const account = service.bootstrap('a').pavilion;
    const rec = repo.get(id);
    repo.transact(id, tx => ({ save: {
      state: { ...rec.state, death: { cause: 'combat', at: T0 } },
      revision: tx.record.revision + 1, rngCounter: tx.record.rngCounter,
      lastSeenAt: T0, schemaVersion: H.VERSION, contentVersion: 'test'
    } }));
    const reset = service.resetAfterDeath('a', id);
    assert.equal(reset.deleted, true);
    assert.equal(reset.pavilion.balance, account.balance);
    assert.equal(reset.pavilion.rebirths, 1);
    assert.equal(reset.pavilion.relics.tuiLinhThach, 2);
    assert.equal(service.bootstrap('a').player, null);
    const next = spawn(service, 'a', 'Tô Vân Kiếp');
    assert.equal(next.state.pavilion.canCot, 1);
    assert.ok(next.state.stone >= 580, 'cộng 200 linh thạch từ bảo vật một lần');
    assert.ok(next.state.qi > 0, 'Ngộ Đạo Ngọc khởi đầu có tu vi');
    assert.equal(next.pavilion.relics.tuiLinhThach, 1);
    assert.equal(next.pavilion.relics.nguDaoNgoc, 0);
    assert.equal(next.pavilion.balance, account.balance);
    const second = forceAscension({ repo, service }, next.playerId, 'a', 'second-ascend');
    assert.equal(second.result.thienTinh, 5);
    assert.equal(second.pavilion.totalEarned, account.totalEarned + 5);
    assert.equal(second.pavilion.balance, account.balance + 5);
  } finally { repo.close(); }
});

test('kho tài khoản bền vững khi đóng/mở SQLite và bị xóa đúng quyền dữ liệu', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-pavilion-'));
  const dbFile = path.join(dir, 'game.sqlite');
  try {
    const firstRepo = new SqlitePlayers(dbFile);
    const service1 = new PlayerService({ repository: firstRepo, clock: () => T0, contentVersion: 'test' });
    const id = spawn(service1, 'account-persist', 'Thạch Đạo Nhân').playerId;
    addPoints(firstRepo, id, 80);
    buy(service1, 'account-persist', 'persist-0001', 'upgrade', 'ngoTinh');
    buy(service1, 'account-persist', 'persist-0002', 'relic', 'tuiLinhThach');
    const expected = service1.bootstrap('account-persist').pavilion;
    firstRepo.close();

    const secondRepo = new SqlitePlayers(dbFile);
    const service2 = new PlayerService({ repository: secondRepo, clock: () => T0, contentVersion: 'test' });
    assert.deepEqual(service2.bootstrap('account-persist').pavilion, expected, 'qua process vẫn giữ số dư và kho');
    const replay = service2.pavilionPurchase('account-persist', {
      requestId: 'persist-0001', expectedVersion: 0, kind: 'upgrade', key: 'ngoTinh'
    });
    assert.equal(replay.replayed, true, 'receipt mua tồn tại sau khởi động lại');
    assert.equal(replay.pavilion.balance, expected.balance);
    const exported = service2.exportData('account-persist');
    assert.equal(exported.pavilion.balance, expected.balance);
    assert.equal(exported.pavilion.upgrades.ngoTinh, 1);
    const erased = service2.eraseData('account-persist', { confirm: ERASE_CONFIRMATION });
    assert.equal(erased.erased, true);
    assert.equal(service2.bootstrap('account-persist').pavilion.balance, 0);
    assert.equal(service2.bootstrap('account-persist').player, null);
    secondRepo.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
