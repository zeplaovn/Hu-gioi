'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const NOW = 1_700_000_000_000;
const PROFILE = { name:'Lâm Vân',gender:'nu',age:18,race:'nhan',
  roots:[72, 61, 45, 44, 33],rootType:'Song',
  talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1} };
/* RNG đổi được giữa chừng: bốc sự kiện bằng một giá trị, kết toán bằng giá trị khác. */
const make = (roll = .5) => {
  const box = { roll };
  const g = new H.Game(H.createCharacter(PROFILE, NOW, () => .5), () => box.roll);
  return { g, box };
};
const run = (g, type, payload = {}, now = NOW) => C.execute(g, { type, payload }, now);

test('tỉ lệ sự kiện khởi hành: quái 45% · NPC 30% · kỳ duyên 25%', () => {
  const weights = Object.fromEntries(H.EXPLORE_WEIGHTS);
  assert.deepEqual(weights, { monster: .45, npc: .30, encounter: .25 });
  const sum = H.EXPLORE_WEIGHTS.reduce((n, [, w]) => n + w, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  for (const [roll, kind] of [[0, 'monster'], [.449, 'monster'], [.451, 'npc'], [.749, 'npc'], [.751, 'encounter'], [.999, 'encounter']]) {
    const { g } = make(roll);
    assert.equal(run(g, 'startExploration').kind, kind, 'roll ' + roll);
  }
});

test('exploreChoice: schema chỉ nhận chỉ số 0–2 và không có trường thừa', () => {
  assert.ok(C.types.includes('exploreChoice'));
  for (const bad of [{ index: -1 }, { index: 3 }, { index: 1.5 }, { index: '1' }, {}, { index: 0, extra: 1 }])
    assert.throws(() => C.validate({ type: 'exploreChoice', payload: bad }), /không hợp lệ/);
  assert.deepEqual(C.validate({ type: 'exploreChoice', payload: { index: 2 } }).payload, { index: 2 });
});

test('exploreChoice: cần chuyến đang diễn ra, sự kiện có lựa chọn và chỉ chọn một lần', () => {
  const { g } = make(.5);
  assert.throws(() => run(g, 'exploreChoice', { index: 0 }), /Chưa có chuyến/);
  run(g, 'startExploration');
  assert.equal(run(g, 'exploreChoice', { index: 1 }), 'listen');
  assert.equal(g.s.exploration.active.choice, 1);
  assert.throws(() => run(g, 'exploreChoice', { index: 0 }), /đã chọn/);

  const kyDuyen = make(.99).g;
  run(kyDuyen, 'startExploration');
  assert.throws(() => run(kyDuyen, 'exploreChoice', { index: 0 }), /không có lựa chọn/);
});

test('NPC: lựa chọn đổi tâm ma và tu vi, kết quả chỉ tính khi hết chuyến', () => {
  const expected = { 0: -12, 1: -4, 2: 10 };
  for (const [index, delta] of Object.entries(expected)) {
    const { g } = make(.5);
    g.s.tamMa = 30;
    const journey = run(g, 'startExploration');
    run(g, 'exploreChoice', { index: Number(index) });
    assert.equal(g.s.tamMa, 30, 'chưa đổi khi chuyến đi còn diễn ra');
    const qi = g.s.totalRunExp;
    g.advance(journey.end);
    assert.equal(g.s.tamMa, 30 + delta, 'lựa chọn ' + index);
    assert.ok(g.s.totalRunExp > qi, 'có tu vi');
    assert.match(g.s.exploration.last.text, /Đàm đạo/);
  }
});

test('NPC: không chọn thì chỉ lướt qua, tâm ma kẹp trong 0–100', () => {
  const idle = make(.5).g;
  idle.s.tamMa = 30;
  const journey = run(idle, 'startExploration');
  idle.advance(journey.end);
  assert.equal(idle.s.tamMa, 30);
  assert.match(idle.s.exploration.last.text, /Lướt qua/);

  const low = make(.5).g;
  low.s.tamMa = 5;
  const j1 = run(low, 'startExploration');
  run(low, 'exploreChoice', { index: 0 });
  low.advance(j1.end);
  assert.equal(low.s.tamMa, 0);

  const high = make(.5).g;
  high.s.tamMa = 95;
  const j2 = run(high, 'startExploration');
  run(high, 'exploreChoice', { index: 2 });
  high.advance(j2.end);
  assert.equal(high.s.tamMa, 100);
});

test('quái: né tránh không thu được gì và không hao sinh lực', () => {
  const { g } = make(.01);
  const journey = run(g, 'startExploration');
  assert.equal(journey.kind, 'monster');
  run(g, 'exploreChoice', { index: 1 });
  const before = { hp: g.s.hp, stone: g.s.stone, kills: g.s.enemyNum };
  g.advance(journey.end);
  assert.equal(g.s.hp, before.hp);
  assert.equal(g.s.stone, before.stone);
  assert.equal(g.s.enemyNum, before.kills);
  assert.match(g.s.exploration.last.text, /Né tránh/);
});

test('quái: thương lượng thành công nhận linh thạch, thất bại hao sinh lực nhưng không tử vong', () => {
  const win = make(.01);
  const j1 = run(win.g, 'startExploration');
  run(win.g, 'exploreChoice', { index: 2 });
  const stone = win.g.s.stone;
  win.g.advance(j1.end);
  assert.ok(win.g.s.stone > stone, 'thương lượng thành công có linh thạch');
  assert.equal(win.g.s.exploration.last.cleared, true);

  const lose = make(.01);
  const j2 = run(lose.g, 'startExploration');
  run(lose.g, 'exploreChoice', { index: 2 });
  lose.box.roll = .99;
  const hp = lose.g.s.hp, stone2 = lose.g.s.stone;
  lose.g.advance(j2.end);
  assert.ok(lose.g.s.hp < hp, 'thất bại mất sinh lực');
  assert.ok(lose.g.s.hp >= 1, 'không bao giờ tử vong vì thương lượng');
  assert.equal(lose.g.s.stone, stone2);
  assert.equal(lose.g.isDead(), false);

  const weak = make(.01);
  weak.g.s.hp = 1;
  const j3 = run(weak.g, 'startExploration');
  run(weak.g, 'exploreChoice', { index: 2 });
  weak.box.roll = .99;
  weak.g.advance(j3.end);
  assert.equal(weak.g.s.hp, 1, 'sinh lực 1 vẫn giữ nguyên');
});

test('quái: không chọn thì mặc định giao chiến như trước', () => {
  const { g } = make(.01);
  const journey = run(g, 'startExploration');
  const kills = g.s.enemyNum;
  g.advance(journey.end);
  const won = g.s.enemyNum - kills;
  assert.ok(won === 0 || won === 1);
  assert.equal(g.s.exploration.last.choice, -1);
});

test('tâm ma làm giảm xác suất đột phá và đan giải độc giảm tâm ma', () => {
  const { g } = make(.5);
  g.s.tamMa = 0;
  const base = g.chance();
  g.s.tamMa = 100;
  const worst = g.chance();
  assert.ok(worst < base);
  assert.ok(Math.abs((base - worst) - 100 * H.TAM_MA_BREAK_PENALTY) < .05, 'chênh lệch xấp xỉ mức phạt tối đa');
  assert.ok(worst >= 0);

  const pill = H.ITEMS.find(x => x.kind === 'PILL' && x.effect === 'GIAI_DOC');
  assert.ok(pill, 'có đan giải độc');
  g.s.tamMa = 50;
  g.add(pill.code);
  run(g, 'use', { code: pill.code });
  assert.equal(g.s.tamMa, 50 - H.TAM_MA_CLEANSE);
});

test('normalize: tamMa được làm sạch, bản lưu cũ mặc định 0, lựa chọn hợp lệ được giữ', () => {
  const { g } = make(.5);
  const raw = JSON.parse(JSON.stringify(g.s));
  for (const [input, out] of [[500, 100], [-7, 0], ['x', 0], [42.9, 42], [undefined, 0]]) {
    raw.tamMa = input;
    assert.equal(H.normalize(JSON.parse(JSON.stringify(raw)), NOW).tamMa, out, String(input));
  }
  delete raw.tamMa;
  assert.equal(H.normalize(raw, NOW).tamMa, 0);

  const started = make(.5);
  run(started.g, 'startExploration');
  run(started.g, 'exploreChoice', { index: 2 });
  const saved = H.normalize(JSON.parse(JSON.stringify(started.g.s)), NOW);
  assert.equal(saved.exploration.active.choice, 2);
  const tampered = JSON.parse(JSON.stringify(started.g.s));
  tampered.exploration.active.choice = 9;
  assert.equal(H.normalize(tampered, NOW).exploration.active.choice, -1);
});
