/* Hư Giới — kiểm tra vệ sinh repo không tác động luật gameplay. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = ['README.md', 'data/README.md', 'docs/architecture.md', 'docs/design-integration.md'];
const MD_LINK = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;

test('đường dẫn tài liệu cốt lõi không bị hỏng sau khi chuyển kiến trúc online', () => {
  for (const doc of DOCS) {
    const source = fs.readFileSync(path.join(ROOT, doc), 'utf8');
    for (const [, destination] of source.matchAll(MD_LINK)) {
      const link = destination.trim().split(/[\s#?]/)[0];
      if (!link || /^(?:https?:|mailto:|data:|#|\/)/i.test(link)) continue;
      const target = path.resolve(ROOT, path.dirname(doc), decodeURIComponent(link));
      assert.ok(target.startsWith(ROOT + path.sep), 'Liên kết thoát repository: ' + doc + ' → ' + link);
      assert.ok(fs.existsSync(target), 'Liên kết tài liệu hỏng: ' + doc + ' → ' + link);
    }
  }
});

test('không có file nhãn thư mục giả dưới media/ (tệp 1 byte, thiếu phần mở rộng)', () => {
  const unexpected = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && !path.extname(file) && fs.statSync(file).size <= 1)
        unexpected.push(path.relative(ROOT, file));
    }
  };
  walk(path.join(ROOT, 'media'));
  assert.deepEqual(unexpected, [], 'Các file nhãn thư mục cần được xóa khỏi Git');
});

test('tài liệu kiến trúc hiện hành không quảng bá phiên offline V8/51 lệnh', () => {
  const architecture = fs.readFileSync(path.join(ROOT, 'docs/architecture.md'), 'utf8');
  const integration = fs.readFileSync(path.join(ROOT, 'docs/design-integration.md'), 'utf8');
  assert.match(architecture, /state V9/i);
  assert.match(architecture, /48 lệnh/);
  assert.match(integration, /online-only/);
  assert.doesNotMatch(architecture, /Schema V8|51 lệnh|Game chơi được.*offline/);
  assert.doesNotMatch(integration, /Schema lưu hiện là V8/);
});

test('Docker HEALTHCHECK và meta CSP cùng origin, không còn chú thích offline-only', () => {
  const docker = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const adapter = fs.readFileSync(path.join(ROOT, 'client/auth/supabase.js'), 'utf8');
  const cspMeta = html.split('\n').find(line => line.includes('http-equiv="Content-Security-Policy"'));
  assert.match(docker, /HEALTHCHECK[^\n]*[\s\S]*?\/api\/health/);
  assert.ok(cspMeta);
  assert.doesNotMatch(cspMeta, /file:/);
  assert.doesNotMatch(adapter, /gameplay remains offline-only/);
});

test('tài liệu triển khai không còn hướng dẫn Wrangler hoặc tách frontend khỏi Node', () => {
  const documents = fs.readdirSync(path.join(ROOT, 'docs')).filter(name => name.endsWith('.md'));
  for (const file of ['README.md', ...documents.map(name => path.join('docs', name))]) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(text, /wrangler\s+deploy|wrangler\.jsonc/i, file + ' không được hướng dẫn Wrangler');
  }
  for (const file of ['docs/security.md', 'docs/supabase-security-setup.md']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(text, /Docker(?: Compose)?/);
    assert.match(text, /reverse proxy HTTPS/);
    assert.match(text, /cùng origin/);
  }
});
