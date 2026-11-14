/* Công pháp và bí tịch: ngoại tu chủ động, nội tu bị động, bí tịch nghề không chiếm ô, đan hiếm theo phẩm chất sách. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const M = H.MANUALS;

const NOW = 1800000000000;
const profile = { name: 'Lý Vô Thường', gender: 'nam', age: 18, race: 'nhan', roots: [72, 61, 45, 44, 33], rootType: 'Song', talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 }, destiny: 'exp' };
const newGame = () => new H.Game(H.createCharacter(profile, NOW, () => 0), () => 0);
const books = H.ITEMS.filter(x => x.kind === 'BT');
const first = (sc, tier = 0) => books.find(x => M.school(x) === sc && x.tier === tier && x.sub === 0 && !x.designOnly);

test('mọi bí tịch thuộc đúng một hệ và cả ba hệ đều có sách', () => {
  const count = { ngoai: 0, noi: 0, nghe: 0 };
  for (const x of books) { assert.ok(M.school(x) in count, x.code); count[M.school(x)]++; }
  assert.ok(count.ngoai > 0 && count.noi > 0 && count.nghe > 0, JSON.stringify(count));
});

test('công pháp có chiêu thức là ngoại tu, sách tốc độ tu là nội tu, sách luyện đan là nghề', () => {
  assert.equal(M.school(H.item('BT-002')), 'ngoai');
  assert.equal(M.school(H.item('BT-001')), 'noi');
  assert.equal(M.school(H.item('BT-004')), 'nghe');
  assert.equal(M.trade(H.item('BT-004')), 'dan');
  assert.equal(M.trade(H.item('BT-001')), null);
});

test('số ô mỗi hệ tăng theo cảnh giới và không quá bốn', () => {
  assert.deepEqual({ ...M.slots(0) }, { ngoai: 1, noi: 1 });
  assert.ok(M.slots(5).ngoai >= M.slots(0).ngoai && M.slots(5).noi >= M.slots(0).noi);
  assert.deepEqual({ ...M.slots(30) }, { ngoai: 4, noi: 4 });
});

test('ngoại tu có chiêu thức, phẩm chất sách cao thì chiêu mạnh hơn', () => {
  const weak = M.skillOf({ ...H.item('BT-002'), sub: 0 }), strong = M.skillOf({ ...H.item('BT-002'), sub: 3 });
  assert.equal(weak.kind, 'attack');
  assert.ok(strong.multiplier > weak.multiplier);
  assert.equal(M.skillOf(H.item('BT-001')), null);
});

test('học sách: ngoại và nội tự vào ô, mỗi hệ có ô riêng, nghề không chiếm ô', () => {
  const g = newGame(), s = g.s, out = first('ngoai'), inn = first('noi'), trade = first('nghe');
  for (const x of [out, inn, trade]) g.add(x.code);
  for (const x of [out, inn, trade]) g.learn({ code: x.code }, NOW);
  assert.ok(s.activeManuals.includes(out.code) && s.activeManuals.includes(inn.code));
  assert.ok(!s.activeManuals.includes(trade.code));
  assert.ok(trade.code in s.learned);
  assert.throws(() => g.activate({ code: trade.code }), /không chiếm ô/);
});

test('hết ô thì không vận hành thêm được cho đến khi dừng một công pháp cùng hệ', () => {
  const g = newGame(), s = g.s, a = first('ngoai'), b = books.find(x => M.school(x) === 'ngoai' && x.tier === 0 && x.code !== a.code);
  for (const x of [a, b]) { g.add(x.code); g.learn({ code: x.code }, NOW); }
  assert.equal(M.slots(s.realm).ngoai, 1);
  assert.deepEqual(s.activeManuals.filter(k => M.school(H.item(k)) === 'ngoai'), [a.code]);
  assert.throws(() => g.activate({ code: b.code }), /Hết ô/);
  g.activate({ code: a.code });
  assert.equal(g.activate({ code: b.code }), true);
});

test('nội tu bị động tăng tốc độ tu luyện khi vận hành, ngoại tu thì không', () => {
  const g = newGame(), before = g.manualEffects().rate, inn = first('noi'), out = first('ngoai');
  g.add(inn.code); g.learn({ code: inn.code }, NOW);
  const after = g.manualEffects().rate;
  assert.ok(after > before);
  g.add(out.code); g.learn({ code: out.code }, NOW);
  assert.equal(g.manualEffects().rate, after);
});

test('thi triển ngoại tu tốn linh lực, vào hồi chiêu và không dùng được khi chưa đặt vào ô', () => {
  const g = newGame(), s = g.s, x = first('ngoai');
  g.add(x.code);
  assert.throws(() => g.castManual({ code: x.code }, NOW), /đặt công pháp ngoại tu vào ô/);
  g.learn({ code: x.code }, NOW);
  s.mp = g.maxMp();
  g.castManual({ code: x.code }, NOW);
  assert.ok(s.mp < g.maxMp());
  assert.throws(() => g.castManual({ code: x.code }, NOW), /hồi chiêu/);
});

test('đan hiếm cần bí tịch luyện đan đủ cấp; sách phẩm cao bù cảnh giới thấp hơn', () => {
  const rare = H.ITEMS.find(x => x.kind === 'PILL' && x.effect === 'THO_NGUYEN');
  assert.ok(M.isRarePill(rare));
  assert.equal(M.isRarePill(H.ITEMS.find(x => x.kind === 'PILL' && x.effect === 'HOI_PHUC')), false);
  const g = newGame();
  assert.equal(g.pillGate(rare).ok, false);
  const weak = books.find(x => M.trade(x) === 'dan' && M.rank(x) < M.pillNeed(rare));
  const strong = books.find(x => M.trade(x) === 'dan' && M.rank(x) >= M.pillNeed(rare));
  g.s.learned[weak.code] = .5;
  assert.equal(g.pillGate(rare).ok, false);
  g.s.learned[strong.key || strong.code] = .5;
  assert.equal(g.pillGate(rare).ok, true);
});

test('bản lưu cũ có quá nhiều công pháp cùng hệ bị cắt theo số ô', () => {
  const g = newGame(), outs = books.filter(x => M.school(x) === 'ngoai' && x.tier === 0).slice(0, 4);
  const raw = JSON.parse(JSON.stringify(g.s));
  raw.learned = Object.fromEntries(outs.map(x => [x.code, .5]));
  raw.activeManuals = outs.map(x => x.code);
  const back = H.normalize(raw, NOW);
  assert.equal(back.activeManuals.length, M.slots(back.realm).ngoai);
});
