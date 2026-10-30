/* Kiểm tra khung sau khi dọn backend: dữ liệu nạp được, hợp đồng lệnh khớp miền luật, thứ tự script đúng, máy chủ tĩnh an toàn.
   Khi engine được viết lại, thêm test hành vi theo từng miền (tools/pending-engine/test-game-integration.mjs là đặc tả tham chiếu). */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');

test('dữ liệu thiết kế nạp được trong Node', () => {
  assert.ok(H.ITEMS.length > 0, 'catalog có vật phẩm');
  assert.ok(H.item(H.ITEMS[0].code), 'tra cứu vật phẩm theo mã');
  assert.equal(H.ZONES.length, 14);
  assert.ok(H.F.exp_need(0, 0) > 0);
});

test('mọi H.* mà UI dùng đều có trong HU_GAME hoặc nằm trong phần engine phải cung cấp', () => {
  const ENGINE_PROVIDED = ['create', 'createCharacter', 'normalize', 'Game'];
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const used = new Set();
  for (const file of walk(join(root, 'client')).filter(f => f.endsWith('.js'))) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/\bH\.([A-Za-z_]+)/g)) used.add(name);
  }
  const missing = [...used].filter(name => !(name in H) && !ENGINE_PROVIDED.includes(name));
  assert.deepEqual(missing, [], 'UI cần các thành viên HU_GAME này nhưng data/ và engine không cấp');
});

test('mỗi lệnh thuộc đúng một miền luật', () => {
  assert.equal(C.types.length, 46);
  assert.deepEqual(Object.keys(H.OWNERS).sort(), [...C.types].sort());
});

test('validate nhận payload hợp lệ và từ chối payload sai', () => {
  assert.deepEqual(C.validate({ type: 'garden', payload: { slot: 1, action: 'water' } }), { type: 'garden', payload: { slot: 1, action: 'water' } });
  assert.deepEqual(C.validate({ type: 'breakthrough' }), { type: 'breakthrough', payload: {} });
  for (const bad of [
    { type: 'khongTonTai' }, { type: 'buy', payload: { code: 'KHONG-CO' } }, { type: 'garden', payload: { slot: 9, action: 'water' } },
    { type: 'breakthrough', payload: { thuong: 1e9 } }, { type: 'breakthrough', extra: 1 }, null, []
  ]) assert.throws(() => C.validate(bad), { code: 'INVALID_COMMAND' });
});

test('READY phản ánh đúng phần engine còn thiếu', () => {
  assert.equal(H.READY, H.MISSING.length === 0);
  const game = new H.Game({ created: true, logs: [] });
  for (const name of H.MISSING.filter(n => typeof game[n] === 'function')) {
    assert.throws(() => game[name]({}, 0), { code: 'NOT_IMPLEMENTED' }, name);
  }
});

test('index.html nạp data → engine → client đúng thứ tự, không đưa server vào trình duyệt', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  const at = src => { const i = scripts.indexOf(src); assert.ok(i >= 0, 'thiếu ' + src); return i; };
  assert.ok(scripts.every(s => !s.startsWith('server/') && !s.startsWith('shared/')));
  const dataLast = Math.max(...scripts.filter(s => s.startsWith('data/')).map(at));
  const rules = scripts.filter(s => s.startsWith('engine/rules/'));
  assert.equal(rules.length, 9);
  assert.ok(Math.min(...rules.map(at)) > dataLast, 'engine/rules sau data');
  assert.ok(at('engine/protocol/commands.js') > Math.max(...rules.map(at)));
  assert.ok(at('engine/game.js') > at('engine/protocol/commands.js'));
  assert.ok(at('client/session/local-session.js') > at('engine/game.js'));
  assert.ok(at('client/ui/core.js') > at('client/session/local-session.js'));
});

test('máy chủ: health, 404 API, chặn thoát thư mục và mã nguồn server', async () => {
  const { createRouter } = require('../server/http/router.js');
  const server = http.createServer(createRouter());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const get = async path => fetch(`http://127.0.0.1:${server.address().port}${path}`);
  try {
    const health = await get('/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    assert.equal((await get('/api/khong-co')).status, 404);
    assert.equal((await get('/%2e%2e/%2e%2e/etc/passwd')).status, 404);
    assert.equal((await get('/server/main.js')).status, 404);
    assert.equal((await get('/package.json')).status, 404);
    assert.equal((await get('/engine/game.js')).status, 200);
  } finally { server.close(); }
});
