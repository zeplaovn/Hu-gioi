/* Luật design đã kiểm chứng ở docs/design-audit.md: giao diện phải nói đúng xác suất và thời gian sống còn. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const H = require('../engine/game.js');
const F = H.F;
const NOW = 1_700_000_000_000;
const seeded = (seed = 7) => { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); };
const PROFILE = { name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan', roots: [72, 61, 45, 44, 33], rootType: 'Song', talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 } };
const make = () => { const rng = seeded(); return new H.Game(H.createCharacter({ ...PROFILE, talent: { ...PROFILE.talent }, roots: [...PROFILE.roots] }, NOW, rng), rng); };
const atPeak = (g, realm) => { g.s.realm = realm; g.s.stage = F.STAGES[realm]; g.s.shield = 0; g.s.reduction = 0; return g; };

test('breakthroughOdds: không hộ kiếp thì từ Trúc Cơ trở đi xác suất thực là 0 dù chance() > 0', () => {
  for (let realm = 1; realm <= 12; realm++) {
    const g = atPeak(make(), realm), odds = g.breakthroughOdds();
    assert.ok(g.chance() > 0, 'chance() nền vẫn dương ở realm ' + realm);
    assert.equal(odds.doomed, true, 'realm ' + realm);
    assert.equal(odds.chance, 0, 'realm ' + realm);
    assert.ok(odds.failing.length >= 1);
  }
});

test('breakthroughOdds: đủ hộ kiếp thì trả lại xác suất nền; tầng nhỏ và Luyện Khí không bị coi là chắc thất bại', () => {
  const g = atPeak(make(), 3);
  g.s.shield = 0.4; g.s.reduction = 0.2;
  const odds = g.breakthroughOdds();
  assert.equal(odds.doomed, false);
  assert.equal(odds.chance, odds.base);
  const minor = make(); minor.s.realm = 3; minor.s.stage = 1;
  assert.deepEqual(minor.breakthroughOdds().events, []);
  assert.equal(minor.breakthroughOdds().doomed, false);
  assert.equal(atPeak(make(), 0).breakthroughOdds().doomed, false);
});

test('breakthroughOdds khớp kết quả thật: doomed thì breakthrough() thất bại với mọi hạt giống', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = seeded(seed), g = new H.Game(H.createCharacter({ ...PROFILE, talent: { ...PROFILE.talent }, roots: [...PROFILE.roots] }, NOW, rng), rng);
    atPeak(g, 3); g.s.qi = g.need();
    assert.equal(g.breakthroughOdds().doomed, true);
    assert.equal(g.breakthrough({}, NOW).success, false, 'seed ' + seed);
  }
});

test('lifeInfo.seconds: thời gian thực còn lại trước khi tọa hóa, hữu hạn khi chưa chứng đạo', () => {
  const g = make(), life = g.lifeInfo();
  assert.ok(Number.isFinite(life.seconds) && life.seconds > 0);
  assert.ok(life.seconds >= life.safeSeconds || life.safeSeconds === Infinity);
  g.s.completed = true;
  assert.equal(g.lifeInfo().seconds, Infinity);
});

test('cảnh báo thọ nguyên không nhắc vật phẩm không tồn tại', () => {
  assert.equal(H.ITEMS.some(x => /Trường Thọ Quả/.test(x.name)), false);
  const g = make(); g.s.age = g.maxLife() - 2; g.warnLife(g.maxLife());
  assert.ok(g.s.logs.some(l => l.includes('Thọ nguyên chỉ còn')));
  assert.ok(!g.s.logs.some(l => l.includes('Trường Thọ Quả')));
});

test('giao diện dùng xác suất thực và có bước xác nhận khi chắc chắn thất bại', () => {
  const shell = readFileSync(join(__dirname, '..', 'client/ui/shell.js'), 'utf8');
  const idle = readFileSync(join(__dirname, '..', 'client/ui/screens/idle.js'), 'utf8');
  assert.match(shell, /breakthroughOdds\(\)/);
  assert.match(shell, /odds\.doomed && !confirmed/);
  assert.match(idle, /breakthroughOdds\(\)/);
});
