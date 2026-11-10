/* RemoteSession: không mất/nhân đôi Thiên Tinh khi mạng mất sau commit. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../client/session/remote-session.js'), 'utf8');

function fixture({ lostReply = false, conflict = false } = {}) {
  const calls = [], seen = new Set();
  let balance = 10, version = 0, loss = lostReply, id = 0, spent = 0;
  const pavilion = () => ({ version, balance, totalEarned: 10, rebirths: 0, upgrades: { ngoTinh: spent }, relics: {} });
  const ok = out => ({ ok: true, status: 200, json: async () => out });
  const root = {
    URL, AbortSignal, location: { protocol: 'https:' },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++id).padStart(12, '0') },
    setTimeout: resolve => resolve(),
    HU_GAME: { VERSION: 9, Game: class { constructor(state) { this.s = state; } }, create: () => ({ created: false, settings: {} }) },
    HU_COMMANDS: { VERSION: 2, validate: input => input },
    HU_SUPABASE: { accessToken: async () => 'test-token' },
    fetch: async (url, init) => {
      const path = url.replace('/api/v1', '');
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ path, body });
      if (path === '/bootstrap') return ok({ protocolVersion: 2, schemaVersion: 9, contentVersion: 'test', player: null, pavilion: pavilion() });
      if (path === '/creation/preview') return ok({ ticketId: 'ticket', preview: { age: 18, race: 'nhan' } });
      if (path === '/pavilion/purchase') {
        if (conflict) {
          conflict = false;
          version++;
          return { ok: false, status: 409, json: async () => ({ error: { code: 'PAVILION_CONFLICT', message: 'Đã đổi phiên bản.' } }) };
        }
        if (!seen.has(body.requestId)) {
          assert.equal(body.expectedVersion, version, 'phiên bản kho phải cập nhật theo lượt mua trước');
          assert.equal(body.kind, 'upgrade');
          assert.equal(body.key, 'ngoTinh');
          assert.equal(Object.hasOwn(body, 'price'), false, 'không gửi giá');
          seen.add(body.requestId);
          version++; balance -= 2; spent++;
        }
        if (loss) { loss = false; throw Error('Đã commit nhưng thất lạc phản hồi.'); }
        return ok({ protocolVersion: 2, schemaVersion: 9, contentVersion: 'test', pavilion: pavilion(), replayed: seen.has(body.requestId),
          result: { key: 'ngoTinh', cost: 2 } });
      }
      throw Error('API ngoài dự kiến: ' + path);
    }
  };
  root.window = root;
  vm.runInNewContext(source, root, { filename: 'remote-session.js' });
  const session = new root.HU_REMOTE_SESSION.RemoteSession();
  return { session, calls, get spent() { return spent; }, get balance() { return balance; }, get version() { return version; } };
}

test('mất phản hồi sau khi trừ Thiên Tinh: retry đúng requestId, không trừ lần hai', async () => {
  const f = fixture({ lostReply: true });
  await f.session.connect({ id: 'a' });
  const done = await f.session.pavilionPurchase('upgrade', 'ngoTinh');
  assert.equal(done.cost, 2);
  assert.equal(f.balance, 8);
  assert.equal(f.spent, 1);
  assert.equal(f.session.pavilion.version, 1);
  const calls = f.calls.filter(c => c.path === '/pavilion/purchase');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.requestId, calls[1].body.requestId);
  assert.equal(calls[0].body.expectedVersion, calls[1].body.expectedVersion);
});

test('hai lượt mua xếp hàng và dùng expectedVersion tăng tuần tự', async () => {
  const f = fixture();
  await f.session.connect({ id: 'a' });
  await Promise.all([f.session.pavilionPurchase('upgrade', 'ngoTinh'), f.session.pavilionPurchase('upgrade', 'ngoTinh')]);
  assert.equal(f.balance, 6);
  assert.equal(f.spent, 2);
  const calls = f.calls.filter(c => c.path === '/pavilion/purchase');
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].body.requestId, calls[1].body.requestId);
  assert.equal(calls[0].body.expectedVersion, 0);
  assert.equal(calls[1].body.expectedVersion, 1);
});

test('mua xung đột giữa hai tab: chỉ đồng bộ bootstrap, không tự mua lại', async () => {
  const f = fixture({ conflict: true });
  await f.session.connect({ id: 'a' });
  await assert.rejects(f.session.pavilionPurchase('upgrade', 'ngoTinh'), /phiên khác/);
  assert.equal(f.spent, 0);
  assert.equal(f.session.pavilion.version, 1);
  assert.equal(f.calls.filter(c => c.path === '/pavilion/purchase').length, 1);
});
