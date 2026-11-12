/* Đồng hồ giao dịch đơn điệu: request lấy `now` trước khi giữ khóa hàng không được lùi mốc thời gian
   và không được khiến khoảng thời gian bị cộng hai lần (xem PlayerService.#monotonic). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');

const T0 = 1_800_000_000_000;
function setup(config = {}) {
  const clock = { t: T0 }, repo = new SqlitePlayers(':memory:');
  const svc = new PlayerService({ repository: repo, clock: () => clock.t, contentVersion: 'test', config, onError: () => {} });
  return { clock, repo, svc };
}
async function spawn(svc, owner = 'owner-a', name = 'Bạch Thanh Vân') {
  const pv = await svc.previewCreation(owner);
  return await svc.createPlayer(owner, { ticketId: pv.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
}
const envelope = async (svc, owner, type, payload, requestId) => ({
  protocolVersion: 4, requestId, expectedRevision: (await svc.bootstrap(owner)).player.revision, type, payload
});

test('request chậm khóa hàng (now cũ) không làm lùi mốc và không khiến thời gian bị cộng hai lần', async () => {
  const run = async skew => {
    const { svc, clock } = setup({ onlineGraceMs: 60000, nextSyncInMs: 5000 });
    const made = await spawn(svc), id = made.playerId;     // tuổi khởi đầu gieo ngẫu nhiên: so sánh mức tăng
    clock.t = T0 + 10000;
    await svc.sync('owner-a', id, {});                     // request B giữ khóa trước, now = T0+10s
    if (skew) {
      clock.t = T0 + 5000;                                // request A lấy now sớm hơn nhưng giành khóa sau
      await svc.sync('owner-a', id, {});
    }
    clock.t = T0 + 15000;
    const last = await svc.sync('owner-a', id, {}), s = last.state;
    return { age: s.age - made.state.age, seconds: last.report.seconds, lastUpdate: s.lastUpdate };
  };
  const clean = await run(false), skewed = await run(true);
  assert.ok(clean.age > 0, 'tiến trình cơ sở phải có thật');
  assert.equal(clean.seconds, 5);
  assert.equal(skewed.seconds, 5, 'lần sync sau request chậm chỉ được tính đúng 5s thực');
  assert.ok(Math.abs(skewed.age - clean.age) < 1e-9, 'tuổi không được cộng trùng khoảng bị chồng');
  assert.equal(skewed.lastUpdate, clean.lastUpdate);
});

test('lệnh với now cũ cũng không lùi lastSeenAt/lastUpdate', async () => {
  const { svc, clock, repo } = setup();
  const { playerId: id } = await spawn(svc);
  clock.t = T0 + 10000;
  await svc.sync('owner-a', id, {});
  clock.t = T0 + 5000;
  await svc.command('owner-a', id, await envelope(svc, 'owner-a', 'buy', { code: 'HERB-001' }, 'req-stale'));
  const rec = await repo.get(id);
  assert.ok(rec.lastSeenAt >= T0 + 10000, 'lastSeenAt không được lùi');
  assert.ok(rec.state.lastUpdate >= T0 + 10000, 'state.lastUpdate không được lùi');
});
