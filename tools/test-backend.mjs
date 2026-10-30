/* Test backend: service (idempotency, revision, hoàn tác, đồng hồ), outbox, xác thực, API qua HTTP thật, giới hạn tốc độ. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { makeFakeEngine } from './lib/fake-engine.mjs';
import { repositoryContract } from './lib/repository-contract.mjs';

const require = createRequire(import.meta.url);
const { MemoryPlayerRepository } = require('../server/repositories/memory-player-repository.js');
const { PlayerService } = require('../server/services/player-service.js');
const { OutboxWorker } = require('../server/workers/outbox-worker.js');
const { TokenBucketLimiter } = require('../server/http/rate-limit.js');
const { SessionStore } = require('../server/auth/sessions.js');
const { AccountStore } = require('../server/auth/accounts.js');
const { hashPassword, verifyPassword, needsRehash } = require('../server/auth/passwords.js');
const { createApp } = require('../server/app.js');
const { loadConfig } = require('../server/config.js');
const { stableStringify, redact } = require('../server/lib/util.js');
const { silentLogger } = require('../server/lib/logger.js');

// ---------- hợp đồng repository ----------
repositoryContract((name, fn) => test('MemoryPlayerRepository · ' + name, fn), () => new MemoryPlayerRepository());

// ---------- PlayerService ----------
const REQ = n => 'req-' + String(n).padStart(8, '0');
function setup(opts = {}) {
  const t = { now: 1_000_000 };
  const fake = makeFakeEngine(opts);
  const repository = new MemoryPlayerRepository({ now: () => t.now });
  const service = new PlayerService({ repository, engine: fake.engine, protocol: fake.protocol, clock: () => t.now, rng: () => 0.5 });
  return { t, repository, service };
}
const cmd = (n, rev, type, payload) => ({ requestId: REQ(n), expectedRevision: rev, type, payload });

test('service: createPlayer idempotent theo requestId, requestId khác → PLAYER_EXISTS, snapshot không lộ seed', async () => {
  const { service } = setup();
  const a = await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  assert.equal(a.revision, 1); assert.equal(a.replayed, false);
  assert.equal('seed' in a.state, false, 'snapshot đã che seed');
  const b = await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  assert.equal(b.replayed, true); assert.equal(b.revision, 1);
  await assert.rejects(service.createPlayer('p1', { requestId: REQ(2), profile: { name: 'Khác' } }), { code: 'PLAYER_EXISTS' });
  await assert.rejects(service.createPlayer('p2', { requestId: 'x', profile: {} }), { code: 'BAD_REQUEST' });
});

test('service: command áp dụng, tăng revision, trả logs', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  const r = await service.command('p1', cmd(2, 1, 'earn', { amount: 7 }));
  assert.equal(r.revision, 2); assert.equal(r.replayed, false);
  assert.equal(r.state.stone, 7); assert.deepEqual(r.logs, ['nhận 7']);
});

test('service: retry cùng requestId KHÔNG cấp thưởng hai lần và trả kết quả cũ', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  const first = await service.command('p1', cmd(2, 1, 'earn', { amount: 50 }));
  const retry = await service.command('p1', cmd(2, 1, 'earn', { amount: 50 }));
  assert.equal(retry.replayed, true);
  assert.equal(retry.revision, first.revision);
  assert.equal(retry.state.stone, 50, 'không cộng lần hai');
  assert.equal((await service.sync('p1')).revision, 2);
});

test('service: retry vẫn trả bản cũ dù revision client đã lỗi thời (mạng rớt sau khi commit)', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await service.command('p1', cmd(2, 1, 'earn', { amount: 5 }));
  await service.command('p1', cmd(3, 2, 'earn', { amount: 5 }));
  const stale = await service.command('p1', cmd(2, 1, 'earn', { amount: 5 }));
  assert.equal(stale.replayed, true);
});

test('service: cùng requestId khác nội dung → IDEMPOTENCY_KEY_REUSED, không đổi state', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await service.command('p1', cmd(2, 1, 'earn', { amount: 5 }));
  await assert.rejects(service.command('p1', cmd(2, 1, 'earn', { amount: 99 })), { code: 'IDEMPOTENCY_KEY_REUSED', status: 409 });
  assert.equal((await service.sync('p1')).state.stone, 5);
});

test('service: expectedRevision lệch → REVISION_CONFLICT kèm currentRevision, không đổi gì', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await assert.rejects(service.command('p1', cmd(2, 0, 'earn', { amount: 5 })), e => e.code === 'REVISION_CONFLICT' && e.details.currentRevision === 1);
  assert.equal((await service.sync('p1')).state.stone, 0);
});

test('service: hai thiết bị gửi cùng revision đồng thời → đúng một bên thắng', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  const results = await Promise.allSettled([
    service.command('p1', cmd(10, 1, 'earn', { amount: 10 })),
    service.command('p1', cmd(11, 1, 'earn', { amount: 20 }))
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const loser = results.find(r => r.status === 'rejected').reason;
  assert.equal(loser.code, 'REVISION_CONFLICT');
  const s = await service.sync('p1');
  assert.ok([10, 20].includes(s.state.stone)); assert.equal(s.revision, 2);
});

test('service: lệnh bị từ chối không đổi state, không tăng revision, không lưu receipt (retry sau khi đủ điều kiện được)', async () => {
  const { service, repository } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await assert.rejects(service.command('p1', cmd(2, 1, 'buy')), { code: 'GAME_RULE_VIOLATION', status: 422, message: 'Không đủ linh thạch.' });
  const rec = await repository.get('p1');
  assert.equal(rec.revision, 1); assert.deepEqual(rec.receipts, {});
  await service.command('p1', cmd(3, 1, 'earn', { amount: 20 }));
  assert.equal((await service.command('p1', cmd(2, 2, 'buy'))).state.stone, 10, 'cùng requestId dùng lại được vì lần trước bị từ chối');
});

test('service: payload sai → INVALID_COMMAND 422; phong bì sai → BAD_REQUEST 400', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await assert.rejects(service.command('p1', cmd(2, 1, 'earn', { amount: 1e9 })), { code: 'INVALID_COMMAND', status: 422 });
  await assert.rejects(service.command('p1', cmd(3, 1, 'khong-co')), { code: 'INVALID_COMMAND' });
  for (const bad of [null, [], { ...cmd(4, 1, 'earn', { amount: 1 }), now: 5 }, { ...cmd(4, 1.5, 'earn', { amount: 1 }) }, { ...cmd(4, -1, 'earn', { amount: 1 }) }, { ...cmd(0, 1, 'earn', { amount: 1 }), requestId: 'ngan' }])
    await assert.rejects(service.command('p1', bad), { code: 'BAD_REQUEST', status: 400 });
});

test('service: lỗi lập trình của engine KHÔNG bị gán nhãn vi phạm luật (để thành 500, không lộ nội dung)', async () => {
  const { service } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  for (const [n, type] of [[2, 'crash'], [3, 'bug']]) {
    const err = await service.command('p1', cmd(n, 1, type)).catch(e => e);
    assert.notEqual(err.code, 'GAME_RULE_VIOLATION', type);
    assert.equal(err.status, undefined, 'không phải AppError → router trả 500');
  }
  assert.equal((await service.sync('p1')).revision, 1);
});

test('service: advance theo đồng hồ server, sync không tăng revision, đồng hồ không lùi', async () => {
  const { service, t } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  t.now += 30_000;
  const s = await service.sync('p1');
  assert.equal(s.state.qi, 30); assert.equal(s.revision, 1);
  t.now -= 10_000; // đồng hồ lùi
  const s2 = await service.sync('p1');
  assert.equal(s2.state.qi, 30, 'không lùi, không cộng thêm');
});

test('service: thành tựu từ advance/lệnh được ghi vào outbox cùng giao dịch', async () => {
  const { service, t, repository } = setup();
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  t.now += 2_000_000;
  await service.command('p1', cmd(2, 1, 'earn', { amount: 1 }));
  const types = (await repository.drainOutbox(10)).map(e => e.type);
  assert.deepEqual(types, ['command.applied', 'meta.achievement']);
});

test('service: receipt hết hạn sau TTL thì requestId được coi là mới', async () => {
  const { t, repository } = setup();
  const fake = makeFakeEngine();
  const service = new PlayerService({ repository, engine: fake.engine, protocol: fake.protocol, clock: () => t.now, receiptTtlMs: 1000 });
  await service.createPlayer('p1', { requestId: REQ(1), profile: { name: 'Hàn' } });
  await service.command('p1', cmd(2, 1, 'earn', { amount: 5 }));
  t.now += 5000;
  const again = await service.command('p1', cmd(2, 2, 'earn', { amount: 5 }));
  assert.equal(again.replayed, false);
});

test('service: engine chưa READY → 501 ENGINE_NOT_READY cho mọi thao tác gameplay', async () => {
  const { service } = setup({ ready: false });
  for (const call of [() => service.createPlayer('p', { requestId: REQ(1), profile: {} }), () => service.sync('p'), () => service.command('p', cmd(1, 0, 'earn', { amount: 1 }))])
    await assert.rejects(call(), { code: 'ENGINE_NOT_READY', status: 501 });
});

// ---------- engine thật: khung đang NOT_IMPLEMENTED ----------
test('service + engine thật (khung): báo ENGINE_NOT_READY thay vì lỗi 500', async () => {
  const engine = require('../engine/game.js'), protocol = require('../engine/protocol/commands.js');
  const service = new PlayerService({ repository: new MemoryPlayerRepository(), engine, protocol });
  await assert.rejects(service.sync('p'), { code: 'ENGINE_NOT_READY', status: 501 });
});

// ---------- outbox ----------
test('outbox worker: ack sau khi thành công, lỗi để lại thử lại, không kẹt hàng đợi vì thiếu handler', async () => {
  const repo = new MemoryPlayerRepository();
  await repo.create('p', { state: {} });
  await repo.transact('p', async d => { d.events.push({ type: 'ok' }, { type: 'flaky' }, { type: 'khong-handler' }); });
  let flakyCalls = 0; const seen = [];
  const worker = new OutboxWorker({ repository: repo, logger: silentLogger, handlers: {
    ok: async e => { seen.push(e.id); },
    flaky: async () => { if (++flakyCalls < 2) throw Error('tạm lỗi'); }
  } });
  assert.deepEqual(await worker.runOnce(), { handled: 2, failed: 1 });
  assert.deepEqual((await repo.drainOutbox(10)).map(e => e.type), ['flaky']);
  assert.deepEqual(await worker.runOnce(), { handled: 1, failed: 0 });
  assert.deepEqual(await repo.drainOutbox(10), []);
  assert.equal(seen.length, 1);
});

// ---------- tiện ích ----------
test('util: stableStringify không phụ thuộc thứ tự khóa; redact che seed ở mọi độ sâu', () => {
  assert.equal(stableStringify({ b: 1, a: { d: [1, { y: 1, x: 2 }], c: undefined } }), stableStringify({ a: { c: undefined, d: [1, { x: 2, y: 1 }] }, b: 1 }));
  assert.deepEqual(redact({ a: 1, seed: 9, d: { seed: 1, arr: [{ seed: 2, k: 3 }] } }), { a: 1, d: { arr: [{ k: 3 }] } });
});

test('token bucket: bùng nổ tới capacity, nạp lại theo thời gian, Retry-After đúng, khóa độc lập, có trần khóa', () => {
  let now = 0;
  const lim = new TokenBucketLimiter({ capacity: 3, refillPerSecond: 1, now: () => now, maxKeys: 2 });
  assert.ok([1, 2, 3].every(() => lim.take('a').ok));
  const denied = lim.take('a');
  assert.equal(denied.ok, false); assert.equal(denied.retryAfterSeconds, 1);
  assert.ok(lim.take('b').ok, 'khóa khác độc lập');
  now += 2000;
  assert.ok(lim.take('a').ok && lim.take('a').ok && !lim.take('a').ok, 'nạp lại 2 token');
  lim.take('c'); lim.take('d');
  assert.ok(lim.buckets.size <= 2);
});

// ---------- xác thực ----------
test('mật khẩu: băm có salt, xác minh đúng/sai, định dạng hỏng bị từ chối, needsRehash', async () => {
  const fast = { N: 1024, r: 8, p: 1, keyLength: 32, saltBytes: 16 };
  const h1 = await hashPassword('mat-khau-dai-123', fast), h2 = await hashPassword('mat-khau-dai-123', fast);
  assert.notEqual(h1, h2);
  assert.ok(await verifyPassword('mat-khau-dai-123', h1));
  assert.equal(await verifyPassword('sai', h1), false);
  assert.equal(await verifyPassword('x', 'rac'), false);
  assert.equal(await verifyPassword('x', 'scrypt$99999999999$8$1$aa$bb'), false);
  assert.equal(needsRehash(h1, fast), false);
  assert.equal(needsRehash(h1), true);
});

const fastHash = (p) => hashPassword(p, { N: 1024, r: 8, p: 1, keyLength: 32, saltBytes: 16 });
test('tài khoản: đăng ký kiểm tra đầu vào, trùng tên (không phân biệt hoa thường), đăng nhập sai không lộ lý do', async () => {
  const accounts = new AccountStore({ hash: fastHash });
  await accounts.register('HanThien', 'mat-khau-dai-123');
  await assert.rejects(accounts.register('hanthien', 'mat-khau-dai-123'), { code: 'USERNAME_TAKEN' });
  await assert.rejects(accounts.register('a', 'mat-khau-dai-123'), { code: 'BAD_REQUEST' });
  await assert.rejects(accounts.register('hop-le_1', 'ngan'), { code: 'BAD_REQUEST' });
  assert.ok(await accounts.authenticate('HANTHIEN', 'mat-khau-dai-123'));
  assert.equal(await accounts.authenticate('HanThien', 'sai-mat-khau'), null);
  assert.equal(await accounts.authenticate('khong-co', 'mat-khau-dai-123'), null);
});

test('phiên: chỉ lưu băm, timeout nhàn rỗi và tuyệt đối, hủy phía server, cookie đúng thuộc tính', () => {
  let now = 0;
  const s = new SessionStore({ idleSeconds: 60, absoluteSeconds: 300, secureCookies: true, now: () => now });
  const token = s.create('acc');
  assert.ok(![...s.sessions.keys()].includes(token), 'kho không giữ token thô');
  assert.equal(s.resolve(token).accountId, 'acc');
  for (const t of [50_000, 100_000, 150_000, 200_000, 250_000, 290_000]) { now = t; assert.ok(s.resolve(token), 'hoạt động đều (mỗi lần < 60s) nên còn hạn tại ' + t); }
  now = 301_000; assert.equal(s.resolve(token), null, 'quá hạn tuyệt đối dù vẫn hoạt động');
  now = 301_001; assert.equal(s.resolve(token), null, 'đã bị xóa hẳn');
  const t2 = s.create('acc'); now += 61_000;
  assert.equal(s.resolve(t2), null, 'quá hạn nhàn rỗi');
  const t3 = s.create('acc'); s.destroy(t3); assert.equal(s.resolve(t3), null);
  const c = s.serializeCookie('abc');
  for (const part of ['__Host-hu_sid=abc', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Secure']) assert.ok(c.includes(part), part);
  assert.ok(!c.includes('Domain'));
  assert.equal(s.parseCookie('x=1; __Host-hu_sid=' + 'A'.repeat(22)), 'A'.repeat(22));
  assert.equal(s.parseCookie('__Host-hu_sid=ngan'), null);
});

// ---------- API qua HTTP thật ----------
async function startApp(overrides = {}) {
  const fake = makeFakeEngine(overrides.engineOpts);
  const config = loadConfig({});
  const app = createApp({ config, engine: fake.engine, protocol: fake.protocol, logger: silentLogger, accounts: new AccountStore({ hash: fastHash }), ...overrides });
  const server = http.createServer(app.handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let cookie = '';
  const call = async (method, path, body, extra = {}) => {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra.headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
  return { app, call, base, close: () => new Promise(r => server.close(r)), setCookie: c => { cookie = c; } };
}
const creds = { username: 'HanThien', password: 'mat-khau-dai-123' };

test('API: luồng đầy đủ đăng ký → tạo nhân vật → lệnh → retry → sync → đăng xuất', async () => {
  const s = await startApp();
  try {
    const reg = await s.call('POST', '/api/auth/register', creds);
    assert.equal(reg.status, 201);
    assert.match(reg.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    assert.equal((await s.call('GET', '/api/me')).body.account.username, 'HanThien');
    const made = await s.call('POST', '/api/players', { requestId: REQ(1), profile: { name: 'Hàn' } });
    assert.equal(made.status, 201); assert.equal(made.body.revision, 1);
    assert.equal((await s.call('POST', '/api/players', { requestId: REQ(1), profile: { name: 'Hàn' } })).status, 200, 'retry tạo → 200');
    const c1 = await s.call('POST', '/api/commands', cmd(2, 1, 'earn', { amount: 9 }));
    assert.equal(c1.status, 200); assert.equal(c1.body.state.stone, 9);
    assert.equal((await s.call('POST', '/api/commands', cmd(2, 1, 'earn', { amount: 9 }))).body.replayed, true);
    assert.equal((await s.call('POST', '/api/commands', cmd(3, 1, 'earn', { amount: 9 }))).body.error.code, 'REVISION_CONFLICT');
    assert.equal((await s.call('POST', '/api/sync')).body.state.stone, 9);
    assert.equal((await s.call('POST', '/api/auth/logout')).status, 204);
    assert.equal((await s.call('GET', '/api/me')).status, 401, 'phiên bị hủy phía server');
  } finally { await s.close(); }
});

test('API: chưa đăng nhập → 401; cookie giả → 401; đăng nhập sai → 401 cùng thông điệp', async () => {
  const s = await startApp();
  try {
    for (const [m, p] of [['GET', '/api/me'], ['POST', '/api/sync'], ['POST', '/api/commands'], ['POST', '/api/players']])
      assert.equal((await s.call(m, p, m === 'POST' ? {} : undefined)).status, 401, m + ' ' + p);
    s.setCookie('hu_sid=' + 'A'.repeat(22));
    assert.equal((await s.call('GET', '/api/me')).status, 401);
    await s.call('POST', '/api/auth/register', creds); s.setCookie('');
    const a = await s.call('POST', '/api/auth/login', { username: 'HanThien', password: 'sai-mat-khau-1' });
    const b = await s.call('POST', '/api/auth/login', { username: 'khong-co', password: 'sai-mat-khau-1' });
    assert.equal(a.status, 401); assert.deepEqual(a.body.error.message, b.body.error.message);
  } finally { await s.close(); }
});

test('API: lỗi chuẩn có requestId, không lộ stack khi lỗi hệ thống; 404/405/413/415/400', async () => {
  const s = await startApp();
  try {
    await s.call('POST', '/api/auth/register', creds);
    await s.call('POST', '/api/players', { requestId: REQ(1), profile: { name: 'Hàn' } });
    const crash = await s.call('POST', '/api/commands', cmd(2, 1, 'crash'));
    assert.equal(crash.status, 500); assert.equal(crash.body.error.code, 'INTERNAL');
    assert.ok(crash.body.error.requestId); assert.equal(crash.headers.get('x-request-id'), crash.body.error.requestId);
    assert.ok(!JSON.stringify(crash.body).includes('null') || !/boom|Cannot read/i.test(JSON.stringify(crash.body)));
    assert.equal((await s.call('GET', '/api/khong-co')).status, 404);
    assert.equal((await s.call('GET', '/api/sync')).status, 405);
    assert.equal((await s.call('POST', '/api/commands', 'khong-phai-json', { headers: { 'Content-Type': 'application/json' } })).status, 400);
    assert.equal((await s.call('POST', '/api/commands', '{"a":1}', { headers: { 'Content-Type': 'text/plain' } })).status, 415);
    assert.equal((await s.call('POST', '/api/commands', '[1]')).status, 400);
    assert.equal((await s.call('POST', '/api/commands', { requestId: REQ(5), expectedRevision: 1, type: 'earn', payload: { amount: 1, pad: 'x'.repeat(70000) } })).status, 413);
    assert.equal((await s.call('PUT', '/index.html', {})).status, 405);
  } finally { await s.close(); }
});

test('API: CSRF — yêu cầu ghi từ Origin lạ bị chặn, cùng Origin được phép', async () => {
  const s = await startApp();
  try {
    const evil = await s.call('POST', '/api/auth/register', creds, { headers: { Origin: 'https://evil.example' } });
    assert.equal(evil.status, 403); assert.equal(evil.body.error.code, 'CROSS_ORIGIN');
    const ok = await s.call('POST', '/api/auth/register', creds, { headers: { Origin: s.base } });
    assert.equal(ok.status, 201);
  } finally { await s.close(); }
});

test('API: đăng nhập bị giới hạn tốc độ → 429 kèm Retry-After; xô lệnh riêng theo tài khoản', async () => {
  const s = await startApp();
  try {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await s.call('POST', '/api/auth/login', { username: 'x' + i + 'yz', password: 'sai-mat-khau-1' })).status);
    assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
    const limited = await s.call('POST', '/api/auth/login', creds);
    assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  } finally { await s.close(); }
});

test('API: engine chưa READY → /api/health báo thiếu, gameplay trả 501, xác thực vẫn chạy', async () => {
  const s = await startApp({ engineOpts: { ready: false } });
  try {
    const health = await s.call('GET', '/api/health');
    assert.equal(health.body.engineReady, false); assert.equal(health.body.missing, 2);
    assert.equal((await s.call('POST', '/api/auth/register', creds)).status, 201);
    const r = await s.call('POST', '/api/players', { requestId: REQ(1), profile: { name: 'Hàn' } });
    assert.equal(r.status, 501); assert.equal(r.body.error.code, 'ENGINE_NOT_READY');
  } finally { await s.close(); }
});

test('API: file tĩnh vẫn được phục vụ qua app, vẫn chặn server/ và thoát thư mục', async () => {
  const s = await startApp();
  try {
    const home = await fetch(s.base + '/'); assert.equal(home.status, 200);
    assert.equal((await fetch(s.base + '/server/app.js')).status, 404);
    assert.equal((await fetch(s.base + '/%2e%2e/%2e%2e/etc/passwd')).status, 404);
  } finally { await s.close(); }
});
