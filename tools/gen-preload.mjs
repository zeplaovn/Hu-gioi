// Sinh client/assets/preload-manifest.js: danh sách tài nguyên nạp trước khi vào game.
// Chạy lại sau khi thêm/đổi tên ảnh:  node tools/gen-preload.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const walk = dir => readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(png|webp|jpe?g|svg)$/i.test(n) ? [p] : [];
});
const rel = p => relative(ROOT, p).split('\\').join('/');
const A = 'media/assets/';
const list = [];
const add = (...a) => a.forEach(x => { if (!list.includes(x)) list.push(x); });

// 1) Cảnh nền chính + logo (hiện ngay ở màn loading nên xếp đầu)
add(A + 'world/bg/logo.webp', A + 'world/bg/idle_ha_gioi.webp', A + 'world/bg/background.webp');
for (const f of ['idle_linh_gioi', 'idle_tien_gioi', 'dai_loi_kiep']) add(`${A}world/bg/${f}.webp`);
// 2) Toàn bộ icon/nút giao diện (nhỏ, dùng ở mọi màn)
walk(join(ROOT, A + 'ui')).map(rel).sort().forEach(p => add(p));
// 3) Nhân vật Hạ Giới cả hai giới tính: màn tạo nhân vật và 5 cảnh giới đầu
for (const g of ['nam', 'nu']) {
  walk(join(ROOT, `${A}chars/player/${g}/ha_gioi`)).map(rel).sort().forEach(p => add(p));
}
// 4) Hai loài quái đầu tiên của Hạ Giới
for (const m of ['mon_001', 'mon_002']) {
  walk(join(ROOT, `${A}enemies/mon/ha_gioi/${m}`)).map(rel).sort().forEach(p => add(p));
}
// 5) Hạt theo mùa; ảnh intro được nạp riêng khi bấm Bắt đầu tu tiên.
walk(join(ROOT, A + 'world/vfx/leaf')).map(rel).sort().forEach(p => add(p));

writeFileSync(join(ROOT, 'client/assets/preload-manifest.js'),
  `/* Sinh bởi tools/gen-preload.mjs — không sửa tay. */\n(function(root){root.HU_PRELOAD=${JSON.stringify(list)};})(typeof window!=='undefined'?window:globalThis);\n`);
console.log(list.length + ' tệp');
