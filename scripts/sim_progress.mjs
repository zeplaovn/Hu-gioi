// Mô phỏng thời gian lên cảnh giới bằng đúng công thức của game (không cần trình duyệt).
// Dùng:  node scripts/sim_progress.mjs          (in bảng thời gian trung bình cho 3 kiểu nhân vật)
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = path.resolve(import.meta.dirname, "..");
const ctx = vm.createContext({ console, Math, Date, Object, Array, Set, Number, String, JSON, Map });
ctx.window = ctx;
for (const f of ["js/core/data.js", "js/systems/idle_data.js", "js/core/player.js"]) new vm.Script(fs.readFileSync(path.join(root, f), "utf8"), { filename: f }).runInContext(ctx);
const TT = vm.runInContext("TT", ctx);
const mkRng = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* Ba kiểu nhân vật: [điểm cộng, hệ số tu luyện thêm theo cảnh giới (công pháp, tông môn, pháp khí, Đạo Tâm...), tần suất kỳ ngộ cộng thêm tu vi] */
const PROFILES = {
  "Yếu (lần đầu chơi, có Dưỡng Khí Quyết)": { alloc: { "Tướng Mạo": 2, "Phúc Duyên": 2, "Căn Cốt": 2, "Ngộ Tính": 1, "Vận Khí": 1 }, els: ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"], extra: [0.2, 0.25, 0.3, 0.4, 0.45, 0.5, 0.5, 0.5, 0.5], race: "Nhân" },
  "Khá (trung bình)": { alloc: { "Tướng Mạo": 1, "Phúc Duyên": 1, "Căn Cốt": 2, "Ngộ Tính": 3, "Vận Khí": 1 }, els: ["Kim", "Thủy", "Thổ"], extra: [0.2, 0.3, 0.55, 0.75, 0.85, 0.95, 1.0, 1.0, 1.0], race: "Linh" },
  "Mạnh (đã nâng cấp)": { alloc: { "Tướng Mạo": 0, "Phúc Duyên": 1, "Căn Cốt": 3, "Ngộ Tính": 4, "Vận Khí": 0 }, els: ["Hỏa"], extra: [0.35, 0.5, 0.9, 1.15, 1.3, 1.4, 1.5, 1.5, 1.5], race: "Linh", stat: 6 },
};
const MONTH_S = TT.IDLE.MONTH_TICKS * TT.IDLE.TICK_MS / 1000;
const fmtT = s => s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${(s / 60).toFixed(0)}ph` : s < 172800 ? `${(s / 3600).toFixed(1)}h` : `${(s / 86400).toFixed(1)}ng`;

function run(profile, seed) {
  const R = mkRng(seed), P = profile;
  const p = new TT.Player("Nam", 20, P.race, P.alloc, { name: "T", root: { els: P.els } });
  if (P.stat) for (const s of TT.STATS) p.stats[s] += P.stat;
  p.lifespan = TT.RACES[P.race][0] + 20;
  let bonus = 0; const em = p.exp_mult.bind(p); p.exp_mult = () => em() + bonus;
  const times = {}, ages = {}; let months = 0, fails = 0;
  times[0] = 0; ages[0] = 0;
  while (p.realm < TT.REALMS.length && months < 120000) {
    bonus = P.extra[Math.min(p.realm, 8)];
    const mg = p.monthGain(R);
    p.exp += mg; months++;
    if (months % 12 === 0) p.age++;
    if (p.age >= p.lifespan) return { dead: true, realm: p.realm, tang: p.tang, months, times, ages, fails };
    const need = p.need_exp();
    if (p.exp >= need) {
      const big = p.tang === 9, chance = p.breakChance(big);
      if (R() < chance) {
        p.exp -= need;
        if (big) { p.realm++; p.tang = 1; p.lifespan += TT.PROG.LIFE[p.realm]; times[p.realm] = months * MONTH_S; ages[p.realm] = months / 12; if (p.realm === 9) break; }
        else p.tang++;
      } else { fails++; p.exp = Math.floor(p.exp * p.failKeep(big)); months += 1; }
    }
  }
  return { dead: p.realm < 9, realm: p.realm, tang: p.tang, months, times, ages, fails, win: p.realm >= 9 };
}

const N = 60;
for (const [name, P] of Object.entries(PROFILES)) {
  const res = Array.from({ length: N }, (_, i) => run(P, 1000 + i));
  const med = a => { a = [...a].sort((x, y) => x - y); return a[a.length >> 1]; };
  const reach = r => res.filter(x => x.times[r] !== undefined);
  console.log(`\n== ${name}: tu vi/giây tháng đầu ≈ ${(() => { const p = new TT.Player("Nam", 20, P.race, P.alloc, { name: "T", root: { els: P.els } }); return (p.monthGain() / TT.IDLE.MONTH_TICKS).toFixed(2); })()}`);
  console.log("   cảnh giới           | đạt được | thời gian thật (trung vị) | tuổi (trung vị) | chết trước đó");
  for (let r = 1; r <= 9; r++) {
    const ok = reach(r);
    console.log(`   ${(TT.REALMS[r] || "Phi thăng").padEnd(14)}    | ${String(Math.round(ok.length / N * 100)).padStart(3)}%      | ${ok.length ? fmtT(med(ok.map(x => x.times[r]))).padStart(8) : "      - "}                  | ${ok.length ? String(Math.round(med(ok.map(x => x.ages[r])) + 20)).padStart(4) : "   -"}            | ${Math.round(res.filter(x => x.dead && x.realm === r - 1).length / N * 100)}%`);
  }
  console.log(`   thất bại đột phá TB: ${(res.reduce((s, x) => s + x.fails, 0) / N).toFixed(1)}`);
}
