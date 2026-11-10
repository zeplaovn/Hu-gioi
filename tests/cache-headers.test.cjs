/* Đảm bảo Cloudflare _headers và Node server trả cùng cache policy. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRouter } = require('../server/http/router.js');
const root = path.resolve(__dirname, '..');

function cacheRules(source) {
  const rules = [];
  let pattern = null;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { pattern = line.trim(); continue; }
    const m = line.trim().match(/^Cache-Control:\s*(.+)$/i);
    if (m) rules.push({ pattern, value: m[1] });
  }
  return rules;
}
function matches(pattern, requestPath) {
  return pattern.endsWith('*') ? requestPath.startsWith(pattern.slice(0, -1)) : pattern === requestPath;
}

test('mỗi đường dẫn chỉ khớp một Cache-Control trong _headers và dist/_headers', () => {
  const { execFileSync } = require('node:child_process');
  execFileSync(process.execPath, [path.join(root, 'tools/build-dist.cjs')], { stdio: 'pipe' });
  for (const filename of ['_headers', 'dist/_headers']) {
    const rules = cacheRules(fs.readFileSync(path.join(root, filename), 'utf8'));
    const samples = ['/', '/index.html', '/client/config.js', '/client/legal/privacy.html',
      '/engine/game.js', '/data/catalog.js', '/css/base.css', '/media/assets/chars/example.webp',
      '/media/audio/example.ogg'];
    for (const sample of samples) {
      const hit = rules.filter(r => matches(r.pattern, sample));
      assert.equal(hit.length, 1, filename + ' ' + sample + ': ' + JSON.stringify(hit));
      assert.equal(hit[0].value, sample.startsWith('/media/')
        ? 'public, max-age=604800' : 'no-store', sample);
    }
  }
});

test('máy chủ Node trả no-store cho HTML/JS và cache media dài', async t => {
  const server = http.createServer(createRouter());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const get = uri => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path: uri }, res => {
      res.resume(); res.on('end', () => resolve({ status: res.statusCode, cache: res.headers['cache-control'] }));
    }).on('error', reject);
  });
  for (const pathname of ['/index.html', '/client/config.js', '/engine/game.js']) {
    const response = await get(pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.cache, 'no-store', pathname);
  }
  // Media file thực được tìm từ repo để tránh giả định đường dẫn.
  const collect = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) { const found = collect(full); if (found) return found; }
      else if (item.isFile() && /\.(?:webp|png|jpg|mp3|ogg|wav)$/i.test(item.name)) return full;
    }
    return null;
  };
  const sample = collect(path.join(root, 'media'));
  assert.ok(sample, 'cần một asset media thật');
  const media = await get('/' + path.relative(root, sample).split(path.sep).join('/'));
  assert.equal(media.status, 200);
  assert.equal(media.cache, 'public, max-age=604800');
});
