/* Edge: cấu hình URL, header và heartbeat giảm khi có lệnh. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../client/session/remote-session.js'), 'utf8');
test('RemoteSession Edge: dùng HU_API_BASE + apikey + Bearer; bootstrap snapshot không sync lần hai', async () => {
  const player = '12345678-1234-4234-8234-555555555555';
  const state = { created: true, qi: 1, logs: [], lastUpdate: 1000 };
  const calls = [];
  const base = 'https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api';
  const w = {
    HU_API_BASE: base, HU_GAME: { VERSION: 9, Game: class { constructor(s) { this.s = s; } }, create: () => ({ created: false }) },
    HU_COMMANDS: { VERSION: 2, validate: v => v },
    HU_SUPABASE: { publishableKey: 'sb_publishable_test', accessToken: async () => 'access' },
    location: { protocol: 'https:' }, document: { hidden: false }, crypto: { randomUUID: () => 'command-0001' },
    fetch: async (url, init) => {
      calls.push({ url, init });
      const suffix = url.slice(base.length);
      if (suffix === '/bootstrap') return { ok: true, status: 200, json: async () => ({
        player: { id: player }, protocolVersion: 2, schemaVersion: 9, contentVersion: 'hash',
        nextSyncInMs: 20000, snapshot: { state, revision: 0, protocolVersion: 2, schemaVersion: 9, contentVersion: 'hash' }
      }) };
      if (suffix.endsWith('/commands')) return { ok: true, status: 200, json: async () => ({
        state: { ...state, qi: 2 }, revision: 1, protocolVersion: 2, schemaVersion: 9, contentVersion: 'hash'
      }) };
      throw Error('Không mong đợi route ' + suffix);
    },
    AbortSignal, Set, Date, Promise
  };
  w.window = w;
  vm.runInNewContext(source, w);
  const client = new w.HU_REMOTE_SESSION.RemoteSession();
  await client.connect({ id: 'owner' });
  assert.equal(calls.length, 1, 'bootstrap gồm snapshot nên không sync');
  assert.equal(calls[0].url, base + '/bootstrap');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer access');
  assert.equal(calls[0].init.headers.apikey, 'sb_publishable_test');
  await client.dispatch('absorb', { index: 0 });
  assert.equal(calls.length, 2);
  assert.equal(await client.synchronize(), null, 'lệnh thành công hoãn heartbeat');
  w.document.hidden = true;
  assert.equal(await client.synchronize(true), null, 'tab ẩn không sync');
});
