// So sánh tốc độ tu hành giữa các loại linh căn bằng đúng công thức của game (chỉ nhập định + thọ nguyên, một build cố định).
// Dùng:  node scripts/sim_root.mjs [tên cấu hình ...]      (mặc định chạy mọi cấu hình trong CONFIGS)
// Mỗi cấu hình có thể ghi đè: speed = hệ số nhân tốc độ tu chung (mô phỏng chỉnh nhịp TT.PROG), exp(kind, realm) = cộng tốc độ tu luyện của linh căn, life(kind) = thọ nguyên cộng thêm mỗi lần đại đột phá, keep(kind) = cộng tỉ lệ giữ tu vi khi đột phá hỏng.
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = path.resolve(import.meta.dirname, "..");
const ctx = vm.createContext({ console, Math, Date, Object, Array, Set, Number, String, JSON, Map });
ctx.window = ctx;
for (const f of ["js/core/data.js", "js/systems/idle_data.js", "js/core/player.js"]) new vm.Script(fs.readFileSync(path.join(root, f), "utf8"), { filename: f }).runInContext(ctx);
const TT = vm.runInContext("TT", ctx);
const mkRng = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Build "Khá" như sim_progress: cùng điểm cộng, cùng hỗ trợ công pháp / tông môn / pháp khí theo cảnh giới, chủng tộc Linh. */
const BUILD = { alloc: { "Tướng Mạo": 1, "Phúc Duyên": 1, "Căn Cốt": 2, "Ngộ Tính": 3, "Vận Khí": 1 }, extra: [0.2, 0.3, 0.55, 0.75, 0.85, 0.95, 1.0, 1.0, 1.0], race: "Linh" };
const KINDS = {
  "Thiên (Kim)": ["Kim"], "Thiên Thủy": ["Thủy"], "Song": ["Kim", "Mộc"], "Tam": ["Kim", "Thủy", "Thổ"],
  "Tứ": ["Kim", "Mộc", "Thủy", "Thổ"], "Ngũ": [...TT.FIVE], "Dị Lôi": ["Lôi"], "Dị Băng": ["Băng"], "Dị Phong": ["Phong"],
};
const isRare = els => els.some(e => TT.RARE_EL.includes(e));

/** "hiện tại" = đúng số đang chạy trong game (js/systems/idle_data.js, js/core/data.js). Thử số mới: tạo scripts/sim_root_configs.mjs (không bắt buộc) xuất ra các cấu hình ghi đè; lưu ý monthGain đã gồm TT.PROG.SPEED. */
export const CONFIGS = {
  "hiện tại": {},
};
if (fs.existsSync(path.join(root, "scripts/sim_root_configs.mjs"))) Object.assign(CONFIGS, (await import("./sim_root_configs.mjs")).default(TT));

const MONTH_S = TT.IDLE.MONTH_TICKS * TT.IDLE.TICK_MS / 1000;
const fmtT = s => s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${(s / 60).toFixed(0)}ph` : s < 172800 ? `${(s / 3600).toFixed(1)}h` : `${(s / 86400).toFixed(1)}ng`;

function run(els, cfg, seed) {
  const R = mkRng(seed), kind = { els };
  const p = new TT.Player("Nam", 20, BUILD.race, BUILD.alloc, { name: "T", root: kind });
  p.lifespan = TT.RACES[BUILD.race][0] + 20;
  const info = TT.rootInfo(kind), rare = isRare(els);
  const baseRoot = () => info.exp + TT.rootBonus(p, "exp");
  const em = p.exp_mult.bind(p);
  const memo = {};
  p.exp_mult = () => memo[p.realm] ??= (em() - baseRoot() + (cfg.exp ? cfg.exp(els, p.realm, info, rare, TT.rootBonus(p, "exp")) : baseRoot()) + BUILD.extra[Math.min(p.realm, 8)]) * (cfg.speed || 1);
  let months = 0; const times = {};
  while (p.realm < 9 && months < 120000) {
    p.exp += p.monthGain(R); months++;
    if (months % 12 === 0) p.age++;
    if (p.age >= p.lifespan) return { dead: true, realm: p.realm, times, first: 0 };
    const need = p.need_exp();
    if (p.exp >= need) {
      const big = p.tang === 9;
      if (R() < p.breakChance(big)) {
        p.exp -= need;
        if (big) { p.realm++; p.tang = 1; p.lifespan += TT.PROG.LIFE[p.realm] + (cfg.life ? cfg.life(els, info, rare) : info.life || 0); times[p.realm] = months * MONTH_S; }
        else p.tang++;
      } else { p.exp = Math.floor(p.exp * Math.min(0.95, p.failKeep(big) - (info.keep || 0) + (cfg.keep ? cfg.keep(els, info, rare) : info.keep || 0))); months++; }
    }
  }
  return { dead: p.realm < 9, realm: p.realm, times };
}

export function report(name, cfg, N = 80) {
  const med = a => { a = [...a].sort((x, y) => x - y); return a[a.length >> 1]; };
  const rows = [];
  for (const [label, els] of Object.entries(KINDS)) {
    const res = Array.from({ length: N }, (_, i) => run(els, cfg, 5000 + i));
    const pp = new TT.Player("Nam", 20, BUILD.race, BUILD.alloc, { name: "T", root: { els } });
    const info = TT.rootInfo({ els }), rare = isRare(els);
    const em0 = pp.exp_mult.bind(pp), sp = cfg.speed || 1;
    pp.exp_mult = () => (em0() - (info.exp + TT.rootBonus(pp, "exp")) + (cfg.exp ? cfg.exp(els, 0, info, rare, TT.rootBonus(pp, "exp")) : info.exp + TT.rootBonus(pp, "exp")) + BUILD.extra[0]) * sp;
    const reach = r => res.filter(x => x.times[r] !== undefined), win = reach(9), hth = reach(5);
    rows.push({ label, first: pp.monthGain() / TT.IDLE.MONTH_TICKS, hth: hth.length ? med(hth.map(x => x.times[5])) : NaN, win: win.length ? med(win.map(x => x.times[9])) : NaN, winPct: Math.round(win.length / N * 100) });
  }
  console.log(`\n=== Cấu hình: ${name} ===`);
  console.log("Linh căn      | tu vi/s đầu | Hóa Thần | Phi thăng | Phi thăng được | Chết già");
  for (const r of rows) console.log(`${r.label.padEnd(13)} | ${r.first.toFixed(2).padStart(10)}  | ${(isNaN(r.hth) ? "-" : fmtT(r.hth)).padStart(8)} | ${(isNaN(r.win) ? "không tới" : fmtT(r.win)).padStart(9)} | ${String(r.winPct + "%").padStart(13)}  | ${100 - r.winPct}%`);
  const w = rows.filter(r => !isNaN(r.win)), m = w.reduce((s, r) => s + r.win, 0) / (w.length || 1);
  const pcts = rows.map(r => r.winPct);
  console.log(`-> Thời gian Phi thăng lệch tối đa so với TB: ${w.length ? Math.round(Math.max(...w.map(r => Math.abs(r.win - m) / m)) * 100) : "-"}%  ·  tỉ lệ Phi thăng thấp nhất ${Math.min(...pcts)}%, cao nhất ${Math.max(...pcts)}% (chênh ${Math.max(...pcts) - Math.min(...pcts)} điểm)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const want = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(CONFIGS)) if (!want.length || want.includes(name)) report(name, cfg);
}
