// Chạy thử cân bằng bí cảnh bằng đúng công thức của game (không cần trình duyệt).
// Dùng:  node scripts/sim_balance.mjs
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const ctx = vm.createContext({ console, Math, Date, Object, Array, Set, Number, String, JSON, Map });
ctx.window = ctx;
for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) new vm.Script(fs.readFileSync(path.join(root, f), "utf8"), { filename: f }).runInContext(ctx);
const TT = vm.runInContext("TT", ctx);

const SK_BY_REALM = [[], ["Dưỡng Khí Quyết"], ["Dưỡng Khí Quyết", "Thanh Phong Kiếm Pháp", "Kim Cang Thể"],
  ["Dưỡng Khí Quyết", "Thanh Phong Kiếm Pháp", "Kim Cang Thể", "Huyền Thiên Chân Kinh", "Cửu Thiên Lôi Pháp"]];
const mk = (realm, tang, els, extra = 0) => {
  const alloc = { "Tướng Mạo": 1, "Phúc Duyên": 1, "Căn Cốt": 4, "Ngộ Tính": 2, "Vận Khí": 0 };
  const p = new TT.Player("Nam", 20, "Nhân", alloc, { name: "Test", root: { els } });
  p.realm = realm; p.tang = tang;
  for (const s of TT.STATS) p.stats[s] += extra + Math.floor(realm / 2);         // kỳ ngộ / tôi luyện cộng dồn theo thời gian
  p.skills = [...SK_BY_REALM[Math.min(realm, 3)]];
  if (realm >= 1) p.gear = { "Phi Kiếm": 2, "Pháp Bào": 2 };
  p.hp = p.max_hp();
  return p;
};

const N = 400;
const run = (p, def) => {
  let fl = 0, hp = 0, full = 0, down = 0;
  for (let i = 0; i < N; i++) {
    const r = TT.simSecret(p, def, p.max_hp());
    fl += r.cleared; hp += r.hp / p.max_hp(); if (r.cleared === def.floors) full++; if (r.end === "down") down++;
  }
  return { fl: fl / N, hp: hp / N, full: full / N, down: down / N };
};

const roots = [["Tam (Kim,Thủy,Thổ)", ["Kim", "Thủy", "Thổ"]], ["Thiên Mộc", ["Mộc"]], ["Ngũ", [...TT.FIVE]]];
console.log("Mỗi ô: số tầng thanh trừ trung bình / tổng tầng | % khí huyết còn | % thông quan | % gục");
for (const def of TT.SECRETS) {
  console.log(`\n== ${def.name} (${def.el}, cảnh giới ${TT.REALMS[def.realm]}, ${def.floors} tầng, địch tầng 1 = ${TT.secretEnemy(def, 1)}, boss = ${TT.secretEnemy(def, def.floors)})`);
  for (const [lbl, tang, dr] of [["đầu cảnh giới", 1, 0], ["giữa cảnh giới", 5, 0], ["cuối cảnh giới", 9, 0], ["cảnh giới kế tiếp", 5, 1]]) {
    const realm = Math.min(def.realm + dr, 8);
    const cells = roots.map(([n, els]) => {
      const p = mk(realm, tang, els, def.realm >= 3 ? 4 : def.realm);
      const r = run(p, def);
      return `${n.split(" ")[0].padEnd(4)} ${r.fl.toFixed(1)}/${def.floors} | ${(r.hp * 100).toFixed(0)}% | ${(r.full * 100).toFixed(0)}% | ${(r.down * 100).toFixed(0)}%`;
    });
    const p0 = mk(realm, tang, ["Kim", "Thủy", "Thổ"], def.realm >= 3 ? 4 : def.realm);
    console.log(`  ${lbl.padEnd(18)} (lực ${String(p0.power()).padStart(3)}, thủ ${String(p0.def()).padStart(3)}, huyết ${String(p0.max_hp()).padStart(4)})  ${cells.join("   ")}`);
  }
}
