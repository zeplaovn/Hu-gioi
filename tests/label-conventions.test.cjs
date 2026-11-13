/* Quy ước nhãn: một nguồn màu/hiệu ứng duy nhất cho độ hiếm, linh căn, chỉ số,
   cảnh giới chat, danh phận và tông môn. Test này chặn lệch dữ liệu và CSS. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const L = require('../client/ui/labels.js');
const H = require('../data/character.js');
const M = require('../data/meridians.js');
const A = require('../data/adventures.js');
const F = require('../data/formulas.js');

const BG = '#0a1410';
const luminance = hex => {
  const value = String(hex).replace('#', '');
  const rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
};
const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};

test('index.html nạp labels.js sau core và trước mọi màn hình', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  const labels = scripts.indexOf('client/ui/labels.js');
  const core = scripts.indexOf('client/ui/core.js');
  const firstScreen = scripts.findIndex(src => src.startsWith('client/ui/screens/'));
  assert.ok(core >= 0, 'core.js phải được nạp');
  assert.ok(labels > core, 'labels.js phải nạp sau core.js');
  assert.ok(firstScreen > labels, 'labels.js phải nạp trước các màn hình');
});

test('miền nhãn khớp dữ liệu gốc: phẩm chất, độ hiếm, hệ, linh căn', () => {
  assert.deepEqual(Object.values(L.DOMAINS.quality.keys).map(x => x.name), F.SUBPHAM);
  for (const [key, item] of Object.entries(M.RARITY)) {
    const entry = L.entry('rarity', key);
    assert.equal(entry.name, item.name, 'rarity ' + key);
    assert.equal(entry.color.toLowerCase(), item.color.toLowerCase(), 'màu rarity ' + key);
  }
  for (const [name, color] of Object.entries(M.HE_COLOR)) {
    const entry = L.entry('element', name);
    assert.equal(entry.name, name, 'element ' + name);
    assert.equal(entry.color.toLowerCase(), color.toLowerCase(), 'màu element ' + name);
  }
  for (const [type, info] of Object.entries(H.ROOT_TYPES)) {
    const entry = L.entry('root', type);
    assert.equal(entry.name, type, 'root ' + type);
    assert.match(info.group, /^(ngu_hanh|di|chi_ton)$/);
  }
  assert.equal(H.ROOT_TYPES['Âm Dương'], undefined, 'không còn Âm Dương linh căn');
  assert.equal(F.LINH_CAN_RATE['Âm Dương'], undefined, 'không còn hệ số Âm Dương');
  assert.equal(L.DOMAINS.root.keys.amDuong, undefined);
  assert.doesNotMatch(read('client/ui/labels.js'), /Âm Dương linh căn/);
});

test('miền nhãn khớp thiên phú, thiên mệnh, kỳ ngộ, tông môn và danh phận', () => {
  for (const talent of H.TALENT_INFO) {
    assert.equal(L.entry('talent', talent.key).name, talent.name, 'talent ' + talent.key);
  }
  for (const [key, item] of Object.entries(H.META_UPGRADES)) {
    assert.equal(L.entry('destiny', key).name, item.name, 'destiny ' + key);
  }
  for (const [key, item] of Object.entries(H.PAVILION.stats)) {
    assert.equal(L.entry('talent', key).name, item.name, 'pavilion ' + key);
  }
  assert.deepEqual(
    Object.values(L.DOMAINS.encounter.keys).map(x => x.name),
    A.ENCOUNTER_RARITIES.map(x => x.name)
  );
  for (const sect of A.SECTS) {
    const entry = L.entry('sect', sect.id);
    assert.equal(entry.name, sect.name, 'sect ' + sect.id);
  }
  for (const disciple of Object.values(A.SECT_DISCIPLES)) {
    assert.equal(L.entry('role', disciple.id).name, disciple.name, 'role ' + disciple.id);
  }
  for (const key of ['qi', 'qiRate', 'hp', 'mp', 'sta', 'atk', 'def', 'spd', 'cp', 'crit', 'critDamage', 'dodge']) {
    assert.ok(L.entry('stat', key).name, 'stat ' + key);
  }
});

test('alias tiếng Việt và khóa số cảnh giới tra đúng một lớp duy nhất', () => {
  assert.match(L.classFor('root', 'Thiên linh căn'), /hu-label--root-thien\b/);
  assert.match(L.classFor('quality', 'Hạ phẩm'), /hu-label--quality-ha\b/);
  assert.match(L.classFor('role', 'than_truyen'), /hu-label--role-direct-disciple\b/);
  assert.match(L.classFor('realm', 'Đạo Tổ'), /hu-label--realm-13\b/);
  assert.match(L.classFor('realm', 13), /hu-label--realm-13\b/);
  assert.throws(() => L.entry('root', 'Âm Dương'), /không hợp lệ/);
  assert.throws(() => L.entry('domain-không-có', 'x'), /Miền nhãn/);
  const classes = [...L.buildCss().matchAll(/^\.hu-label--([a-z]+)-([a-z0-9-]+)\{/gm)]
    .map(match => match[1] + '-' + match[2]);
  assert.equal(new Set(classes).size, classes.length, 'mỗi khóa chỉ sinh một lớp');
});

test('span thoát HTML và chỉ giữ lớp bố cục hợp lệ', () => {
  const html = L.span('<img src=x onerror="alert(1)">', 'quality', 'Hạ', {
    title: '" onmouseover="alert(1)',
    className: 'inv-sub is-current foo" onclick="x'
  });
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /class="hu-label /);
  assert.match(html, /inv-sub/);
  assert.match(html, /is-current/);
  assert.doesNotMatch(html, /foo"|onclick=/);
  assert.match(html, /title="&quot; onmouseover=&quot;alert\(1\)"/);
});

test('CSS sinh ra có reduced-motion và mọi màu chữ đạt tương phản 4.5:1', () => {
  const css = L.buildCss();
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css, /animation:none!important/);
  const failures = [];
  for (const [domain, def] of Object.entries(L.DOMAINS)) {
    for (const [key, item] of Object.entries(def.keys)) {
      const ratio = contrast(item.color, BG);
      if (ratio < 4.5) failures.push(domain + ':' + key + ' = ' + item.color + ' (' + ratio.toFixed(2) + ':1)');
    }
  }
  assert.deepEqual(failures, []);
});

test('các màn hình chính lấy nhãn từ HU_LABELS', () => {
  const files = {
    'client/ui/screens/chat.js': /L\.apply\(tag, 'realm'/,
    'client/ui/screens/character.js': /L\.span\(label, 'stat'/,
    'client/ui/screens/adventures.js': /L\.span\(d\.name, 'encounter'/,
    'client/ui/screens/meta.js': /L\.span\(d\.name, 'destiny'/
  };
  for (const [file, pattern] of Object.entries(files)) {
    assert.match(read(file), pattern, file);
  }
});
