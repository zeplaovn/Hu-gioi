/* Hư Giới — kiểm tra vệ sinh repo không tác động luật gameplay. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const currentDocs = fs.readdirSync(path.join(ROOT, 'docs'))
  .filter(name => name.endsWith('.md')).map(name => 'docs/' + name);
const DOCS = ['README.md', 'data/README.md', ...currentDocs];
const MD_LINK = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;

test('đường dẫn tài liệu cốt lõi không bị hỏng sau khi chuyển kiến trúc online', () => {
  for (const doc of DOCS) {
    const source = fs.readFileSync(path.join(ROOT, doc), 'utf8')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`\n]*`/g, '');
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

test('triển khai Edge có tài liệu riêng, Cloudflare chỉ phục vụ dist; Node gateway vẫn tách riêng cho dev', () => {
  const edge = fs.readFileSync(path.join(ROOT, 'docs/edge-deployment.md'), 'utf8');
  const node = fs.readFileSync(path.join(ROOT, 'docs/archive/online-deployment.md'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  assert.match(edge, /Supabase Edge/i);
  assert.match(edge, /HU_DB_POOLER_URL/);
  assert.match(edge, /game.*RLS|RLS.*game/s);
  assert.match(node, /Node\/SQLite.*dev/i);
  assert.match(node, /HU_AUTH_TRUSTED_PROXY_IPS/);
  assert.match(config, /"directory": "\.\/dist"/);
  assert.doesNotMatch(config, /api\/v1|SUPABASE_SERVICE_ROLE_KEY|node:sqlite/);
  const security = fs.readFileSync(path.join(ROOT, 'docs/security.md'), 'utf8');
  assert.match(security, /Edge/);
  assert.match(security, /JWT/);
  assert.match(security, /CSP/);
});

test('Docker Compose yêu cầu SUPABASE_URL từ môi trường, mẫu nằm trong .env.example', () => {
  const compose = fs.readFileSync(path.join(ROOT, 'compose.yaml'), 'utf8');
  const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  assert.ok(compose.includes('SUPABASE_URL: ${SUPABASE_URL:?Missing Supabase URL}'));
  assert.match(example, /^SUPABASE_URL=https:\/\/[^\s]+/m);
});

test('UI CI kiểm tra cả before/after bằng Node online-ci-server', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/ui-verification.yml'), 'utf8');
  assert.doesNotMatch(workflow, /python -m http\.server/);
  assert.match(workflow, /PORT=8000 node tools\/online-ci-server\.cjs/);
  assert.match(workflow, /PORT=8001 node tools\/online-ci-server\.cjs/);
});

test('B3: generated game.bundle.mjs is not tracked by git, while bundle entry remains source', () => {
  const { execFileSync } = require('node:child_process');
  const artifact = 'supabase/functions/api/game.bundle.mjs';
  const tracked = execFileSync('git', ['ls-files', '--', artifact], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(tracked, '', 'Generated Edge bundle must not be committed');
  assert.ok(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).includes(artifact));
  assert.ok(fs.existsSync(path.join(ROOT, 'supabase/functions/api/_bundle_entry.mjs')));
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/edge-bundle-build.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /npm run build:edge/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /supabase functions deploy api/);
  for (const forbidden of ['git add -f', 'git commit ', 'git push ', 'ops/edge-bundle-deploy-20261110']) {
    assert.equal(workflow.includes(forbidden), false, 'Workflow must not commit/push bundle: ' + forbidden);
  }
});

test('docs hiện hành có trong mục lục, được gắn trạng thái và không còn từ ngữ lỗi thời', () => {
  const index = fs.readFileSync(path.join(ROOT, 'docs/index.md'), 'utf8');
  for (const doc of currentDocs) {
    const name = path.basename(doc);
    const source = fs.readFileSync(path.join(ROOT, doc), 'utf8');
    assert.ok(index.includes('(' + name + ')'), 'docs/index.md thiếu: ' + name);
    assert.match(source, /^> Trạng thái: (Hiện hành|Đề xuất|Lịch sử)/m,
      'Thiếu dòng trạng thái: ' + doc);
    assert.doesNotMatch(source, /HU_API_ORIGIN|49 lệnh/, 'Từ ngữ lỗi thời: ' + doc);
  }
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.trimEnd().split(/\r?\n/).length <= 80, 'README vượt 80 dòng');
  assert.doesNotMatch(readme, /HU_API_ORIGIN|49 lệnh/);
  for (const doc of ['docs/architecture.md', 'docs/edge-deployment.md', 'docs/security.md',
    'docs/engine-contract.md', 'docs/gameplay-v9.md', 'docs/thien-menh-cac.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, doc), 'utf8'),
      /LocalSession(?![^\n]{0,40}legacy)/, 'Thiếu nhãn legacy: ' + doc);
  }
});
