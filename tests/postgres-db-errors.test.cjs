/* B2 red-first contract: Pg SQLSTATE timeouts and transient connection failures. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PostgresPlayers } = require('../server/repositories/postgres-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const { toEnvelope, shouldLogApiError } = require('../server/errors.js');
const OWNER = '11111111-1111-4111-8111-111111111111';
function fixture(sqlState, { rejectConnect = false, nested = false } = {}) {
  const cause = Object.assign(new Error('simulated PostgreSQL failure'), { code: sqlState });
  const err = nested ? Object.assign(new Error('Postgres driver exception'), { cause }) : cause;
  const pool = { async connect() {
    if (rejectConnect) throw err;
    return { async queryObject() { throw err; }, release() {} };
  }};
  const repo = new PostgresPlayers({ pool });
  let onErrorCalls = 0;
  const svc = new PlayerService({ repository: repo, onError() { onErrorCalls++; } });
  return { svc, get onErrorCalls() { return onErrorCalls; } };
}

for (const code of ['55P03', '57014', '08006']) {
  test('B2: PostgreSQL SQLSTATE ' + code + ' through PlayerService produces retryable 503, without INTERNAL', async () => {
    const f = fixture(code, { rejectConnect: code === '08006', nested: code === '57014' });
    let thrown;
    try { await f.svc.bootstrap(OWNER); } catch (err) { thrown = err; }
    assert.ok(thrown, 'repository error must propagate');
    const { status, body } = toEnvelope(thrown, 'pg-err-123');
    assert.equal(status, 503, code + ' must not become INTERNAL 500');
    assert.equal(body.error.code, 'MAINTENANCE');
    assert.equal(body.error.retryable, true);
    assert.equal(body.error.details.retryAfterMs, 1000);
    assert.equal(f.onErrorCalls, 0, 'expected DB contention must not reach PlayerService.onError');
    assert.equal(typeof shouldLogApiError, 'function');
    if (code === '55P03' || code === '57014')
      assert.equal(shouldLogApiError(thrown, status), false, 'routine lock/statement timeout must not count toward Edge api_error log quota');
  });
}
test('B2: unexpected PostgreSQL code stays INTERNAL and remains loggable', async () => {
  const f = fixture('22000');
  let thrown;
  try { await f.svc.bootstrap(OWNER); } catch (err) { thrown = err; }
  assert.ok(thrown);
  const { status, body } = toEnvelope(thrown, 'pg-unexpected');
  assert.equal(status, 500);
  assert.equal(body.error.code, 'INTERNAL');
  assert.equal(typeof shouldLogApiError, 'function');
  assert.equal(shouldLogApiError(thrown, status), true);
});

// SQLSTATE 40P01 (deadlock) và 40001 (serialization failure) cũng retryable.
for (const code of ['40P01', '40001']) {
  test('B2: PostgreSQL ' + code + ' is retried and excluded from per-request api_error logging', async () => {
    const f = fixture(code);
    let thrown;
    try { await f.svc.bootstrap(OWNER); } catch (err) { thrown = err; }
    const { status, body } = toEnvelope(thrown, 'pg-conflict');
    assert.equal(status, 503);
    assert.equal(body.error.code, 'MAINTENANCE');
    assert.equal(body.error.retryable, true);
    assert.equal(body.error.details.retryAfterMs, 1000);
    assert.equal(f.onErrorCalls, 0);
    assert.equal(shouldLogApiError(thrown, status), false);
  });
}
