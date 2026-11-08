'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('chỉ số và mô tả linh căn không dùng thuật ngữ Tốc tu hoặc MP làm tên hiển thị', () => {
  const core = read('client/ui/core.js'), roots = read('data/roots.js'), sect = read('data/adventures.js');
  assert.match(core, /rate: 'Tốc độ hấp thụ linh khí'/);
  assert.match(core, /mp: 'Linh lực'/);
  assert.doesNotMatch(roots, /Tốc tu|tốc tu/);
  assert.doesNotMatch(sect, /bonus: 'Tốc tu/);
  assert.match(sect, /Hấp thụ linh khí \+3%/);
});

test('kinh mạch diễn giải chỉ số bằng tiếng Việt, không lộ ký hiệu công thức', () => {
  const M = require('../data/meridians.js');
  const descriptions = [...M.CHINH_KINH, ...M.KY_KINH, M.THIEN_MACH];
  assert.ok(descriptions.length >= 20);
  for (const m of descriptions) {
    assert.doesNotMatch(m.stat + '; ' + m.perfect, /\b(?:hp|mp|atk|def|sta|crit|eva|crit_dame)\b/i, m.name);
  }
});

test('bảng chiến đấu giữ mã đối thủ nội bộ nhưng dùng tên huyền huyễn', () => {
  const combat = read('client/ui/screens/combat.js');
  const adventure = read('client/ui/screens/adventures.js');
  assert.doesNotMatch(combat, /data-kind=|enemyCard\(\)/);
  assert.match(combat, /Nhật ký lịch luyện/);
  assert.match(read('engine/rules/time.js'), /exploring\.kind === 'monster'/);
  assert.match(adventure, /meter\('Linh lực', s\.mp/);
  assert.match(adventure, /'% linh lực'/);
  assert.doesNotMatch(adventure, /'Linh khí', s\.mp/);
});

test('màn thiên kiếp khớp luật tự động vượt tiểu cảnh, không nói sai về xác suất', () => {
  const trib = read('client/ui/screens/tribulation.js');
  const progression = read('engine/rules/progression.js');
  const shell = read('client/ui/shell.js');
  assert.match(progression, /autoStage\(\)/);
  assert.match(trib, /đạo thân tự vượt qua bình cảnh tiểu cảnh giới/);
  assert.doesNotMatch(trib, /Tầng nhỏ không triệu hồi lôi kiếp\. Đột phá dựa hoàn toàn vào xác suất/);
  assert.match(trib, /Kiếp vận tích lũy/);
  assert.match(shell, /\$\{s\.pity\}\/15 kiếp vận/);
  assert.doesNotMatch(shell, /bảo hiểm hiện tại/);
});

test('trạm truyền âm thông báo tình trạng chưa kết nối mà không lộ đường dẫn kỹ thuật', () => {
  const chat = read('client/ui/screens/chat.js');
  assert.match(chat, /TRUYỀN ÂM · VẠN GIỚI/);
  assert.match(chat, /Trạm truyền âm hiện chưa khai mở/);
  assert.doesNotMatch(chat, /TRUYỀN ÂM · DEMO|<code>\/api\/chat|docs\/backend-plan/);
  assert.match(chat, /chat-bubble-icon/);
});

test('kỳ nhân và xã giao sử dụng lời thoại trung tính, hợp thế giới tu tiên', () => {
  const world = read('client/ui/screens/world.js');
  const social = read('data/social.js');
  assert.doesNotMatch(world, /id: 'npc', label: 'Kỳ nhân'/);
  assert.match(world, /row\('Thân phận',esc\(roleName\)\)/);
  assert.doesNotMatch(world, /title: 'Nhiệm vụ NPC'/);
  assert.match(social, /Linh khí quanh đạo hữu/);
  assert.doesNotMatch(social, /người huynh|nhập lô hàng hiếm|Dẹp đường buôn/);
});

test('giữ nguyên cấu trúc thông số và tên khoá trò chơi', () => {
  const skill = read('engine/rules/combat.js');
  const social = read('engine/rules/social.js');
  const save = read('engine/state/player.js');
  assert.match(skill, /UI\.command\('skill'/);
  assert.match(social, /DESIGN\.npc\[id\]/);
  assert.match(save, /x\.enemyKind = \['thường', 'tinh anh', 'boss', 'boss kiếp'\]/);
  assert.doesNotMatch(save, /x\.logs\.unshift\('Đã chuyển bản lưu V5 sang V6/);
});
