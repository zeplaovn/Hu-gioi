'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');

test('F6: pause đã dừng không làm revision, lastSeenAt, state đổi hoặc ghi lại', async t => {
  const repo = new SqlitePlayers(':memory:');
  t.after(() => repo.close());
  let now = 1_800_000_000_000;
  const svc = new PlayerService({ repository: repo, clock: () => now, contentVersion: 'test' });
  const pv = await svc.previewCreation('owner-a');
  const id = (await svc.createPlayer('owner-a', { ticketId: pv.ticketId, name: 'Thanh Ngọc', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' })).playerId;
  const one = await svc.pause('owner-a', id);
  const before = await repo.get(id);
  now += 20 * 60_000;
  const two = await svc.pause('owner-a', id);
  const after = await repo.get(id);
  assert.equal(two.revision, one.revision);
  assert.deepEqual(after, before);
  assert.equal((await svc.sync('owner-a', id)).report.seconds, 0);
});
