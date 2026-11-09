const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const F = H.F;

const NOW = 1_700_000_000_000;
const seeded = s => { let x = s >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); };
const TALENT = { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 };
const profile = extra => ({ name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan', talent: { ...TALENT }, ...extra });

test('A.1: mô tả Dị không còn nói sánh ngang Thiên, đúng với số tốc độ', () => {
  const di = H.ROOT_GROUPS.find(g => g.id === 'di');
  assert.ok(F.LINH_CAN_RATE['Dị'] > F.LINH_CAN_RATE['Thiên']);
  assert.doesNotMatch(di.lead, /sánh ngang/);
  assert.match(di.lead, /nhanh hơn/);
});

test('A.2: ngũ hành phải khớp loại suy ra từ roots', () => {
  const rng = seeded(1);
  const ok = [
    ['Thiên', [72, 20, 30, 40, 10]], ['Song', [72, 61, 30, 40, 10]], ['Tam hành', [72, 61, 55, 44, 33]],
    ['Tứ hành', [72, 61, 55, 50, 33]], ['Ngụy', [72, 61, 55, 50, 50]]
  ];
  for (const [rootType, roots] of ok) assert.equal(H.createCharacter(profile({ rootType, roots }), NOW, rng).rootType, rootType);
  for (const [rootType, roots] of ok) {
    const other = ok.find(([t]) => t !== rootType)[0];
    assert.throws(() => H.createCharacter(profile({ rootType: other, roots }), NOW, rng), /Linh căn không khớp/);
  }
  assert.throws(() => H.createCharacter(profile({ rootType: 'Thiên', roots: [10, 20, 30, 40, 10] }), NOW, rng), /Linh căn không khớp/);
});

test('A.2: Dị phải có đúng một hệ gốc hợp lệ với biến thể', () => {
  const rng = seeded(2);
  /* Lôi lấy từ Hỏa (3) hoặc Thủy (2). */
  assert.equal(H.createCharacter(profile({ rootType: 'Dị', rootSub: 'loi', roots: [10, 20, 30, 80, 10] }), NOW, rng).rootSub, 'loi');
  assert.equal(H.createCharacter(profile({ rootType: 'Dị', rootSub: 'loi', roots: [10, 20, 80, 30, 10] }), NOW, rng).rootSub, 'loi');
  assert.throws(() => H.createCharacter(profile({ rootType: 'Dị', rootSub: 'loi', roots: [80, 20, 30, 40, 10] }), NOW, rng), /hệ gốc/);
  assert.throws(() => H.createCharacter(profile({ rootType: 'Dị', rootSub: 'loi', roots: [10, 20, 80, 80, 10] }), NOW, rng), /hệ gốc/);
  assert.throws(() => H.createCharacter(profile({ rootType: 'Dị', rootSub: 'bang', roots: [10, 20, 30, 40, 10] }), NOW, rng), /Linh căn không khớp/);
  assert.throws(() => H.createCharacter(profile({ rootType: 'Dị', rootSub: 'sai', roots: [10, 20, 30, 80, 10] }), NOW, rng), /Dị linh căn/);
});

test('A.2: giao diện gieo bằng rollRoots không bao giờ bị chặn nhầm', () => {
  let n = 0;
  const seen = new Set();
  for (const seed of [1, 7, 42, 99, 1234]) {
    const rng = seeded(seed);
    for (let i = 0; i < 1000; i++) {
      const r = H.rollRoots(rng);
      seen.add(r.rootType);
      assert.doesNotThrow(() => H.createCharacter(profile(r), NOW, rng));
      n++;
    }
  }
  assert.equal(n, 5000);
  for (const t of ['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên', 'Dị']) assert.ok(seen.has(t), t);
});

test('A.3: lifePace suy từ aging_speed, không hard-code', () => {
  const p = H.lifePace('nhan', 0, 18);
  assert.equal(p.secondsPerYear, 1 / F.aging_speed(0));
  assert.equal(p.lifeSeconds, H.raceLife('nhan', 0) / F.aging_speed(0));
  assert.equal(p.leftSeconds, (H.raceLife('nhan', 0) - 18) / F.aging_speed(0));
  /* Khớp mốc khắc nghiệt: khoảng 41 phút còn lại ở tuổi 18, và độ khó không đổi. */
  assert.ok(p.leftSeconds / 60 > 40 && p.leftSeconds / 60 < 42);
  assert.equal(H.lifePace('nhan', 0, 999).leftSeconds, 0);
  assert.ok(H.lifePace('tien_due', 0, 18).lifeSeconds > p.lifeSeconds);
  assert.equal(H.raceLife('nhan', 0), 80);
});
