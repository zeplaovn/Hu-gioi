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

function fixture({ initialPlayer = false, bootstrap = null } = {}) {
  let count = 0, applied = 0, issued = 0;
  let state = { created: true, name: 'Vân Tiêu', qi: 10, lastUpdate: 10000, logs: [], settings: {} };
  let revision = 0, playerId = initialPlayer ? PLAYER : null;
  let dailyClaimed = false, checkedIn = false, mailClaimed = false;
  const calls = [];
  const dailyView = () => ({
    day: '2027-01-15', playerId,
    quests: [{ id: 'kill', name: 'Trừ yêu hộ đạo', desc: 'Hạ yêu thú.', counter: 'kill', unit: 'yêu thú', target: 1, progress: 1, ready: !dailyClaimed, claimed: dailyClaimed, reward: { stone: 80, item: 'PILL-002', itemName: 'Tụ Khí Đan', qty: 1 }, go: 'combat' }],
    total: 1, claimable: dailyClaimed ? 0 : 1,
    checkin: { streak: checkedIn ? 1 : 0, lastDay: checkedIn ? '2027-01-15' : null, today: '2027-01-15', checkedToday: checkedIn, canCheckIn: !checkedIn, nextStreak: 1, rewards: [] }
  });
  const mailView = () => ({
    items: [{ id: 'mail-1', kind: 'system', title: 'Chào mừng', body: 'Quà nhập môn.', attachments: { stone: 100, items: [] }, hasAttachments: true, createdAt: 1000, expiresAt: null, claimedAt: mailClaimed ? 10000 : null, expired: false, claimable: !mailClaimed }],
    total: 1, unread: mailClaimed ? 0 : 1, claimable: mailClaimed ? 0 : 1
  });
  const account = extra => ({
    protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', serverTime: 10000, resetAt: 20000,
    revision, state, ...extra
  });
  class Game { constructor(s) { this.s = s; } }
  const context = {
    URL, AbortSignal, setTimeout, clearTimeout,
    HU_GAME: { Game, create: () => ({ created: false, settings: {} }), VERSION: 10 },
    HU_COMMANDS: { VERSION: 4, validate: c => c },
    HU_SUPABASE: { accessToken: async () => 'token' },
    location: { protocol: 'https:' },
    crypto: { randomUUID: () => 'request-' + (++issued) },
    fetch: async (url, init) => {
      const path = url.replace('/api/v1', '');
      calls.push({ path, body: init.body ? JSON.parse(init.body) : null });
      let out;
      if (path === '/bootstrap') out = bootstrap || { protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', player: playerId ? { id: playerId } : null };
      else if (path === '/creation/preview') out = { ticketId: 'ticket-' + ++count, preview: { age: 18, race: 'nhan', roots: [77,20,20,20,20], rootType: 'Thiên', rootSub: '' } };
      else if (path === '/players') {
        playerId = PLAYER; out = { playerId, protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision: 0, state };
      } else if (path.endsWith('/delete-character')) {
        playerId = null; revision = 0;
        state = { created: true, name: 'Vân Tiêu', qi: 10, lastUpdate: 10000, logs: [], settings: {} };
        out = { deleted: true, pavilion: { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} } };
      } else if (path.endsWith('/sync')) {
        out = { protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision, state, report: null };
      } else if (path.endsWith('/commands')) {
        const body = JSON.parse(init.body);
        assert.equal(body.protocolVersion, 4);
        assert.equal(body.expectedRevision, revision);
        assert.equal(body.requestId, 'request-' + issued);
        revision++; applied++; state = { ...state, qi: state.qi + 3 };
        out = { protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision, state, result: 3 };
      } else if (path.endsWith('/state')) out = { protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision, state };
      else if (path === '/daily') out = account({ daily: dailyView(), mail: { total: 1, unread: mailClaimed ? 0 : 1, claimable: mailClaimed ? 0 : 1 } });
      else if (path === '/mail') out = account({ daily: dailyView(), mail: mailView() });
      else if (path === '/daily/claim') {
        dailyClaimed = true; revision++; state = { ...state, stone: state.stone + 80 };
        out = account({ daily: dailyView(), mail: { total: 1, unread: mailClaimed ? 0 : 1, claimable: mailClaimed ? 0 : 1 },
          result: { questId: 'kill', reward: { stone: 80, item: 'PILL-002', itemName: 'Tụ Khí Đan', qty: 1 } } });
      } else if (path === '/daily/checkin') {
        checkedIn = true; revision++; state = { ...state, stone: state.stone + 50 };
        out = account({ daily: dailyView(), mail: { total: 1, unread: mailClaimed ? 0 : 1, claimable: mailClaimed ? 0 : 1 },
          result: { day: 1, streak: 1, reward: { stone: 50, item: null, itemName: null, qty: 0 } } });
      } else if (path === '/mail/claim') {
        mailClaimed = true; revision++; state = { ...state, stone: state.stone + 100 };
        out = account({ daily: dailyView(), mail: mailView(),
          result: { mailId: 'mail-1', attachments: { stone: 100, items: [] } } });
      }
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
  assert.deepEqual(Object.keys(f.calls.find(x => x.path === '/players').body).sort(), ['gender','name','talent','ticketId']);
  assert.equal(f.session.game.s.qi, 10);
});

test('RemoteSession phân biệt client cũ với máy chủ chưa triển khai bản mới', async () => {
  const old = fixture({ bootstrap: { protocolVersion: 2, schemaVersion: 9, contentVersion: 'old', player: null } });
  await assert.rejects(old.session.connect(ACCOUNT), error => {
    assert.equal(error.code, 'SERVER_OUTDATED');
    assert.match(error.message, /Máy chủ game đang được cập nhật/);
    assert.equal(error.details.client.protocolVersion, 4);
    assert.equal(error.details.client.schemaVersion, 10);
    assert.equal(error.details.server.protocolVersion, 2);
    assert.equal(error.details.server.schemaVersion, 9);
    return true;
  });
  const newer = fixture({ bootstrap: { protocolVersion: 5, schemaVersion: 11, contentVersion: 'new', player: null } });
  await assert.rejects(newer.session.connect(ACCOUNT), error => {
    assert.equal(error.code, 'CLIENT_OUTDATED');
    assert.match(error.message, /tải lại trang/);
    return true;
  });
});

test('RemoteSession báo lệch nội dung và snapshot thiếu trạng thái bằng thông báo riêng', async () => {
  const f = fixture({ initialPlayer: true });
  await f.session.connect(ACCOUNT);
  assert.throws(() => f.session.apply({
    protocolVersion: 4, schemaVersion: 10, contentVersion: 'khac', revision: 1,
    state: { created: true, name: 'Vân Tiêu', settings: {} }
  }), { code: 'CONTENT_VERSION_MISMATCH' });
  assert.throws(() => f.session.apply({
    protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision: 1,
    state: { created: false, settings: {} }
  }), /Chưa thể tải tiến trình/);
});

test('xóa nhân vật đặt lại revision để nhân vật mới revision 0 được áp dụng', async () => {
  const f = fixture({ initialPlayer: true });
  await f.session.connect(ACCOUNT);
  await f.session.dispatch('absorb', { index: 0 });
  assert.equal(f.session.revision, 1);
  assert.equal(f.session.game.s.qi, 13);
  const events = [];
  f.session.subscribe(e => events.push(e.type));
  await f.session.deleteCharacter();
  assert.equal(f.session.playerId, null);
  assert.equal(f.session.revision, 0);
  assert.equal(f.session.game.s.created, false);
  assert.equal(f.session.paused, false);
  assert.ok(events.includes('reset'));
  // Không tải lại trang: phiên phải tạo được nhân vật mới thay vì giữ snapshot cũ.
  await f.session.previewCreation();
  await f.session.create({ name: 'Tân Tiêu', gender: 'nam', talent: { canCot: 1 }, destiny: 'exp' });
  assert.equal(f.session.revision, 0);
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
    return { protocolVersion: 4, schemaVersion: 10, contentVersion: 'content', revision: 0,
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
  const data=(revision,realm,stage)=>({protocolVersion:4,schemaVersion:10,contentVersion:'content',revision,state:{created:true,realm,stage,name:'Vân Tiêu',settings:{}}});
  f.session.apply(data(1,0,1)); f.session.apply(data(2,0,2)); f.session.apply(data(2,0,2)); f.session.apply(data(3,1,1));
  assert.equal(events.filter(x=>x==='minorBreakthrough').length,1);
});


test('thử lại khi đồng bộ sau khi mở tab gặp lỗi tạm thời', async () => {
  const f=fixture({initialPlayer:true}); await f.session.connect(ACCOUNT);
  f.session.paused=true;let calls=0;
  f.session.request=async()=>{calls++;if(calls===1)throw Object.assign(Error('offline'),{code:'NETWORK_UNAVAILABLE'});return {protocolVersion:4,schemaVersion:10,contentVersion:'content',revision:0,state:{created:true,settings:{}}};};
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

test('RemoteSession tải nhiệm vụ ngày, điểm danh và thư qua route riêng', async () => {
  const f = fixture({ initialPlayer: true });
  await f.session.connect(ACCOUNT);
  const daily = await f.session.loadDaily();
  assert.equal(daily.quests.length, 1);
  assert.equal(f.session.daily.claimable, 1);
  assert.equal(f.session.mailClaimable, 1);
  assert.equal(f.session.dailyResetAt, 20000);

  const claim = await f.session.claimDailyQuest('kill');
  assert.equal(claim.questId, 'kill');
  assert.equal(f.session.daily.quests[0].claimed, true);
  assert.equal(f.session.daily.claimable, 0);

  const checkin = await f.session.checkIn();
  assert.equal(checkin.day, 1);
  assert.equal(f.session.daily.checkin.checkedToday, true);

  const mail = await f.session.loadMail(true);
  assert.equal(mail.items.length, 1);
  const claimed = await f.session.claimMail('mail-1');
  assert.equal(claimed.mailId, 'mail-1');
  assert.equal(f.session.mail.items[0].claimedAt, 10000);
  assert.equal(f.session.mailClaimable, 0);

  f.session.disconnect();
  assert.equal(f.session.daily, null);
  assert.equal(f.session.mail, null);
  assert.equal(f.session.dailyResetAt, 0);
  assert.equal(f.session.mailClaimable, 0);
});
