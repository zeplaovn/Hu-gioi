/* Máy chủ tĩnh chỉ được phục vụ file game; không lộ server/, tests/, docs/, tools/, file ẩn hay bảng thiết kế. */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRouter } = require('../server/http/router.js');

let server, port;
before(async () => {
  server = http.createServer(createRouter());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));

/* Dùng http.request thô để đường dẫn như /%2e%2e/ và /../ không bị client chuẩn hóa trước khi tới máy chủ. */
const get = (path, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path, method }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
  });
  req.on('error', reject);
  req.end();
});

test('phục vụ file chạy game', async () => {
  for (const path of ['/', '/index.html', '/css/base.css', '/data/balance.js', '/engine/game.js', '/client/main.js']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
  }
});

test('từ chối mã nguồn máy chủ, test, tài liệu, công cụ, file ẩn và cấu hình', async () => {
  const blocked = [
    '/server/main.js', '/Server/main.js', '/SERVER/http/static.js', '/%73erver/main.js',
    '/tests/engine.test.cjs', '/TESTS/engine.test.cjs', '/docs/architecture.md', '/docs/backend-plan.md',
    '/tools/ui-proof.py', '/demo/player-pack-preview.html', '/README.md', '/data/README.md',
    '/package.json', '/PACKAGE.JSON', '/_headers',
    '/.git/config', '/.git/HEAD', '/.github/workflows/ui-verification.yml', '/.gitignore', '/.env',
    '/media/.env', '/css/.hidden', '/client/.secret.js'
  ];
  for (const path of blocked) assert.equal((await get(path)).status, 404, path);
});

test('từ chối bảng thiết kế và tệp tra cứu nằm trong media/', async () => {
  for (const path of [
    '/media/assets/enemy.xlsx', '/media/assets/npc.xlsx', '/media/assets/vat_pham.xlsx',
    '/media/assets/chars/npc/Doi_Chieu_Ten_Anh.csv', '/media/assets/tra_cuu_item.html', '/media/assets/bang_tra_cuu.json',
    '/MEDIA/ASSETS/ENEMY.XLSX'
  ]) assert.equal((await get(path)).status, 404, path);
});

test('chặn thoát thư mục, dấu gạch ngược và byte rỗng', async () => {
  for (const path of [
    '/../package.json', '/css/../package.json', '/css/../../etc/passwd', '/%2e%2e/package.json',
    '/css/%2e%2e/%2e%2e/package.json', '/css%2f..%2f..%2fpackage.json', '/css\\..\\package.json',
    '/data/balance.js%00.png', '/%00', '//server/main.js', '/client//../server/main.js'
  ]) {
    const res = await get(path);
    assert.ok(res.status === 404 || res.status === 400, path + ' → ' + res.status);
    assert.doesNotMatch(res.body, /createServer|"name": "hu-gioi"/, path);
  }
});

test('mọi phản hồi có header bảo mật; HEAD không trả thân', async () => {
  for (const path of ['/index.html', '/server/main.js']) {
    const res = await get(path);
    assert.equal(res.headers['x-content-type-options'], 'nosniff', path);
    assert.equal(res.headers['x-frame-options'], 'DENY', path);
    assert.equal(res.headers['referrer-policy'], 'no-referrer', path);
    assert.match(res.headers['content-security-policy'], /default-src 'self'/, path);
    assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/, path);
  }
  const head = await get('/index.html', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('HTML/JS/CSS no-cache, media 24h must-revalidate, không trùng Cache-Control', async () => {
  for (const pathname of ['/', '/index.html', '/client/main.js', '/css/base.css', '/engine/game.js', '/data/balance.js']) {
    const res = await get(pathname, 'HEAD');
    assert.equal(res.status, 200, pathname);
    assert.equal(res.headers['cache-control'], 'no-cache', pathname);
  }
  const media = await get('/media/audio/hu_gioi.mp3', 'HEAD');
  assert.equal(media.status, 200);
  assert.equal(media.headers['cache-control'], 'public, max-age=86400, must-revalidate');
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const headersFile = readFileSync(join(__dirname, '../_headers'), 'utf8');
  assert.match(headersFile, /\/media\/\*\s*\n\s*Cache-Control: public, max-age=86400, must-revalidate/);
  const rules = [];
  let rule;
  for (const line of readFileSync(join(__dirname, '../_headers'), 'utf8').split(/\r?\n/)) {
    if (line.startsWith('/')) {
      rule = { route: line.trim(), cache: 0 };
      rules.push(rule);
    } else if (rule && /^\s+Cache-Control:/i.test(line)) rule.cache++;
  }
  for (const pathname of ['/index.html', '/client/main.js', '/css/base.css', '/engine/game.js', '/data/balance.js', '/media/audio/hu_gioi.mp3']) {
    const count = rules.filter(item => item.route === pathname ||
      (item.route.endsWith('/*') && pathname.startsWith(item.route.slice(0, -1))))
      .reduce((total, item) => total + item.cache, 0);
    assert.equal(count, 1, pathname + ' has one Cache-Control');
  }
});

test('phương thức ghi bị từ chối', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) assert.equal((await get('/index.html', method)).status, 405, method);
});

test('Cloudflare static assets dùng wrangler chỉ dist; build:min không đưa mã máy chủ/secrets', () => {
  const { readFileSync, existsSync } = require('node:fs');
  const { join } = require('node:path');
  const { execFileSync } = require('node:child_process');
  const root = join(__dirname, '..');
  assert.equal(existsSync(join(root, 'wrangler.jsonc')), true);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal('wrangler' in pkg.devDependencies, false, 'không thêm dependency cho client; CLI deploy riêng');
  assert.equal('deploy' in pkg.scripts, false, 'deploy phải chạy thủ công sau khi chủ dự án phê duyệt');
  assert.equal('preview' in pkg.scripts, false);
  execFileSync(process.execPath, [join(root, 'tools/build-dist.cjs')], { stdio: 'pipe' });
  assert.ok(existsSync(join(root, 'dist/_headers')));
  assert.ok(existsSync(join(root, 'dist/index.html')));
  assert.ok(existsSync(join(root, 'dist/client/config.js')));
  assert.doesNotMatch(readFileSync(join(root, 'dist/client/config.js'), 'utf8'), /sb_secret_|service_role|JWT_SECRET/);
  for (const leak of ['server', 'tests', 'docs', 'tools', 'package.json', 'wrangler.jsonc']) assert.equal(existsSync(join(root, 'dist', leak)), false, leak);
});
