import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load() {
  const ctx = {
    console,
    Math,
    Date,
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of ["src/game/core/data.js", "src/game/features/idle_data.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  ctx.TT.Game = function Game() {};
  ctx.TT.Game.prototype.refreshBasic = function () {};
  ctx.h = (tag, attrs, ...kids) => ({ nodeType: 1, tag, attrs: attrs || {}, kids });
  vm.runInContext(fs.readFileSync("src/game/features/attribute_audit_fix.js", "utf8"), ctx, { filename: "attribute_audit_fix.js" });
  return ctx;
}

const box = () => ({ children: [], replaceChildren(...children) { this.children = children; } });

test("Linh căn 1-5 thuộc tính không render null/undefined", () => {
  const { TT } = load();
  for (let n = 1; n <= 5; n++) {
    const g = new TT.Game();
    g.rootRoll = { els: TT.FIVE.slice(0, n) };
    g.lblRoot = box();
    g.rootBox = box();
    g.refreshBasic();

    assert.equal(TT.rootInfo(g.rootRoll).n, n);
    assert.equal(g.lblRoot.children.length, n);
    assert.ok(g.rootBox.children.length >= n + 2);
    assert.ok(g.rootBox.children.every(x => x !== null && x !== undefined && x !== false));
    const rendered = JSON.stringify(g.rootBox.children);
    assert.equal(rendered.includes('"null"'), false);
    assert.equal(rendered.includes("undefined"), false);
  }
});

test("safe replaceChildren loại bỏ optional null/undefined/false", () => {
  const { TT } = load(), target = box();
  TT.replaceChildrenSafe(target, "a", null, undefined, false, ["b", null]);
  assert.deepEqual(target.children, ["a", "b"]);
});

test("toàn bộ định nghĩa thuộc tính game hợp lệ và hữu hạn", () => {
  const { TT } = load();
  assert.deepEqual(Array.from(TT.auditAttributes()), []);

  const bonusKeys = ["atk", "def", "hp", "exp", "crit", "dodge", "regen"];
  for (const el of Object.keys(TT.ELEMENTS)) {
    const desc = TT.elemDesc(el, 1);
    assert.equal(/null|undefined|NaN/.test(desc), false, `${el}: ${desc}`);
  }
  for (let n = 1; n <= 5; n++) {
    const root = { els: TT.FIVE.slice(0, n) };
    const p = { root, temper: {} };
    for (const key of bonusKeys) assert.ok(Number.isFinite(TT.rootBonus(p, key)), `${n}/${key}`);
  }
});

test("5 chỉ số gốc có mô tả gameplay và mọi race bonus dùng đúng key", () => {
  const { TT } = load(), valid = new Set(TT.STATS);
  assert.equal(TT.STATS.length, 5);
  assert.equal(valid.size, 5);
  for (const stat of TT.STATS) assert.ok(TT.STAT_DESC[stat]?.length > 20, stat);
  for (const [race, [, bonus]] of Object.entries(TT.RACES)) {
    for (const [key, value] of Object.entries(bonus)) {
      assert.ok(valid.has(key), `${race}/${key}`);
      assert.ok(Number.isFinite(value), `${race}/${key}`);
    }
  }
});
