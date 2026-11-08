'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function preview() {
  const now = Date.now(), ZONES = [
    { id: 0, name: 'Thanh Vân Sơn', realm: 0, desc: 'Luyện Khí' },
    { id: 1, name: 'Trúc Ảnh Lâm', realm: 1, desc: 'Trúc Cơ' }
  ];
  const s = { zone: 0, realm: 0, logs: ['Một chuyến đi mới bắt đầu.'],
    exploration: { active: null, last: null } };
  let screen = null;
  const actions = {};
  const kit = {
    $: () => null, esc: v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    num: String,
    btn: (label, action, attrs = '', disabled = false) =>
      '<button data-act="' + action + '" ' + attrs + (disabled ? ' disabled' : '') + '>' + label + '</button>',
    card: (title, body) => '<section class="card"><h2>' + title + '</h2>' + body + '</section>'
  };
  const context = { HU_GAME: { ZONES, F: { REALMS: ['Luyện Khí', 'Trúc Cơ'] } },
    HU_UI: { s: () => s, kit, register: x => { screen = x; }, action: (name, fn) => { actions[name] = fn; } } };
  vm.runInNewContext(read('client/ui/screens/combat.js'), { window: context, Date });
  return { s, screen, actions, now };
}

test('Lịch luyện chỉ gồm hai khung: chọn địa điểm và nhật ký', () => {
  const { screen } = preview(), html = screen.panel();
  assert.equal((html.match(/class="card"/g) || []).length, 2);
  assert.match(html, /Chọn nơi lịch luyện/);
  assert.match(html, /Nhật ký lịch luyện/);
  assert.match(html, /data-act="travel"/);
  assert.match(html, /data-act="exploreStart"/);
  assert.doesNotMatch(html, /data-act="strike"|data-act="skill"|enemyHpText|kind-toolbar|data-act="auto"/);
});

test('trong 10 phút nút chọn nơi bị khóa, đồng hồ bắt đầu ở 10:00', () => {
  const { s, screen, now } = preview();
  s.exploration.active = { start: now, end: now + 600000, kind: 'monster' };
  const html = screen.panel();
  assert.equal((html.match(/class="card"/g) || []).length, 2);
  assert.match(html, /id="explorationCountdown">10:00/);
  assert.doesNotMatch(html, /data-act="exploreStart"/);
  assert.match(html, /data-act="travel"[^>]*disabled/);
});

test('trạng thái đi bộ hoặc nghỉ thiền có nhịp ổn định và thay đổi trong chuyến đi', () => {
  const source = read('client/ui/shell.js');
  const begin = source.indexOf('  function explorationPose(');
  const end = source.indexOf('  function stageFrame(', begin);
  assert.ok(begin >= 0 && end > begin);
  const pose = new Function(source.slice(begin, end) + '; return explorationPose;')();
  const start = 1700000000000;
  const found = new Set();
  for (let i = 0; i < 66; i++) {
    const time = start + i * 9000 + 500;
    found.add(pose(start, time));
    assert.equal(pose(start, time), pose(start, time + 700), 'animation phải giữ tư thế giữa hai khung hình');
  }
  assert.deepEqual([...found].sort(), ['di_chuyen', 'dung_yen']);
});

test('không thể rời bí cảnh bằng đóng cửa sổ, menu, hash hoặc phím tắt khi đang lịch luyện', () => {
  const shell = read('client/ui/shell.js'), html = read('index.html'), css = read('css/shell.css');
  assert.match(shell, /if \(id === 'combat' && UI\.s\(\)\.exploration\?\.active\)/);
  assert.match(shell, /if \(UI\.s\(\)\.exploration\?\.active && id !== 'combat'\)/);
  assert.match(shell, /if \(wasExploring && !UI\.s\(\)\.exploration\?\.active\)/);
  assert.match(shell, /go\('idle'\)/);
  assert.match(css, /#game\[data-stage="combat"\] #stage #enemyActor/);
  assert.match(css, /#game\[data-stage="combat"\] #stage #skillDock/);
  assert.ok(html.includes('id="enemyActor"'), 'markup vẫn được giữ lại để không phá màn cũ');
  assert.doesNotMatch(read('client/ui/screens/combat.js'), /enemyCard\(\)|skillbar\(\)/);
});

test('khi nạp lại game, tiếp tục chuyến đang chạy hoặc tự về đài nếu đã hết giờ', () => {
  const boot = read('client/ui/boot.js');
  assert.match(boot, /const wasExploring = !!s\.exploration\?\.active/);
  assert.match(boot, /const target = s\.exploration\?\.active \? 'combat' : wasExploring \? 'idle'/);
  assert.match(boot, /if \(wasExploring && !UI\.s\(\)\.exploration\?\.active\)/);
  assert.match(boot, /UI\.go\('idle'\)/);
});

test('chỉ được đổi nơi trước khi khởi hành; chạm trán yêu thú được kết toán khi trở về', () => {
  const combat = read('engine/rules/combat.js'), time = read('engine/rules/time.js');
  assert.match(combat, /if \(this\.s\.exploration\?\.active\) throw Error\('Đang lịch luyện; chưa thể đổi địa điểm/);
  assert.match(time, /const foe = this\.enemy\(\), chance = F\.win_probability/);
  assert.match(time, /this\.collectLoot\(1, false\)/);
  assert.match(time, /s\.exploration\.active = null/);
});
