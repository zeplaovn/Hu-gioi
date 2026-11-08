'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname,'..');
const read = path => readFileSync(join(root,path),'utf8');

test('đạo thân có kích thước theo chiều ngang và cao thực tế của sân khấu', () => {
  const shell=read('client/ui/shell.js'),css=read('css/player-pack.css');
  assert.match(shell,/stageEl\.clientWidth \* \.20/);
  assert.match(shell,/stageEl\.clientHeight \* \.32/);
  assert.match(shell,/actor\.style\.setProperty\('--hero-unit'/);
  assert.match(css,/width: 124%/);
  assert.match(css,/width: 122%/);
});

test('chat nổi kéo thả bằng con trỏ/cảm ứng, lưu vị trí và không mở khi kết thúc kéo', () => {
  const chat=read('client/ui/screens/chat.js'),css=read('css/chat.css');
  assert.match(chat,/huGioiChatBubblePosition/);
  assert.match(chat,/setPointerCapture/);
  assert.match(chat,/addEventListener\('pointermove'/);
  assert.match(chat,/addEventListener\('pointercancel'/);
  assert.match(chat,/dragSuppressClick/);
  assert.match(chat,/localStorage\?\.setItem/);
  assert.match(css,/touch-action:none/);
});

test('bản đồ lớn duy nhất hỗ trợ phóng to, thu nhỏ và kéo vuốt', () => {
  const world=read('client/ui/screens/world.js');
  const css=read('css/screens.css');
  assert.doesNotMatch(world, /class="map-grid"/);
  assert.doesNotMatch(world, /class="realm-card/);
  assert.match(world, /class="map-viewport"/);
  assert.match(world, /data-map-zoom="in"/);
  assert.match(world, /data-map-zoom="out"/);
  assert.match(world, /data-map-zoom="reset"/);
  assert.match(world, /addEventListener\('wheel'/);
  assert.match(world, /addEventListener\('pointermove'/);
  assert.match(world, /addEventListener\('keydown'/);
  assert.match(css, /\.interactive-map \.map-image/);
});

test('Thế giới không còn tab Kỳ ngộ và Kỳ nhân; cả hai nằm trong Lịch luyện', () => {
  const world=read('client/ui/screens/world.js');
  const combat=read('client/ui/screens/combat.js');
  assert.doesNotMatch(world, /\{ id: 'encounter', label: 'Kỳ ngộ'/);
  assert.doesNotMatch(world, /\{ id: 'npc', label: 'Kỳ nhân'/);
  assert.match(world, /UI\.lorePanels = \{ npcs, encounter \}/);
  assert.match(combat, /Chọn nơi lịch luyện/);
  assert.match(combat, /Nhật ký lịch luyện/);
  assert.doesNotMatch(combat, /UI\.lorePanels\?\.npcs|enemyCard\(\)|skillbar\(\)/);
  assert.match(combat, /explorationCountdown/);
});

test('loại bỏ nút Nhập định/Tự chiến và sử dụng nút Lịch luyện để khởi hành ngẫu nhiên', () => {
  const html=read('index.html');
  const shell=read('client/ui/shell.js');
  const combat=read('client/ui/screens/combat.js');
  const env=read('client/ui/environment.js');
  assert.doesNotMatch(html, /modeMeditate|modeFight|idleModeSwitch|autoCombatToggle/);
  assert.match(combat, /UI\.command\('startExploration'\)/);
  assert.match(shell, /const mode = \(exploring \|\| wins\.has\('combat'\)\) \? 'combat' : 'idle'/);
  assert.match(combat, /UI\.action\('exploreStart'/);
  assert.doesNotMatch(combat, /UI\.action\('auto'/);
  assert.match(env, /A\.BG\.combat/);
  assert.match(env, /A\.BG\.combatFallback/);
});

test('engine không tính tu vi và nghề phụ trong 600 giây lịch luyện', () => {
  const time=read('engine/rules/time.js');
  const combat=read('engine/rules/combat.js');
  const protocol=read('engine/protocol/commands.js');
  assert.match(combat, /end: now \+ 600000/);
  assert.match(time, /const pauseMs = Math\.max/);
  assert.match(time, /job\.end \+= pauseMs/);
  assert.match(time, /plot\.plantedAt \+= pauseMs; plot\.end \+= pauseMs/);
  assert.match(time, /s\.lastUpdate = now;[\s\S]{0,110}return \{ \.\.\.empty\(\), exploring: true/);
  assert.match(protocol, /pausedActions\.includes\(c\.type\)/);
});


test('cửa sổ Lịch luyện đóng được và các menu khác mở được khi đang du hành', () => {
  const shell = read('client/ui/shell.js');
  const windows = shell.slice(shell.indexOf('  const wins = {'), shell.indexOf('  UI.windows = wins;'));
  const routing = shell.slice(shell.indexOf('  function go(target,'), shell.indexOf('  function updateChrome()'));
  const hash = shell.slice(shell.indexOf("root.addEventListener('hashchange'"), shell.indexOf("root.addEventListener('resize'"));
  assert.ok(windows.length > 1000 && routing.length > 100, 'phải tìm thấy mã điều hướng');
  assert.doesNotMatch(windows, /exploration\?\.active/, 'không khóa cửa sổ trong chuyến lịch luyện');
  assert.doesNotMatch(routing, /exploration\?\.active/, 'không ép trở lại Lịch luyện');
  assert.doesNotMatch(hash, /exploration\?\.active/, 'đổi đường dẫn vẫn vào menu được');
  assert.match(windows, /if \(id === 'combat'\) this\.saveRect\(id, w\.rect\)/);
  assert.match(shell, /if \(wins\.has\('combat'\)\) wins\.close\('combat'\)/, 'menu Lịch luyện phải đóng/mở luân phiên');
});

test('đang lịch luyện vẫn không được đổi vùng hoặc khởi hành chuyến khác', () => {
  const combat = read('client/ui/screens/combat.js');
  const protocol = read('engine/protocol/commands.js');
  assert.match(combat, /journey \|\| z\.realm > s\.realm \? 'disabled' : ''/);
  assert.match(combat, /if \(UI\.s\(\)\.exploration\?\.active\) throw Error/);
  assert.match(protocol, /startExploration: \{\}/);
});

test('khôi phục hoặc trở lại tab không tự cướp trang người chơi đang xem', () => {
  const boot = read('client/ui/boot.js');
  assert.match(boot, /const requested = UI\.screens\[hash\[0\]\]/);
  assert.match(boot, /if \(UI\.current === 'combat' \|\| UI\.windows\.has\('combat'\)\) UI\.go\('idle'\)/);
  assert.doesNotMatch(boot, /else if \(UI\.s\(\)\.exploration\?\.active\) UI\.go\('combat'/);
});

test('đạo thân đi bộ có điểm neo chân ở tiền cảnh', () => {
  const css = read('css/player-pack.css');
  assert.match(css, /#game\[data-stage="combat"\] #stage #heroActor\s*\{[\s\S]*?top:87%;/);
  assert.match(css, /#game\[data-stage="combat"\] #stage #heroActor\s*\{[\s\S]*?transform:translate\(-50%,-100%\)/);
});
