/* Contract regression: browser RemoteSession never alters state except from API snapshots. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { HEARTBEAT } = require('../server/heartbeat-policy.js');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../client/session/remote-session.js'), 'utf8');
const configSource = readFileSync(join(__dirname, '../client/config.js'), 'utf8');
const PLAYER = '12345678-1234-4234-8234-555555555555';
const ACCOUNT = { id: '88888888-2222-4333-8444-555555555555', email: 'user@example.test' };

function fixture({ initialPlayer = false } = {}) {
  let count = 0, applied = 0, issued = 0;
  let state = { created: true, name: 'Vân Tiêu', qi: 10, lastUpdate: 10000, logs: [], settings: {} };
  let revision = 0, playerId = initialPlayer ? PLAYER : null;
  const calls = [];
  class Game { constructor(s) { this.s = s; } }
  const context = {
    URL, AbortSignal,
    HU_GAME: { Game, create: () => ({ created: false, settings: {} }), VERSION: 9 },
    HU_COMMANDS: { VERSION: 2, validate: c => c },
    HU_SUPABASE: { accessToken: async () => 'token' },
    location: { protocol: 'https:' },
    crypto: { randomUUID: () => 'request-' + (++issued) },
    fetch: async (url, init) => {
      const path = url.replace('/api/v1', '');
      calls.push({ path, body: init.body ? JSON.parse(init.body) : null });
      let out;
      if (path === '/bootstrap') out = { protocolVersion: 2, schemaVersion: 9, contentVersion: 'content', player: playerId ? { id: playerId } : null };
      else if (path === '/creation/preview') out = { ticketId: 'ticket-' + ++count, preview: { age: 18, race: 'nhan', roots: [77,20,20,20,20], rootType: 'Thiên', rootSub: '' } };
      else if (path === '/players') {
        playerId = PLAYER; out = { playerId, protocolVersion: 2, schemaVersion: 9, contentVersion: 'content', revision: 0, state };
      } else if (path.endsWith('/sync')) {
        out = { protocolVersion: 2, schemaVersion: 9, contentVersion: 'content', revision, state, report: null };
      } else if (path.endsWith('/commands')) {
        const body = JSON.parse(init.body);
        assert.equal(body.protocolVersion, 2);
        assert.equal(body.expectedRevision, revision);
        assert.equal(body.requestId, 'request-' + issued);
        revision++; applied++; state = { ...state, qi: state.qi + 3 };
        out = { protocolVersion: 2, schemaVersion: 9, contentVersion: 'content', revision, state, result: 3 };
      } else if (path.endsWith('/state')) out = { protocolVersion: 2, schemaVersion: 9, contentVersion: 'content', revision, state };
      else throw Error('Unexpected API ' + path);
      out.nextSyncInMs = HEARTBEAT.nextSyncInMs;
      return { ok: true, status: 200, json: async () => out };
    }
  };
  context.window = context;
  vm.runInNewContext(configSource, context, { filename: 'config.js' });
  vm.runInNewContext(source, context, { filename: 'remote-session.js' });
  return { session: new context.HU_REMOTE_SESSION.RemoteSession(), calls, get applied() { return applied; } };
}

test('RemoteSession requires Supabase, server preview and creates player from ticket only', async () => {
  const f = fixture();
  await assert.rejects(() => f.session.connect(null), /đăng nhập/);
  assert.equal(await f.session.connect(ACCOUNT), null);
  assert.equal(f.session.ready, false);
  assert.equal(f.session.ticket.ticketId, 'ticket-1');
  await f.session.create({ name: 'Vân Tiêu', gender: 'nam', talent: { canCot: 2 }, destiny: 'exp' });
  assert.equal(f.session.ready, true);
  assert.equal(f.session.playerId, PLAYER);
  assert.deepEqual(Object.keys(f.calls.find(x => x.path === '/players').body).sort(), ['destiny','gender','name','talent','ticketId']);
  assert.equal(f.session.game.s.qi, 10);
});

test('RemoteSession serializes commands with current revision and reads only server snapshots', async () => {
  const f = fixture({ initialPlayer: true });
  await f.session.connect(ACCOUNT);
  const [first, second] = await Promise.all([
    f.session.dispatch('absorb', { index: 0 }), f.session.dispatch('absorb', { index: 0 })
  ]);
  assert.equal(first, 3);
  assert.equal(second, 3);
  assert.equal(f.applied, 2);
  assert.equal(f.session.revision, 2);
  assert.equal(f.session.game.s.qi, 16);
  assert.equal(f.calls.filter(x => x.path.endsWith('/commands')).length, 2);
  f.session.disconnect();
  assert.equal(f.session.ready, false);
});
