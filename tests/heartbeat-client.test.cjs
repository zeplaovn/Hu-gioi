/* Nhịp retry 429: trình duyệt không tự đè thời gian Retry-After. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { HEARTBEAT } = require('../server/heartbeat-policy.js');

test('FE hoãn heartbeat theo Retry-After 429, kể cả gọi force', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../client/session/remote-session.js'), 'utf8');
  let now = 1_800_000_000_000, syncCalls = 0;
  const state = { created: true, name: 'Đạo Hữu', settings: {} };
  const success = out => ({ ok: true, status: 200, json: async () => out });
  const w = {
    AbortSignal, URL, location: { protocol: 'https:' },
    HU_PUBLIC_CONFIG: { apiUrl: path => path },
    HU_GAME: { VERSION: 9, create: () => ({ created: false, settings: {} }), Game: class { constructor(s) { this.s = s; } } },
    HU_COMMANDS: { VERSION: 2 }, HU_SUPABASE: { accessToken: async () => 'token' },
    fetch: async url => {
      if (url === '/api/v1/bootstrap') return success({
        protocolVersion: 2, schemaVersion: 9, contentVersion: 'test', player: { id: 'player' }
      });
      if (url.endsWith('/sync')) {
        syncCalls++;
        if (syncCalls === 2) return {
          ok: false, status: 429, headers: { get: name => name === 'retry-after' ? '30' : null },
          json: async () => ({ error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu.' } })
        };
        return success({
          protocolVersion: 2, schemaVersion: 9, contentVersion: 'test',
          revision: syncCalls, state, nextSyncInMs: HEARTBEAT.nextSyncInMs
        });
      }
      throw Error('Unexpected request ' + url);
    }
  };
  w.window = w;
  vm.runInNewContext(source, w);
  const session = new w.HU_REMOTE_SESSION.RemoteSession({ clock: () => now });
  await session.connect({ id: 'account' });
  assert.equal(syncCalls, 1);
  now += HEARTBEAT.nextSyncInMs;
  await assert.rejects(session.synchronize(), /Quá nhiều/);
  assert.equal(syncCalls, 2);
  for (let i = 0; i < 5; i++) {
    now += HEARTBEAT.nextSyncInMs;
    assert.equal(await session.synchronize(true), null);
  }
  assert.equal(syncCalls, 2, 'không được gửi request mới trong 30 giây Retry-After');
  now += HEARTBEAT.nextSyncInMs;
  await session.synchronize();
  assert.equal(syncCalls, 3);
});
