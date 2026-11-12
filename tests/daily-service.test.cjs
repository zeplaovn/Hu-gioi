/* Nhiệm vụ ngày, điểm danh 7 ngày và hộp thư: server-authoritative, receipt idempotent. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const { DailyService, dayKey, resetAt } = require('../server/services/daily-service.js');

const OWNER = '11111111-1111-4111-8111-111111111111';
const DAY = 24 * 3600 * 1000;
// 15:00 ngày 15/01/2027 theo UTC+7.
const T0 = Date.UTC(2027, 0, 15, 8, 0, 0);

function setup(t) {
  const repo = new SqlitePlayers(':memory:');
  t.after(() => repo.close());
  const clock = { now: T0 };
  const service = new PlayerService({
    repository: repo, clock: () => clock.now, contentVersion: 'test', onError: () => {}
  });
  const daily = new DailyService({
    repository: repo, playerService: service, clock: () => clock.now, contentVersion: 'test'
  });
  return { repo, service, daily, clock };
}

async function spawn(service, name = 'Vân Nhiệm') {
  const ticket = await service.previewCreation(OWNER);
  return (await service.createPlayer(OWNER, {
    ticketId: ticket.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
  })).playerId;
}

async function bump(repo, playerId, changes) {
  await repo.transact(playerId, async tx => {
    const record = tx.record, state = structuredClone(record.state);
    for (const [counter, amount] of Object.entries(changes)) state.progress[counter] += amount;
    return {
      save: {
        state, revision: record.revision + 1, rngCounter: record.rngCounter,
        lastSeenAt: record.lastSeenAt, schemaVersion: H.VERSION, contentVersion: record.contentVersion
      }
    };
  });
}

test('mốc ngày cố định UTC+7, không theo múi giờ máy khách', () => {
  const before = Date.UTC(2027, 0, 15, 16, 59, 59);
  const after = Date.UTC(2027, 0, 15, 17, 0, 0);
  assert.equal(dayKey(before), '2027-01-15');
  assert.equal(dayKey(after), '2027-01-16');
  assert.equal(resetAt(before), after);
  assert.equal(dayKey(T0), '2027-01-15');
});

test('chọn ba nhiệm vụ ổn định trong ngày và đặt baseline mới khi sang ngày', async t => {
  const { repo, service, daily, clock } = setup(t);
  const id = await spawn(service);
  const first = await daily.daily(OWNER);
  assert.equal(first.daily.quests.length, 3);
  assert.equal(new Set(first.daily.quests.map(q => q.id)).size, 3);
  assert.equal(first.daily.claimable, 0);
  assert.equal(first.daily.checkin.canCheckIn, true);
  assert.equal(first.mail.total, 3);

  const again = await daily.daily(OWNER);
  assert.deepEqual(again.daily.quests.map(q => q.id), first.daily.quests.map(q => q.id));

  await bump(repo, id, { kill: 40, meditate: 40, travel: 40, breaks: 40, alchemy: 40 });
  clock.now += DAY;
  const next = await daily.daily(OWNER);
  assert.notEqual(next.daily.day, first.daily.day);
  assert.ok(next.daily.quests.every(q => q.progress === 0), 'tiến độ trước ngày mới phải nằm trong baseline');
  assert.equal(next.mail.total, 3, 'thư mẫu không được gieo lặp');
});

test('nhận thưởng nhiệm vụ ngày đúng một lần; replay trả receipt, requestId khác bị từ chối', async t => {
  const { repo, service, daily } = setup(t);
  const id = await spawn(service);
  const view = (await daily.daily(OWNER)).daily;
  const quest = view.quests[0], other = view.quests[1];
  const before = (await repo.get(id)).state;

  await assert.rejects(daily.claimQuest(OWNER, { requestId: 'daily-not-ready', questId: quest.id }),
    { code: 'GAME_RULE_VIOLATION' }, 'chưa đủ tiến độ thì không được phát thưởng');

  await bump(repo, id, { [quest.counter]: quest.target });
  const first = await daily.claimQuest(OWNER, { requestId: 'daily-claim-01', questId: quest.id });
  assert.equal(first.result.questId, quest.id);
  assert.equal(first.result.reward.stone, quest.reward.stone);
  const after = (await repo.get(id)).state;
  assert.equal(after.stone, before.stone + quest.reward.stone);
  assert.equal(after.bag[quest.reward.item] || 0, (before.bag[quest.reward.item] || 0) + quest.reward.qty);

  const replay = await daily.claimQuest(OWNER, { requestId: 'daily-claim-01', questId: quest.id });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, first.result);
  assert.equal((await repo.get(id)).state.stone, after.stone, 'replay không cộng thưởng lần hai');

  await assert.rejects(daily.claimQuest(OWNER, { requestId: 'daily-claim-02', questId: quest.id }),
    { code: 'GAME_RULE_VIOLATION' }, 'cùng ngày không nhận lại cùng nhiệm vụ');
  await assert.rejects(daily.claimQuest(OWNER, { requestId: 'daily-claim-01', questId: other.id }),
    { code: 'REQUEST_ID_REUSED' }, 'requestId không được dùng cho intent khác');
  await assert.rejects(daily.checkIn(OWNER, { requestId: 'daily-claim-01' }),
    { code: 'REQUEST_ID_REUSED' }, 'receipt dùng chung cho mọi claim cấp tài khoản');
});

test('điểm danh đúng một lần mỗi ngày, replay không cấp lại và bỏ ngày reset chuỗi', async t => {
  const { repo, service, daily, clock } = setup(t);
  const id = await spawn(service);
  const before = (await repo.get(id)).state;

  const first = await daily.checkIn(OWNER, { requestId: 'checkin-01' });
  assert.equal(first.result.day, 1);
  assert.equal(first.daily.checkin.checkedToday, true);
  assert.equal(first.daily.checkin.canCheckIn, false);
  const after = (await repo.get(id)).state;
  assert.equal(after.stone, before.stone + first.result.reward.stone);

  const replay = await daily.checkIn(OWNER, { requestId: 'checkin-01' });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, first.result);
  assert.equal((await repo.get(id)).state.stone, after.stone);

  const sameDay = await daily.checkIn(OWNER, { requestId: 'checkin-02' });
  assert.equal(sameDay.already, true);
  assert.equal((await repo.get(id)).state.stone, after.stone);

  clock.now += DAY;
  const second = await daily.checkIn(OWNER, { requestId: 'checkin-03' });
  assert.equal(second.result.day, 2);
  assert.equal(second.daily.checkin.streak, 2);

  clock.now += 2 * DAY;
  const missed = await daily.checkIn(OWNER, { requestId: 'checkin-04' });
  assert.equal(missed.result.day, 1, 'bỏ lỡ một ngày phải quay về ngày 1');
});

test('chuỗi điểm danh lặp lại sau ngày 7', async t => {
  const { service, daily, clock } = setup(t);
  await spawn(service);
  const days = [];
  for (let i = 0; i < 8; i++) {
    const result = await daily.checkIn(OWNER, { requestId: 'checkin-cycle-' + i });
    days.push(result.result.day);
    clock.now += DAY;
  }
  assert.deepEqual(days, [1, 2, 3, 4, 5, 6, 7, 1]);
});

test('hộp thư gieo mẫu một lần, nhận quà đúng một lần và chặn thư hết hạn', async t => {
  const { repo, service, daily, clock } = setup(t);
  const id = await spawn(service);
  const first = await daily.mail(OWNER);
  assert.equal(first.mail.items.length, 3);
  assert.equal(new Set(first.mail.items.map(x => x.kind)).size, 3);
  assert.equal(first.mail.claimable, 2, 'thư hỗ trợ không có quà đính kèm');
  assert.equal((await daily.mail(OWNER)).mail.items.length, 3);

  const welcome = first.mail.items.find(x => x.kind === 'system');
  const before = (await repo.get(id)).state;
  const claim = await daily.claimMail(OWNER, { requestId: 'mail-claim-01', mailId: welcome.id });
  assert.equal(claim.result.mailId, welcome.id);
  const after = (await repo.get(id)).state;
  assert.equal(after.stone, before.stone + 100);
  assert.equal(after.bag['HERB-001'] || 0, (before.bag['HERB-001'] || 0) + 3);

  const replay = await daily.claimMail(OWNER, { requestId: 'mail-claim-01', mailId: welcome.id });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, claim.result);
  assert.equal((await repo.get(id)).state.stone, after.stone);

  await assert.rejects(daily.claimMail(OWNER, { requestId: 'mail-claim-02', mailId: welcome.id }),
    { code: 'GAME_RULE_VIOLATION' }, 'thư đã nhận không được nhận lại');

  const support = first.mail.items.find(x => x.kind === 'support');
  const read = await daily.claimMail(OWNER, { requestId: 'mail-claim-03', mailId: support.id });
  assert.equal(read.result.attachments.stone, 0);
  assert.deepEqual(read.result.attachments.items, []);

  clock.now += 31 * DAY;
  const later = await daily.mail(OWNER);
  const event = later.mail.items.find(x => x.kind === 'event');
  assert.equal(event.expired, true);
  await assert.rejects(daily.claimMail(OWNER, { requestId: 'mail-claim-04', mailId: event.id }),
    { code: 'GAME_RULE_VIOLATION' }, 'thư hết hạn không được phát quà');
});

test('xuất dữ liệu tài khoản gồm nhiệm vụ ngày và thư; xóa tài khoản xóa sạch dữ liệu mới', async t => {
  const { repo, service, daily } = setup(t);
  await spawn(service);
  await daily.daily(OWNER);
  const exported = await service.exportData(OWNER);
  assert.ok(exported.account?.daily);
  assert.equal(exported.mail.length, 3);

  const deleted = await repo.deleteOwnerData(OWNER);
  assert.equal(deleted.accountState, 1);
  assert.equal(deleted.accountMail, 3);
  assert.ok(deleted.accountReceipts >= 0);
  assert.equal(await repo.exportOwnerData(OWNER), null);
});
