/* Dữ liệu kinh mạch theo root.txt (mục 4, 5): số lượng, quan hệ hệ và xem trước tạp chất. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../data/meridians.js');
const C = require('../data/character.js');

test('kinh mạch: 12 chính kinh, 8 kỳ kinh, Hỗn Độn Thiên Mạch', () => {
  assert.equal(M.CHINH_KINH.length, 12);
  assert.equal(M.KY_KINH.length, 8);
  assert.equal(M.THIEN_MACH.rarity, 'thiên');
  const he = M.CHINH_KINH.map(m => m.he);
  for (const h of ['Kim', 'Thổ', 'Hỏa', 'Thủy', 'Mộc']) assert.equal(he.filter(x => x === h).length, 2, h);
  assert.equal(he.filter(x => x === 'Trung hòa').length, 2);
  assert.equal(new Set(M.CHINH_KINH.map(m => m.name)).size, 12);
});

test('kinh mạch: quan hệ cùng hệ / sinh hệ và tương sinh', () => {
  assert.equal(M.relation('Hỏa', ['Hỏa']), 'same');
  assert.equal(M.relation('Mộc', ['Hỏa']), 'sinh');
  assert.equal(M.relation('Thủy', ['Hỏa']), 'none');
  assert.equal(M.relation('Trung hòa', ['Hỏa']), 'none');
  assert.equal(M.SINH.Mộc, 'Hỏa');
  assert.equal(M.SINH_RA.Kim, 'Thổ');
});

test('kinh mạch: tạp chất Z theo số hệ và độ tinh khiết', () => {
  assert.equal(M.zPerMinute(1, 70), 0);
  assert.ok(Math.abs(M.zPerMinute(5, 65) - 0.7) < 1e-9);
  assert.equal(M.zPenalty(49), 0);
  assert.equal(M.zPenalty(50), 0.1);
  assert.equal(M.zPenalty(80), 0.3);
  assert.equal(M.zPenalty(100), 1);
  assert.ok(Math.abs(M.preview([80, 20, 20, 20, 20], 'Thiên', '').maxBonus - 0.51) < 1e-9);
});

test('kinh mạch: xem trước với mọi linh căn gieo được', () => {
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) {
    const r = C.rollRoots(rng), pv = M.preview(r.roots, r.rootType, r.rootSub);
    assert.ok(pv.count >= 1 && pv.count <= 5);
    assert.ok(pv.purity >= 50 && pv.purity <= 100);
    assert.ok(pv.same >= 0 && pv.same <= 12 && pv.same + pv.sinh <= 12);
    assert.equal(pv.countRate, M.COUNT_RATE[pv.count]);
    if (r.rootType === 'Dị') assert.ok(pv.diHe);
    if (pv.count === 1) assert.equal(pv.zPerMinute, 0);
  }
});
