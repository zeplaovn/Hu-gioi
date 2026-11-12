/* Contract regression: browser RemoteSession never alters state except from API snapshots. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../client/session/remote-session.js'), 'utf8');
const PLAYER = '12345678-1234-4234-8234-555555555555';
const ACCOUNT = { id: '88888888-2222-4333-8444-555555555555', email: 'user@example.test' };

function fixture({ initialPlayer = false } = {}) {
  let count = 0, applied = 0, issued = 0;
  let state = { created: true, name: 'Vân Tiêu', qi: 10, lastUpdate: 10000, logs: [], settings: {} };
  let revision = 0, playerId = initialPlayer ? PLAYER : null;
  const calls = [];
  class Game { constructor(s) { this.s = s; } }
  const context = {
    URL, AbortSignal, setTimeout, clearTimeout,
    HU_GAME: { Game, create: () => ({ created: false, settings: {} }), VERSION: 10 },
    HU_COMMANDS: { VERSION: 3, validate: c => c },
    HU_SUPABASE: { accessToken: async () => 'token' },
    location: { protocol: 'https:' },
    crypto: { randomUUID: () => 'request-' + (++issued) },
    fetch: async (url, init) => {
      const path = url.replace('/api/v1', '');
      calls.push({ path, body: init.body ? JSON.parse(init.body) : null });
      let out;
      if (path === '/bootstrap') out = { protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', player: playerId ? { id: playerId } : null };
      else if (path === '/creation/preview') out = { ticketId: 'ticket-' + ++count, preview: { age: 18, race: 'nhan', roots: [77,20,20,20,20], rootType: 'Thiên', rootSub: '' } };
      else if (path === '/players') {
        playerId = PLAYER; out = { playerId, protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', revision: 0, state };
      } else if (path.endsWith('/sync')) {
        out = { protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', revision, state, report: null };
      } else if (path.endsWith('/commands')) {
        const body = JSON.parse(init.body);
        assert.equal(body.protocolVersion, 3);
        assert.equal(body.expectedRevision, revision);
        assert.equal(body.requestId, 'request-' + issued);
        revision++; applied++; state = { ...state, qi: state.qi + 3 };
        out = { protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', revision, state, result: 3 };
      } else if (path.endsWith('/state')) out = { protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', revision, state };
      else throw Error('Unexpected API ' + path);
      return { ok: true, status: 200, json: async () => out };
    }
  };
  context.window = context;
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

test('RemoteSession hoãn heartbeat theo retryAfterMs khi server trả 429', async () => {
  const f = fixture({ initialPlayer: true });
  let now = 0, attempts = 0;
  f.session.clock = () => now;
  await f.session.connect(ACCOUNT);
  f.session.nextSyncInMs = 5000;
  f.session.request = async () => {
    attempts++;
    if (attempts === 1) throw Object.assign(Error('rate limited'), { status: 429, retryAfterMs: 20000 });
    return { protocolVersion: 3, schemaVersion: 10, contentVersion: 'content', revision: 0,
      state: { created: true, name: 'Vân Tiêu', settings: {} }, nextSyncInMs: 5000 };
  };
  now = 5000;
  await assert.rejects(f.session.synchronize(), { status: 429 });
  now = 10000;
  assert.equal(await f.session.synchronize(), null);
  assert.equal(attempts, 1);
  now = 25000;
  await f.session.synchronize();
  assert.equal(attempts, 2);
  assert.equal(f.session.nextSyncInMs, 5000);
});

test('hiệu ứng tiểu cảnh chỉ phát khi snapshot tăng tầng trong cùng cảnh giới', async () => {
  const f=fixture({initialPlayer:true}); await f.session.connect(ACCOUNT);
  const events=[];f.session.subscribe(e=>events.push(e.type));
  const data=(revision,realm,stage)=>({protocolVersion:3,schemaVersion:10,contentVersion:'content',revision,state:{created:true,realm,stage,name:'Vân Tiêu',settings:{}}});
  f.session.apply(data(1,0,1)); f.session.apply(data(2,0,2)); f.session.apply(data(2,0,2)); f.session.apply(data(3,1,1));
  assert.equal(events.filter(x=>x==='minorBreakthrough').length,1);
});


test('thử lại khi đồng bộ sau khi mở tab gặp lỗi tạm thời', async () => {
  const f=fixture({initialPlayer:true}); await f.session.connect(ACCOUNT);
  f.session.paused=true;let calls=0;
  f.session.request=async()=>{calls++;if(calls===1)throw Object.assign(Error('offline'),{code:'NETWORK_UNAVAILABLE'});return {protocolVersion:3,schemaVersion:10,contentVersion:'content',revision:0,state:{created:true,settings:{}}};};
  await assert.rejects(f.session.synchronize(true),/offline/);
  assert.notEqual(f.session.resumeTimer,null);
  await new Promise(resolve=>setTimeout(resolve,3200));
  assert.equal(calls,2);assert.equal(f.session.paused,false);f.session.disconnect();
});

test('dự đoán tu vi chỉ hiển thị, dừng khi bận và không vượt giới hạn', async () => {
  const f=fixture({initialPlayer:true});await f.session.connect(ACCOUNT);let now=100000;f.session.clock=()=>now;
  const s={created:true,qi:10,lastUpdate:100000,craftQueue:[],dungeon:{},settings:{}};
  f.session.game={s,isDead:()=>false,lifeInfo:()=>({seconds:60}),need:()=>20,integrateRate:(a,b)=>(b-a)/1000};
  f.session.predictable=true;f.session.nextSyncInMs=20000;f.session.serverOffset=0;
  now+=5000;assert.equal(f.session.displayQi(),15);assert.equal(s.qi,10);
  s.craftQueue.push({});assert.equal(f.session.displayQi(),10);s.craftQueue=[];
  s.dungeon.active={};assert.equal(f.session.displayQi(),10);s.dungeon={};
  now+=50000;assert.equal(f.session.displayQi(),20);
  f.session.paused=true;assert.equal(f.session.displayQi(),10);f.session.disconnect();
});

test('đồng bộ một lần mỗi revision và cho thử lại khi lỗi', async () => {
 const f=fixture({initialPlayer:true});await f.session.connect(ACCOUNT);let n=0;f.session.clock=()=>100000;f.session.lastSyncAttempt=0;
 f.session.synchronize=async()=>{n++;if(n===1)throw Error('network');return null;};
 await assert.rejects(f.session.syncOnce(),/network/);await f.session.syncOnce();assert.equal(n,2);assert.equal(f.session.syncOnce(),null);
 f.session.revision++;await f.session.syncOnce();assert.equal(n,3);f.session.disconnect();
});
