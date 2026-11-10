/* API /api/v1: xác thực JWT (HS256 + JWKS ES256), cookie thử nghiệm, CORS, rate limit, envelope lỗi, luồng chơi đầy đủ. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createJwtVerifier } = require('../server/auth/jwt.js');
const { createPrincipalResolver } = require('../server/auth/principal.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const { createGameApi } = require('../server/http/game-api.js');
const { RateLimiter } = require('../server/http/rate-limit.js');
const { createClientIp } = require('../server/http/client-ip.js');
const { AuthService } = require('../server/services/auth-service.js');
const { createRouter } = require('../server/http/router.js');

const SECRET = 'test-secret-test-secret-test-secret-123';
const ID_A = '11111111-1111-4111-8111-111111111111', ID_B = '22222222-2222-4222-8222-222222222222';
const b64 = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
function signHs(payload, { alg = 'HS256', secret = SECRET } = {}) {
  const head = b64({ alg, typ: 'JWT' }), body = b64(payload);
  return head + '.' + body + '.' + crypto.createHmac('sha256', secret).update(head + '.' + body).digest('base64url');
}
const claims = (sub, extra = {}) => ({ sub, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600, ...extra });

test('JWT HS256: chữ ký, hạn, audience, alg lạ, sub', async () => {
  const v = createJwtVerifier({ secret: SECRET });
  assert.equal((await v.verify(signHs(claims(ID_A)))).sub, ID_A);
  const bad = async token => { try { await v.verify(token); } catch (e) { return e.code; } return null; };
  assert.equal(await bad(signHs(claims(ID_A), { secret: 'khac' })), 'UNAUTHENTICATED');
  assert.equal(await bad(signHs(claims(ID_A, { exp: Math.floor(Date.now() / 1000) - 60 }))), 'UNAUTHENTICATED');
  assert.equal(await bad(signHs(claims(ID_A, { aud: 'anon' }))), 'UNAUTHENTICATED');
  assert.equal(await bad(signHs(claims('khong-phai-uuid'))), 'UNAUTHENTICATED');
  assert.equal(await bad(signHs({ aud: 'authenticated', role: 'anon', exp: Math.floor(Date.now() / 1000) + 60 })), 'UNAUTHENTICATED');
  assert.equal(await bad(b64({ alg: 'none' }) + '.' + b64(claims(ID_A)) + '.'), 'UNAUTHENTICATED');
  assert.equal(await bad('rác'), 'UNAUTHENTICATED');
});

test('JWT ES256 qua JWKS: xoay khóa, kid lạ và alg bị ép đều bị từ chối', async () => {
  const gen = () => crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const k1 = gen(), k2 = gen();
  const jwk = (pair, kid) => ({ ...pair.publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' });
  let served = [jwk(k1, 'k1')], fetches = 0, now = 1_800_000_000_000;
  const fetchImpl = async () => { fetches++; return { ok: true, json: async () => ({ keys: served }) }; };
  const v = createJwtVerifier({ jwksUrl: 'https://x.test/jwks', issuer: 'https://x.test/auth/v1', fetchImpl, clock: () => now, jwksMinRefetchMs: 0 });
  const signEs = (pair, kid, payload) => {
    const head = b64({ alg: 'ES256', typ: 'JWT', kid }), body = b64(payload);
    return head + '.' + body + '.' + crypto.sign('sha256', Buffer.from(head + '.' + body), { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };
  const p = extra => claims(ID_A, { iss: 'https://x.test/auth/v1', exp: Math.floor(now / 1000) + 600, ...extra });
  assert.equal((await v.verify(signEs(k1, 'k1', p()))).sub, ID_A);
  assert.equal(fetches, 1);
  await assert.rejects(v.verify(signEs(k2, 'k2', p())), { code: 'UNAUTHENTICATED' }); // k2 chưa công bố
  served = [jwk(k1, 'k1'), jwk(k2, 'k2')];
  assert.equal((await v.verify(signEs(k2, 'k2', p()))).sub, ID_A); // tự tải lại khi gặp kid mới
  await assert.rejects(v.verify(signEs(k1, 'k2', p())), { code: 'UNAUTHENTICATED' }); // ký bằng khóa này nhưng khai kid khác
  await assert.rejects(v.verify(signEs(k1, 'k1', p({ iss: 'https://evil.test' }))), { code: 'UNAUTHENTICATED' });
  await assert.rejects(v.verify(signHs(p(), { secret: 'k1' })), { code: 'UNAUTHENTICATED' }); // không cho đổi sang HS256 khi chưa cấu hình secret
});

async function boot(t, { allowedOrigins = [], limiter, legacy = null, clientIp, loginGateway = null } = {}) {
  const repo = new SqlitePlayers(':memory:');
  const service = new PlayerService({ repository: repo, contentVersion: 'test', onError: () => {} });
  const api = createGameApi({ service, resolvePrincipal: createPrincipalResolver({ jwt: createJwtVerifier({ secret: SECRET }), legacy }), allowedOrigins, limiter, clientIp });
  const server = http.createServer(createRouter(null, legacy, api, loginGateway));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); repo.close(); });
  const port = server.address().port;
  const call = (method, url, { token, body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ hostname: '127.0.0.1', port, method, path: url, headers: {
      ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, data: text ? JSON.parse(text) : null }); });
    });
    req.on('error', reject); req.end(data);
  });
  return { call, tokenA: signHs(claims(ID_A)), tokenB: signHs(claims(ID_B)), port };
}

test('API: cần đăng nhập, envelope lỗi chuẩn, route lạ và phương thức sai', async t => {
  const { call, tokenA } = await boot(t);
  const anon = await call('GET', '/api/v1/bootstrap');
  assert.equal(anon.status, 401);
  assert.equal(anon.data.error.code, 'UNAUTHENTICATED');
  assert.ok(anon.data.error.requestId && anon.headers['x-request-id']);
  assert.equal((await call('GET', '/api/v1/bootstrap', { token: 'a.b.c' })).status, 401);
  assert.equal((await call('GET', '/api/v1/khong-co', { token: tokenA })).data.error.code, 'NOT_FOUND');
  assert.equal((await call('GET', '/api/v1/creation/preview', { token: tokenA })).status, 404);
  const boot1 = await call('GET', '/api/v1/bootstrap', { token: tokenA });
  assert.equal(boot1.status, 200);
  assert.equal(boot1.data.player, null);
  assert.equal(boot1.data.contentVersion, 'test');
  assert.equal(boot1.headers['cache-control'], 'no-store');
});

test('API: luồng chơi đầy đủ preview → tạo → state → sync → lệnh → replay, cô lập hai tài khoản', async t => {
  const { call, tokenA, tokenB } = await boot(t);
  const pv = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  assert.equal(pv.status, 201);
  const made = await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv.data.ticketId, name: 'Diệp Phàm', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' } });
  assert.equal(made.status, 201);
  const id = made.data.playerId;
  assert.equal((await call('GET', '/api/v1/bootstrap', { token: tokenA })).data.player.id, id);
  assert.equal((await call('GET', `/api/v1/players/${id}/state`, { token: tokenA })).data.state.name, 'Diệp Phàm');

  const synced = await call('POST', `/api/v1/players/${id}/sync`, { token: tokenA, body: { lastRevision: 0 } });
  assert.equal(synced.status, 200);
  const rev = synced.data.revision;
  const env = (rid, extra = {}) => ({ protocolVersion: 2, requestId: rid, expectedRevision: rev, type: 'buy', payload: { code: 'HERB-001' }, ...extra });
  const c1 = await call('POST', `/api/v1/players/${id}/commands`, { token: tokenA, body: env('api-1') });
  assert.equal(c1.status, 200);
  assert.equal(c1.data.revision, rev + 1);
  const again = await call('POST', `/api/v1/players/${id}/commands`, { token: tokenA, body: env('api-1') });
  assert.equal(again.data.replayed, true);
  assert.equal(again.data.state.stone, c1.data.state.stone);
  const conflict = await call('POST', `/api/v1/players/${id}/commands`, { token: tokenA, body: env('api-2') });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'REVISION_CONFLICT');
  assert.equal(conflict.data.error.retryable, true);
  assert.equal(conflict.data.error.details.currentRevision, rev + 1);
  assert.equal('state' in conflict.data, false);

  for (const url of [`/api/v1/players/${id}/state`]) assert.equal((await call('GET', url, { token: tokenB })).status, 404);
  assert.equal((await call('POST', `/api/v1/players/${id}/sync`, { token: tokenB, body: {} })).status, 404);
  assert.equal((await call('POST', `/api/v1/players/${id}/commands`, { token: tokenB, body: env('b-1') })).status, 404);
  assert.equal((await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv.data.ticketId, name: 'Khác', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' } })).data.error.code, 'TICKET_INVALID');
});

test('API: body hỏng, quá lớn, sai content-type, trường thừa', async t => {
  const { call, tokenA } = await boot(t);
  const pv = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  const id = (await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv.data.ticketId, name: 'Lục Tuyết', gender: 'nu', talent: { canCot: 8 }, destiny: 'life' } })).data.playerId;
  const url = `/api/v1/players/${id}/commands`;
  assert.equal((await call('POST', url, { token: tokenA, body: '{hỏng' })).data.error.code, 'INVALID_REQUEST');
  assert.equal((await call('POST', url, { token: tokenA, body: JSON.stringify({ pad: 'x'.repeat(70000) }) })).status, 413);
  assert.equal((await call('POST', url, { token: tokenA, body: '{}', headers: { 'content-type': 'text/plain' } })).status, 415);
  const extra = await call('POST', `/api/v1/players/${id}/sync`, { token: tokenA, body: { lastRevision: 0, offline: true } });
  assert.equal(extra.data.error.code, 'INVALID_REQUEST', 'client không được gửi cờ offline');
});

test('API: giới hạn tốc độ trả 429 kèm Retry-After', async t => {
  let now = 0;
  const { call, tokenA } = await boot(t, { limiter: new RateLimiter({ clock: () => now }) });
  const pv = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  const id = (await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv.data.ticketId, name: 'Tô Mạc', gender: 'nam', talent: { vanKhi: 8 }, destiny: 'luck' } })).data.playerId;
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await call('POST', `/api/v1/players/${id}/sync`, { token: tokenA, body: {} })).status);
  assert.deepEqual(statuses, Array(12).fill(200));
  const limited = await call('POST', `/api/v1/players/${id}/sync`, { token: tokenA, body: {} });
  assert.equal(limited.status, 429);
  assert.equal(limited.data.error.code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers['retry-after']) >= 1);
  now += 60000;
  assert.equal((await call('POST', `/api/v1/players/${id}/sync`, { token: tokenA, body: {} })).status, 200);
});

test('pause được giới hạn riêng, không tiêu token của sync', async t => {
  const { call, tokenA } = await boot(t, { limiter: new RateLimiter({ clock: () => 0 }) });
  const pv = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  const created = await call('POST', '/api/v1/players', { token: tokenA, body: {
    ticketId: pv.data.ticketId, name: 'Huyền Tâm', gender: 'nam', talent: { vanKhi: 8 }, destiny: 'luck'
  } });
  const url = '/api/v1/players/' + created.data.playerId;
  for (let i = 0; i < 12; i++) assert.equal((await call('POST', url + '/sync', { token: tokenA, body: {} })).status, 200);
  assert.equal((await call('POST', url + '/sync', { token: tokenA, body: {} })).status, 429);
  assert.equal((await call('POST', url + '/pause', { token: tokenA, body: {} })).status, 200);
});

test('API: CORS chỉ cho origin trong danh sách; preflight không cần đăng nhập', async t => {
  const { call } = await boot(t, { allowedOrigins: ['https://game.example'] });
  const ok = await call('OPTIONS', '/api/v1/bootstrap', { headers: { origin: 'https://game.example', 'access-control-request-method': 'GET' } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers['access-control-allow-origin'], 'https://game.example');
  const evil = await call('OPTIONS', '/api/v1/bootstrap', { headers: { origin: 'https://evil.example' } });
  assert.equal(evil.headers['access-control-allow-origin'], undefined);
});

test('API: cookie thử nghiệm đi được tới /api/v1 và mọi yêu cầu ghi bị kiểm Origin', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-gioi-api-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const legacy = new AuthService(path.join(dir, 'private', 'accounts.json'));
  const { call, port } = await boot(t, { legacy });
  const reg = await call('POST', '/api/auth/signup', { body: { email: 'dao@example.com', password: 'mat-khau-dai-va-kho-doan' } });
  assert.equal(reg.status, 201);
  const cookie = reg.headers['set-cookie'][0].split(';')[0];
  assert.match(reg.headers['set-cookie'][0], /Path=\/api;/);
  assert.equal((await call('GET', '/api/v1/bootstrap', { headers: { cookie } })).status, 200);
  const evil = await call('POST', '/api/v1/creation/preview', { headers: { cookie, origin: 'https://evil.example', host: `127.0.0.1:${port}` } });
  assert.equal(evil.status, 403);
  assert.equal((await call('POST', '/api/v1/creation/preview', { headers: { cookie } })).status, 201);
});

test('health báo trạng thái gameplay và gateway Supabase đang cấu hình', async t => {
  const { call } = await boot(t, { loginGateway: { handle() {} } });
  const health = (await call('GET', '/api/health')).data;
  assert.equal(health.gameplay, true);
  assert.equal(health.auth, true);
});

test('API: tài khoản tự xuất và tự xóa dữ liệu gameplay, không lộ seed, cô lập theo chủ', async t => {
  const { call, tokenA, tokenB } = await boot(t);
  assert.equal((await call('GET', '/api/v1/me/export')).status, 401);
  assert.equal((await call('GET', '/api/v1/me/export', { token: tokenA })).data.player, null);

  const pv = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  const made = await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv.data.ticketId, name: 'Lâm Phong', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' } });
  assert.equal(made.status, 201);
  const id = made.data.playerId;

  const out = await call('GET', '/api/v1/me/export', { token: tokenA });
  assert.equal(out.status, 200);
  assert.match(out.headers['content-disposition'], /attachment/);
  assert.equal(out.data.player.id, id);
  assert.equal(out.data.player.name, 'Lâm Phong');
  assert.doesNotMatch(JSON.stringify(out.data), /rng|seed_hex|rngSeed/i);
  assert.equal((await call('GET', '/api/v1/me/export', { token: tokenB })).data.player, null);

  // Phải xác nhận rõ ràng; B không thể xóa dữ liệu của A.
  assert.equal((await call('POST', '/api/v1/me/erase', { token: tokenA, body: {} })).data.error.code, 'INVALID_REQUEST');
  assert.equal((await call('POST', '/api/v1/me/erase', { token: tokenA, body: { confirm: 'yes' } })).data.error.code, 'INVALID_REQUEST');
  assert.equal((await call('POST', '/api/v1/me/erase', { token: tokenB, body: { confirm: 'delete-my-game-data' } })).data.players, 0);
  assert.equal((await call('GET', `/api/v1/players/${id}/state`, { token: tokenA })).status, 200);

  // Nhân vật còn sống vẫn xóa được (quyền xóa dữ liệu khác với tọa hóa).
  const erased = await call('POST', '/api/v1/me/erase', { token: tokenA, body: { confirm: 'delete-my-game-data' } });
  assert.equal(erased.status, 200);
  assert.equal(erased.data.erased, true);
  assert.equal(erased.data.players, 1);
  assert.equal((await call('GET', `/api/v1/players/${id}/state`, { token: tokenA })).status, 404);
  assert.equal((await call('GET', '/api/v1/bootstrap', { token: tokenA })).data.player, null);
  // Đạo hiệu được giải phóng và có thể tạo lại.
  const pv2 = await call('POST', '/api/v1/creation/preview', { token: tokenA });
  const again = await call('POST', '/api/v1/players', { token: tokenA, body: { ticketId: pv2.data.ticketId, name: 'Lâm Phong', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' } });
  assert.equal(again.status, 201);
});

test('API: quyền dữ liệu cá nhân không phụ thuộc bản đồng ý chính sách còn hiệu lực', async t => {
  const repo = new SqlitePlayers(':memory:');
  const service = new PlayerService({ repository: repo, contentVersion: 'test', onError: () => {} });
  const deleted = [];
  const accountAdmin = { deleteUser: async id => { deleted.push(id); return { deleted: true }; } };
  const jwt = createJwtVerifier({ secret: SECRET });
  let consentGiven = true;
  const verifyConsent = async () => { if (!consentGiven) throw new (require('../server/errors.js').GameError)('CONSENT_REQUIRED', 'Cần đồng ý.'); };
  const api = createGameApi({ service, accountAdmin, resolvePrincipal: createPrincipalResolver({ jwt, verifyConsent }) });
  const server = http.createServer(createRouter(null, null, api));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); repo.close(); });
  const token = signHs(claims(ID_A));
  const call = (method, url, body) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, method, path: url, headers: {
      authorization: 'Bearer ' + token, ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}) } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString() || 'null') }));
    });
    req.on('error', reject); req.end(data);
  });
  const pv = await call('POST', '/api/v1/creation/preview');
  assert.equal(pv.status, 201);
  assert.equal((await call('POST', '/api/v1/players', { ticketId: pv.data.ticketId, name: 'Vân Hạc', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' })).status, 201);

  consentGiven = false; // người dùng đã rút đồng ý / chưa đồng ý bản mới
  assert.equal((await call('GET', '/api/v1/bootstrap')).data.error.code, 'CONSENT_REQUIRED'); // gameplay vẫn bị chặn
  assert.equal((await call('GET', '/api/v1/me/export')).data.player.name, 'Vân Hạc');
  // Xóa tài khoản: phải xác nhận đúng; thành công thì xóa dữ liệu rồi gọi quản trị Supabase.
  assert.equal((await call('POST', '/api/v1/me/delete-account', {})).data.error.code, 'INVALID_REQUEST');
  assert.equal((await call('POST', '/api/v1/me/delete-account', { confirm: 'delete-my-game-data' })).data.error.code, 'INVALID_REQUEST');
  assert.deepEqual(deleted, []);
  const out = await call('POST', '/api/v1/me/delete-account', { confirm: 'delete-my-account' });
  assert.equal(out.status, 200);
  assert.equal(out.data.accountDeleted, true);
  assert.equal(out.data.players, 1);
  assert.deepEqual(deleted, [ID_A]);
  assert.equal(repo.getByOwner(ID_A), null);
});

test('xóa tài khoản: chưa cấu hình khóa quản trị thì từ chối và KHÔNG xóa dữ liệu; Supabase lỗi thì báo thử lại', async () => {
  const repo = new SqlitePlayers(':memory:');
  const service = new PlayerService({ repository: repo, contentVersion: 'test', onError: () => {} });
  const t1 = service.previewCreation(ID_A).ticketId;
  service.createPlayer(ID_A, { ticketId: t1, name: 'Mộ Dung', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' });
  await assert.rejects(service.deleteAccount(ID_A, { confirm: 'delete-my-account' }, null), { code: 'NOT_IMPLEMENTED' });
  assert.ok(repo.getByOwner(ID_A));
  const { createAccountAdmin } = require('../server/auth/account-admin.js');
  const calls = [];
  const mk = status => createAccountAdmin({ url: 'https://abc.supabase.co', secretKey: 'sb_secret_' + 'x'.repeat(30),
    fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: status < 300, status }; } });
  await assert.rejects(service.deleteAccount(ID_A, { confirm: 'delete-my-account' }, mk(500)), { code: 'MAINTENANCE' });
  assert.equal(repo.getByOwner(ID_A), null); // dữ liệu game đã xóa; gọi lại là idempotent
  assert.equal((await service.deleteAccount(ID_A, { confirm: 'delete-my-account' }, mk(404))).accountDeleted, true);
  assert.equal(calls[0].url, 'https://abc.supabase.co/auth/v1/admin/users/' + ID_A);
  assert.equal(calls[0].init.method, 'DELETE');
  assert.equal(calls[0].init.headers.Authorization, undefined); // khóa sb_secret_ chỉ đi qua apikey
  repo.close();
});

test('sao lưu SQLite: bản sao toàn vẹn, quyền 0600, luân phiên giữ N bản', () => {
  const { backup } = require('../tools/backup-db.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hu-backup-'));
  fs.chmodSync(dir, 0o700);
  const file = path.join(dir, 'game.sqlite');
  const repo = new SqlitePlayers(file);
  const service = new PlayerService({ repository: repo, contentVersion: 'test', onError: () => {} });
  service.createPlayer(ID_A, { ticketId: service.previewCreation(ID_A).ticketId, name: 'Thanh Vân', gender: 'nam', talent: { phucDuyen: 8 }, destiny: 'exp' });
  const results = [1, 2, 3].map(i => backup({ db: file, keep: 2, now: new Date(Date.UTC(2026, 10, 9, 0, 0, i)) }));
  const kept = fs.readdirSync(path.join(dir, 'backups')).sort();
  assert.equal(kept.length, 2);
  assert.equal(results[2].removed.length, 1);
  assert.equal(fs.statSync(results[2].dest).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(dir, 'backups')).mode & 0o777, 0o700);
  const copy = new SqlitePlayers(results[2].dest);
  assert.equal(copy.getByOwner(ID_A).name, 'Thanh Vân');
  copy.close(); repo.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('API: giới hạn theo IP chặn cả request không có token trước khi xác minh JWT', async t => {
  const limiter = new RateLimiter();
  const { call } = await boot(t, { limiter });
  let last;
  for (let i = 0; i < 130; i++) last = await call('GET', '/api/v1/bootstrap', { token: 'a.b.c' });
  assert.equal(last.status, 429);
  assert.equal(last.data.error.code, 'RATE_LIMITED');
  assert.ok(Number(last.headers['retry-after']) >= 1);
});

test('hai IP qua cùng proxy tin cậy không dùng chung bucket 120/phút gameplay', async t => {
  const { call } = await boot(t, {
    limiter: new RateLimiter({ clock: () => 0 }),
    clientIp: createClientIp(['127.0.0.1'])
  });
  const first = { 'x-forwarded-for': '203.0.113.10' };
  const second = { 'x-forwarded-for': '203.0.113.11' };
  for (let i = 0; i < 120; i++)
    assert.equal((await call('GET', '/api/v1/bootstrap', { headers: first })).status, 401);
  assert.equal((await call('GET', '/api/v1/bootstrap', { headers: first })).status, 429);
  assert.equal((await call('GET', '/api/v1/bootstrap', { headers: second })).status, 401);
});

test('API Thiên Mệnh Các: chỉ JWT và intent hợp lệ; thiếu Thiên Tinh trả 422, không nhận giá client', async t => {
  const { call, tokenA, tokenB } = await boot(t);
  const bootA = await call('GET', '/api/v1/bootstrap', { token: tokenA });
  assert.equal(bootA.data.pavilion.balance, 0);
  assert.equal(bootA.data.pavilion.version, 0);
  const intent = { requestId: 'pavilion-00001', expectedVersion: 0, kind: 'upgrade', key: 'ngoTinh' };
  assert.equal((await call('POST', '/api/v1/pavilion/purchase', { body: intent })).status, 401);
  const fake = await call('POST', '/api/v1/pavilion/purchase', { token: tokenA, body: { ...intent, price: 0 } });
  assert.equal(fake.status, 400);
  assert.equal(fake.data.error.code, 'INVALID_REQUEST');
  const missing = await call('POST', '/api/v1/pavilion/purchase', { token: tokenA, body: intent });
  assert.equal(missing.status, 422);
  assert.equal(missing.data.error.code, 'INSUFFICIENT_TINH');
  const other = await call('GET', '/api/v1/bootstrap', { token: tokenB });
  assert.equal(other.data.pavilion.balance, 0);
});
