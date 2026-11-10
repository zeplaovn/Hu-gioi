'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('../engine/game.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const NOW = 1_800_000_000_000;
async function fixture(repo) {
  const time = { value: NOW };
  const svc = new PlayerService({ repository: repo, clock: () => time.value, contentVersion: 'test', onError: () => {} });
  const ticket = await svc.previewCreation('owner-a');
  const made = await svc.createPlayer('owner-a', { ticketId: ticket.ticketId, name: 'Tử Vân', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp' });
  const command = async (type, payload, requestId) => ({ protocolVersion: 2, type, payload, requestId, expectedRevision: (await svc.bootstrap('owner-a')).player.revision });
  return { svc, time, id: made.playerId, command };
}
for (const mode of ['memory', 'disk']) {
  function useRepo(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-f1-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const repo = new SqlitePlayers(mode === 'memory' ? ':memory:' : path.join(dir, 'database.sqlite'));
    t.after(() => repo.close());
    return repo;
  }
  test('F1 ' + mode + ': lệnh breakthrough thất bại sau 20 phút không hồi sinh thời gian offline', t => {
    const repo = useRepo(t);
    const { svc, time, id, command } = await fixture(repo);
    const original = await svc.state('owner-a', id);
    time.value += 20 * 60_000;
    await assert.rejects(async () => svc.command('owner-a', id, await command('breakthrough', {}, 'f1-breakthrough')), { code: 'GAME_RULE_VIOLATION' });
    const fresh = await svc.sync('owner-a', id);
    assert.equal(fresh.report.seconds, 0);
    assert.equal(fresh.state.qi, original.state.qi);
    assert.equal(fresh.state.age, original.state.age);
    assert.equal(fresh.state.lastUpdate, time.value);
    assert.equal((await repo.get(id)).lastSeenAt, fresh.state.lastUpdate);
  });
  test('F1 ' + mode + ': lệnh đã trừ tiền rồi lỗi thì khôi phục state sau advance', t => {
    const repo = useRepo(t);
    const { svc, time, id, command } = await fixture(repo);
    time.value += 20 * 60_000;
    const expected = structuredClone((await repo.get(id)).state);
    new H.Game(expected).advance(time.value, true);
    expected.presencePaused = false;
    const old = H.Game.prototype.buy;
    H.Game.prototype.buy = function () { this.s.stone -= 10; this.s.qi += 4000; throw Error('Mua thất bại.'); };
    try {
      await assert.rejects(async () => svc.command('owner-a', id, await command('buy', { code: 'HERB-001' }, 'f1-spend')), { code: 'GAME_RULE_VIOLATION' });
    } finally { H.Game.prototype.buy = old; }
    assert.deepEqual((await repo.get(id)).state, expected);
    assert.equal((await repo.get(id)).lastSeenAt, (await repo.get(id)).state.lastUpdate);
    assert.equal(await svc.sync('owner-a', id).report.seconds, 0);
  });
}
