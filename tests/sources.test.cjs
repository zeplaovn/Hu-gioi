/* Kiểm tra nguồn: cú pháp toàn bộ JavaScript và ranh giới thuần của engine/. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const vm = require('node:vm');

const ROOT = join(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) out.push(...walk(file));
    else if (/\.(?:c?js|mjs)$/.test(name)) out.push(file);
  }
  return out;
}

function engineFiles() {
  return walk(join(ROOT, 'engine')).filter(file => file.endsWith('.js'));
}

function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

test('cú pháp: mọi file JavaScript trong dự án đều biên dịch được', () => {
  const files = ['data', 'engine', 'client', 'server', 'tests'].flatMap(dir => walk(join(ROOT, dir)));
  assert.ok(files.length >= 50);
  for (const file of files) {
    assert.doesNotThrow(() => new vm.Script(readFileSync(file, 'utf8'), { filename: relative(ROOT, file) }), relative(ROOT, file));
  }
});

test('ranh giới: engine/ không dùng DOM, lưu trữ, mạng, timer, đồng hồ hay RNG toàn cục', () => {
  const forbidden = [
    /\bDate\.now\s*\(/,
    /\bMath\.random\s*\(/,
    /\bdocument\s*\./,
    /\bwindow\s*\./,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\brequestAnimationFrame\s*\(/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /require\(\s*['"](?:fs|path|http|https|os|crypto|child_process|net|worker_threads)['"]\s*\)/
  ];
  for (const file of engineFiles()) {
    const code = codeOnly(readFileSync(file, 'utf8'));
    for (const pattern of forbidden) assert.doesNotMatch(code, pattern, relative(ROOT, file));
  }
});

test('index.html nạp data trước engine và engine trước client', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  const at = prefix => scripts.findIndex(src => src.startsWith(prefix));
  const data = at('data/');
  const state = at('engine/state/');
  const rules = at('engine/rules/');
  const protocol = at('engine/protocol/');
  const game = at('engine/game.js');
  const client = at('client/main.js');
  assert.ok(data >= 0 && state > data, 'data trước engine/state');
  assert.ok(rules > state, 'engine/state trước engine/rules');
  assert.ok(protocol > rules, 'engine/rules trước engine/protocol');
  assert.ok(game > protocol, 'engine/protocol trước engine/game');
  assert.ok(client > game, 'engine/game trước client/main');
  const sources = scripts.slice(data, game + 1);
  for (const name of ['progression', 'inventory', 'crafting', 'combat', 'world', 'adventures', 'social', 'time', 'creation'])
    assert.ok(sources.includes('engine/rules/' + name + '.js'), name);
});
