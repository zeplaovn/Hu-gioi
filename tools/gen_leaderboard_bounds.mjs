// Sinh bảng "số tháng tu luyện tối thiểu để đạt cấp L" dùng cho bảng xếp hạng (supabase/migrations/20261013000000_leaderboard.sql).
//   node tools/gen_leaderboard_bounds.mjs   -> in mảng SQL. Chạy lại và dán vào migration mới mỗi khi đổi TT.PROG / công thức tu vi.
// Cận dưới rất rộng rãi: Căn Cốt = Ngộ Tính = 40, hệ số tu luyện x3,5, dao động tối đa 1,3, rồi chia đôi để chừa chỗ cho kỳ ngộ / đan dược.
import fs from "node:fs"; import vm from "node:vm";
const c = { console }; c.TT = {}; vm.createContext(c); c.window = c;
vm.runInContext(fs.readFileSync(new URL("../js/data.js", import.meta.url), "utf8"), c);
const T = c.TT, MAX_MULT = 3.5, MAX_ROLL = 1.3, SAFETY = 0.5, LEVELS = T.REALMS.length * 9;
const out = [0]; let sum = 0;
for (let L = 1; L <= LEVELS; L++) {
  out.push(Math.floor(sum * SAFETY));                           // cấp L cần đã tu qua các cấp 1..L-1
  sum += T.needExp(L) / ((4 + 40 * 1.5 + 40 * 2 + L * 1.5) * MAX_MULT * MAX_ROLL);
}
console.log(out.slice(1).join(", "));
