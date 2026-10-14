import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/ui/character_create_fix.js", import.meta.url), "utf8");

function renderRoot(info, root = { els: ["Phong"] }) {
  class Game {}
  const makeSlot = () => ({ children: [], replaceChildren(...xs) { this.children = xs; } });
  const TT = {
    Game,
    RACES: { "Nhân": [90, {}] },
    ELEMENTS: {
      "Phong": { color: "#a8f0c8" },
      "Kim": { color: "#e8d28a" },
      "Mộc": { color: "#6edc7a" },
      "Thủy": { color: "#6ab8ff" },
    },
    rootInfo: () => info,
    elemDesc: el => `${el} bonus`,
  };
  const h = (tag, attrs = {}, ...children) => ({ tag, attrs, children });
  const ctx = vm.createContext({ TT, h });
  vm.runInContext(source, ctx, { filename: "character_create_fix.js" });

  const g = new Game();
  Object.assign(g, {
    age: 17,
    race: "Nhân",
    rootRoll: root,
    lblAge: {},
    lblRace: {},
    raceInfo: {},
    lblRoot: makeSlot(),
    rootBox: makeSlot(),
  });
  g.refreshBasic();
  return g;
}

test("linh can without compensation never renders literal null", () => {
  const g = renderRoot({ name: "Dị Linh Căn", exp: 0.45, scale: 1, life: 0, keep: 0 });
  assert.equal(g.lblRoot.children.length, 1);
  assert.ok(g.rootBox.children.length >= 3);
  assert.ok(g.rootBox.children.every(x => x !== null && x !== undefined));
  assert.equal(g.rootBox.children.some(x => String(x) === "null"), false);
});

test("multi-element linh can still renders compensation row", () => {
  const g = renderRoot(
    { name: "Tam Linh Căn", exp: 0.08, scale: 0.62, life: 25, keep: 0.03 },
    { els: ["Kim", "Mộc", "Thủy"] },
  );
  const texts = g.rootBox.children.flatMap(x => x.children || []).filter(x => typeof x === "string");
  assert.ok(texts.some(x => x.includes("+25 năm thọ nguyên")));
  assert.ok(g.rootBox.children.every(x => x !== null && x !== undefined));
});
