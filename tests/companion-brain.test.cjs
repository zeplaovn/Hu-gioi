/* Bộ não Linh Hồ: tình huống, leo thang, trí nhớ hội thoại, hiểu ý (có/không dấu). Thuần hàm, không DOM. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(clock = { t: 0 }) {
  const ctx = vm.createContext({ Math: Object.assign(Object.create(Math), { random: () => 0 }), Date: { now: () => clock.t } });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../client/ui/companion-brain.js'), 'utf8'), ctx);
  return { brain: ctx.HU_COMPANION_BRAIN.create(), lib: ctx.HU_COMPANION_BRAIN, clock };
}
const base = (o = {}) => ({
  name: 'Vân Lam', realm: 0, stage: 3, realmName: 'Luyện Khí', hp: 100, maxHp: 100, hpPct: 1, qi: 20, need: 100, qiPct: 0.2,
  completed: false, age: 20, maxLife: 100, lifeLeft: 80, gardenReady: 0, craftReady: 0, sectJoined: true,
  hasMission: false, missionDone: false, mission: null, ...o
});

test('Tình huống nguy cấp được xếp theo độ gấp: sinh lực > thọ nguyên > đột phá > linh điền', () => {
  const { lib } = load();
  const f = base({ hpPct: 0.1, hp: 10, lifeLeft: 2, qi: 100, qiPct: 1, gardenReady: 2 });
  assert.equal(lib.scan(f).map(x => x.id).slice(0, 4).join(','), 'hp,life,break,garden');
  assert.equal(lib.scan(base({ hpPct: 0.5 })).some(x => x.id === 'hp'), false);
});

test('Cảnh báo có hồi chiêu theo từng việc và càng bỏ mặc càng gắt, hết tình huống thì quên', () => {
  const { brain, clock } = load();
  const bad = base({ hpPct: 0.1, hp: 10 });
  const a = brain.urgent(bad); assert.equal(a.kind, 'warn'); assert.match(a.text, /^Cảnh báo: Sinh lực/);
  clock.t += 30000; assert.equal(brain.urgent(bad), null, 'chưa hết hồi chiêu 60s');
  clock.t += 31000; assert.match(brain.urgent(bad).text, /Cảnh báo lần hai.*10%/);
  clock.t += 61000; assert.match(brain.urgent(bad).text, /Ngươi điếc à.*10%/);
  clock.t += 61000; assert.match(brain.urgent(bad).text, /Ngươi điếc à/, 'giữ mức gắt nhất');
  assert.equal(brain.urgent(base()), null); // hồi máu → quên
  clock.t += 61000; assert.match(brain.urgent(bad).text, /^Cảnh báo: Sinh lực/, 'tái phát thì nhắc nhẹ lại từ đầu');
});

test('Thọ nguyên sắp cạn và tu vi đầy sinh nhắc việc đúng số liệu', () => {
  const { brain, clock } = load();
  assert.match(brain.urgent(base({ lifeLeft: 4 })).text, /khoảng 4 năm/);
  clock.t += 61000;
  assert.match(brain.urgent(base({ qi: 100, qiPct: 1 })).text, /Tu vi đã đầy/);
  assert.equal(brain.urgent(base({ completed: true, lifeLeft: 1, qi: 100, qiPct: 1 })), null, 'viên mãn thì không nhắc thọ nguyên/đột phá');
});

test('Sự kiện: đột phá được khen đúng loại, nhiệm vụ qua nửa được khen một lần, lần đầu quan sát không khen nhầm', () => {
  const { brain } = load();
  assert.equal(brain.observe(base()), null);
  assert.match(brain.observe(base({ stage: 4 })).text, /Luyện Khí tầng 4/);
  const up = brain.observe(base({ realm: 1, stage: 1, realmName: 'Trúc Cơ' }));
  assert.equal(up.kind, 'praise'); assert.equal(up.always, true); assert.match(up.text, /bước vào Trúc Cơ/);
  assert.equal(brain.observe(base({ realm: 0, stage: 1 })), null, 'tụt cảnh giới (kiếp mới) không khen');
  const m = { name: 'Trừ yêu', unit: 'yêu thú', progress: 3, left: 2, count: 5 };
  assert.match(brain.observe(base({ realm: 0, stage: 1, hasMission: true, mission: m })).text, /một nửa/);
  assert.equal(brain.observe(base({ realm: 0, stage: 1, hasMission: true, mission: m })), null, 'chỉ khen một lần');
});

test('Về lại sau khi vắng: chỉ chào khi vắng từ 5 phút, kèm việc cần làm thật', () => {
  const { brain } = load();
  assert.equal(brain.welcome(base(), 4 * 60000), null);
  assert.match(brain.welcome(base({ gardenReady: 1 }), 12 * 60000).text, /Vắng ròng rã 12 phút.*Linh điền/);
  assert.match(brain.welcome(base(), 3 * 3600000).text, /3 giờ/);
});

test('Hiểu ý người chơi: gõ có dấu, không dấu, nhiều cách hỏi', () => {
  const { lib } = load(), u = lib.create().understand;
  const cases = {
    'tình hình sao rồi': 'status', 'tinh hinh the nao': 'status', 'bao cao di': 'status',
    'bao giờ đột phá': 'breakthrough', 'dot pha': 'breakthrough', 'còn bao nhiêu tuổi thọ': 'life', 'tho nguyen': 'life',
    'máu tôi sao': 'hp', 'sinh lực': 'hp', 'thu hoạch linh dược': 'garden', 'lò luyện xong chưa': 'craft',
    'tông môn': 'sect', 'cho nhiệm vụ': 'mission', 'nhiệm vụ tới đâu rồi': 'mission_progress', 'hủy nhiệm vụ': 'cancel',
    'gợi ý': 'suggest', 'làm gì bây giờ': 'suggest', 'nên làm gì': 'suggest', 'kể chuyện cười': 'joke',
    'mệt quá': 'sad', 'cảm ơn': 'thanks', 'xin chào': 'greet', 'hello': 'greet', 'bạn là ai': 'who', 'em tên gì': 'who',
    'ngu quá': 'insult', 'tạm biệt': 'bye', 'bạn giỏi quá': 'praise', 'giúp tôi': 'help', 'blah blah': 'unknown'
  };
  for (const [text, intent] of Object.entries(cases)) assert.equal(u(text), intent, text);
  assert.equal(u('người ngoài'), 'unknown', '"ngu" nằm trong từ khác không bị bắt nhầm');
});

test('Trả lời bằng số liệu thật của nhân vật', () => {
  const { brain } = load();
  const f = base({ hpPct: 0.5, hp: 50, qi: 40, qiPct: 0.4, lifeLeft: 80, gardenReady: 2, craftReady: 1, sectJoined: false, realm: 1, realmName: 'Trúc Cơ' });
  const status = brain.reply('tình hình', f).text;
  assert.match(status, /Vân Lam.*Trúc Cơ tầng 3.*Tu vi 40%.*sinh lực 50%.*80 năm/);
  assert.match(brain.reply('bao giờ đột phá', f).text, /40%.*60% nữa/);
  assert.match(brain.reply('sinh lực', f).text, /50%/);
  assert.match(brain.reply('linh điền', f).text, /2 cây linh dược/);
  assert.match(brain.reply('lò luyện', f).text, /1 món/);
  assert.match(brain.reply('tông môn', f).text, /chưa có tông môn/);
  assert.match(brain.reply('đột phá', base({ qi: 100, qiPct: 1 })).text, /đã đầy/);
  assert.match(brain.reply('đột phá', base({ completed: true })).text, /viên mãn/);
  assert.match(brain.reply('tuổi thọ', base({ age: 95, maxLife: 100, lifeLeft: 5 })).text, /5 năm.*95\/100/);
});

test('Nhớ chủ đề: "còn gì nữa" đọc tiếp danh sách gợi ý, hết thì bảo đi làm', () => {
  const { brain } = load();
  const f = base({ hpPct: 0.1, hp: 10, qi: 100, qiPct: 1, gardenReady: 1, sectJoined: true });
  const first = brain.reply('gợi ý', f).text;
  assert.match(first, /Việc đáng làm nhất lúc này: hồi sinh lực.*Kế đó: đột phá/);
  assert.match(brain.reply('còn gì nữa', f).text, /Còn nữa: thu hoạch 1 cây ở Linh điền/);
  assert.match(brain.reply('nữa đi', f).text, /Hết việc|Còn nữa/);
  assert.match(load().brain.reply('còn gì nữa', f).text, /Hỏi “gợi ý” hoặc “tình hình”/, 'chưa có chủ đề thì không bịa');
});

test('Hỏi lặp lần thứ ba bị trêu; nhiệm vụ/hủy trả về hành động cho giao diện', () => {
  const { brain } = load(), f = base();
  brain.reply('tình hình', f); brain.reply('tình hình', f);
  assert.match(brain.reply('tình hình', f).text, /không phải con vẹt.*Báo cáo/);
  assert.equal(brain.reply('nhiệm vụ', f).action, 'mission');
  assert.equal(brain.reply('bỏ nhiệm vụ', f).action, 'cancel');
  assert.match(brain.reply('nhiệm vụ tới đâu', base({ hasMission: true, mission: { name: 'Trừ yêu', unit: 'yêu thú', progress: 2, left: 3, count: 5 } })).text, /2\/5.*thiếu 3 yêu thú/);
});

test('Câu lạ không bịa: gợi ý việc thật thay vì trả lời chung chung', () => {
  const { brain } = load();
  assert.match(brain.reply('xyz qwerty', base({ gardenReady: 3 })).text, /thu hoạch 3 cây ở Linh điền/);
});

test('Lời phiếm có điều kiện chỉ nói khi đúng bối cảnh, và không lặp liên tiếp', () => {
  const { brain } = load();
  const seen = new Set();
  for (let i = 0; i < 8; i++) { const line = brain.chatter(base({ hasMission: true, missionDone: true })); seen.add(line.text); }
  assert.ok(seen.size >= 3, 'không lặp một câu');
  const ctx = base({ hpPct: 1, qi: 60, qiPct: 0.6, hasMission: true, mission: { name: 'a', unit: 'x', progress: 0, left: 5, count: 5 } });
  const texts = new Set();
  for (let i = 0; i < 30; i++) { const l = brain.chatter({ ...ctx }); texts.add(l.text); }
  assert.ok([...texts].every(x => !/Mới ở|Đã tới/.test(x) || /Luyện Khí/.test(x)), 'điền đúng tên cảnh giới');
});
