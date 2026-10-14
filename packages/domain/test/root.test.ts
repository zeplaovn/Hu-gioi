import assert from "node:assert/strict";
import test from "node:test";
import { FIVE, ROOT_TYPES, cleanRoot, rootInfo, rollRoot } from "../src/index.js";

test("five normal root types are complete and finite", () => {
  assert.deepEqual(ROOT_TYPES.map(x => x.n), [1, 2, 3, 4, 5]);
  assert.equal(ROOT_TYPES.reduce((s, x) => s + x.weight, 0), 97);
  for (const type of ROOT_TYPES) for (const value of [type.exp, type.scale, type.life, type.keep, type.weight]) assert.ok(Number.isFinite(value));
});

test("1..5 element roots never resolve to null", () => {
  for (let n = 1; n <= 5; n++) {
    const root = cleanRoot({ els: FIVE.slice(0, n) });
    assert.ok(root);
    assert.equal(root.els.length, n);
    assert.equal(rootInfo(root).n, n);
  }
});

test("rollRoot always returns a valid root", () => {
  let seed = 1;
  const rng = () => ((seed = (seed * 48271) % 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 5000; i++) {
    const root = rollRoot(rng);
    assert.ok(root.els.length >= 1 && root.els.length <= 5);
    assert.equal(new Set(root.els).size, root.els.length);
  }
});
