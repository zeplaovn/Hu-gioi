// Kiểm thử save_game (sổ cái thời gian) trên Postgres thật chạy trong Node (PGlite, không cần cài Postgres hay Docker).
// Chạy: npm i --no-save @electric-sql/pglite && node supabase/tests/save_game_time_bounds.test.mjs
// Áp toàn bộ supabase/migrations rồi MỌI file trong supabase/pending_migrations (theo thứ tự tên) lên một DB trống có bản giả lập tối thiểu của Supabase.
// NO_FIX=1 node supabase/tests/save_game_time_bounds.test.mjs  -> chạy trên bản đang live (không có bản sửa): các ca A, C và F phải thất bại, chứng minh test thật sự bắt được lỗi.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const SUPABASE = path.resolve(import.meta.dirname, "..");
const PENDING = path.join(SUPABASE, "pending_migrations");
const FIXES = process.env.NO_FIX ? [] : fs.readdirSync(PENDING).filter(f => f.endsWith(".sql")).sort().map(f => path.join(PENDING, f));

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
`);
const migDir = path.join(SUPABASE, "migrations");
for (const f of fs.readdirSync(migDir).filter(f => f.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join(migDir, f), "utf8"));
for (const f of FIXES) await db.exec(fs.readFileSync(f, "utf8"));

const STATS = { "Tướng Mạo": 5, "Phúc Duyên": 5, "Căn Cốt": 5, "Ngộ Tính": 5, "Vận Khí": 5 };
const player = (lv, months, mt = 0) => ({
  realm: Math.floor((lv - 1) / 9), tang: ((lv - 1) % 9) + 1, months, age: 20 + Math.floor(months / 12), lifespan: 200,
  stats: STATS, stone: 15, exp: 0, race: "Nhân", skills: [], name: "Thử", idle: { mt },
});
let nextUser = 1;
const newUser = async ({ ageSeconds = 5 } = {}) => {
  const id = `00000000-0000-4000-8000-${String(nextUser++).padStart(12, "0")}`;
  await db.query("insert into auth.users(id, created_at) values ($1, now() - make_interval(secs => $2))", [id, ageSeconds]);
  await db.exec(`select set_config('request.jwt.claim.sub', '${id}', false), set_config('request.jwt.claim.email', 'u@example.com', false)`);
  return id;
};
const save = async (count, p, rev, force = false, meta = {}) => {
  try {
    const r = await db.query("select public.save_game($1::jsonb, $4::jsonb, $2::bigint, $3) as r", [JSON.stringify({ count, player: p }), rev, force, JSON.stringify(meta)]);
    return { ok: true, rev: r.rows[0].r.rev };
  } catch (e) { return { ok: false, err: e.message }; }
};
const effective = s => Math.min(7200, s <= 120 ? s : 120 + (s - 120) * 0.5);       // cùng công thức với TT.IDLE (idle_data.js)
// Lùi mốc lần ghi cuối để mô phỏng thời gian thật đã trôi qua mà không phải chờ.
const ago = (uid, secs) => db.query("update public.player_saves set updated_at = now() - make_interval(secs => $2), trusted_game_at = now() - make_interval(secs => $2) where user_id = $1", [uid, secs]);

let failed = 0;
const check = (name, got, want) => { const ok = got === want; if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${got} (mong đợi ${want})`}`); };
const verdict = r => (r.ok ? "ok" : r.err);

console.log("A. Không được bỏ qua giới hạn thời gian bằng đường 'lần ghi đầu' / 'kiếp mới'");
{
  const u = await newUser();
  check("A1 tài khoản vừa tạo ghi thẳng nhân vật cấp 81", verdict(await save(1, player(81, 573), 0)), "time_jump");
  check("A1b bảng xếp hạng không có dòng giả", String((await db.query("select count(*)::int c from public.leaderboard where user_id=$1", [u])).rows[0].c), "0");
}
{
  const u = await newUser(); let r = await save(1, player(1, 0), 0);
  await ago(u, 5); r = await save(2, null, r.rev);
  await ago(u, 5); check("A2 sau khi chết, kiếp mới nhảy thẳng cấp 81", verdict(await save(2, player(81, 573), r.rev)), "time_jump");
}
{
  const u = await newUser(); const r = await save(1, player(1, 0), 0);
  await ago(u, 5); check("A3 tăng count kèm nhân vật cấp 81", verdict(await save(2, player(81, 573), r.rev)), "time_jump");
}

console.log("B. Luồng chơi thật vẫn lưu được");
{
  await newUser(); check("B1 tạo nhân vật rồi lưu lần đầu", verdict(await save(1, player(1, 0, 3), 0)), "ok");
  await newUser({ ageSeconds: 40 }); check("B2 lưu lần đầu khi tài khoản 40s, tiến độ 24s", verdict(await save(1, player(1, 2, 4), 0)), "ok");
  const u = await newUser(); let r = await save(1, player(1, 0), 0);
  await ago(u, 40); r = await save(1, player(1, 4), r.rev);
  await ago(u, 5); r = await save(2, null, r.rev);
  await ago(u, 20); r = await save(2, player(1, 0, 0), r.rev);
  check("B3 chết rồi tạo kiếp mới", verdict(r), "ok");
  await ago(u, 8); check("B4 kiếp mới tiếp tục lưu sau 8 nhịp", verdict(await save(2, player(1, 0, 8), r.rev)), "ok");
}

console.log("C. Vắng mặt rồi quay lại: client bù thời gian (công thức offline) rồi lưu sau PUSH_DELAY = 8s, mỗi giây thêm 1 nhịp");
for (const D of [60, 130, 600, 3600, 20000]) {
  const u = await newUser({ ageSeconds: 7200 }), P0 = 1000, PUSH = 8;
  const first = await save(1, player(10, P0 / 10), 0);
  const progress = Math.floor(P0 + effective(D) + PUSH);
  await ago(u, D + PUSH);
  check(`C vắng ${D}s rồi quay lại`, verdict(await save(1, player(10, Math.floor(progress / 10), progress % 10), first.rev)), "ok");
}

console.log("D. Dung sai không cộng dồn: gọi save_game liên tục không đẻ thêm thời gian");
{
  const u = await newUser({ ageSeconds: 7200 }); let r = await save(1, player(10, 100), 0), progress = 1000, accepted = 0, rejectedAt = null;
  for (let i = 1; i <= 6; i++) {
    await ago(u, 1); progress += 20;
    r = await save(1, player(10, Math.floor(progress / 10), progress % 10), r.rev ?? 0);
    if (r.ok) accepted++; else { rejectedAt = i; break; }
  }
  check("D1 khai vượt 20s mỗi giây: 1 lần trong dung sai, lần 2 bị chặn", `${accepted}/${rejectedAt}`, "1/2");
}

console.log("E. Các chặn khác vẫn hoạt động");
{
  const a = await newUser(); await db.query("insert into public.admin_users(user_id, role) values ($1, 'admin')", [a]);
  check("E1 admin dùng p_force được ghi cấp 81", verdict(await save(1, player(81, 573), 0, true)), "ok");
  const u = await newUser({ ageSeconds: 7200 }); let r = await save(1, player(10, 100), 0);
  await ago(u, 5); check("E2 lùi cấp trong cùng kiếp", verdict(await save(1, player(9, 100), r.rev)), "level_reverse");
  await newUser(); check("E3 người chơi thường dùng p_force", verdict(await save(1, player(1, 0), 0, true)), "force_forbidden");
}

console.log("F. meta.best do client khai không được nâng hạng quá thời gian thật");
{
  const lvOf = async uid => String((await db.query("select level from public.leaderboard where user_id=$1", [uid])).rows[0]?.level ?? "none");
  const u = await newUser({ ageSeconds: 600 }); const r = await save(1, player(1, 0), 0);
  await ago(u, 5);
  check("F1 tài khoản cấp 1 khai meta.best = 81 (lưu vẫn được, chỉ không nâng hạng)", verdict(await save(1, player(1, 0), r.rev, false, { best: 81, history: [{ age: 20 }] })), "ok");
  check("F1b bảng xếp hạng vẫn ở cấp 1", await lvOf(u), "1");

  const v = await newUser({ ageSeconds: 7200 }); const s1 = await save(1, player(39, 40), 0);
  await ago(v, 5);
  await save(1, player(39, 40), s1.rev, false, { best: 50, history: [{ age: 40 }] });
  check("F2 cấp 39 khai meta.best = 50 (cận 82 tháng, mới tu 40)", await lvOf(v), "39");

  const w = await newUser({ ageSeconds: 7200 }); const t1 = await save(1, player(39, 40), 0);
  await ago(w, 5);
  const t2 = await save(2, null, t1.rev, false, { best: 40, history: [{ age: 23 }] });
  check("F3 người chơi thật: lên cấp 40 rồi chết giữa hai lần lưu, vẫn được ghi nhận", `${verdict(t2)}/${await lvOf(w)}`, "ok/40");
}

console.log(failed ? `\n${failed} ca thất bại` : "\nTất cả đạt");
process.exit(failed ? 1 : 0);
