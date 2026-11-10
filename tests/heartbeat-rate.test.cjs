/* Hồi quy heartbeat thật: đồng hồ giả, limiter và PlayerService chung một nhịp online. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter, LIMITS } = require('../server/http/rate-limit.js');
const { PlayerService } = require('../server/services/player-service.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');

const { onlineGrace, HEARTBEAT } = require('../server/heartbeat-policy.js');
const T0 = 1_800_000_000_000;
test('HU_ONLINE_GRACE_MS không được rút xuống dưới ba nhịp sync', () => {
  assert.equal(onlineGrace(), HEARTBEAT.onlineGraceMs);
  assert.equal(onlineGrace('20000'), 20000);
  for (const invalid of ['0','-1','14999','nan','1000.5'])
    assert.throws(() => onlineGrace(invalid), /HU_ONLINE_GRACE_MS/);
  assert.equal(onlineGrace('15000'), 15000);
});
function simulate(intervals) {
  const clock = { now: T0 };
  const limiter = new RateLimiter({ clock: () => clock.now });
  const repo = new SqlitePlayers(':memory:');
  const service = new PlayerService({
    repository: repo, clock: () => clock.now, contentVersion: 'heartbeat-test'
  });
  const owner = 'owner', pv = service.previewCreation(owner);
  const { playerId } = service.createPlayer(owner, {
    ticketId: pv.ticketId, name: 'Thử Đồng Bộ', gender: 'nam',
    talent: { ngoTinh: 8 }, destiny: 'exp'
  });
  let denied = 0, offline = 0, accepted = 0, maximumGap = 0, lastOk = clock.now;
  try {
    for (const ms of intervals) {
      clock.now += ms;
      const ip = limiter.take('ip:127.0.0.1', LIMITS.ip);
      assert.ok(ip.ok, 'một người online ổn định không bị IP bucket chặn');
      const result = limiter.take('sync:' + owner, LIMITS.sync);
      if (!result.ok) { denied++; continue; }
      maximumGap = Math.max(maximumGap, clock.now - lastOk);
      lastOk = clock.now;
      accepted++;
      const report = service.sync(owner, playerId, {}).report;
      if (report?.seconds === 0) offline++;
    }
    return { denied, offline, accepted, maximumGap, grace: service.cfg.onlineGraceMs,
      heartbeat: service.cfg.nextSyncInMs };
  } finally { repo.close(); }
}

test('10 phút idle đồng bộ đúng 5s không bị 429 hoặc rơi vào offline grace', () => {
  const trace = simulate(Array(120).fill(5000));
  assert.deepEqual({ denied: trace.denied, offline: trace.offline }, { denied: 0, offline: 0 },
    JSON.stringify(trace));
  assert.equal(trace.accepted, 120);
  assert.ok(trace.grace >= trace.heartbeat * 3, 'grace phải >= 3 lần nhịp heartbeat');
});

test('10 phút đồng bộ với jitter mạng ±30% vẫn không bị throttle hoặc offline', () => {
  const jitter = Array.from({ length: 120 }, (_, i) => i % 2 ? 6500 : 3500);
  const trace = simulate(jitter);
  assert.equal(trace.denied, 0, JSON.stringify(trace));
  assert.equal(trace.offline, 0, JSON.stringify(trace));
  assert.ok(trace.maximumGap < trace.grace, JSON.stringify(trace));
});

test('pause dùng bucket độc lập và không làm mất lượt sync', () => {
  const clock = { now: T0 };
  const lim = new RateLimiter({ clock: () => clock.now });
  for (let i = 0; i < LIMITS.sync.capacity; i++)
    assert.equal(lim.take('sync:user', LIMITS.sync).ok, true);
  assert.equal(lim.take('sync:user', LIMITS.sync).ok, false);
  assert.equal(lim.take('pause:user', LIMITS.pause).ok, true,
    'pause phải hoạt động ngay cả khi sync đang bị hạn chế');
});
