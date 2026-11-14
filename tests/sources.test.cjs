/* Kiểm tra nguồn: mọi file JS biên dịch được, engine thuần, index.html trỏ đúng file, README không trỏ link hỏng. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

test('mọi file JavaScript biên dịch được', () => {
  for (const file of ['data', 'engine', 'client', 'server', 'tests'].flatMap(d => walk(path.join(ROOT, d))).filter(f => /\.c?js$/.test(f)))
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }), file);
});

test('engine thuần: không DOM, mạng, timer hay đồng hồ/ngẫu nhiên trực tiếp', () => {
  const banned = /\b(document|localStorage|fetch|setTimeout|setInterval)\b|window\.|Date\.now\(|Math\.random\(/;
  for (const file of walk(path.join(ROOT, 'engine')).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
    assert.doesNotMatch(code, banned, path.relative(ROOT, file));
  }
});

test('index.html chỉ tham chiếu script và stylesheet còn tồn tại', () => {
  const html = read('index.html');
  for (const [, ref] of html.matchAll(/(?:src|href)="((?:client|css|data|engine)\/[^"?#]+)"/g))
    assert.ok(fs.existsSync(path.join(ROOT, ref)), 'thiếu ' + ref);
});

test('README không có liên kết nội bộ hỏng', () => {
  for (const [, link] of read('README.md').matchAll(/\]\(([^)#\s]+)\)/g))
    if (!/^(https?:|mailto:)/.test(link)) assert.ok(fs.existsSync(path.join(ROOT, link)), 'link hỏng: ' + link);
});

test('repo không chứa file sinh ra', () => {
  const out = require('node:child_process').execSync('git ls-files', { cwd: ROOT }).toString().split('\n');
  assert.deepEqual(out.filter(f => /(^|\/)__pycache__\/|\.pyc$|\.log$|\.DS_Store$/.test(f)), []);
});
