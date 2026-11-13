/* Backend hardening regression: no production credentials or database. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const { MemoryPlayers } = require('./helpers/memory-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const { decodePavilionReceipt, encodePavilionReceipt } = require('../server/repositories/pavilion-receipt.js');

const T0 = 1_800_000_000_000;
function setup(t) {
  const repo = new MemoryPlayers();
  t.after(() => repo.close());
  const clock = { now: T0 };
  const service = new PlayerService({
    repository: repo, clock: () => clock.now, contentVersion: 'test', onError: () => {}
  });
  return { repo, service, clock };
}
async function spawn(service, owner = 'owner-a') {
  const ticket = await service.previewCreation(owner);
  return (await service.createPlayer(owner, {
    ticketId: ticket.ticketId, name: 'Hư Giới Bảo Trì', gender: 'nam',
    talent: { ngoTinh: 8 }, destiny: 'exp'
  })).playerId;
}

test('sync engine exception cannot advance lastSeenAt or grant offline cultivation', async t => {
  const { repo, service, clock } = setup(t);
  const id = await spawn(service);
  const before = await repo.get(id);
  clock.now += 20 * 60_000; // past online grace
  const original = H.Game.prototype.advance;
  H.Game.prototype.advance = function () {
    this.s.qi += 10000; // partial mutation before an unexpected engine crash
    throw new TypeError('test-injected sync failure');
  };
  try {
    await assert.rejects(service.sync('owner-a', id, {}), { code: 'INTERNAL' });
  } finally {
    H.Game.prototype.advance = original;
  }
  const after = await repo.get(id);
  assert.deepEqual(after.state, before.state, 'partial engine changes must not persist');
  assert.equal(after.lastSeenAt, before.lastSeenAt, 'failed sync must not stamp a fresh online heartbeat');
  assert.equal(after.revision, before.revision);
  const recovered = await service.sync('owner-a', id);
  assert.equal(recovered.report.seconds, 0);
  assert.equal(recovered.state.age, before.state.age);
  assert.equal(recovered.state.qi, before.state.qi);
});

test('Pavilion charged cost survives a replay; historical receipt reports unknown cost', async t => {
  const { repo, service } = setup(t);
  const id = await spawn(service);
  await repo.transact(id, () => ({ pavilionAward: 12, value: null }));
  const first = await service.pavilionPurchase('owner-a', {
    requestId: 'upgrade-first', expectedVersion: 1, kind: 'upgrade', key: 'ngoTinh'
  });
  assert.equal(first.result.cost, 2);
  const retry = async () => service.pavilionPurchase('owner-a', {
    requestId: 'upgrade-first', expectedVersion: 0, kind: 'upgrade', key: 'ngoTinh'
  });
  const second = await retry();
  assert.equal(second.replayed, true);
  assert.equal(second.result.cost, first.result.cost);
  assert.deepEqual(second.pavilion, first.pavilion, 'replay must not charge again');
  repo.testSetPavilionFingerprint('owner-a', 'upgrade-first', 'upgrade:ngoTinh');
  const old = await retry();
  assert.equal(old.replayed, true);
  assert.equal(old.result.cost, null, 'unknown historical price is not zero');
  assert.deepEqual(old.pavilion, first.pavilion);
});

test('Pavilion receipt fingerprint rejects changed intent and noncanonical stored cost', () => {
  assert.equal(encodePavilionReceipt('upgrade', 'ngoTinh', 2), 'upgrade:ngoTinh#2');
  assert.equal(decodePavilionReceipt('upgrade:ngoTinh#2', 'upgrade', 'ngoTinh'), 2);
  assert.equal(decodePavilionReceipt('upgrade:ngoTinh', 'upgrade', 'ngoTinh'), null);
  assert.throws(() => decodePavilionReceipt('upgrade:ngoTinh#2', 'upgrade', 'ngoTinh#2'),
    { code: 'REQUEST_ID_REUSED' }, 'an altered key may not look like a legacy receipt');
  for (const fingerprint of ['upgrade:canCot#2', 'upgrade:ngoTinh#2junk',
    'upgrade:ngoTinh#-1', 'upgrade:ngoTinh#01']) {
    assert.throws(() => decodePavilionReceipt(fingerprint, 'upgrade', 'ngoTinh'),
      { code: 'REQUEST_ID_REUSED' });
  }
});
